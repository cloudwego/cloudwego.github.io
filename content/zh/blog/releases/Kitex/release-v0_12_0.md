---
title: "Kitex Release v0.12.0"
linkTitle: "Release v0.12.0"
projects: ["Kitex"]
date: 2025-01-03
description: >
---

## **重要变更介绍**

### 精简产物建议 - 去 Apache Thrift
强烈建议去 Apache Codec，解决 Apache 不兼容变更带来的编译体验问题，并能**减少 50% 产物体积**。

请使用 Kitex 的 Thrift Codec：FastCodec 或 Frugal，不会依赖 Apache Thrift  Codec。

后续版本计划：Kitex 会默认去除 Apache 产物，用户指南见 [Kitex 去 Apache Thrift 用户手册](/zh/docs/kitex/best-practice/remove_apache_codec/)

### New Features
1. **Thrift Streaming over TTHeader - 自定义流式协议**
   
   支持了基于 TTheader 协议的流式调用，优化因 gRPC streaming 协议复杂度过高而引入的稳定性问题；
   
   提供了新的流式接口 StreamX，解决原流式接口各类使用体验问题，并提供流式接口的最佳实践。
   
   用户文档：[StreamX 用户文档与最佳实践](/zh/docs/kitex/tutorials/basic-feature/streamx/)
   
2. **gRPC Streaming 支持优雅退出**
   
   支持了优雅退出功能，用于解决因为服务升级/更新而导致的上游报错问题。
   
   用户文档：[gRPC Streaming 优雅退出](/zh/docs/kitex/tutorials/basic-feature/protocol/streaming/grpc/graceful_shutdown/)
   
3. **JSON 泛化调用支持 gRPC Streaming**
   
   JSON 泛化调用支持 gRPC Streaming 流式接口（仅限 client），经过 v0.10.0 试用，正式发布。
   
   用户文档：[User Guide to Generic Call for Streaming](/docs/kitex/tutorials/advanced-feature/generic-call/generic_streaming)

### 体验优化
1. **gRPC Streaming 日志优化**

   对于流式串联场景，若下游 Stream 出错是由于上游 Stream 退出，将会在错误中包含"[triggered by {serviceName}]"后缀，方便定位问题；

   Send 返回的 the stream is done 错误将变成导致流被关闭的真正错误。
      
2. **代码生成工具 Kitex Tool**

   **生成速度和工具安装优化**：无需再安装或升级 Thriftgo ，内置到 Kitex，在 IDL 特别庞大的场景，生成速度有较大提升。
   
   **最小化产物体积**：产物体积最小化可以使用 Frugal，如果希望灰度开启，支持指定结构体使用 Frugal 序列化。详见 [代码生成工具](/zh/docs/kitex/tutorials/code-gen/code_generation/)关于 -frugal-struct、-gen-frugal 参数的说明。

### 不兼容变更-对99%用户无影响
Kitex 会尽量保证常规使用方式的兼容性，个别用户可能对 Kitex 部分代码定义有依赖，Kitex 本次版本调整对这部分用户有影响。
- **删除 `thrift.NewBinaryProtocol`**
  
  `thrift.NewBinaryProtocol`是 Kitex 对 Apache thrift.TProtocol 接口的实现，因为 trans 部分直接使用 Kitex 的 ByteBuffer，相比 apache thrift.TBinaryProtocol 性能更好。在 v0.11.0 已经加了弃用注释。
  
  **删除原因**: 因为要去除 Apache Thrift 依赖，所以需要删除该实现。
  
  **用户修改说明**: 该实现本就是配套 Apache Codec 使用，如果你还需要依赖 Apache Codec，请直接使用 Apache 的TBinaryProtocol。如果觉得对性能有影响，可以把 Kitex 旧版本实现 fork 下来，参考 github/cloudwego/kitex v0.10.0。 
  ```go
    import "github.com/apache/thrift/lib/go/thrift"
    tProt := thrift.NewTBinaryProtocol(thrift.NewTMemoryBufferLen(1024), true, true)
  ```
- **删除 `generic.ServiceInfo`**
  
  泛化部分删除 `generic.ServiceInfo` API。
  
  **删除原因**: 因为多 Service 的支持需要对泛化部分定义做重构。
  
  **用户修改说明**: 新 API 用 `generic.ServiceInfoWithGeneric` 替代。
  ```go
   import "github.com/cloudwego/kitex/pkg/generic"

   // removed
   func ServiceInfo(pcType serviceinfo.PayloadCodec) *serviceinfo.ServiceInfo

   // please use this instead
   func ServiceInfoWithGeneric(g Generic) *serviceinfo.ServiceInfo
  ```

## **Full Release Log**

### Feature:
[[#1541](https://github.com/cloudwego/kitex/pull/1541)][[#1633](https://github.com/cloudwego/kitex/pull/1633)] feat(ttstream): support ttheader streaming and streamv2 interface

[[#1623](https://github.com/cloudwego/kitex/pull/1623)] feat(gRPC): optimize gRPC error prompt and metrics, assisting in troubleshooting problems

[[#1556](https://github.com/cloudwego/kitex/pull/1556)] feat(gRPC): support gRPC graceful shutdown

[[#1467](https://github.com/cloudwego/kitex/pull/1467)][[#1627](https://github.com/cloudwego/kitex/pull/1627)][[#1619](https://github.com/cloudwego/kitex/pull/1619)] feat(generic): support thrift streaming(over gRPC) for json generic client

[[#1607](https://github.com/cloudwego/kitex/pull/1607)] feat(tool): kitex tool support gen frugal codec for certain struct

[[#1526](https://github.com/cloudwego/kitex/pull/1526)] feat(generic): support an option to remove go.tag annotation

[[#1536](https://github.com/cloudwego/kitex/pull/1536)] feat(generic): support an option to set IDL ParseMode for each client

[[#1510](https://github.com/cloudwego/kitex/pull/1510)] feat: register service with service level middleware

### Optimize:
[[#1635](https://github.com/cloudwego/kitex/pull/1635)] optimize: add two function for binary protocol to get bufiox reader and writer

[[#1630](https://github.com/cloudwego/kitex/pull/1630)] optimize(tool): implement no recursive generate to support incremental update

[[#1617](https://github.com/cloudwego/kitex/pull/1617)] optimize(retry): optimize UpdatePolicy and add test cases to check invalid retry policy. <v0.11.0, if the FailurePolicy is nil and type is 0 or >1, will trigger nil panic. The bug has been fixed in v0.11.0, this pr is to add test cases and optimize UpdatePolicy to ignore the nil panic

[[#1606](https://github.com/cloudwego/kitex/pull/1606)] optimize(tool): use embedded thriftgo as default option

[[#1595](https://github.com/cloudwego/kitex/pull/1595)] optimize(tool): optimize pb tool code

[[#1599](https://github.com/cloudwego/kitex/pull/1599)] optimize(tool): call FastWriteNocopy in FastWrite to avoid misuse by users

### Refactor:
[[#1615](https://github.com/cloudwego/kitex/pull/1615)] refactor: get rid of apache thrift in go.mod

[[#1611](https://github.com/cloudwego/kitex/pull/1611)][[#1614](https://github.com/cloudwego/kitex/pull/1614)] refactor: move ttheader codec logic to gopkg

[[#1553](https://github.com/cloudwego/kitex/pull/1553)] refactor(codec/thrift): unified typecodec implementation and adjust new file layout

### Perf:
[[#1581](https://github.com/cloudwego/kitex/pull/1581)][[#1628](https://github.com/cloudwego/kitex/pull/1628)] perf(timeout): refactor new rpctimeout implementation to improve performance

[[#1564](https://github.com/cloudwego/kitex/pull/1564)][[#1567](https://github.com/cloudwego/kitex/pull/1567)] perf: reduce object allocation for circuitbreak middleware and retry context

[[#1557](https://github.com/cloudwego/kitex/pull/1557)] perf(rpcinfo): remove lock for rpcinfo.RPCStats

### Fix:
[[#1622](https://github.com/cloudwego/kitex/pull/1622)] fix(generic): use jsoniter instead of sonic for json generic-call, since sonic doesn't support map[interface{}]interface{}

[[#1562](https://github.com/cloudwego/kitex/pull/1562)] fix: deep copy function of the generated code cannot copy the empty string

[[#1602](https://github.com/cloudwego/kitex/pull/1602)] fix(gRPC): check if the type assertion succeed in ProtocolMatch to avoid panic

[[#1598](https://github.com/cloudwego/kitex/pull/1598)] fix(retry): fix issue that mixed retry cannot update its config correctly

[[#1590](https://github.com/cloudwego/kitex/pull/1590)][[#1572](https://github.com/cloudwego/kitex/pull/1572)] fix(generic): set default values for optional fields of primitive types with generic with dynamicgo

[[#1580](https://github.com/cloudwego/kitex/pull/1580)] fix(netpoll): fix timeout caused by partial use of the Read method of remote.ByteBuffer

[[#1574](https://github.com/cloudwego/kitex/pull/1574)] fix(trace): stream event handler ignore io.EOF event

[[#1563](https://github.com/cloudwego/kitex/pull/1563)] fix(generic): fix the issue where the generic client sets the parse mode of CombineServices and then requests causes "unknown service" error

[[#1568](https://github.com/cloudwego/kitex/pull/1568)] fix(wpool): fix the issue of wpool object allocation, and incorrect ctx causing profiler errors.

[[#1558](https://github.com/cloudwego/kitex/pull/1558)][[#1555](https://github.com/cloudwego/kitex/pull/1555)] fix(bthrift): fix the issue of no recursion conversion of unknown field type under bthrift

### Chore:
[[#1593](https://github.com/cloudwego/kitex/pull/1593)][[#1560](https://github.com/cloudwego/kitex/pull/1560)][[#1561](https://github.com/cloudwego/kitex/pull/1561)][[#1559](https://github.com/cloudwego/kitex/pull/1559)] chore(test): fix data race issue, unstable issue and long time running issue of some test cases

[[#1634](https://github.com/cloudwego/kitex/pull/1634)][[#1632](https://github.com/cloudwego/kitex/pull/1632)][[#1573](https://github.com/cloudwego/kitex/pull/1573)] chore(dep): upgrade frugal, localsession and other cloudwego dependency versions

[[#1616](https://github.com/cloudwego/kitex/pull/1616)] chore(generic): remove deprecated apis/interfaces/variables
