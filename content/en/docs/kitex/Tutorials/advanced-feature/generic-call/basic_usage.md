---
title: "Basic Usage"
date: 2024-01-24
weight: 2
keywords: ["generic-call", "HTTP", "Thrift"]
description: "Basic usage of generic call"
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
1. Thrift Binary Forwarding: For traffic forwarding scenarios (non-streaming only).
2. HTTP-Mapping Generic Call: For API gateway scenarios (non-streaming only).
3. Protobuf Binary Generic Call (supports streaming and non-streaming).
4. Map-Thrift Mapping Generic Call (supports streaming and non-streaming).
5. JSON-Mapping Generic Call (supports streaming and non-streaming, and supports mapping to thrift / protobuf).

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

### Thrift Binary Stream Forwarding
This requires users to encode the data themselves or to forward message packets in traffic forwarding scenarios. Binary generic calls only support Framed or TTHeader requests, not Buffered Binary.

Note: Oneway methods are not supported.

#### Client-side Usage
1. Initialize the Client

Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
import (
   genericclient "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
)

func NewGenericClient(service string) genericclient.Client {
    genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGeneric())
    // ...
    return genericCli
}
```

2. Generic Call

For usage, refer to https://github.com/cloudwego/kitex/blob/develop/pkg/generic/binary_test/generic_test.go#L117

Note:
- The binary encoding is not performed on the original Thrift request parameters (e.g., [api.Request](https://github.com/cloudwego/kitex-examples/blob/v0.2.0/hello/kitex_gen/api/hello.go#L12)), but on the **KitexArgs** that wrap the method parameters (also a struct generated from the IDL under `kitex_gen`, e.g., [api.HelloEchoArgs](https://github.com/cloudwego/kitex-examples/blob/v0.2.0/hello/kitex_gen/api/hello.go#L461)).

```go
import (
    "github.com/cloudwego/kitex/pkg/utils"
    gopkg "github.com/cloudwego/gopkg/protocol/thrift"
)

// The following uses the thrift codec package provided by kitex to construct an encoded Thrift binary ([]byte)
// It must conform to the Thrift encoding format [thrift/thrift-binary-protocol.md](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md#message)

// Construct a request parameter MethodArgs
// Note: This is a type generated under kitex_gen.MethodArgs wraps MethodReq. [Click here](https://github.com/cloudwego/kitex-examples/blob/v0.2.2/hello/kitex_gen/api/hello.go#L461) for an example.
args := &HelloEchoArgs{
    Req: &Request {
        Message: "hello",
    },
}

var buf []byte
buf, err := gopkg.MarshalFastMsg(methodName, gopkg.CALL, /*seqID*/ 0, args)

// The code above is for demonstration purposes only on how to get a Thrift Binary
// The actual scenario for binary generic calls is often to receive the Thrift Binary directly

// After obtaining the encoded Thrift binary in some way, directly call the generic Client to request the downstream service
result, err:= genericCli.GenericCall(ctx, methodName, buf)
```

Note:

1. `seqID` is the request sequence number. The `SeqID` set by the user here will not take effect; the framework will generate and reset it, so you can just write 0. In server-side scenarios, you need to set the `seqID` actively, see the server-side section for details.
2. The apparent type of the returned `result` is `interface{}`, but its actual type is `[]uint8`, which is the Thrift payload from the server response. It can be decoded into a `KitexResult` type.

#### Server-side Usage (if needed)
1. The server is used for services that only do traffic forwarding.
    - The upstream client for binary generic calls and the downstream server **do not need to be paired**. A binary generic server can accept normal Thrift requests, but the protocol must be Framed or TTHeader; **Buffered Binary is not supported**.
        - Reason: Binary generic calls do not decode the Thrift packet, so a protocol with a header is needed for processing.
    - If the client passes a **correctly thrift-encoded binary**, it can access a normal Thrift server.

2. Pay attention to the usage in the following scenario:
   Scenario: normal client -> [generic server -> generic client] -> normal server. You need to ensure that the `seqID` of the packet returned by the generic server to the upstream is consistent, otherwise it will cause an error on the upstream side.

   **Solution**: Get the upstream `seqID` via `generic.GetSeqID(buff)`. When the generic server receives the `buff` returned from the generic client, reset the `seqID` of the data packet returned to the upstream using `generic.SetSeqID(seqID, transBuff)`.

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    bgeneric "github.com/cloudwego/kitex/server/genericserver"
)

var genericCli genericclient.Client

func main() {
    genericCli = NewGenericClient("targetServiceName")
    g := generic.BinaryThriftGeneric()
    svr := bgeneric.NewServer(&GenericServiceImpl{}, g)
    err := svr.Run()
    if err != nil {
            panic(err)
    }
}

type GenericServiceImpl struct {}

// GenericCall ...
func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
    // For thrift protocol binary format, refer to: [thrift/thrift-binary-protocol.md](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md#message)
    reqBuf := request.([]byte)
    // The method name is already parsed
    // e.g. 
    seqID, err := generic.GetSeqID(reqBuf)
    if err != nil {
        // Theoretically impossible, the request packet is invalid
    }
    // If it's a proxy scenario - request the target downstream
    respBuf, err:= genericCli.GenericCall(ctx, methodName, reqBuf)
    // Execute handler logic
    // Construct a respBuf: 1. Serialize the downstream response 2. // It can also be the response from a binary generic call, satisfying the "request passthrough" requirement
    generic.SetSeqID(seqID, respBuf)
    return respBuf, nil
}

func NewGenericClient(service string) genericclient.Client {
    genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGeneric())
    // ...
    return genericCli
}
```

### HTTP-Mapping Generic Call

Note:

1. Only the generic client is supported, which converts an HTTP Request into a Thrift request and sends it, while also converting the downstream Thrift response into an HTTP Response.
2. Kitex has supported a higher-performance implementation of generic calls. For usage, see [Guide to Accessing dynamicgo for Generic Calls](https://www.cloudwego.io/zh/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/).

#### Generic Call Example (JSON data format)
`YOUR_IDL.thrift`

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

- Request

Type: *generic.HTTPRequest

- Response

Type: *generic.HTTPResponse

```go
package main

import (
    bgeneric "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
)

func main() {
    // Parse local IDL file
    // YOUR_IDL_PATH thrift file path: e.g., ./idl/example.thrift
    // includeDirs: specify include paths, defaults to using relative paths from the current file to find includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct an HTTP-type generic call
    g, err := generic.HTTPThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := bgeneric.NewClient("service", g, opts...)
    if err != nil {
        panic(err)
    }
    // Construct a request
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
    customReq, err := generic.FromHTTPRequest(req) // Considering that the business might use a third-party http request, you can construct a conversion function yourself
    // customReq *generic.HTTPRequest
    // Since the method for http generic call is obtained from the http request through bam rules, just leave it empty
    resp, err := cli.GenericCall(ctx, "", customReq)
    realResp := resp.(*generic.HTTPResponse)
    realResp.Write(w) // Write back to ResponseWriter, for http gateway
}
```

#### Generic Call Example (Protobuf data format)
For usage, refer to: https://github.com/cloudwego/kitex/pull/638/files#diff-bd83f811aba6a67986c66e48a85a0566579ab64757ea75ba8f9a39dcb363d1d5

**Note the following points:**

1. Fields in the thrift struct modified with `api.body` must correspond one-to-one with the field IDs in the proto file; other fields are not mapped to proto and have no requirements.
2. Nesting structs in thrift IDL default values is not supported.
3. The method corresponding to thrift in the proto file must have the same name.

An example of an extended annotation is adding `api.source='not_body_struct'`, which indicates that a certain field itself does not have a mapping to an HTTP request field, and it is necessary to traverse its subfields to get the corresponding value from the HTTP request. The usage is as follows:

```thrift
struct Request {
    1: optional i64 v_int64(api.query = 'v_int64')
    2: optional CommonParam common_param (api.source='not_body_struct')
}

struct CommonParam {
    1: optional i64 api_version (api.query = 'api_version')
    2: optional i32 token(api.header = 'token')
}
```

The extension method is as follows:

```go
func init() {
        descriptor.RegisterAnnotation(new(apiNotBodyStruct))
}

// Implement descriptor.Annotation
type apiNotBodyStruct struct {
}

func (a *apiNotBodyStruct) Equal(key, value string) bool {
        return key == "api.source" && value == "not_body_struct"
}

func (a *apiNotBodyStruct) Handle() interface{} {
        return newNotBodyStruct
}

type notBodyStruct struct{}

var newNotBodyStruct descriptor.NewHTTPMapping = func(value string) descriptor.HTTPMapping {
        return &notBodyStruct{}
}

// get value from request
func (m *notBodyStruct) Request(req *descriptor.HTTPRequest, field *descriptor.FieldDescriptor) (interface{}, bool) {
        // The role of the not_body_struct annotation is equivalent to "step into", so return req itself to let the current field continue to query the required value from the Request
        return req, true
}

// set value to response
func (m *notBodyStruct) Response(resp *descriptor.HTTPResponse, field *descriptor.FieldDescriptor, val interface{}) {
}
```

### Protobuf Binary Generic Call
Protobuf binary generic calls support both streaming and non-streaming calls, currently only for client-side use, and require `cloudwego/kitex >= v0.14.1`.

#### Client-side Usage
1. Initialize the Client

Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
import (
   genericclient "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
)

func NewGenericClient(service string) genericclient.Client {
    g := generic.BinaryPbGeneric(serviceName, packageName)
    genericCli, err := genericclient.NewClient(service, generic.BinaryThriftGeneric())
    // ...
    return genericCli
}
```

Here `serviceName` and `packageName` correspond to the service name and package name defined in the IDL, such as `"Mock"` and `"protobuf/pbapi"` in the following pb idl.

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

If the client needs to support streaming generic calls, the streaming protocol must be confirmed. By default, the streaming protocol for the generic client generated in this way is `TTHeaderStreaming`, and non-streaming messages are `Framed` or `TTHeaderFramed`. **If you need to configure it to use the GRPC protocol, add the following client options**:

```go
genericclient.NewClient("service", generic.BinaryThriftGeneric(), client.WithTransportProtocol(transport.GRPC))
```

2. Generic Call

The request/response or stream messages passed in a generic call are the result of protobuf serialization. After the generic client is initialized, it provides 4 streaming mode call methods. For detailed usage of streaming, see: [StreamX Basic Stream Programming](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/streamx/stream+basic+programming/).

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

Detailed usage example: https://github.com/cloudwego/kitex-tests/blob/main/generic/streamxbinarypb/generic_test.go

### Map-Mapping Generic Call
Map-mapping generic call means that users can directly construct Map request parameters or returns according to the specification, and Kitex will perform the corresponding Thrift encoding and decoding.

#### Map Construction
Kitex will strictly verify the field names and types constructed by the user according to the given IDL. Field names only support string types corresponding to Map Keys (the map key preferentially takes the value defined by the json tag, followed by the field name, refer to the **Special Note - JSON Generic** section). The type mapping of field Values is shown in the table below.

For the return, it will verify the Field ID and type of the Response, and generate the corresponding Map Key according to the Field Name in the IDL.

#### Type Mapping
The mapping between Golang and Thrift IDL types is as follows:

**Write Mapping**

| **Golang Type**<br> | **Thrift IDL Type**<br>     |
| --- |---------------------------|
| bool<br> | bool<br>                  |
| int8, byte<br> | i8, byte<br>              |
| int16<br> | i16<br>                   |
| int32<br> | i32, i16, i8<br>          |
| int64<br> | i64<br>                   |
| float64<br> | double, i64, i32, i16, i8<br> |
| string<br> | string,binary<br>         |
| []byte<br> | binary,string<br>         |
| []interface{} <br> | list/set<br>              |
| map[interface{}]interface{}<br> | map<br>                   |
| map[string]interface{}<br> | struct<br>                |
| int32<br> | enum<br>                  |

**Read Mapping**

| **Thrift IDL Type**<br> | **Golang Type (read)**<br>         | **Note**<br> |
|-----------------------|---------------------------------| --- |
| bool<br>              | bool<br>                        | <br> |
| i8, <br>              | int8<br>                        | <br> |
| byte<br>              | byte<br>                        | <br> |
| i16<br>               | int16<br>                       | <br> |
| i32<br>               | int32<br>                       | <br> |
| i64<br>               | int64<br>                       | <br> |
| double<br>            | float64<br>                     | <br> |
| string<br>            | string<br>                      | <br> |
| binary<br>            | []byte<br>                      | By default, it returns a String. If you need to return []byte, you need to set it through [SetBinaryWithByteSlice](https://github.com/cloudwego/kitex/blob/develop/pkg/generic/generic.go#L159).<br>g, err := generic.MapThriftGeneric(p)<br>err = generic.SetBinaryWithByteSlice(g, true)<br> |
| list/set<br>          | []interface{} <br>              | <br> |
| map<br>               | map[interface{}]interface{}<br> | <br> |
| struct<br>            | map[string]interface{}<br>      | <br> |
| enum<br>              | int32<br>                       | <br> |

#### Data Example
Taking the following IDL as an example:

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
                // Note: A value in the format of ([]interface{})(nil) will also be treated as a null value for encoding.
        }
```

`base.thrift`

```cpp
namespace py base
namespace go base
namespace java com.bytedance.thrift.base

struct TrafficEnv {
    1: bool Open = false,
    2: string Env = "",
}

struct Base {
    1: string LogID = "",
    2: string Caller = "",
    3: string Addr = "",
    4: string Client = "",
    5: optional TrafficEnv TrafficEnv,
    6: optional map<string, string> Extra,
}

struct BaseResp {
    1: string StatusMessage = "",
    2: i32 StatusCode = 0,
    3: optional map<string, string> Extra,
}
```

`YOUR_IDL.thrift`

```thrift
include "base.thrift"
namespace go kitex.test.server

struct ExampleReq {
    1: required string Msg,
    255: base.Base Base,
}
struct ExampleResp {
    1: required string Msg,
    255: base.BaseResp BaseResp,
}
service ExampleService {
    ExampleResp ExampleMethod(1: ExampleReq req),
}
```

#### Client-side Usage (supports streaming and non-streaming calls)
Streaming calls require `cloudwego/kitex >= v0.14.1`.

1. Client Initialization

Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
package main

import (
   genericclient "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
)

func main() {
    // Parse local IDL file
    // YOUR_IDL_PATH thrift file path: e.g., ./idl/example.thrift
    // includeDirs: specify include paths, defaults to using relative paths from the current file to find includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct a map request and response type generic call
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("service", g)
    if err != nil {
        panic(err)
    }
}
```

If the client needs to support streaming generic calls, the streaming protocol must be confirmed. By default, the streaming protocol for the generic client generated in this way is `TTHeaderStreaming`, and non-streaming messages are `Framed` or `TTHeaderFramed`. **If you need to configure streaming methods to use the GRPC protocol without changing the protocol for non-streaming methods, add the following client options**:

```go
cli, err := genericclient.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

2. Generic Call

The request/response or stream messages passed in a generic call are of type `map[string]interface{}`. After the generic client is initialized, it provides 4 streaming mode call methods. For detailed usage of streaming, see: [StreamX Basic Stream Programming](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/streamx/stream+basic+programming/).

- **Request**

Type: map[string]interface{}

- **Response**

Type: map[string]interface{}

```go
// unary
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

Detailed usage example: https://github.com/cloudwego/kitex-tests/blob/main/generic/streamxmap/generic_test.go

#### Server-side Usage (non-streaming requests only)
- **Request**

Type: map[string]interface{}

- **Response**

Type: map[string]interface{}

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    bgeneric "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    // Parse local IDL file
    // YOUR_IDL_PATH thrift file path: e.g. ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct a map request and response type generic call
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    svc := bgeneric.NewServer(new(GenericServiceImpl), g, opts...)
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
    // resp is a map[string]interface{}
}

type GenericServiceImpl struct {
}

func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
        m := request.(map[string]interface{})
        fmt.Printf("Recv: %v\n", m)
        return  map[string]interface{}{
            "Msg": "world",
        }, nil
}
```

#### Special Note - Map Generic
1. It will verify the field ID and type of the response and generate the corresponding map key according to the field name in the IDL. The field ID and type here need to be consistent with the IDL definition; otherwise, it will lead to undefined behavior.
2. If you confirm that all map type keys defined in thrift are string type and you do not want to use `map[interface{}]interface{}` type parameters to construct/parse messages, you can use `MapThriftGenericForJSON` to construct the generic call.
3. For an **empty struct**, the generic call will generate an empty map by default instead of an empty struct, which means **its subfields will not appear in the map**. If you need to set its subfields in the empty map at the same time, you can use the setting [EnableSetFieldsForEmptyStruct](https://github.com/cloudwego/kitex/pull/1265/files#diff-605c96e826099f4fa61d7d4a328caa529da4097e99585917afa3c38cf291eb7bR206).

#### Map-Mapping Generic Serialization (generally no need to pay attention)
Main interfaces:

- Serialization

```go
func (m *WriteStruct) Write(ctx context.Context, out bufiox.Writer, msg interface{}, method string, isClient bool, requestBase *base.Base) error
```

- Deserialization

```go
func (m *ReadStruct) Read(ctx context.Context, method string, isClient bool, dataLen int, in bufiox.Reader) (interface{}, error)
```

- Use Case

```go
package main

import (
    "context"
    "fmt"

    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/gopkg/bufiox"
    "github.com/cloudwego/gopkg/protocol/thrift/base"
    "github.com/cloudwego/kitex/pkg/generic/thrift"
)

func main() {
    // Parse local IDL file
    // YOUR_IDL_PATH thrift file path: e.g. ./idl/example.thrift
    // includeDirs: specify include paths, defaults to using relative paths from the current file to find includes
    p, err := generic.NewThriftFileProvider("YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }

    // Get a reader writer from p
    var (
        rw         = thrift.NewStructReaderWriter(<-p.Provide())
        buf []byte = nil // Recommended to be nil
        req        = map[string]interface{}{"Msg": "hello"}
        w          = bufiox.NewBytesWriter(&buf)
    )

    // Serialize the request
    err = rw.Write(context.Background(), w, req, "ExampleMethod", true, &base.Base{LogID: "1"})
    if err != nil {
        panic(err)
    }

    w.Flush() // Important!!!
    fmt.Println("buf:", buf, len(buf), cap(buf))

    // Deserialize the request
    // If deserializing a response, then isClient = true
    r := bufiox.NewBytesReader(buf)
    req2, err := rw.Read(context.Background(), "ExampleMethod", false, len(buf), r)
    if err != nil {
        panic(err)
    }

    // req2: map[Base:map[Addr: Caller: Client: LogID:1] Msg:hello]
    fmt.Println("req2:", req2)
}
```

In Map generic serialization, you **need to call** `w.Flush()` after serializing the request. If the initial `len(buf)` > `len(serialized message)`, the message body will be at the end of `buf`. It is recommended to initialize `buf` as `nil`.

### JSON-Mapping Generic Call
JSON-mapping generic call means that users can directly construct JSON String request parameters or returns according to the specification, and Kitex will perform the corresponding Thrift encoding and decoding.

Note: Kitex has supported a higher-performance implementation of generic calls. For usage, see [Guide to Accessing dynamicgo for Generic Calls](https://www.cloudwego.io/zh/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/).

#### JSON Construction
Unlike Map generic calls, which strictly verify the field names and types constructed by the user, JSON generic calls will convert the user's request parameters according to the given IDL, without requiring the user to specify explicit types like int32 or int64.

For the Response, it will verify the Field ID and type, and generate the corresponding JSON Field according to the Field Name in the IDL.

Currently supports **Kitex-Thrift** and **Kitex-Protobuf** for downstream calls.

#### JSON<>Thrift Generic
##### Type Mapping
The mapping between Golang and Thrift IDL types is as follows:

| Golang Type<br> | Thrift IDL Type<br> | Note<br> |
| --- | --- | --- |
| bool<br> | bool<br> | <br> |
| int8<br> | i8<br> | <br> |
| int16<br> | i16<br> | <br> |
| int32<br> | i32<br> | <br> |
| int64<br> | i64<br> | <br> |
| float64<br> | double<br> |
| []byte<br> | binary<br> | binary construction requires base64 encoding<br>[Generic call binary type compatibility](https://bytedance.feishu.cn/docx/doxcnxkmeIRGVe6K5M0vVIAN5be)<br> |
| []interface{}<br> | list/set<br> | <br> |
| map[interface{}]interface{}<br> | map<br> | <br> |
| map[string]interface{}<br> | struct<br> | <br> |
| int32<br> | enum<br> | <br> |

##### Data Example
Taking the following IDL as an example:

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

```go
req := "{
  \"Msg\": \"hello\",
  \"I8\": 1,
  \"I16\": 1,
  \"I32\": 1,
  \"I64\": 1,
  \"Map\": \"{\"hello\":\"world\"}\",
  \"Set\": [\"hello\", \"world\"],
  \"List\": [\"hello\", \"world\"],
  \"ErrorCode\": 1,
  \"Info\": \"{\"Map\":\"{\"hello\":\"world\"}\", \"ID\":232324}\"
}"
```

Example IDL:

`base.thrift`

```thrift
namespace py base
namespace go base
namespace java com.xxx.thrift.base

struct TrafficEnv {
    1: bool Open = false,
    2: string Env = "",
}

struct Base {
    1: string LogID = "",
    2: string Caller = "",
    3: string Addr = "",
    4: string Client = "",
    5: optional TrafficEnv TrafficEnv,
    6: optional map<string, string> Extra,
}

struct BaseResp {
    1: string StatusMessage = "",
    2: i32 StatusCode = 0,
    3: optional map<string, string> Extra,
}
```

`example_service.thrift`

```go
include "base.thrift"
namespace go kitex.test.server

struct ExampleReq {
    1: required string Msg,
    255: base.Base Base,
}
struct ExampleResp {
    1: required string Msg,
    255: base.BaseResp BaseResp,
}
service ExampleService {
    ExampleResp ExampleMethod(1: ExampleReq req),
}
```

##### Client-side Usage (supports streaming and non-streaming calls)
Streaming calls require `cloudwego/kitex >= v0.14.1`.

1. Client Initialization

Note: **Do not** create a new Client for each request (as each client consumes extra resources). It is recommended to create one client for each downstream service when the process starts, or use a Client Pool indexed by the downstream service.

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
     bgeneric "github.com/cloudwego/kitex/client/genericclient"
)

func main() {
    // Parse local IDL file
    // YOUR_IDL_PATH thrift file path: e.g. ./idl/example.thrift
    // includeDirs: specify include paths, defaults to using relative paths from the current file to find includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct a JSON request and response type generic call
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := bgeneric.NewClient("service", g, opts...)
    if err != nil {
        panic(err)
    }
}
```

If the client needs to support streaming generic calls, the streaming protocol must be confirmed. By default, the streaming protocol for the generic client generated in this way is `TTHeaderStreaming`, and non-streaming messages are `Framed` or `TTHeaderFramed`. **If you need to configure streaming methods to use the GRPC protocol without changing the protocol for non-streaming methods, add the following client options**:

```go
cli, err := bgeneric.NewClient("service", g, client.WithTransportProtocol(transport.GRPCStreaming))
```

2. Generic Call

The request/response or stream messages passed in a generic call are of type JSON string. After the generic client is initialized, it provides 4 streaming mode call methods. For detailed usage of streaming, see: [StreamX Basic Stream Programming](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/streamx/stream+basic+programming/).

- **Request**

Type: JSON string

- **Response**

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

##### **Server-side Usage (non-streaming requests only)**
- **Request**

Type: JSON string

- **Response**

Type: JSON string

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    bgeneric "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    // Parse local IDL file
    // YOUR_IDL_PATH thrift file path: e.g. ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct a JSON request and response type generic call
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    svc := bgeneric.NewServer(new(GenericServiceImpl), g, opts...)
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
    // resp is a JSON string
}

type GenericServiceImpl struct {
}

func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
        // use jsoniter or other json parse sdk to assert request 
        m := request.(string)
        fmt.Printf("Recv: %v\n", m)
        return  "{\"Msg\": \"world\"}", nil
}
```

##### Special Note
- Since JSON generic currently uses gjson, it performs a forced conversion for each field of the user's request according to the IDL (https://github.com/cloudwego/kitex/blob/develop/pkg/generic/thrift/write.go#L130). Therefore, when the user passes the wrong field type, it will be replaced with a default value. For example, if the "test" field in the IDL requires i64, but the request is {"test":"abc"}, this situation will not currently report an error, but will be modified to {"test":0}. This issue will be more strictly restricted when switching to dynamicgo.

- You can choose whether to globally enable the use of the `go.tag` value as the json key by setting an environment variable. This also applies to Map generic calls.

```
# Use the original key as the key for JSON generic or Map generic calls, and disable the use of the go.tag key
KITEX_GENERIC_GOTAG_ALIAS_DISABLED = True
```

- Starting from cloudwego/kitex@v0.12.0, go.tag can be disabled via the `generic.WithGoTagDisabled` option. This allows specifying whether to disable the go.tag annotation for client/server generic calls individually.

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
Currently only for the **KitexProtobuf protocol**. Pass in the IDL Provider and optional Option parameters to return a Protobuf JSON generic call object. For Option parameters, see the Guide to Accessing DynamicGo for Generic Calls.

##### Type Mapping
The mapping between Golang and Proto IDL types is as follows:

| Protocol Buffers Type	| Golang Type |
| --- | --- |
| float | 	float32|
| double	| float64|
| int32	| int32|
| int64	| int64|
| uint32	| uint32|
| uint64	| uint64 |
| sint32	| int32|
| sint64	| int64|
| fixed32	| uint32|
| fixed64	| uint64|
| sfixed32	| int32|
| sfixed64	| uint64|
| bool	| bool|
| string	| string|
| bytes	| byte[]|

It also supports lists and dictionaries in JSON, mapping them to `repeated V` and `map<K,V>` in protobuf. Special types in protobuf, such as `Enum` and `oneof`, are not supported.

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

## Performance Benchmark Comparison
The following test results use a complex struct with multiple nests as the benchmark payload, with concurrency controlled at 100. The server is allocated a 4-core `Intel(R) Xeon(R) Gold 5118 CPU @ 2.30GHz`. The benchmark code can be found at this [link](https://github.com/cloudwego/kitex-benchmark/pull/57/files).

| **Generic Type**<br> | **TPS**<br><br> | **TP99**<br><br> | **TP999**<br><br> | **Server CPU AVG**<br> | **Client CPU AVG**<br> | **Throughput Difference (vs. no generic)**<br> |
| --- | --- | --- | --- | --- | --- | --- |
| **No Generic**<br> | 147006<br> | 1.60ms<br> | 3.45ms<br> | 391.48<br> | 544.83<br> | 0%<br> |
| **Map Generic**<br> | 78104<br> | 3.58ms<br> | 21.88ms<br> | 392.62<br> | 509.70<br> | -47%<br> |
| **JSON Generic - No dynamicgo**<br> | 19647<br> | 21.49ms<br> | 61.52ms<br> | 392.20<br> | 494.30<br> | -86%<br> |
| **HTTP Generic - No dynamicgo**<br> | 136093<br> | 2.57ms<br> | 5.18ms<br> | 369.61<br><br> | 1329.26<br> | -8%<br> |

Json / http generic supports using dynamicgo for higher performance. The following are the performance test results under 2k qps, 100 concurrency, and 10k packet size. The server is allocated a 4-core `Intel (R) Xeon (R) Gold 5118 CPU @2.30GHz`.

| **Generic Type**<br> | **With dynamicgo**<br> | **TPS**<br> | **TP99**<br> | **TP999**<br> | **Throughput differences**<br> |
| --- | --- | --- | --- | --- | --- |
| **json generic**<br> | no<br> | 2466.90<br> | 141.38ms<br> | 206.25ms<br> | 0%<br> |
| <br> | yes<br> | 9179.28<br> | 34.75ms<br> | 80.75ms<br> | +272%<br> |
| **http generic**<br><br> | no<br> | 8338.20<br> | 90.92ms<br> | 139.31ms<br> | 0%<br> |
| <br> | yes<br> | 27243.95<br> | 9.57ms<br> | 23.76ms<br> | +227%<br> |

## FAQ
### Q: Is it necessary to reference the IDL for generic calls?
- Binary stream forwarding: No
- HTTP/MAP/JSON: Yes
    - Because the request only contains field names, the IDL is needed to provide the mapping from "field name -> field ID". The serialized thrift binary only contains field IDs.

### Q: Will the framework do corresponding metrics reporting when using binary stream forwarding?
Yes, it will.

### Q: "missing version in Thrift Message"
This indicates that the passed buffer is not a correctly encoded Thrift buff. Please confirm the usage.
Note: The binary encoding is not performed on the original Thrift request (e.g., [api.Request](https://github.com/cloudwego/kitex-examples/blob/v0.2.0/hello/kitex_gen/api/hello.go#L12)) parameters, but on the **XXXArgs** that wrap the method parameters (e.g., [api.HelloEchoArgs](https://github.com/cloudwego/kitex-examples/blob/v0.2.0/hello/kitex_gen/api/hello.go#L461)).

### Q: Is protobuf supported?
Currently, map generic supports it, and json generic is planned to support it.

### Q: Does generic call support default values defined in the idl?
Kitex map/http/json generic supports setting default values defined in the idl when reading, as in the idl file in the following example:

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

When encoding a request containing the above default values to the peer,
- For map generic, it will automatically add k-v pairs with the above field names as keys and default values as values.
- For json generic, the encoded json string will contain the k-v pairs defined with default values.
- For http generic, it will set the default value at the field where the response annotation is located.

### Q: The generated type for a field modified with optional has a pointer. Does the value in map generic also need to be a pointer?
No.

### Q: There are multiple services defined in the idl file. How to handle this in generic calls?
Each generic client/server uses the last service definition by default. You can specify a particular service to parse with the following code:

```go
import "github.com/cloudwego/kitex/pkg/generic"

path := "json_test/idl/example_multi_service.thrift"
opts := []ThriftIDLProviderOption{WithIDLServiceName("ExampleService")}
p, err := NewThriftFileProviderWithOption(path, opts)
```

### Q: Server error "[ReadString] the string size greater than buf length"
It may be that the idl of the client and server are different, for example, the field types are inconsistent.

### Q: map generic call byte type field panics in writeInt8 function
> github.com/cloudwego/kitex/pkg/generic/thrift.writeInt8(...)
>         /.../github.com/cloudwego/kitex@v0.4.4/pkg/generic/thrift/write.go:312 +0xb4

**Reason**: thriftgo aligns with the implementation of apache thrift and converts all byte type fields in the IDL to int8 type in go. Therefore, older versions of kitex (<0.6.0) did not adapt for the byte type in `writeInt8`.

**Suggestion**:

1. Client side:
    - Upgrade to a new version: kitex >= 0.6.0 (or)
    - Keep the old version: use `int(byteVal)` to assign a value to the field when constructing the map.
2. Server side: convert the int8 field to byte type (if there are values > 127).

Note: Converting between byte and int8 does not lose precision.

### Q: binary generic-server: "invalid trans buffer in binaryThriftCodec Unmarshal" ?
The packet received by a binary generic server must have a header size, because binary generic does not parse the Thrift packet, and packets without a header size cannot be processed normally.
If you encounter this problem, the upstream client needs to configure the transport protocol to framed or ttheader. See [How to specify the transport protocol](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/protocol/transport_protocol/).

### Q: How to inject different generic implementations for different idl services under one server?
All generic call types **except BinaryThriftGeneric** are supported. BinaryThriftGeneric can only be enabled via `genericserver.NewServer` or `genericserver.NewServerWithServiceInfo`.

```
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
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
       panic(err)
    }

    svr.RegisterService(generic.ServiceInfoWithGeneric(g), &JsonGenericServiceImpl{})
    
    return svr.Run()
}
```
