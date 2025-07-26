#include "parser.hpp"
#include <regex>
#include <sstream>
#include <algorithm>

Napi::Object SolidityParser::Init(Napi::Env env, Napi::Object exports) {
    exports.Set("parse", Napi::Function::New(env, ParseContract));
    return exports;
}

Napi::Value SolidityParser::ParseContract(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::string source = info[0].As<Napi::String>();
    
    try {
        return ParseContractSource(source, env);
    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Parse error: ") + e.what()).ThrowAsJavaScriptException();
        return env.Null();
    }
}

Napi::Object SolidityParser::ParseContractSource(const std::string& source, Napi::Env env) {
    Napi::Object result = Napi::Object::New(env);
    
    std::regex contract_regex(R"(contract\s+(\w+))");
    std::smatch matches;
    std::string contractName = "Unknown";
    if (std::regex_search(source, matches, contract_regex)) {
        contractName = matches[1].str();
    }
    result.Set("name", contractName);
    
    Napi::Array functions = Napi::Array::New(env);
    std::regex function_regex(
        R"(function\s+(\w+)\s*\(([^)]*)\)\s*(?:(public|private|internal|external))?\s*(?:(pure|view|payable|nonpayable))?\s*(?:returns\s*\(([^)]*)\))?\s*\{)"
    );
    
    std::sregex_iterator iter(source.begin(), source.end(), function_regex);
    std::sregex_iterator end;
    
    uint32_t functionIndex = 0;
    for (; iter != end; ++iter) {
        const auto& match = *iter;
        
        Napi::Object func = Napi::Object::New(env);
        func.Set("name", match[1].str());
        func.Set("visibility", match[3].str().empty() ? "public" : match[3].str());
        func.Set("stateMutability", match[4].str().empty() ? "nonpayable" : match[4].str());
        
        uint32_t lineNumber = std::count(source.begin(), source.begin() + match.position(), '\n') + 1;
        func.Set("startLine", lineNumber);
        
        size_t start_pos = match.position(); // Start from function declaration
        size_t brace_pos = match.position() + match.length() - 1; // Position of opening brace
        size_t brace_count = 1;
        size_t end_pos = brace_pos + 1;
        
        while (end_pos < source.length() && brace_count > 0) {
            if (source[end_pos] == '{') {
                brace_count++;
            } else if (source[end_pos] == '}') {
                brace_count--;
            }
            end_pos++;
        }
        
        std::string functionSourceCode;
        if (end_pos <= source.length()) {
            functionSourceCode = source.substr(start_pos, end_pos - start_pos);
        } else {
            functionSourceCode = source.substr(start_pos, std::min(size_t(1000), source.length() - start_pos));
        }
        func.Set("sourceCode", functionSourceCode);
        
        std::string paramsStr = match[2].str();
        Napi::Array params = Napi::Array::New(env);
        if (!paramsStr.empty()) {
            std::regex param_regex(R"(\s*(\w+(?:\[\])?)\s+(\w+))");
            std::sregex_iterator param_iter(paramsStr.begin(), paramsStr.end(), param_regex);
            std::sregex_iterator param_end;
            
            uint32_t paramIndex = 0;
            for (; param_iter != param_end; ++param_iter) {
                Napi::Object param = Napi::Object::New(env);
                param.Set("type", (*param_iter)[1].str());
                param.Set("name", (*param_iter)[2].str());
                params.Set(paramIndex++, param);
            }
        }
        func.Set("parameters", params);
        
        std::string returnsStr = match[5].str();
        Napi::Array returnTypes = Napi::Array::New(env);
        if (!returnsStr.empty()) {
            std::regex return_regex(R"(\s*(\w+(?:\[\])?))");
            std::sregex_iterator return_iter(returnsStr.begin(), returnsStr.end(), return_regex);
            std::sregex_iterator return_end;
            
            uint32_t returnIndex = 0;
            for (; return_iter != return_end; ++return_iter) {
                returnTypes.Set(returnIndex++, (*return_iter)[1].str());
            }
        }
        func.Set("returnTypes", returnTypes);
        
        Napi::Array patterns = Napi::Array::New(env);
        
        std::regex loop_regex(R"(\b(for|while)\s*\()");
        if (std::regex_search(functionSourceCode, loop_regex)) {
            Napi::Object pattern = Napi::Object::New(env);
            pattern.Set("type", "loop");
            pattern.Set("description", "Loop detected - gas scales with iterations");
            pattern.Set("estimatedGas", 5000);
            pattern.Set("suggestion", "Consider using unchecked arithmetic for counters and caching array length");
            patterns.Set(patterns.Length(), pattern);
        }
        
        std::regex storage_regex(R"(\w+\s*[\[\.].*?\]\s*=|\w+\s*=\s*[^=!<>])");
        std::sregex_iterator storage_iter(functionSourceCode.begin(), functionSourceCode.end(), storage_regex);
        std::sregex_iterator storage_end;
        
        uint32_t storageCount = 0;
        for (; storage_iter != storage_end; ++storage_iter) {
            std::string matched = (*storage_iter).str();
            if (matched.find("==") == std::string::npos && 
                matched.find("!=") == std::string::npos &&
                matched.find("require") == std::string::npos &&
                matched.find("<=") == std::string::npos &&
                matched.find(">=") == std::string::npos) {
                storageCount++;
            }
        }
        
        if (storageCount > 0) {
            Napi::Object pattern = Napi::Object::New(env);
            pattern.Set("type", "storage_write");
            pattern.Set("description", "Storage write operations detected");
            pattern.Set("estimatedGas", storageCount * 20000);
            pattern.Set("suggestion", "Consider batching storage operations or using memory for intermediate calculations");
            patterns.Set(patterns.Length(), pattern);
        }
        
        std::regex require_regex(R"(require\s*\()");
        std::sregex_iterator req_iter(functionSourceCode.begin(), functionSourceCode.end(), require_regex);
        std::sregex_iterator req_end;
        uint32_t requireCount = 0;
        for (; req_iter != req_end; ++req_iter) {
            requireCount++;
        }
        
        if (requireCount > 0) {
            Napi::Object pattern = Napi::Object::New(env);
            pattern.Set("type", "validation");
            pattern.Set("description", "Input validation detected");
            pattern.Set("estimatedGas", requireCount * 500);
            pattern.Set("suggestion", "Consider custom errors instead of require with strings");
            patterns.Set(patterns.Length(), pattern);
        }
        
        std::regex external_call_regex(R"(\w+\.call\(|\w+\.delegatecall\(|\w+\.staticcall\()");
        if (std::regex_search(functionSourceCode, external_call_regex)) {
            Napi::Object pattern = Napi::Object::New(env);
            pattern.Set("type", "external_call");
            pattern.Set("description", "External call detected");
            pattern.Set("estimatedGas", 2300);
            pattern.Set("suggestion", "Ensure proper gas estimation and consider reentrancy protection");
            patterns.Set(patterns.Length(), pattern);
        }
        
        std::regex array_regex(R"(\w+\.length|\w+\.push\(|\w+\.pop\(\))");
        if (std::regex_search(functionSourceCode, array_regex)) {
            Napi::Object pattern = Napi::Object::New(env);
            pattern.Set("type", "array_operation");
            pattern.Set("description", "Array operations detected");
            pattern.Set("estimatedGas", 1000);
            pattern.Set("suggestion", "Cache array length in loops and consider gas costs of dynamic arrays");
            patterns.Set(patterns.Length(), pattern);
        }
        
        std::regex string_regex(R"(string\s*\(\s*|\babi\.encode|\babi\.encodePacked)");
        if (std::regex_search(functionSourceCode, string_regex)) {
            Napi::Object pattern = Napi::Object::New(env);
            pattern.Set("type", "string_operation");
            pattern.Set("description", "String operations detected");
            pattern.Set("estimatedGas", 2000);
            pattern.Set("suggestion", "String operations are expensive; consider using bytes32 for fixed-length strings");
            patterns.Set(patterns.Length(), pattern);
        }
        
        func.Set("patterns", patterns);
        func.Set("complexityScore", 1 + patterns.Length() * 2);
        
        functions.Set(functionIndex++, func);
    }
    
    result.Set("functions", functions);
    result.Set("totalLines", static_cast<uint32_t>(std::count(source.begin(), source.end(), '\n') + 1));
    
    Napi::Array stateVars = Napi::Array::New(env);
    std::regex state_var_regex(R"(\s*(uint256|uint|address|bool|string|mapping)\s+(?:public\s+|private\s+|internal\s+)?(\w+))");
    std::sregex_iterator var_iter(source.begin(), source.end(), state_var_regex);
    std::sregex_iterator var_end;
    
    uint32_t varIndex = 0;
    for (; var_iter != var_end; ++var_iter) {
        stateVars.Set(varIndex++, (*var_iter)[2].str());
    }
    result.Set("stateVariables", stateVars);
    
    Napi::Array events = Napi::Array::New(env);
    std::regex event_regex(R"(event\s+(\w+)\s*\()");
    std::sregex_iterator event_iter(source.begin(), source.end(), event_regex);
    std::sregex_iterator event_end;
    
    uint32_t eventIndex = 0;
    for (; event_iter != event_end; ++event_iter) {
        events.Set(eventIndex++, (*event_iter)[1].str());
    }
    result.Set("events", events);
    
    return result;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return SolidityParser::Init(env, exports);
}

NODE_API_MODULE(parser, Init)
