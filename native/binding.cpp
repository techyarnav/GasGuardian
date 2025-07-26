#include <napi.h>
#include "parser.hpp"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return SolidityParser::Init(env, exports);
}

NODE_API_MODULE(gas_guardian_native, InitAll)
