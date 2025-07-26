#pragma once
#include <napi.h>
#include <string>
#include <vector>
#include <memory>

class SolidityParser {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    static Napi::Value ParseContract(const Napi::CallbackInfo& info);
    
private:
    static Napi::Object ParseContractSource(const std::string& source, Napi::Env env);
};
