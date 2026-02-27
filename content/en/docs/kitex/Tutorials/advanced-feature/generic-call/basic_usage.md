---
title: "Basic Usage"
date: 2025-09-28
weight: 2
keywords: ["generic-call", "HTTP", "Thrift", "Protobuf", "Map", "JSON"]
description: "Complete guide to Kitex generic calls including binary forwarding, HTTP mapping, Map/JSON mapping, and Protobuf binary generic calls."
---

> For stream calls, please upgrade **github.com/cloudwego/kitex** to >= v0.14.1

## What is Generic Call?
In a standard Kitex Client -> Kitex Server request, the business code can directly construct a Go struct (the method's Request), call the corresponding method of the Kitex Client, perform serialization within the method, and then send it to the Server.

In some scenarios, the business code might receive:

- Already encoded binary data (e.g., in a proxy)
    - The data needs to be directly forwarded to the target Server without being decoded and reconstructed.

- HTTP Request, Go map, or JSON (e.g., in an ApiGateway)
    - The binary data resulting from the serialization of this data needs to be sent to the target Server.

In these scenarios, there may be multiple target downstream services/methods, and it is impossible (or unsuitable) for the business code to construct a Go struct for each piece of data. Therefore, Kitex's generic call capability is needed.

## Supported Scenarios
1. **Thrift Binary Forwarding**: For traffic forwarding scenarios.
2. **HTTP-Mapping Generic Call**: For API gateway scenarios (non-streaming only).
3. **Protobuf Binary Generic Call**
4. **Map-Thrift Mapping Generic Call**
5. **JSON-Mapping Generic Call**: Supports mapping to thrift / protobuf.

## Usage Examples

### IDLProvider
Generic calls require a runtime descriptor from the IDL, which is provided by an `IDLProvider`. Kitex currently offers two `IDLProvider` implementations.

#### Parsing Local Files
```go
import "github.com/cloudwego/kitex/pkg/generic"

 // equals to `kitex -I /idl ./Your_IDL_File_Path`
 p, err := generic.NewThriftFileProvider("./Your_IDL_File_Path", "/idl")
 if err != nil {
     panic(err)
 }
```

#### Parsing In-Memory Content (update cloudwego/kitex >= v0.13.0)
```go
// equals to `kitex -I . a/a.thrift`
p, err := NewThriftContentWithAbsIncludePathProvider("a/a.thrift", map[string]string{
    "a/a.thrift": `include "../b/b.thrift"
                      namespace go a.b.c`,
    "b/b.thrift": "namespace go a.b.c"})

err = p.UpdateIDL("a/a.thrift", map[string]string{
    "a/a.thrift": `include "b/b.thrift"
                      namespace go a.b.c`,
    "b/b.thrift": "namespace go a.b.c"})
```

The first argument of `NewThriftContentWithAbsIncludePathProvider` is the main IDL filename, and the second is a map from filenames to their content. This interface first tries to find included files using relative paths based on the main IDL file. If not found, it then uses absolute paths (i.e., directly looking up the IDL content using the filename as the key, as shown in `UpdateIDL`).

#### Testcase
Test case: https://github.com/cloudwego/kitex/blob/develop/pkg/generic/thriftidl_provider_test.go

### Thrift Binary Generic - V2 Interface
For proxy applications, Kitex provides a best practice guide, please refer to: [Proxy Application Development Guide](../proxy_application_development/).

Thrift Binary Generic Call V2 interface requires cloudwego/kitex >= v0.15.1.

#### Client Usage
##### Initialize Client
Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
import (
   "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
   "github.com/cloudwego/kitex/client"
   "github.com/cloudwego/kitex/transport"
   "github.com/cloudwego/kitex/pkg/transmeta"
)

// service is the downstream service name, while idlServiceName is the name defined in the thrift/pb idl.
genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGenericV2(idlServiceName),
    client.WithHostPorts(addr.String()),
    client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithMetaHandler(transmeta.ClientHTTP2Handler))
```

Note that the thrift binary generic interface must specify the IDL service name, which corresponds to a service defined within an IDL. A client can only access RPC methods of a specific IDL service.

If the client needs to support streaming generic calls, you need to confirm the streaming call protocol. By default, the generic client generated through the above method uses TTHeaderStreaming for streaming protocols, while non-streaming messages use Framed or TTHeaderFramed. If you need to configure streaming methods to use GRPC protocol without changing the protocol of non-streaming methods, add the following client options:

```go
cli, err := genericclient.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

##### Unary Generic Call
Note: Binary encoding does not encode the original Thrift request parameters (example: api.Request), but rather encapsulates the method parameters in KitexArgs (also a struct generated in kitex_gen from IDL, example: api.HelloEchoArgs).

```go
import (
    "github.com/bytedance/gopkg/lang/dirtmake"
    "github.com/cloudwego/frugal"
)

// Construct a request parameter MethodArgs
// Note: type generated under kitex_gen, MethodArgs encapsulates MethodReq
args := &HelloEchoArgs{Req: &Request{Message: "hello"}}

size := frugal.EncodedSize(args)
buf := dirtmake.Bytes(size, size)
_, err := frugal.EncodeObject(buf, nil, args)

// Obtain the encoded Thrift binary from some method (not containing thrift header), directly call the generic Client to request downstream
result, err:= genericCli.GenericCall(ctx, methodName, buf)

resp := &HelloEchoResult{}
_, err = frugal.DecodeObject(res.([]byte), resp)
```

##### Streaming Generic Call
Kitex streaming interface's binary payload is the value after raw request/response serialization, without Args/Results struct encapsulation, which differs from the unary interface. The streaming interface provides three streaming call modes. For detailed usage, see: [StreamX Basic Stream Programming](../../basic-feature/streamx/).

```go
import (
    "github.com/bytedance/gopkg/lang/dirtmake"
    "github.com/cloudwego/frugal"
)

req := &Request{Message: "hello"}

size := frugal.EncodedSize(req)
buf := dirtmake.Bytes(size, size)
_, err := frugal.EncodeObject(buf, nil, req)

stream, err := genericCli.BidirectionalStreaming(ctx, methodName)

err = stream.Send(stream.Context(), buf)
rbuf, err := stream.Recv(stream.Context())

resp := &Response{}
_, err = frugal.DecodeObject(rbuf.([]byte), resp)
```

#### Server Usage
Since the thrift binary generic V2 interface must强制 specify the idl service name, and the idl service name must be carried by header protocols such as ttheader/grpc header/ttstream header, traffic from protocols like framed/buffered cannot carry idl service name and may not hit these specified idl service names, which could cause server processing errors.

Therefore, for thrift binary generic servers, Kitex framework recommends using the built-in UnknownServiceOrMethodHandler. Detailed usage is as follows:

```go
import (
    "github.com/cloudwego/kitex/server"
    "github.com/cloudwego/kitex/server/genericserver"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

opts := []server.Option{
    server.WithListener(ln),
    server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
    server.WithMetaHandler(transmeta.ServerHTTP2Handler),
}

svr := server.NewServer(opts...)
err := genericserver.RegisterUnknownServiceOrMethodHandler(svr, &genericserver.UnknownServiceOrMethodHandler{
    DefaultHandler:   defaultUnknownHandler,
    StreamingHandler: streamingUnknownHandler,
})
```

The `genericserver.UnknownServiceOrMethodHandler` needs to be injected with server handlers as needed. If the server does not receive streaming/grpc traffic, only inject the DefaultHandler; otherwise, you also need to inject the StreamingHandler. At least one of these two handlers must be injected.

##### DefaultHandler
The DefaultHandler injects the server handler for handling ping-pong traffic (excluding grpc unary traffic), which is the familiar kitex standard RPC mode. This usually includes buffered/framed/ttheader traffic, supporting thrift and protobuf message protocols. Here's an example using thrift idl:

```go
import (
    "github.com/bytedance/gopkg/lang/dirtmake"
    "github.com/cloudwego/frugal"
)

func defaultUnknownHandler(ctx context.Context, service, method string, request interface{}) (response interface{}, err error) {
    args := &HelloEchoArgs{}
    if _, err = frugal.DecodeObject(request.([]byte), args); err != nil {
        return nil, err
    }
    req := args.Req
    if req == nil {
        return nil, fmt.Errorf("req is nil")
    }
    resp := runner.ProcessRequest(req)
    result := &HelloEchoResult{Success: resp}
    size := frugal.EncodedSize(result)
    buf := dirtmake.Bytes(size, size)
    _, err = frugal.EncodeObject(buf, nil, result)
    return buf, err
}
```

According to the handler method signature, service is the service name defined in the IDL. If the request does not carry IDL Service name, the parameter value is empty.

##### StreamingHandler
The StreamingHandler injects the server handler for all streaming methods (including grpc unary traffic), which is streaming RPC mode traffic. This usually includes grpc/ttstream traffic, supporting thrift and protobuf message formats. Here's an example using thrift:

```go
func streamingUnknownHandler(ctx context.Context, service, method string, stream generic.BidiStreamingServer) (err error) {
    for {
        request, err := stream.Recv(ctx)
        if err == io.EOF {
           return nil
        }
        if err != nil {
           return err
        }
        req := &Request{}
        if _, err = frugal.DecodeObject(request.([]byte), req); err != nil {
            return nil, err
        }
        resp := runner.ProcessRequest(req)
        size := frugal.EncodedSize(resp)
        buf := dirtmake.Bytes(size, size)
        _, err = frugal.EncodeObject(buf, nil, resp)
        err = stream.Send(ctx, buf)
        if err != nil {
           return err
        }
    }
}
```

Due to the lack of IDL Info, all binary traffic received by binary generic servers is treated as bidirectional streaming. Users need to ensure that the actual sending/receiving streaming mode is consistent with the IDL definition, otherwise it will cause processing errors on the peer side.

##### Unknown Handler
If the service itself has already defined services, such as creating a server through the generated code's NewServer function, or injecting services through json/map and other generic call interfaces:

```go
svr := servicea.NewServer()
// register multi services
err := serviceb.RegisterService(svr, new(ServiceBImpl))
```

Then when injecting unknown service handler again, all traffic that originally returned "unknown service" or "unknown method" errors when the client called this server will be received and processed by the unknownHandler.

```go
import "github.com/cloudwego/kitex/server/genericserver"

genericserver.RegisterUnknownServiceOrMethodHandler(svr, unknownHandler)
```

### [DEPRECATED] Thrift Binary Generic
This requires users to encode the data themselves or to forward message packets in traffic forwarding scenarios. Binary generic calls only support Framed or TTHeader requests, not Buffered Binary.

Note: Oneway methods are not supported.

#### Client-side Usage
##### Initialize the Client
Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
import (
   "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
   "github.com/cloudwego/kitex/client"
   "github.com/cloudwego/kitex/transport"
   "github.com/cloudwego/kitex/pkg/transmeta"
)

genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGeneric(),
    client.WithHostPorts(addr.String()),
    client.WithTransportProtocol(transport.TTHeader),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithMetaHandler(transmeta.ClientHTTP2Handler))
```

##### Generic Call
Usage can be referenced at: https://github.com/cloudwego/kitex/blob/develop/pkg/generic/binary_test/generic_test.go#L117

Note: Binary encoding does not encode the original Thrift request parameters (example: api.Request), but rather encapsulates the method parameters in KitexArgs (also a struct generated in kitex_gen from IDL, example: api.HelloEchoArgs).

```go
import (
    gopkg "github.com/cloudwego/gopkg/protocol/thrift"
)

// Use the thrift encoding/decoding package provided by kitex to construct an encoded Thrift binary ([]byte)
// Need to satisfy thrift encoding format thrift/thrift-binary-protocol.md

// Construct a request parameter MethodArgs
// Note: type generated under kitex_gen, MethodArgs encapsulates MethodReq
args := &HelloEchoArgs {
    Req: &Request {
        Message: "hello",
    },
}

var buf []byte
buf, err = gopkg.MarshalFastMsg(methodName, gopkg.CALL, /*seqID*/ 0, args)

// The above code is only for demonstrating how to get Thrift Binary
// The actual scenario for binary generic calls is often directly obtaining Thrift Binary

// Obtain the encoded Thrift binary from some method, directly call the generic Client to request downstream
result, err:= genericCli.GenericCall(ctx, methodName, buf)
```

Note: seqID is the request sequence number. The SeqID set by the user here will not take effect; the framework will generate and reset it, so just write 0. Server scenarios need to actively set seqID, specifically see the server section.

The returned result has a surface type of interface{}, actual type is []uint8, which is the thrift payload in the server response, and can be decoded to the KitexResult type.

#### Server Usage (if needed)
Used for servers that only do traffic forwarding.

The binary generic upstream client and downstream server do not need to be used in pairs. A binary generic server can accept normal Thrift requests, but the accepted protocol must be Framed or TTHeader, not Buffered Binary.

Reason: Binary generic does not parse Thrift packets, so it needs protocols with headers to handle them.

If the client passes the correct thrift encoded binary, it can access normal Thrift servers.

Note the usage in the following scenario:
Scenario: normal client -> [generic server-> generic client]-> normal server, you need to ensure that the packet returned by the generic server to the upstream has consistent seqID, otherwise it will cause upstream errors.

Handling method: Get the upstream seqID through `generic.GetSeqID(buff)`, after the generic server receives the buff returned by the generic client, reset the seqID of the data packet returned to the upstream through `generic.SetSeqID(seqID, transBuff)`.

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/server"
    "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    g := generic.BinaryThriftGeneric()
    svr := genericserver.NewServer(&GenericServiceImpl{}, g)
    err := svr.Run()
    if err != nil {
            panic(err)
    }
}

type GenericServiceImpl struct {}

// GenericCall ...
func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
    // thrift protocol binary format, reference: thrift/thrift-binary-protocol.md
    reqBuf := request.([]byte)
    // method name is already parsed
    // e.g.
    seqID, err := generic.GetSeqID(reqBuf)
    if err != nil {
        // theoretically impossible, request packet is illegal
    }
    // Assume proxy scenario - request target downstream
    respBuf, err:= genericCli.GenericCall(ctx, methodName, reqBuf)
    // Execute handler logic
    // Construct a respBuf: 1. Serialize the downstream return 2. // Can also be the return of binary generic call, satisfying "request passthrough" requirements
    generic.SetSeqID(seqID, respBuf)
    return respBuf, nil
}
```

### Protobuf Binary Generic Call
For proxy applications, Kitex provides a best practice guide, please refer to: [Proxy Application Development Guide](../proxy_application_development/).

Protobuf Binary Generic Call supports streaming and non-streaming calls, requiring cloudwego/kitex >= v0.15.1.

#### Client Usage
##### Initialize Client
Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
import (
   "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
   "github.com/cloudwego/kitex/client"
   "github.com/cloudwego/kitex/transport"
   "github.com/cloudwego/kitex/pkg/transmeta"
)

g := generic.BinaryPbGeneric(serviceName, packageName)
genericCli, err := genericclient.NewClient(service, g,
    client.WithHostPorts(addr.String()),
    client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithMetaHandler(transmeta.ClientHTTP2Handler))
```

Where serviceName and packageName correspond to the service name and package name defined in the idl, such as "Mock" and "protobuf/pbapi" in the following pb idl.

```protobuf
syntax = "proto3";
package pbapi;

option go_package = "protobuf/pbapi";

message MockReq {
  string message = 1;
}

message MockResp {
  string message = 1;
}

service Mock {
  rpc UnaryTest (MockReq) returns (MockResp) {}
  rpc ClientStreamingTest (stream MockReq) returns (MockResp) {}
  rpc ServerStreamingTest (MockReq) returns (stream MockResp) {}
  rpc BidirectionalStreamingTest (stream MockReq) returns (stream MockResp) {}
}
```

If the client needs to support streaming generic calls, you need to confirm the streaming call protocol. By default, the generic client generated through the above method uses TTHeaderStreaming for streaming protocols, while non-streaming messages use Framed or TTHeaderFramed. If you need to configure to use GRPC protocol, add the following client options:

```go
genericclient.NewClient("service", generic.BinaryThriftGeneric(), client.WithTransportProtocol(transport.GRPC))
```

##### Generic Call
The request/response or stream message passed in generic calls are the results after protobuf serialization. After the generic client is initialized, it provides 4 streaming mode call methods. For detailed streaming usage, see: [StreamX Basic Stream Programming](../../basic-feature/streamx/).

```go
// unary
resp, err := genericCli.GenericCall(ctx, "UnaryTest", buf)
// client streaming
stream, err := genericCli.ClientStreaming(ctx, "ClientStreamingTest")
// server streaming
stream, err := genericCli.ServerStreaming(ctx, "ServerStreamingTest", buf)
// bidi streaming
stream, err := genericCli.BidirectionalStreaming(ctx, "BidirectionalStreamingTest")
```

Detailed usage example: https://github.com/cloudwego/kitex-tests/blob/main/generic/binarypb/generic_test.go

#### Server Usage
Since the protobuf binary generic interface must specify the idl service name, and the idl service name must be carried by header protocols such as ttheader/grpc header/ttstream header, traffic from protocols like framed/buffered (kitex-protobuf) cannot carry idl service name and may not hit these specified idl service names, which could cause server processing errors.

Therefore, for protobuf binary generic servers, the recommended usage is to use the built-in UnknownServiceOrMethodHandler. For its usage, please refer to the thrift binary generic - server usage section. The usage of protobuf and thrift is completely consistent, only the message encoding format differs.

#### Unknown Handler
For unknown handler, also refer to thrift binary generic - unknown handler.

### HTTP Mapping Generic Call

Note: Only supports generic clients, converting HTTP Request to Thrift request, and will convert downstream Thrift return to HTTP Response.

Kitex now supports higher performance generic call implementation, usage see [Generic Call Access DynamicGo Guide](../generic-call-dynamicgo/).

#### Generic Call Example (data format is json)
**YOUR_IDL.thrift**
```thrift
namespace go http

struct ReqItem{
    1: optional i64 id(go.tag = "json:\"id\"")
    2: optional string text
}

struct BizRequest {
    1: optional i64 v_int64(api.query = 'v_int64', api.vd = "$>0&&$<200")
    2: optional string text(api.body = 'text')
    3: optional i32 token(api.header = 'token')
    4: optional map<i64, ReqItem> req_items_map (api.body='req_items_map')
    5: optional ReqItem some(api.body = 'some')
    6: optional list<string> req_items(api.query = 'req_items')
    7: optional i32 api_version(api.path = 'action')
    8: optional i64 uid(api.path = 'biz')
    9: optional list<i64> cids(api.query = 'cids')
    10: optional list<string> vids(api.query = 'vids')
}

struct RspItem{
    1: optional i64 item_id
    2: optional string text
}

struct BizResponse {
    1: optional string T                             (api.header= 'T')
    2: optional map<i64, RspItem> rsp_items           (api.body='rsp_items')
    3: optional i32 v_enum                       (api.none = '')
    4: optional list<RspItem> rsp_item_list            (api.body = 'rsp_item_list')
    5: optional i32 http_code                         (api.http_code = '')
    6: optional list<i64> item_count (api.header = 'item_count')
}

service BizService {
    BizResponse BizMethod1(1: BizRequest req)(api.get = '/life/client/:action/:biz', api.baseurl = 'ib.snssdk.com', api.param = 'true')
    BizResponse BizMethod2(1: BizRequest req)(api.post = '/life/client/:action/:biz', api.baseurl = 'ib.snssdk.com', api.param = 'true', api.serializer = 'form')
    BizResponse BizMethod3(1: BizRequest req)(api.post = '/life/client/:action/:biz/other', api.baseurl = 'ib.snssdk.com', api.param = 'true', api.serializer = 'json')
}
```

**Request**
Type: *generic.HTTPRequest

**Response**
Type: *generic.HTTPResponse

```go
package main

import (
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/transport"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // Local file idl parsing
    // YOUR_IDL_PATH thrift file path: example ./idl/example.thrift
    // includeDirs: specify include paths, default uses relative path of current file to find includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct http type generic call
    g, err := generic.HTTPThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("service", g,
        client.WithHostPorts(addr.String()),
        client.WithTransportProtocol(transport.TTHeader),
        client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
        client.WithMetaHandler(transmeta.ClientHTTP2Handler))
    if err != nil {
        panic(err)
    }
    // Construct request
    body := map[string]interface{}{
                "text": "text",
                "some": map[string]interface{}{
                        "id":   1,
                        "text": "text",
                },
                "req_items_map": map[string]interface{}{
                        "1": map[string]interface{}{
                                "id":   1,
                                "text": "text",
                        },
                },
        }
    data, err := json.Marshal(body)
    if err != nil {
        panic(err)
    }
    url := "http://example.com/life/client/1/1?v_int64=1&req_items=item1,item2,itme3&cids=1,2,3&vids=1,2,3"
    req, err := http.NewRequest(http.MethodGet, url, bytes.NewBuffer(data))
    if err != nil {
        panic(err)
    }
    req.Header.Set("token", "1")
    customReq, err := generic.FromHTTPRequest(req) // Considering that business may use third-party http request, you can construct conversion function yourself
    // customReq *generic.HTTPRequest
    // Since the method for http generic is obtained from http request through bam rules, just fill in empty
    resp, err := cli.GenericCall(ctx, "", customReq)
    realResp := resp.(*generic.HTTPResponse)
    realResp.Write(w) // Write back ResponseWriter, used for http gateway
}
```

### Map Mapping Generic Call
Map mapping generic call means that users can directly construct Map request parameters or returns according to the specification, and Kitex will complete Thrift encoding and decoding accordingly.

Note: For users with high performance requirements, consider [Using Thrift Dynamic Reflection to Improve Generic Call Performance](../generic-call-reflection/).

#### Map Construction
Kitex will strictly validate the field names and types constructed by users according to the given IDL. Field names only support string type corresponding to Map Key (map key优先取json tag定义的值，其次取字段名，参考 特别说明 - JSON泛化 一节), and the type mapping of field Value is shown in the table below.

For returns, the Response's Field ID and type will be validated, and the corresponding Map Key will be generated according to the Field Name of the IDL.

#### Type Mapping
Golang 与 Thrift IDL 类型映射如下：

**Write Mapping**

| Golang Type | Thrift IDL Type |
|-------------|-----------------|
| bool | bool |
| int8, byte | i8, byte |
| int16 | i16 |
| int32 | i32, i16, i8 |
| int64 | i64 |
| float64 | double, i64, i32, i16, i8 |
| string | string,binary |
| []byte | binary,string |
| []interface{} | list/set |
| map[interface{}]interface{} | map |
| map[string]interface{} | struct |
| int32 | enum |

**Read Mapping**

| Thrift IDL Type | Golang Type (read) | Remarks |
|---------------|-------------------|---------|
| bool | bool | |
| i8, | int8 | |
| byte | byte | |
| i16 | int16 | |
| i32 | int32 | |
| i64 | int64 | |
| double | float64 | |
| string | string | |
| binary | []byte | Default return is String, if you need to return []byte, you need to set through SetBinaryWithByteSlice. |
| list/set | []interface{} | |
| map | map[interface{}]interface{} | |
| struct | map[string]interface{} | |
| enum | int32 | |

```go
g, err := generic.MapThriftGeneric(p)
err = generic.SetBinaryWithByteSlice(g, true)
```

#### Data Example
Take the following IDL as an example:

```thrift
enum ErrorCode {
    SUCCESS = 0
    FAILURE = 1
}

struct Info {
    1: map<string,string> Map
    2: i64 ID
}

struct EchoRequest {
    1: string Msg
    2: i8 I8
    3: i16 I16
    4: i32 I32
    5: i64 I64
    6: binary Binary
    7: map<string,string> Map
    8: set<string> Set
    9: list<string> List
    10: ErrorCode ErrorCode
    11: Info Info

    255: optional Base Base
}
```

Construct the request as follows:

```go
req := map[string]interface{}{
                "Msg":    "hello",
                "I8":     int8(1),
                "I16":    int16(1),
                "I32":    int32(1),
                "I64":    int64(1),
                "Binary": []byte("hello"),
                "Map": map[interface{}]interface{}{
                        "hello": "world",
                },
                "Set":       []interface{}{"hello", "world"},
                "List":      []interface{}{"hello", "world"},
                "ErrorCode": int32(1),
                "Info": map[string]interface{}{
                        "Map": map[interface{}]interface{}{
                                "hello": "world",
                        },
                        "ID": int64(232324),
                },
                //Note:传入形如 ([]interface{})(nil) 格式的value也会被视为空值进行编码
        }
```

#### Client Usage
Streaming calls on the client side require cloudwego/kitex >= v0.14.1.

##### Client Initialization
Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
package main

import (
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/transport"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // Local file idl parsing
    // YOUR_IDL_PATH thrift file path: example ./idl/example.thrift
    // includeDirs: specify include paths, default uses relative path of current file to find includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct map request and return type generic call
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("service", g,
        client.WithHostPorts(addr.String()),
        client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
        client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
        client.WithMetaHandler(transmeta.ClientHTTP2Handler))
    if err != nil {
        panic(err)
    }
}
```

If the client needs to support streaming generic calls, you need to confirm the streaming call protocol. By default, the generic client generated through the above method uses TTHeaderStreaming for streaming protocols, while non-streaming messages use Framed or TTHeaderFramed. If you need to configure streaming methods to use GRPC protocol without changing the protocol of non-streaming methods, add the following client options:

```go
cli, err := genericclient.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

##### Generic Call
The request/response or stream message passed in generic calls are map[string]interface{} type. After the generic client is initialized, it provides 4 streaming mode call methods. For detailed streaming usage, see: [StreamX Basic Stream Programming](../../basic-feature/streamx/).

**Request**
Type: map[string]interface{}

**Response**
Type: map[string]interface{}

```go
// uanry
resp, err := cli.GenericCall(ctx, "ExampleMethod", map[string]interface{}{
    "msg": "hello", // keys should be the same as defined in json tag
}) // resp is a map[string]interface{}

// client streaming
stream, err := genericCli.ClientStreaming(ctx, "ClientStreamingTest")
// server streaming
stream, err := genericCli.ServerStreaming(ctx, "ServerStreamingTest", map[string]interface{}{
    "msg": "hello", // keys should be the same as defined in json tag
})
// bidi streaming
stream, err := genericCli.BidirectionalStreaming(ctx, "BidirectionalStreamingTest")
```

Detailed usage example: https://github.com/cloudwego/kitex-tests/blob/main/generic/map/client_test.go

#### Server Usage
For servers using map generic calls with streaming interfaces, please ensure cloudwego/kitex >= v0.15.1.

**Request**
Type: map[string]interface{}

**Response**
Type: map[string]interface{}

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/server"
    "github.com/cloudwego/kitex/server/genericserver"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // Local file idl parsing
    // YOUR_IDL_PATH thrift file path: e.g. ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct map request and return type generic call
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    // Old generic call interface, only supports ping pong
    svc := genericserver.NewServer(new(GenericServiceImpl), g,
        server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
        server.WithMetaHandler(transmeta.ServerHTTP2Handler))
    // v2 generic call interface, supports streaming
    svc := genericserver.NewServerV2(utils.ServiceV2Iface2ServiceV2(&GenericServiceImplV2{}), g,
        server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
        server.WithMetaHandler(transmeta.ServerHTTP2Handler))
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
    // resp is a map[string]interface{}
}
```

Detailed usage can be referenced at https://github.com/cloudwego/kitex-tests/blob/main/generic/map/server.go#L81C6-L81C24

#### Special Notes - Map Generic
- The response's field id and type will be validated and the corresponding map key will be generated according to the idl's field name. The field id and type here need to be consistent with the idl definition, otherwise it will lead to undefined behavior;
- If you confirm that all map types defined in thrift have string type keys, and you do not want to use map[interface{}]interface{} type parameters to construct/parse messages, you can use MapThriftGenericForJSON to construct generic;

(Note: Kitex v1.17.*~v1.19.* versions introduced a bug that caused this interface to fail, see MapThriftGenericForJSON does not take effect)

For empty structs, generic calls will default to generating an empty map rather than an empty struct, meaning its subfields will not appear in this map. If you need to set subfields in an empty map at the same time, you can use EnableSetFieldsForEmptyStruct.

### JSON Mapping Generic Call
JSON mapping generic call means that users can directly construct JSON String request parameters or returns according to the specification, and Kitex will complete Thrift encoding and decoding accordingly.

Note: Kitex now supports higher performance generic call implementation, usage see [Generic Call Access DynamicGo Guide](../generic-call-dynamicgo/).

#### JSON Construction
Unlike MAP generic calls which strictly validate the field names and types constructed by users, JSON generic calls will convert the user's request parameters according to the given IDL, without requiring users to specify explicit types such as int32 or int64.

For Response, the Field ID and type will be validated, and the corresponding JSON Field will be generated according to the Field Name of the IDL.

Currently supports Kitex-Thrift and Kitex-Protobuf as downstream for calls

#### JSON<>Thrift Generic
##### Type Mapping
Golang 与 Thrift IDL 类型映射如下：

| Golang Type | Thrift IDL Type | Note |
|-------------|-----------------|------|
| bool | bool | |
| int8 | i8 | |
| int16 | i16 | |
| int32 | i32 | |
| int64 | i64 | |
| float64 | double | |
| string | string | |
| []byte | binary | binary construction requires base64 encoding |
| []interface{} | list/set | |
| map[interface{}]interface{} | map | |
| map[string]interface{} | struct | |
| int32 | enum | |

##### Data Example
Take the following IDL as an example:

```thrift
enum ErrorCode {
    SUCCESS = 0
    FAILURE = 1
}

struct Info {
    1: map<string,string> Map
    2: i64 ID
}

struct EchoRequest {
    1: string Msg
    2: i8 I8
    3: i16 I16
    4: i32 I32
    5: i64 I64
    6: map<string,string> Map
    7: set<string> Set
    8: list<string> List
    9: ErrorCode ErrorCode
    10: Info Info

    255: optional Base Base
}
```

Construct the request as follows:

```json
{
  "Msg": "hello",
  "I8": 1,
  "I16": 1,
  "I32": 1,
  "I64": 1,
  "Map": "{\"hello\":\"world\"}",
  "Set": ["hello", "world"],
  "List": ["hello", "world"],
  "ErrorCode": 1,
  "Info": "{\"Map\":\"{\"hello\":\"world\"}\", \"ID\":232324}"
}
```

#### Client Usage
Streaming calls require cloudwego/kitex >= v0.14.1.

##### Client Initialization
Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
package main

import (
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/transport"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // Local file idl parsing
    // YOUR_IDL_PATH thrift file path: example ./idl/example.thrift
    // includeDirs: specify include paths, default uses relative path of current file to find includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct JSON request and return type generic call
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("service", g,
        client.WithHostPorts(addr.String()),
        client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
        client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
        client.WithMetaHandler(transmeta.ClientHTTP2Handler))
    if err != nil {
        panic(err)
    }
}
```

If the client needs to support streaming generic calls, you need to confirm the streaming call protocol. By default, the generic client generated through the above method uses TTHeaderStreaming for streaming protocols, while non-streaming messages use Framed or TTHeaderFramed. If you need to configure streaming methods to use GRPC protocol without changing the protocol of non-streaming methods, add the following client options:

```go
cli, err := genericclient.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

##### Generic Call
The request/response or stream message passed in generic calls are JSON string type. After the generic client is initialized, it provides 4 streaming mode call methods. For detailed streaming usage, see: [StreamX Basic Stream Programming](../../basic-feature/streamx/).

**Request**
Type: JSON string

**Response**
Type: JSON string

```go
// unary
resp, err := cli.GenericCall(ctx, "ExampleMethod", "{\"Msg\": \"hello\"}") // resp is a JSON string
// client streaming
stream, err := genericCli.ClientStreaming(ctx, "ClientStreamingTest")
// server streaming
stream, err := genericCli.ServerStreaming(ctx, "ServerStreamingTest", "{\"Msg\": \"hello\"}")
// bidi streaming
stream, err := genericCli.BidirectionalStreaming(ctx, "BidirectionalStreamingTest")
```

Detailed usage example: https://github.com/cloudwego/kitex-tests/blob/main/generic/streamxjson/generic_test.go

#### Server Usage
For servers using json generic calls with streaming interfaces, please ensure cloudwego/kitex >= v0.15.1.

**Request**
Type: JSON string

**Response**
Type: JSON string

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/server"
    "github.com/cloudwego/kitex/server/genericserver"
    "github.com/cloudwego/kitex/pkg/transmeta"
)

func main() {
    // Local file idl parsing
    // YOUR_IDL_PATH thrift file path: e.g. ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct JSON request and return type generic call
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    // Old generic call interface, only supports ping pong
    svc := genericserver.NewServer(new(GenericServiceImpl), g,
        server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
        server.WithMetaHandler(transmeta.ServerHTTP2Handler))
    // v2 generic call interface, supports streaming
    svc := genericserver.NewServerV2(utils.ServiceV2Iface2ServiceV2(&GenericServiceImplV2{}), g,
        server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
        server.WithMetaHandler(transmeta.ServerHTTP2Handler))
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
    // resp is a JSON string
}
```

Detailed usage can be referenced at https://github.com/cloudwego/kitex-tests/blob/main/generic/json/server.go#L84

#### Special Notes
Since JSON generic currently uses gjson, it will forcibly convert each field of the user's request according to the IDL (https://github.com/cloudwego/kitex/blob/develop/pkg/generic/thrift/write.go#L130), so when the user's field type is passed incorrectly, it will be replaced with the default value. For example: "test" field in IDL requires i64, but request contains {"test":"abc"}, this situation will not report an error now, but will be modified to {"test":0}. This problem will be more strictly limited when switching to dynamicgo.

By setting environment variables, you can choose whether to globally enable using go.tag values as JSON keys, which also applies to Map generic calls.

```bash
# Use original Key as JSON generic or Map generic call Key, disable the use of go.tag Key
KITEX_GENERIC_GOTAG_ALIAS_DISABLED = True
```

Starting from cloudwego/kitex@v0.12.0, go.tag can be disabled through generic.WithGoTagDisabled option. This allows separately specifying whether to disable go.tag annotations for client/server generic calls.

Example:

```go
// when you use ThriftFileProvider
p, err := generic.NewThriftFileProviderWithOption(path, []generic.ThriftIDLProviderOption{generic.WithGoTagDisabled(true)})

// when you use ThriftContentProvider
p, err := generic.NewThriftContentProvider(serviceContent, includes, generic.WithGoTagDisabled(true))

// when you use ThriftContentWithAbsIncludePathProvider
p, err := generic.NewThriftContentWithAbsIncludePathProvider(path, includes, generic.WithGoTagDisabled(true))
```

#### JSON<>Protobuf Generic
Currently only targets KitexProtobuf protocol. Pass in IDL Provider and optional Option parameters, return Protobuf JSON generic call object, Option parameters see Generic Call Access DynamicGo Guide.

##### Type Mapping
Golang 与 Proto IDL 类型映射如下：

Additionally supports lists and dictionaries in JSON, mapping them to repeated V and map<K,V> in protobuf. Does not support special types in protobuf, such as Enum, oneof.

##### Example IDL
```protobuf
syntax = "proto3";
package api;
// The greeting service definition.
option go_package = "api";

message Request {
  string message = 1;
}

message Response {
  string message = 1;
}

service Echo {
  rpc EchoPB (Request) returns (Response) {}
}
```

##### Client
```go
package main

import (
        "context"
        dproto "github.com/cloudwego/dynamicgo/proto"
        "github.com/cloudwego/kitex/client"
        "github.com/cloudwego/kitex/client/genericclient"
        "github.com/cloudwego/kitex/pkg/generic"
        "github.com/cloudwego/kitex/pkg/klog"
        "github.com/cloudwego/kitex/transport"
        "github.com/cloudwego/kitex/pkg/transmeta"
)

const serverHostPort = "127.0.0.1:9999"

func main() {
        var err error

        path := "./YOUR_IDL_PATH"

        // Create Pb IDL Provider
        dOpts := dproto.Options{}
        p, err := generic.NewPbFileProviderWithDynamicGo(path, context.Background(), dOpts)
        if err != nil {
                panic(err)
        }

        // Create Generic client
        g, err := generic.JSONPbGeneric(p)
        if err != nil {
                panic(err)
        }

        var opts []client.Option
        opts = append(opts, client.WithHostPorts(serverHostPort))
        opts = append(opts, client.WithTransportProtocol(transport.TTHeader))
        opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))
        opts = append(opts, client.WithMetaHandler(transmeta.ClientHTTP2Handler))

        cli, err := genericclient.NewClient("server_name_for_discovery", g, opts...)
        if err != nil {
                panic(err)
        }

        jReq := `{"message": "hello"}`

        ctx := context.Background()

  // JRsp type is JSON string
        jRsp, err := cli.GenericCall(ctx, "EchoPB", jReq)
        klog.CtxInfof(ctx, "genericJsonCall: jRsp(%T) = %s, err = %v", jRsp, jRsp, err)
}
```

##### Server
```go
package main

import (
        "context"
        dproto "github.com/cloudwego/dynamicgo/proto"
        "github.com/cloudwego/kitex/pkg/generic"
        "github.com/cloudwego/kitex/pkg/klog"
        "github.com/cloudwego/kitex/server"
        "github.com/cloudwego/kitex/server/genericserver"
        "github.com/cloudwego/kitex/pkg/transmeta"
        "net"
)

const serverHostPort = "127.0.0.1:9999"

func WithServiceAddr(hostPort string) server.Option {
        addr, _ := net.ResolveTCPAddr("tcp", hostPort)
        return server.WithServiceAddr(addr)
}

type GenericEchoImpl struct{}

func (g *GenericEchoImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
        buf := request.(string)
        return buf, nil
}

func main() {
        var opts []server.Option
        opts = append(opts, WithServiceAddr(serverHostPort))
        opts = append(opts, server.WithMetaHandler(transmeta.ServerTTHeaderHandler))
        opts = append(opts, server.WithMetaHandler(transmeta.ServerHTTP2Handler))

        path := "./YOUR_IDL_PATH"

        dOpts := dproto.Options{}
        p, err := generic.NewPbFileProviderWithDynamicGo(path, context.Background(), dOpts)

        if err != nil {
                panic(err)
        }
        g, err := generic.JSONPbGeneric(p)

        opts = append(opts, WithServiceAddr(serverHostPort))

        svr := genericserver.NewServer(new(GenericEchoImpl), g, opts...)

        if err := svr.Run(); err != nil {
                klog.Infof(err.Error())
        }
}
```

### Performance Benchmark Comparison
The following test results use complex nested structures as benchmark payloads, with concurrency controlled at 100, server allocated 4 cores Intel(R) Xeon(R) Gold 5118 CPU @ 2.30GHz, benchmark code link.

| Generic Type | TPS | TP99 | TP999 | Server CPU AVG | Client CPU AVG | Throughput differences (compared to non-generic) |
|-------------|-----|------|-------|----------------|----------------|---------------------------------------------|
| Non-generic | 147006 | 1.60ms | 3.45ms | 391.48 | 544.83 | 0% |
| Map generic | 78104 | 3.58ms | 21.88ms | 392.62 | 509.70 | -47% |
| JSON generic-No dynamicgo | 19647 | 21.49ms | 61.52ms | 392.20 | 494.30 | -86% |
| HTTP generic-No dynamicgo | 136093 | 2.57ms | 5.18ms | 369.61 | 1329.26 | -8% |

Json / http generic support using dynamicgo for higher performance, the following are performance test results under 2k qps, 100 concurrency, 10k package size. Server allocated 4 cores Intel (R) Xeon (R) Gold 5118 CPU @2.30GHz.

| Generic Type | With dynamicgo | TPS | TP99 | TP999 | Throughput differences |
|-------------|---------------|-----|------|-------|---------------------|
| JSON generic | no | 2466.90 | 141.38ms | 206.25ms | 0% |
| | yes | 9179.28 | 34.75ms | 80.75ms | +272% |
| HTTP generic | no | 8338.20 | 90.92ms | 139.31ms | 0% |
| | yes | 27243.95 | 9.57ms | 23.76ms | +227% |

Note: During the above testing process, map/json generic are enabled simultaneously on client/server, http generic only supports client side so it is only enabled on client side. Since the benchmark only limits the server CPU upper limit, please pay attention to client cpu overhead when comparing results.

### FAQ
**Q：Do generic calls need to reference IDL?**

- Binary stream forwarding: No need
- HTTP/Map/JSON: Need

Because the request only contains field names, IDL is needed to provide the mapping relationship of "field name -> field ID". The serialized thrift binary only contains field IDs.

**Q：Will the framework do corresponding monitoring and reporting when using binary stream forwarding?**

Yes, it will.

**Q: "missing version in Thrift Message"**

This indicates that the passed buff is not correctly encoded Thrift, please confirm the usage.

Note: Binary encoding does not encode the original Thrift request parameters (example: api.Request), but rather encapsulates method parameters in XXXArgs (example: api.HelloEchoArgs).

**Q: Does it support protobuf?**

Currently map generic supports it, json generic plans to support it.

**Q：How to check if annotation key is standardized in HTTP generic calls?**

You can use the Parse method under pkg/generic/thrift/parse.go to check, if it's not a key in BAM specification, it will return error.

**Q：Do generic calls support default values defined in idl?**

Kitex map/http/json generic supports setting default values defined in idl when reading, as in the following example idl file:

```thrift
struct BaseElem {
        1: optional i32 a,
}

struct Request {
    1: optional byte a = 0,
    2: optional i32 b = 0,
    3: optional double c = 5.1,
    4: optional string d = "123",
    5: optional list< BaseElem> e = [{"a":34}]
    5: optional map<i32, BaseElem> f = {12: {"a": 34}}
}
```

When encoding requests containing the above default values to the peer,
- For map generic, it will automatically add the above field names as keys, default values as values k-v pairs;
- For json generic, it will include k-v pairs with defined default values in the encoded json string;
- For http generic, it will set default values at response annotation fields.

**Q：For fields modified by optional, the generated type carries pointers, does the value of Map generic also need to use pointers?**

No need.

**Q：If multiple services are defined in idl file, how to handle them in generic calls?**

Each generic client/server defaults to using the last service definition, you can specify parsing specific service through the following code:

```go
import "github.com/cloudwego/kitex/pkg/generic"

path := "json_test/idl/example_multi_service.thrift"
opts := []ThriftIDLProviderOption{WithIDLServiceName("ExampleService")}
p, err := NewThriftFileProviderWithOption(path, opts)
```

**Q: Server reports error "[ReadString] the string size greater than buf length"**

It may be that the client and server have idl differences, such as inconsistent field types.

**Q：map generic call byte type field panics in writeInt8 function**
```
github.com/cloudwego/kitex/pkg/generic/thrift.writeInt8(...)
        /.../github.com/cloudwego/kitex@v0.4.4/pkg/generic/thrift/write.go:312 +0xb4
```
Reason: thriftgo aligns with apache thrift implementation, will convert byte type fields in IDL to int8 type in go, so old version cloudwego/kitex (<0.6.0) does not have adaptation for byte type in writeInt8.

Suggestion:
- Client side: Upgrade to new version: cloudwego/kitex >= 0.6.0 (or)
- Keep old version: Use int(byteVal) to assign values to this field when constructing map.
- Server side: Convert the int8 field to byte type (if there are values > 127)

Note: Converting between byte and int8 will not lose precision.

**Q: binary generic-server: "invalid trans buffer in binaryThriftCodec Unmarshal" ?**

The binary generic server received packets must have header size, because binary generic does not parse Thrift packets, packets without header size cannot be processed normally.

Internal services must enable ingress traffic proxy.

If you encounter this problem, the upstream client needs to configure the transmission protocol framed or ttheader, see how to specify transmission protocol.

**Q：How to inject different generic implementations for different idl services under one server?**

Support all generic call types except BinaryThriftGeneric, BinaryThriftGeneric only supports enabling through genericserver.NewServer or genericserver.NewServerWithServiceInfo.

```go
func runServer(ln net.Listener) error {
    svr := server.NewServer()

    p, err := generic.NewThriftFileProvider("idl/tenant.thrift")
    if err != nil {
       panic(err)
    }
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
       panic(err)
    }
    svr.RegisterService(generic.ServiceInfoWithGeneric(g), &MapGenericServiceImpl{})

    p, err = generic.NewThriftFileProvider("idl/echo.thrift")
    if err != nil {
       panic(err)
    }
    g, err = generic.JSONThriftGeneric(p)
    if err != nil {
       panic(err)
    }

    svr.RegisterService(generic.ServiceInfoWithGeneric(g), &JsonGenericServiceImpl{})

    return svr.Run()
}
```
