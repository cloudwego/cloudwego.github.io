---
title: "Kitex Release v0.10.0"
linkTitle: "Release v0.10.0"
projects: ["Kitex"]
date: 2024-06-12
description: >
---

## **重要变更介绍**

### 性能优化
新版本探索了更多性能优化的方向和非常规的一些优化手段。
1. 长连接池: 100 并发 qps 提升 4%, p99 降低 18%
2. 多路复用: 100 并发 qps 提升 7%, p99 降低 24%
3. gRPC: 100 并发 qps优化 8%，p99优化 10%
   
### 代码产物精简优化
1. **移除非序列化代码（默认）**：原 kitex_gen Thrift 产物代码为保持与 Apache 的一致性，会生成 Processor 代码，但 Kitex 并不需要这些代码。为解决大家的产物痛点问题，此版本默认去除这部分代码，生成速度提升约10%。
2. **移除 Apache Codec 代码（配置移除）**：Kitex 有自定义的 FastCodec 代码，旧版本仅在 Buffered 包需要使用 Apache Codec。Kitex 新版本实现 SkipDecoder，在开启后就可以完全不依赖 Apache Codec，进而移除代码，产物体积可减少约50%。使用方式见 [SkipDecoder](/zh/docs/kitex/tutorials/code-gen/skip_decoder/)

### 新特性
1. **Thrift 按需序列化**：支持定义 FieldMask 实现数据按需序列化（字段裁剪、合并，RPC性能优化等），详见 [Thrift FieldMask RFC](https://github.com/cloudwego/thriftgo/tree/main/fieldmask)

### 功能优化
1. **熔断**：支持自定义熔断的错误类型
2. **异常重试**：代码配置的自定义结果重试增加 ctx 参数，方便用户结合 ctx 信息判断是否重试
3. **移除一致性哈希中的缓存**：解决hash key分散导致的延迟变高、内存上涨的问题。移除缓存后，面对 Key 特别分散甚至接近随机分布的场景，可以有效降低内存占用与管理缓存的消耗。

### 用户体验优化
1. **Kitex 工具兼容性检测**：优化过去产物引入新定义导致的 undefined 编译问题。Kitex 工具在生成代码前会检查 go.mod 中使用的 Kitex 版本。若 Kitex 工具和 Kitex 版本不兼容，则不会生成代码并给出相应的升降级提示。


## **详细变更**

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
