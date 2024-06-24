---
title: "Kitex Release v0.10.0"
linkTitle: "Release v0.10.0"
projects: ["Kitex"]
date: 2024-06-12
description: >
---

## **Introduction to Key Changes**

### Performance Optimization
1. Long connection: conncurrency = 100, qps increased by 4%, p99 decreased by  18%
2. connection multiplexing: conncurrency = 100, qps increased by 7%, p99 decreased by 24%
3. gRPC: conncurrency = 100, qps increased by 8%，p99 decreased by 10%
   
### Code Generation Simplification and Optimization
1. **Remove non-serialization code (By default)**: the original kitex_gen Thrift code includes Processor code to maintain consistency with Apache Thrift. However, Kitex does not need these codes. To solve users' code generation painpoint, this version Kitex removes this part of the code, increasing the generation speed by about 10%.
2. **Remove Apache Codec code (Remove if configured)**：Kitex has custom FastCodec code, and the original Apache Codec is only required when using Buffered protocol. The new version of Kitex implements SkipDecoder. If enabled, the serialization will be completely independent of Apache Codec, reducing the generated code size by about 50%. Refer to this doc for usage [SkipDecoder](/docs/kitex/tutorials/code-gen/skip_decoder)

### New Feature
1. **Thrift Serialize Data Ondemands**：Support defining FieldMask to achieve on-demand serialization of data (field clipping, merging, RPC Performance optimization, etc.), see details [Thrift FieldMask RFC](https://github.com/cloudwego/thriftgo/tree/main/fieldmask)

### Feature optimization
1. **CircuitBreaker**： Support for customized circuit breaker error types.
2. **Failure Retry**：The code configuration of the customized result retry adds the ctx parameter to facilitate users to check whether to retry based on ctx information.
3. **Remove cache from consistent hashing**：Solve the issue of high latency and memory increase caused by scattered hash keys. After removing the cache, it can effectively reduce memory usage and cache management consumption in scenarios where keys are particularly scattered or even close to random distribution.

### User Experience and Tool Optimization
1. **Kitex tool compatibility check**：Optimize the "undefined" compile error caused by introducing new definitions in old generated code. The Kitex tool will check the Kitex version used in go.mod before generating code. If the Kitex tool and Kitex version are incompatible, the code will not be generated and will provide corresponding upgrade and downgrade prompts and documentation.


## **Full Release Log**

### Feature:
1. [[#1370](https://github.com/cloudwego/kitex/pull/1370)] feat(loadbalance): do not cache all the keys for Consistent Hash
2. [[#1359](https://github.com/cloudwego/kitex/pull/1359)] feat:(generic) jsonpb using dynamicgo support parse IDL from memory
3. [[#1353](https://github.com/cloudwego/kitex/pull/1353)] feat(retry): add ctx param for customized result retry funcs
4. [[#1352](https://github.com/cloudwego/kitex/pull/1352)] feat: add option to specify ip version for default HTTPResolver
5. [[#1316](https://github.com/cloudwego/kitex/pull/1316)] feat(kitex tool): support dependencies compatibility checking
6. [[#1346](https://github.com/cloudwego/kitex/pull/1346)] feat(generic): set dynamicgo parse mode
8. [[#1336](https://github.com/cloudwego/kitex/pull/1336)] feat(tool): fast-codec supports Thrift Fieldmask
9. [[#1313](https://github.com/cloudwego/kitex/pull/1313), #1378] feat(thrift codec): implement skipDecoder to enable Frugal and FastCodec for standard Thrift Buffer Protocol
10. [[#1257](https://github.com/cloudwego/kitex/pull/1257)] feat: CBSuite custom GetErrorType func

### Optimize:
1. [[#1349](https://github.com/cloudwego/kitex/pull/1349)] optimize(gRPC): gRPC onError uses CtxErrorf to print log with information in ctx
2. [[#1326](https://github.com/cloudwego/kitex/pull/1326)] optimize(tool): remove thrift processor for less codegen

### Perf:
1. [[#1369](https://github.com/cloudwego/kitex/pull/1369)] perf(thrift): optimized skip decoder
2. [[#1314](https://github.com/cloudwego/kitex/pull/1314)] perf: use dirtmake to reduce memclr cost
3. [[#1322](https://github.com/cloudwego/kitex/pull/1322)] perf(codec): support fast write nocopy when using netpoll link buffer
4. [[#1276](https://github.com/cloudwego/kitex/pull/1276)] perf: linear allocator for fast codec ReadString/ReadBinary
5. [[#1320](https://github.com/cloudwego/kitex/pull/1320)] perf(codec): fast codec use batch alloc

### Fix:
1. [[#1379](https://github.com/cloudwego/kitex/pull/1379)] fix: fix a bug "unknown service xxx" when using generic client by not writing IDLServiceName when it's generic service
2. [[#1368](https://github.com/cloudwego/kitex/pull/1368)] fix(remote): modify the error message thrown when no target service is found
3. [[#1374](https://github.com/cloudwego/kitex/pull/1374)] fix: init default values when using liner allocator
4. [[#1361](https://github.com/cloudwego/kitex/pull/1361)] fix: span cache re-cap bytes when using Make
5. [[#1362](https://github.com/cloudwego/kitex/pull/1362)] fix(payloadCodec): replace the registered PayloadCodec if the type is same when using WithPayloadCodec for server-side
6. [[#1364](https://github.com/cloudwego/kitex/pull/1364)] fix: fix grpc compressor mcache free panic when data is empty
7. [[#1328](https://github.com/cloudwego/kitex/pull/1328)] fix(gRPC): release connection in DoFinish for grpc streaming to close the short connection
8. [[#1307](https://github.com/cloudwego/kitex/pull/1307)] fix(connpool): kitex long pool reset idleList element to nil to prevent conn leak
9. [[#1294](https://github.com/cloudwego/kitex/pull/1294)] fix(netpollmux): fix a bug that disables multi-service by assigning the first svcInfo to targetSvcInfo
10. [[#1308](https://github.com/cloudwego/kitex/pull/1308)] fix(generic): not write generic method name for binary generic exception to align with method names of services not using binary generic

### Refactor:
 1. [[#1344](https://github.com/cloudwego/kitex/pull/1344)] refactor(tool): export thriftgo template definition in kitextool

### Chore:
1. [[#1385](https://github.com/cloudwego/kitex/pull/1385)] chore: update dynamicgo to v0.2.8
2. [[#1383](https://github.com/cloudwego/kitex/pull/1383)] chore: upgrade netpoll to v0.6.1
3. [[#1376](https://github.com/cloudwego/kitex/pull/1376)] chore: integration test use go 1.20 to solve the compatibility issue of official gRPC in kitex-tests repo
4. [[#1355](https://github.com/cloudwego/kitex/pull/1355)] chore: upgrade netpoll to v0.6.1 pre-release version
5. [[#1338](https://github.com/cloudwego/kitex/pull/1338)] chore: correct the comment of FreezeRPCInfo
6. [[#1347](https://github.com/cloudwego/kitex/pull/1347)] chore: use runtimex to replace choleraehyq/pid
7. [[#1342](https://github.com/cloudwego/kitex/pull/1342)] chore: update sonic/loader to v0.1.1
8. [[#1334](https://github.com/cloudwego/kitex/pull/1334)] chore: update dynamicgo to v0.2.3
9. [[#1324](https://github.com/cloudwego/kitex/pull/1324)] chore: update dynamicgo and sonic version
10. [[#1317](https://github.com/cloudwego/kitex/pull/1317)] chore: frugal v0.1.15 (with migrated iasm)

------
**Thanks a lot to those community contributors who submit some pull requests or share your ideas for this version:** 
@XiaoYi-byte
