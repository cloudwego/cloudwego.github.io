---
title: "Basic Usage"
date: 2024-01-24
weight: 2
keywords: ["generic-call", "HTTP", "Thrift"]
description: "generic call's basic usage"
---

## IDL Provider

Although generic calls do not require code generation based on IDL (Interface Definition Language), it is usually necessary to provide an IDL. Then, based on the IDL, data structures like JSON or Map are used to construct the corresponding RPC (Remote Procedure Call) request structures. (**Except for binary generic calls**)

In Kitex, the interface for IDL Provider is defined as follows:

```go
// DescriptorProvider provide service descriptor
type DescriptorProvider interface {
    Closer
    // Provide return a channel for provide service descriptors
    Provide() <-chan *descriptor.ServiceDescriptor
}
```

The usage of this interface is introduced in the later section "Basic Usage". Here, it is only necessary to understand **how to create** it.

Currently, Kitex offers two implementations of the IDL Provider. Users can choose to specify the IDL path or pass in the IDL content. Additionally, it is possible to extend the `generic.DescriptorProvider` interface according to your needs.

### Parsing IDL from Local Files

#### Thrift

There are two methods provided for parsing IDL from local files. Both methods are similar and require passing the IDL path and the paths of other IDLs referenced within it.

```go
p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
if err != nil {
    panic(err)
}

p, err := generic.NewThriftFileProviderWithDynamicGo("./YOUR_IDL_PATH")
if err != nil {
    panic(err)
}
```

The `generic.NewThriftFileProviderWithDynamicGo` integrates [dynamicgo](https://github.com/cloudwego/dynamicgo) for improved performance when processing RPC data. For more details, see the [dynamicgo integration guide](/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/).

#### Protobuf

A method is provided to parse local `proto` files, which requires passing the IDL path, `context.Context`, and optional `option` parameters. For detailed information about the parameters, please refer to [dynamicgo proto idl](https://github.com/cloudwego/dynamicgo/blob/main/proto/idl.go).

```go
p, err := NewPbFileProviderWithDynamicGo("./YOUR_IDL_PATH", context.Background())
if err != nil {
    panic(err)
}
```

### Parsing IDL from Memory

You can also directly parse the IDL content. Other IDLs referenced within the IDL need to be constructed into a map and passed in. The key should be the path of the referenced IDL, and the value should be the IDL content.

#### Thrift

A simple example (to minimize display, the path construction is not a real IDL):

```go
content := `
namespace go kitex.test.server
include "x.thrift"
include "../y.thrift"

service InboxService {}
`
path := "a/b/main.thrift"
includes := map[string]string{
   path:           content,
   "x.thrift": "namespace go kitex.test.server",
   "../y.thrift": `
   namespace go kitex.test.server
   include "z.thrift"
   `,
}

p, err := generic.NewThriftContentProvider(content, includes)
if err != nil {
    panic(err)
}

p, err := generic.NewThriftContentProviderWithDynamicGo(content, includes)
if err != nil {
    panic(err)
}
```

The `generic.NewThriftContentProviderWithDynamicGo` integrates [dynamicgo](https://github.com/cloudwego/dynamicgo) for improved performance when processing RPC data. For more details, see the [dynamicgo integration guide](/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/).

#### Protobuf

A simple example (to minimize display, the path construction is not a real IDL):

```go
content := `
syntax = "proto3";
package kitex.test.server;
option go_package = "test";

import "x.proto"

service Echo{}
`

path := "a/b/main.proto"
includes := map[string]string{
		path: content,
		"x.proto": `syntax = "proto3";
					package kitex.test.server;
					option go_package = "test";
					`,
}
p, err := NewPbContentProvider(content, includes)
if err != nil {
	panic(err)
}
```

#### Support for Absolute Path in include path Addressing

Currently, only Thrift supports this functionality.

For ease of constructing the IDL Map, you can also use absolute paths as keys with `generic.NewThriftContentWithAbsIncludePathProvider` or `generic.NewThriftContentWithAbsIncludePathProviderWithDynamicGo`.

```go
content := `
namespace go kitex.test.server
include "x.thrift"
include "../y.thrift"

service InboxService {}
`

path := "a/b/main.thrift"
includes := map[string]string{
   path:           content,
   "a/b/x.thrift": "namespace go kitex.test.server",
   "a/y.thrift": `
   namespace go kitex.test.server
   include "z.thrift"
   `,
   "a/z.thrift": "namespace go kitex.test.server",
}

p, err := generic.NewThriftContentWithAbsIncludePathProvider(content, includes)
if err != nil {
    panic(err)
}

p, err := generic.NewThriftContentWithAbsIncludePathProviderWithDynamicGo(content, includes)
if err != nil {
    panic(err)
}
```

The `generic.NewThriftContentWithAbsIncludePathProviderWithDynamicGo` integrates [dynamicgo](https://github.com/cloudwego/dynamicgo) for improved performance when processing RPC data. For more details, see the [dynamicgo integration guide](/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/).

In Kitex, the `generic.Generic` interface represents a generic call, with different implementations for different types of generic calls. A `Generic` instance is required when creating both clients and servers.

## Client-Side Interface

### Create Client

The client-side interfaces are all under the `github.com/cloudwego/kitex/client/genericclient ` package.

#### NewClient

Function signature: `func NewClient(destService string, g generic.Generic, opts ...client.Option) (Client, error)`

Description: This function takes the target service name, a Generic object, and optional Option parameters, returning a generic call client. For details on Option parameters, see [Client Option](/docs/kitex/tutorials/options/client_options/)

#### NewClientWithServiceInfo

Function signature: `func NewClientWithServiceInfo(destService string, g generic.Generic, svcInfo *serviceinfo.ServiceInfo, opts ...client.Option) (Client, error)`

Description: This function requires the target service name, a Generic object, custom service information, and optional Option parameters to return a generic call client. For details on Option parameters, see [Client Option](/docs/kitex/tutorials/options/client_options/)

## Server-Side Interface

### Generic Call Service Object

In Kitex, the `generic.Service` interface represents a generic call service.

```go
// Service generic service interface
type Service interface {
    // GenericCall handle the generic call
    GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error)
}
```

As long as the `GenericCall` method is implemented, it can be used as a generic call service instance for creating a generic call server.

### Create Server

The server-side interfaces are all under the `github.com/cloudwego/kitex/client/genericclient ` package.

#### NewServer

Function signature: `func NewServer(handler generic.Service, g generic.Generic, opts ...server.Option) server.Server`

Description: This function requires a generic call service instance, a Generic object, and optional Option parameters to return a Kitex server. For details on Option parameters, see [Server Option](/docs/kitex/tutorials/options/server_options/)

#### NewServerWithServiceInfo

Function signature: `func NewServerWithServiceInfo(handler generic.Service, g generic.Generic, svcInfo *serviceinfo.ServiceInfo, opts ...server.Option) server.Server`

Description: This function takes a generic call service instance, a Generic object, custom service information, and optional Option parameters to return a Kitex server. For details on Option parameters, see [Server Option](/docs/kitex/tutorials/options/server_options/)

## Generic Call Scenarios

Kitex supports generic calls in the following four scenarios:

1. Thrift:

   - Binary generic call

   - HTTP mapping generic call

   - Map mapping generic call

   - JSON mapping generic call

2. Protobuf:

   - JSON mapping generic call
   - Protobuf -> Thrift generic call

### Generic

```go
type Generic interface {
    Closer
    // PayloadCodec return codec implement
    PayloadCodec() remote.PayloadCodec
    // PayloadCodecType return the type of codec
    PayloadCodecType() serviceinfo.PayloadCodec
    // RawThriftBinaryGeneric must be framed
    Framed() bool
    // GetMethod to get method name if need
    GetMethod(req interface{}, method string) (*Method, error)
}
```

The core method of `Generic` is the codec implementation. Different `Generic` implementations distinguish themselves through various codec implementations. Different codecs are expanded based on the implementation of `thriftCodec`.

### Binary Generic

Use case: For scenarios like middle-end services, where it is possible to forward the received original Thrift protocol packets as binary streams to the target service.

The following method is provided to create a binary generic call `Generic` instance.

#### BinaryThriftGeneric

Function signature: `func BinaryThriftGeneric() Generic`

Description: Returns a binary generic call object.

### HTTP Generic Call

Use case: For scenarios like API gateways, where HTTP requests can be parsed and then forwarded as RPC requests to backend services.

The following method is provided to create an HTTP generic call `Generic` instance.

#### HTTPThriftGeneric

Function signature: `func HTTPThriftGeneric(p DescriptorProvider, opts ...Option) (Generic, error)`

Description: Takes an IDL Provider and optional Option parameters to return an HTTP generic call object. Details of Option parameters are provided later in the text.

#### HTTPPbThriftGeneric

Function signature: `func HTTPPbThriftGeneric(p DescriptorProvider, pbp PbDescriptorProvider) (Generic, error)`

Description: Takes a Thrift IDL Provider and a Protobuf IDL Provider to return an HTTP generic call object capable of parsing body in Protobuf format.

### JSON Generic Call

Use case: For scenarios like interface testing platforms, where users' constructed JSON data is parsed and sent as requests to RPC services to obtain response results.

The following method is provided to create a JSON generic call `Generic` instance.

#### JSONThriftGeneric

Function signature: `func JSONThriftGeneric(p DescriptorProvider, opts ...Option) (Generic, error)`

Description: Takes an IDL Provider and optional Option parameters to return an Thrift JSON generic call object. Details of Option parameters are provided later in the text.

#### MapThriftGenericForJSON

Function signature: `func MapThriftGenericForJSON(p DescriptorProvider) (Generic, error)`

Description: Takes an IDL Provider to return a Thrift JSON generic call object, which internally uses Map generic calls for implementation.

#### JSONPbGeneric

Function signature: `func JSONPbGeneric(p PbDescriptorProviderDynamicGo, opts ...Option) (Generic, error)`

Description: Currently only applicable to the KitexProtobuf protocol. Takes an IDL Provider and optional Option parametersand optional Option parameters to return a Protobuf JSON generic call object. Details of Option parameters are provided later in the text.

### Map Generic Call

Use case: Scenarios involving dynamic parameter adjustment and verifying certain functionalities during rapid prototyping stages.

The following method is provided to create a Map generic call `Generic` instance.

#### MapThriftGeneric

Function signature: `func MapThriftGeneric(p DescriptorProvider) (Generic, error)`

Description: Takes an IDL Provider to return a Map generic call object.

### Option

Kitex offers Option parameters for customizing configurations when creating a Generic, including the following:

#### WithCustomDynamicGoConvOpts

Function signature:`func WithCustomDynamicGoConvOpts(opts *conv.Options) Option`

Description: Customizes `conv.Option` configurations when using `dynamicgo`. Configuration details can be found at [dynamicgo conv](https://github.com/cloudwego/dynamicgo/tree/main/conv). For details on integrating dynamicgo, see the [dynamicgo integration guide](/docs/kitex/tutorials/advanced-feature/generic-call/generic-call-dynamicgo/).

#### UseRawBodyForHTTPResp

Function signature: `func UseRawBodyForHTTPResp(enable bool) Option`

Description: In HTTP mapping generic calls, this sets whether to use `HTTPResponse.RawBody` as the response result. If this feature is disabled, the response result will only be stored in `HTTPResponse.Body`

## Thrift Usage Example

### Binary Generic Call

#### Client

For client-side binary generic calls, request parameters need to be encoded using the [Thrift encoding format](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md#message).

> **Note**: The binary encoding is not for the original Thrift request parameters, but for the method parameter's **XXXArgs**. Refer to [test cases](https://github.com/cloudwego/kitex/blob/develop/pkg/generic/generic_test.go) for examples.

Kitex provides a Thrift encoding/decoding package `github.com/cloudwego/kitex/pkg/utils.NewThriftMessageCodec`。

```go
import (
   "github.com/cloudwego/kitex/client/genericclient"
   "github.com/cloudwego/kitex/pkg/generic"
   "github.com/cloudwego/kitex/pkg/utils.NewThriftMessageCodec"
)

func NewGenericClient(destServiceName string) genericclient.Client {
    genericCli := genericclient.NewClient(destServiceName, generic.BinaryThriftGeneric())
    return genericCli
}

func main(){
    rc := utils.NewThriftMessageCodec()
		buf, err := rc.Encode("Test", thrift.CALL, 100, args)
		// generic call
  	genericCli := NewGenericClient("actualServiceName")
		resp, err := genericCli.GenericCall(ctx, "actualMethod", buf)
}
```

#### Server

The client and server for binary generic calls in Kitex **are not necessarily paired**. As long as the client provides parameters in the **correct Thrift binary encoding format**, it can request normal Thrift interface services.

The binary generic server only supports Framed or TTHeader requests, not Buffered Binary. The client needs to specify this through an Option, such as: `client.WithTransportProtocol(transport.Framed)`.

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
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
    // request is thrift binary
    reqBuf := request.([]byte)
    // e.g.
    fmt.Printf("Method: %s\n", method))
    result := xxx.NewMockTestResult()
    result.Success = &resp
    respBuf, err = rc.Encode(mth, thrift.REPLY, seqID, result)

    return respBuf, nil
}
```

### HTTP Mapping Generic Call

HTTP generic calls involve constructing Thrift interface parameters based on an HTTP Request and initiating a generic call. Currently, this is only applicable to the client side. The Thrift IDL must follow the interface mapping specifications, detailed in [Thrift-HTTP Mapping's IDL Standards](https://www.cloudwego.cn/docs/kitex/tutorials/advanced-feature/generic-call/thrift_idl_annotation_standards/).

#### IDL Example

```thrift
namespace go http

struct ReqItem {
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

struct RspItem {
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

#### Generic Call Example

```go
package main

import (
    "github.com/cloudwego/kitex/client/genericclient"
    "github.com/cloudwego/kitex/pkg/generic"
)

func main() {
		// Local file IDL parsing
    // YOUR_IDL_PATH is the path to the Thrift file, for example, ./idl/example.thrift
    // includeDirs: specifies include paths, defaulting to the current file's relative path for finding includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Construct an HTTP type generic call
    g, err := generic.HTTPThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("destServiceName", g	)
    if err != nil {
        panic(err)
    }
    // Construct a request (for testing purposes); in actual applications, you can directly use the original HTTP Request
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
    // Kitex generic currently directly supports the standard library's http.Request; using hertz requires a request conversion
    // httpReq, err := adaptor.GetCompatRequest(hertzReqCtx)
    req.Header.Set("token", "1")
    customReq, err := generic.FromHTTPRequest(req) // Considering that businesses might use third-party HTTP requests, you can create your own conversion function
    // customReq *generic.HttpRequest
    // Since the HTTP generic method is obtained from the HTTP request via [Thrift-HTTP Mapping's IDL Standards], it's okay to leave it empty
    resp, err := cli.GenericCall(ctx, "", customReq)
    realResp := resp.(*generic.HTTPResponse)
    realResp.Write(w) // Write back to ResponseWriter, used for HTTP gateway
}
```

#### Annotation Extension

For example, adding an annotation `xxx.source='not_body_struct'` indicates that a certain field itself does not map to any HTTP request field and requires iterating over its subfields to obtain corresponding values from the HTTP request.

Usage is as follows:

```thrift
struct Request {
    1: optional i64 v_int64(api.query = 'v_int64')
    2: optional CommonParam common_param (xxx.source='not_body_struct')
}

struct CommonParam {
    1: optional i64 api_version (api.query = 'api_version')
    2: optional i32 token(api.header = 'token')
}
```

The extension method is as follows:

```go
func init() {
        descriptor.RegisterAnnotation(new(notBodyStruct))
}

// Implementing descriptor.Annotation
type notBodyStruct struct {
}

func (a * notBodyStruct) Equal(key, value string) bool {
        return key == "xxx.source" && value == "not_body_struct"
}

// Handle currently supports four types: HttpMapping, FieldMapping, ValueMapping, Router
func (a * notBodyStruct) Handle() interface{} {
        return newNotBodyStruct
}

type notBodyStruct struct{}

var newNotBodyStruct descriptor.NewHTTPMapping = func(value string) descriptor.HTTPMapping {
        return &notBodyStruct{}
}

// get value from request
func (m *notBodyStruct) Request(req *descriptor.HttpRequest, field *descriptor.FieldDescriptor) (interface{}, bool) {
        return req, true
}

// set value to response
func (m *notBodyStruct) Response(resp *descriptor.HTTPResponse, field *descriptor.FieldDescriptor, val interface{}) {
}
```

### Map Mapping Generic Call

Map mapping generic calls refer to the ability of users to construct Map parameters according to specifications, and Kitex will handle the Thrift encoding/decoding accordingly.

Kitex strictly validates the field names and types constructed by the user based on the given IDL. Field names are only supported as string types corresponding to Map Keys, and the mapping of field Value types can be seen in the type mapping table.

For Responses, the Field ID and type will be validated, and the corresponding Map Key will be generated based on the IDL's Field Name.

#### Type Mapping

Golang and Thrift IDL Type Mapping is as follows:

| **Golang Type**             | **Thrift IDL Type** |
| --------------------------- | ------------------- |
| bool                        | bool                |
| int8                        | i8                  |
| int16                       | i16                 |
| int32                       | i32                 |
| int64                       | i64                 |
| float64                     | double              |
| string                      | string              |
| []byte                      | binary              |
| []interface{}               | list/set            |
| map[interface{}]interface{} | map                 |
| map[string]interface{}      | struct              |
| int32                       | enum                |

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

The request construction is as follows:

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
        }
```

#### Example IDL

`base.thrift`:

```thrift
base.thrift
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

`example_service.thrift`:

```thrift
example_service.thrift
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

#### Client

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
)

func main() {
    // Local file IDL parsing
    // YOUR_IDL_PATH is the path to the Thrift file, for example, ./idl/example.thrift
    // includeDirs: Specifies the include path, defaults to the current file's relative path for finding includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Constructing a map type generic call
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("destServiceName", g)
    if err != nil {
        panic(err)
    }
    // 'ExampleMethod' the method name must be included in the IDL definition
    // resp type is map[string]interface{}
    resp, err := cli.GenericCall(ctx, "ExampleMethod", map[string]interface{}{
        "Msg": "hello",
    })
}
```

#### Server

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    // Local file IDL parsing
    // YOUR_IDL_PATH is the path to the Thrift file, e.g., ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Constructing a generic call with map request and return types
    g, err := generic.MapThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    svc := genericserver.NewServer(new(GenericServiceImpl), g)
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
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

### JSON Mapping Generic Call

JSON mapping generic calls refer to the ability of users to construct JSON String request parameters or returns directly according to specifications, and Kitex will handle encoding/decoding accordingly.

Unlike the strict validation of field names and types in Map generic calls, JSON generic calls in Kitex transform user request parameters based on the given IDL, eliminating the need for users to specify explicit types, such as int32 or int64.

For Responses, the Field ID and type will be validated, and the corresponding JSON field will be generated based on the IDL's Field Name.

#### Type Mapping

The type mapping between Golang and Thrift IDL is as follows:

| **Golang Type**             | **Thrift IDL Type** |
| --------------------------- | ------------------- |
| bool                        | bool                |
| int8                        | i8                  |
| int16                       | i16                 |
| int32                       | i32                 |
| int64                       | i64                 |
| float64                     | double              |
| string                      | string              |
| ~~[]byte~~                  | ~~binary~~          |
| []interface{}               | list/set            |
| map[interface{}]interface{} | map                 |
| map[string]interface{}      | struct              |
| int32                       | enum                |

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

The request construction is as follows:

```go
req := {
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

#### Example IDL

`base.thrift`:

```
base.thrift
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

`example_service.thrift`：

```
example_service.thrift
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

#### Client

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/client/genericclient"
)

func main() {
    // Local file IDL parsing
    // YOUR_IDL_PATH is the path to the Thrift file, for example, ./idl/example.thrift
    // includeDirs: Specifies the include path, defaults to the current file's relative path for finding includes
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Constructing a JSON type generic call
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    cli, err := genericclient.NewClient("destServiceName", g)
    if err != nil {
        panic(err)
    }
    // 'ExampleMethod' the method name must be included in the IDL definition
    // resp type is JSON string
    resp, err := cli.GenericCall(ctx, "ExampleMethod", "{\"Msg\": \"hello\"}")

}
```

#### Server

```go
package main

import (
    "github.com/cloudwego/kitex/pkg/generic"
    "github.com/cloudwego/kitex/server/genericserver"
)

func main() {
    // Local file IDL parsing
    // YOUR_IDL_PATH is the path to the Thrift file, e.g., ./idl/example.thrift
    p, err := generic.NewThriftFileProvider("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Constructing a generic call with map request and return types
    g, err := generic.JSONThriftGeneric(p)
    if err != nil {
        panic(err)
    }
    svc := genericserver.NewServer(new(GenericServiceImpl), g)
    if err != nil {
        panic(err)
    }
    err := svr.Run()
    if err != nil {
        panic(err)
    }
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

## Protobuf Usage Example

### JSON Mapping Generic Call

JSON mapping generic calls refer to the ability of users to construct JSON String request parameters or returns directly according to specifications, and Kitex will handle encoding/decoding accordingly.

#### Type Mapping

The Mapping between Golang and Protocol Buffers:

| **Protocol Buffers Type** | **Golang Type** |
| ------------------------- | --------------- |
| float                     | float32         |
| double                    | float64         |
| int32                     | int32           |
| int64                     | int64           |
| uint32                    | uint32          |
| uint64                    | uint64          |
| sint32                    | int32           |
| sint64                    | int64           |
| fixed32                   | uint32          |
| fixed64                   | uint64          |
| sfixed32                  | int32           |
| sfixed64                  | uint64          |
| bool                      | bool            |
| string                    | string          |
| bytes                     | byte[]          |

Also supports lists and dictionaries in json, mapping them to repeated V and map<K,V> in protobufs. Does not support Protobuf special fields, such as Enum, Oneof, etc.;

#### Example IDl

```proto
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

#### Client

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

	// initialise DynamicGo proto.ServiceDescriptor
	dOpts := dproto.Options{}
	p, err := generic.NewPbFileProviderWithDynamicGo(path, context.Background(), dOpts)
	if err != nil {
		panic(err)
	}

	// create generic client
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

  // jRsp's type is JSON string
	jRsp, err := cli.GenericCall(ctx, "EchoPB", jReq)
	klog.CtxInfof(ctx, "genericJsonCall: jRsp(%T) = %s, err = %v", jRsp, jRsp, err)
}

```

#### Server

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
