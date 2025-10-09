---
title: "Kitex Release v0.15.1"
linkTitle: "Release v0.15.1"
projects: ["Kitex"]
date: 2025-09-29
description: >
---

## **Introduction to Key Changes**

### **Announcements**
1. **Go Version Support Changes**: Kitex's minimum declared Go version has been adjusted to Go1.20 and supports up to Go1.25
   - Currently does not affect Go v1.18/v1.19 compilation, but after being declared for higher versions, subsequent versions will introduce features of higher versions
2. **Breaking Change for Partial interfaces**: No impact on regular users, but may affect those with extensions or special api dependencies. For details, refer to the [**Special Changes**] section.

### **New Features**
1. **Generic Call: New v2 API Supporting Multi-Services and Streaming Calls**

   The Thrift binary generic call API now provides v2 version, supporting multi-services and streaming calls. For detailed usage, see [Generic Call User Guide](/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage)

2. **Generic Call: Support for Unknown Service Handler**

   Facilitates rapid development of streaming proxy, see [Proxy Application Development Guide](/docs/kitex/tutorials/advanced-feature/proxy_application_development) for details

3. **Generic Call: Support for Server-Level JSON/Map Streaming Generic Calls**

   See: [Generic Call User Guide](/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage) for details

4. **TTHeader Streaming: Support for ctx Cancel to Control Flow Lifecycle**

   - Quickly terminate streaming calls, saving model resources
   - Aligns with gRPC, for detailed usage see [Stream Lifecycle Control Best Practices](/docs/kitex/tutorials/basic-feature/streamx/streamx_lifecycle_control)
   - Supports Client actively invoking cancel to end streaming calls
   - Supports Client sensing the ctx cancel signal of the current Handler and cascading to end streaming calls

5. **Streaming Error Handling Optimization**

   - Quickly address specific error scenarios, accelerate troubleshooting of cascade cancel link issues, see [Stream Error Handling Best Practices](/docs/kitex/tutorials/basic-feature/streamx/streamx_error_handling) for details
   - In cascade cancel scenarios, error description includes complete cancel link, quickly locating the first-hop service that actively cancels
   - Error description includes specific error scenarios and corresponding unique error codes
   - Unified and convenient cancel error handling method, eliminating the need for cumbersome string matching

### **Feature/Experience Optimization**
1. **Generic Client: Optimize Background Goroutine Startup Logic**

   Starting from Kitex v0.13.0, a generic client supports both Ping-Pong and streaming calls, and uses the TTHeader Streaming protocol by default. Each generic client automatically starts a background goroutine to clean up idle connections for TTHeader Streaming.

   If users previously used the generic client incorrectly (e.g., creating a generic client for each request), upgrading to Kitex v0.13.x would result in a large number of background goroutines being created, leading to goroutine leaks, even though streaming generics are not actually used.

   The v0.15.1 version only creates background goroutines when streaming generalization is actually used.

### **Code Generation Tool Kitex Tool**
1. **Strict Enum Value Checking**

   For scenarios where Thrift IDL defines enum value overflow, strict generation checks have been added, see [Kitex Tool Enum Type Checking Instructions](/docs/kitex/tutorials/code-gen/idl_enumeration_type) for details

   This change will cause some products to fail to generate because correctness already has issues, posing a significant risk to the service!

### **Special Change - Minor Services May Be Affected**
> Interface Breaking Change that has no impact on 99.9% of users

Kitex will ensure compatibility with normal usage patterns of internal users. However, individual users may have dependencies on definitions in the Kitex repository, and this version adjustment of Kitex will have an impact on these users.

This version has made minor adjustments to non-standard usage of `remote.Message`, `rpcinfo.RPCInfo` or `generic.Generic` interfaces. If there are special usages, they need to be adjusted to conform to the new version's interface definition.

1. `rpcinfo.RPCInfo().Invocation()` added `MethodInfo()` method, returning MethodInfo for the current RPC:
```diff
commit 62979e4b95e5a5ed73d0bfd9e218cfc61c5ce253
type Invocation interface {
        PackageName() string
        ServiceName() string
        MethodName() string
+       MethodInfo() serviceinfo.MethodInfo
        StreamingMode() serviceinfo.StreamingMode
        SeqID() int32
        BizStatusErr() kerrors.BizStatusErrorIface
}
```

2. `remote.Message` interface removed some redundant interfaces:
```diff
 // Message is the core abstraction for Kitex message.
 type Message interface {
        RPCInfo() rpcinfo.RPCInfo
-       ServiceInfo() *serviceinfo.ServiceInfo
-       SpecifyServiceInfo(svcName, methodName string) (*serviceinfo.ServiceInfo, error)
        Data() interface{}
        NewData(method string) (ok bool)
        MessageType() MessageType
        SetPayloadLen(size int)
        TransInfo() TransInfo
        Tags() map[string]interface{}
-       ProtocolInfo() ProtocolInfo
-       SetProtocolInfo(ProtocolInfo)
        PayloadCodec() PayloadCodec
        SetPayloadCodec(pc PayloadCodec)
        Recycle()
 }
```
Dependencies on `ProtocolInfo()` should be modified to rely on `remote.Message().RPCInfo().Config().TransportProtocol()`.

3. `generic.Generic` interface underwent significant adjustments:
```diff
 commit 024fedbc2da33956cd81cd0a8226f817e5eac777
 // Generic ...
 type Generic interface {
        Closer
-       // PayloadCodec return codec implement
-       // this is used for generic which does not need IDL
-       PayloadCodec() remote.PayloadCodec
        // PayloadCodecType return the type of codec
        PayloadCodecType() serviceinfo.PayloadCodec
-       // RawThriftBinaryGeneric must be framed
-       Framed() bool
-       // GetMethod is to get method name if needed
-       GetMethod(req interface{}, method string) (*Method, error)
+       // GenericMethod return generic method func
+       GenericMethod() serviceinfo.GenericMethodFunc
        // IDLServiceName returns idl service name
        IDLServiceName() string
-       // MessageReaderWriter returns reader and writer
-       // this is used for generic which needs IDL
-       MessageReaderWriter() interface{}
+       // GetExtra returns extra info by key
+       GetExtra(key string) interface{}
 }
```
- The `PayloadCodec()` interface was completely removed. This adjustment was made because, after Kitex generic interface supported the multi-service feature, it no longer relies on hijacking PayloadCodec to inject the generic codec; instead, it's implemented by hijacking Args/Results structs. Currently, only `generic.BinaryThriftGeneric()` relies on the old method, but this interface has been marked as deprecated. Please migrate to using `generic.BinaryThriftGenericV2()`, refer to [Generic Call User Guide](/docs/kitex/tutorials/advanced-feature/generic-call/basic_usage).
- `Framed() bool` is a deprecated interface because Kitex has defaulted to framed mode for clients since v0.13.*.
- `MessageReaderWriter` and `GetMethod` interfaces are merged into a unified `GenericMethod()` interface. The new unified interface returns a closure function that accepts context and method name as arguments and returns the corresponding method info. This method info includes the hijacked Args/Results parameters, thus implementing different types of generic call codec logic.

4. `remote.ServiceSearcher` Get/Set method changes, `codec.SetOrCheckMethodName` parameter adjustment:
```diff
commit a1008887b9ab4553a79ce82cf6d3db324c344977
-const keyServiceSearcher = "rpc_info_service_searcher"
+type keyServiceSearcher struct{}

-// GetServiceSearcher returns the service searcher from rpcinfo.RPCInfo.
-func GetServiceSearcher(ri rpcinfo.RPCInfo) ServiceSearcher {
-       svcInfo, _ := ri.Invocation().Extra(keyServiceSearcher).(ServiceSearcher)
-       return svcInfo
+// GetServiceSearcher returns the service searcher from context.
+func GetServiceSearcher(ctx context.Context) ServiceSearcher {
+       svcSearcher, _ := ctx.Value(keyServiceSearcher{}).(ServiceSearcher)
+       return svcSearcher
 }

-// SetServiceSearcher sets the service searcher to rpcinfo.RPCInfo.
-func SetServiceSearcher(ri rpcinfo.RPCInfo, svcSearcher ServiceSearcher) {
-       setter := ri.Invocation().(rpcinfo.InvocationSetter)
-       setter.SetExtra(keyServiceSearcher, svcSearcher)
+// WithServiceSearcher sets the service searcher to context.
+func WithServiceSearcher(ctx context.Context, svcSearcher ServiceSearcher) context.Context {
+       return context.WithValue(ctx, keyServiceSearcher{}, svcSearcher)
 }
```
- The old version set `ServiceSearcher` on rpcinfo; the new version moves it to context to optimize Get/Set performance.
```diff
commit a1008887b9ab4553a79ce82cf6d3db324c344977
// SetOrCheckMethodName is used to set method name to invocation.
-func SetOrCheckMethodName(methodName string, message remote.Message) error {
+func SetOrCheckMethodName(ctx context.Context, methodName string, message remote.Message) error {
```
- This simultaneously affects the definition of `codec.SetOrCheckMethodName`, adding `context.Context` as a parameter.


## **Full Change**

### Feature
* feat(ttstream): support ctx cancel and detailed canceled error by @DMwangnima in [#1821](https://github.com/cloudwego/kitex/pull/1821) | [#1859](https://github.com/cloudwego/kitex/pull/1859) | [#1856](https://github.com/cloudwego/kitex/pull/1856)
* feat(generic): support new thrift binary generic call api, server streaming generic call and unknown service or method handler by @jayantxie in [#1837](https://github.com/cloudwego/kitex/pull/1837) | [#1857](https://github.com/cloudwego/kitex/pull/1857)
* feat(grpc): support dump MaxConcurrentStreams of HTTP2 Client by @DMwangnima in [#1820](https://github.com/cloudwego/kitex/pull/1820)

### Fix
* fix(retry): shallow copy response to avoid data race by @jayantxie in [#1799](https://github.com/cloudwego/kitex/pull/1799) | [#1814](https://github.com/cloudwego/kitex/pull/1814)
* fix(lbcache): check the existence before new Balancer to prevent leakage by @ppzqh in [#1825](https://github.com/cloudwego/kitex/pull/1825)
* fix(generic): descriptor.HTTPRequest.GetParam nil pointer exception by @jayantxie in [#1827](https://github.com/cloudwego/kitex/pull/1827)
* fix(generic): fix generic write int range check by @HeyJavaBean in [#1861](https://github.com/cloudwego/kitex/pull/1861)
* fix(rpcinfo): protect bizErr and extra field of ri.Invocation by lock by @jayantxie in [#1850](https://github.com/cloudwego/kitex/pull/1850)
* fix(timeout): remove timer pool to avoid timer race issue by @jayantxie in [#1858](https://github.com/cloudwego/kitex/pull/1858)
* fix(tool): disable fast api for protobuf by @DMwangnima in [#1807](https://github.com/cloudwego/kitex/pull/1807)
* fix(tool): skip pb code gen for arg -use by @xiaost in [#1819](https://github.com/cloudwego/kitex/pull/1819)

### Optimize
* optimize(grpc): access metadata.MD without ToLower by @xiaost in [#1806](https://github.com/cloudwego/kitex/pull/1806)
* optimize(ttstream): lazy init cleaning task for ObjectPool to reduce the impact of lots of goroutines caused by creating too many Generic Client by @DMwangnima in [#1842](https://github.com/cloudwego/kitex/pull/1842)
* optimize(tool): remove string deepcopy because the string type is read-only in Go by @jayantxie in [#1832](https://github.com/cloudwego/kitex/pull/1832)

### Refactor
* refactor(ttstream): remove ttstream provider by @jayantxie in [#1805](https://github.com/cloudwego/kitex/pull/1805)
* refactor(rpcinfo): move service/method info from message to rpcinfo, remove protocol info from message and update min go version to 1.20 by @jayantxie in [#1818](https://github.com/cloudwego/kitex/pull/1818) | [#1855](https://github.com/cloudwego/kitex/pull/1855)
* refactor(server): remove service middleware and SupportedTransportsFunc api by @jayantxie in [#1839](https://github.com/cloudwego/kitex/pull/1839)
* refactor(server): remove useless TargetSvcInfo field by @jayantxie in [#1840](https://github.com/cloudwego/kitex/pull/1840)

### Chore
* chore: update dependencies of kitex to support go 1.25 and new features by @jayantxie @AsterDY in [#1848](https://github.com/cloudwego/kitex/pull/1848) | [#1834](https://github.com/cloudwego/kitex/pull/1834) | [#1862](https://github.com/cloudwego/kitex/pull/1862) | [#1836](https://github.com/cloudwego/kitex/pull/1836)
* chore: update version v0.15.0 by @jayantxie in [#1864](https://github.com/cloudwego/kitex/pull/1864)
* docs: fix broken link to blogs by @scientiacoder in [#1813](https://github.com/cloudwego/kitex/pull/1813)
* chore: support custom ctx key to pass to downstream in Service-Inline by @Duslia in [#1709](https://github.com/cloudwego/kitex/pull/1709)
