---
title: "Kitex Release v0.12.0"
linkTitle: "Release v0.12.0"
projects: ["Kitex"]
date: 2025-01-03
description: >
---

## **Introduction to Key Changes**

### Simplified Product Recommendation - Remove Apache Thrift Dependency
We strongly recommend removing Apache Codec to resolve the compilation issues caused by Apache's incompatible changes and to **reduce the product size by 50%**. 

Please replace it with Kitex's own Thrift codec: FastCodec or Frugal, which does not rely on Apache Thrift Codec.

Future version plans: Kitex will remove Apache products by default. User guide: [Kitex Remove Apache Thrift User Guide](/docs/kitex/best-practice/remove_apache_codec)

### New Features
1. **Thrift Streaming over TTHeader - Custom Streaming Protocol**
   
   Supported streaming calls based on the TTHeader protocol, optimizing stability issues caused by the high complexity of the gRPC streaming protocol.
   
   Provided a new streaming interface, StreamX, to solve various user experience issues with the original streaming interface and provide best practices for streaming interfaces.
   
   For more details: [StreamX User Documentation and Best Practices](/docs/kitex/tutorials/basic-feature/streamx/)
   
2. **Graceful Shutdown for gRPC Streaming**
   
   Added support for a graceful shutdown feature to address upstream errors caused by service upgrades or updates.
   
   For usage: [gRPC Streaming Graceful Shutdown](/docs/kitex/tutorials/basic-feature/protocol/streaming/grpc/graceful_shutdown/)
   
3. **JSON Generic Call Supports gRPC Streaming**
   
   JSON generic calls now support gRPC Streaming interfaces (client-side only). This is the official release after trial in v0.10.0.
   
   For usage: [User Guide to Generic Call for Streaming](/docs/kitex/tutorials/advanced-feature/generic-call/generic_streaming)

### Experience Optimization
1. **gRPC Streaming Log Optimization**
   
   For streaming concatenation scenarios, if the downstream error is due to an exit of the upstream Stream exiting, the error will include the suffix "[triggered by {serviceName}]" will be included in the error, which is convenient for locating the problem.
   
   Errors returned by Send such as `the stream is done` now reflect the actual error that caused the stream to close.
      
2. **Code Generation Tool Kitex Tool**
   
   **Optimization of Generation Speed and Tool Installation**: Now Thriftgo is built into Kitex, significantly improving generation speed, especially for scenarios with particularly large IDL files. There is no need to install or upgrade Thriftgo anymore.
   
   **Minimizing Product Size**: To minimize product size, Frugal can be used. For gray scale adoption, it supports specifying certain structs to use Frugal serialization.
      For more details, refer to [Code Generation Tool](/docs/kitex/tutorials/code-gen/code_generation/) for instructions on -frugal-struct and -gen-frugal parameters.

### Breaking Change - No Impact for 99% of Users
Kitex will strive to ensure compatibility with normal usage methods. Some users may have dependencies on certain code definitions of Kitex, and this version adjustment of Kitex will have an impact on these users.
- Removing `thrift.NewBinaryProtocol`
  `thrift.NewBinaryProtocol` is Kitex's implementation of the Apache thrift.TProtocol interface. Because the trans part directly uses Kitex's ByteBuffer, the performance is better than Apache thrift.TBinaryProtocol. 
  The Deprecation comment has been added to it in v0.11.0.
  
  **Removing Reason**: To remove the Apache Thrift dependency, the implementation needs to be removed.
  
  **User Modification Method**: This implementation was originally used with Apache Codec. If you still need to rely on Apache Codec, please directly use Apache's TBinaryProtocol. 
  If you think that it has an impact on performance, you can fork the old version of Kitex, refer to github/cloudwego/kitex v0.10.0
  ```go
    import "github.com/apache/thrift/lib/go/thrift"
    tProt := thrift.NewTBinaryProtocol(thrift.NewTMemoryBufferLen(1024), true, true)
  ```
- **Removing `generic.ServiceInfo`**
  
  Generic removed an API `generic.ServiceInfo`.
  
  **Removing Reason**: To prepare for future multi-service registration on a generic server, the generic implementation has been refactored (v0.11.0), and this API is no longer used.
  
  **User Modification Method**: This API was replaced by `generic.ServiceInfoWithGeneric`. Please use it instead.
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
