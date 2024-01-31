---
title: "User guide to generic call with dynamicgo"
date: 2023-12-17
weight: 4
keywords: ["generic-call", "dynamicgo"]
description: "User guide to generic call with dynamicgo; high-performance generic-call"
---

## Background

Dynamicgo provides fast json⇆thrift conversion. Kitex has achieved higher performance generic calls by integrating dynamicgo.

Generic calls using dynamicgo are **supported only for json generic calls and http generic calls (data format: json**).

## Usage differences between old and new way

The usage is basically the same as the original Kitex generic call, with the following differences.

### Descriptor provider

- Thrift idl provider
  In the Kitex original way, we have some functions (ex. `NewThriftFileProvider`) to parse idl and return `DescriptorProvider`, which includes a channel of `ServiceDescriptor`.
  In the new way, we provide 3 functions to parse idl and return `DescriptorProvider` including dynamicgo's `ServiceDescriptor`.
  - `NewThriftFileProviderWithDynamicGo(path string, includeDirs ...string)`: create thriftFileProvider which implements DescriptorProvider with dynamicgo from given path and include dirs
  - `NewThriftContentProviderWithDynamicGo(main string, includes map[string]string)`: create ThriftContentProvider which implements DescriptorProvider with dynamicgo from content
    - You can  your IDL with the same method `UpdateIDL` as the old way
  - `NewThriftContentWithAbsIncludePathProviderWithDynamicGo(mainIDLPath string, includes map[string]string)`: create ThriftContentWithAbsIncludePathProvider which implements DescriptorProvider (abs include path) with dynamicgo from content
    - You can  your IDL with the same method `UpdateIDL` as the old way
- Provider option
  - `GetProviderOption` is an interface which contains a func `Option()` to get `ProviderOption`. ProviderOption has a bool field `DynamicGoEnabled`, which indicates whether dynamicgo is enabled or not.
  - The providers returned by the three idl parse functions mentioned above implement `GetProviderOption`. Basically, when the user calls one of the three idl parse functions, `DynamicGoExpected` will be true, but if getting dynamicgo's provider fails inside the function, it will be false.

### Generic option

- Dynamicgo conv option
  Dynamicgo needs to set [options](https://github.com/cloudwego/dynamicgo/blob/main/conv/api.go#L50) for conversion: `conv.Options`. The default `conv.Options` for json/http generic call are as follows:

```go
DefaultJSONDynamicgoConvOpts = conv.Options{
   WriteRequireField:  true,
   WriteDefaultField:  true,
}

DefaultHTTPDynamicgoConvOpts = conv.Options{
   EnableHttpMapping:     true,
   EnableValueMapping:    true,
   WriteRequireField:     true,
   WriteDefaultField:     true,
   OmitHttpMappingErrors: true,
   NoBase64Binary:        true,
   UseKitexHttpEncoding:  true,
}
```

&emsp;&emsp;If you want to use your customized `conv.Options`, you can set it through this option below:

&emsp;&emsp;- `WithCustomDynamicgoConvOpts(opts conv.Options)`: customized dynamicgo conv options for json/http generic call

- Option only for http generic call
  In Kitex original http generic call (data format: json), the type of resp body is map[string]interface{}, which is stored in `HTTPResponse.Body`. However, in the http generic call (data format: json) with dynamicgo, **the type of resp body will be json byte slice**, which is stored in `HTTPResponse.RawBody`.
  We provide a function `UseRawBodyForHTTPResp(enable bool)` so that you can choose according to your preference of response type.

## Break changes

- Thrift exception field

  - Json generic call
    There is a difference in the error message for a thrift exception field between the original generic call and a generic call using dynamicgo. The original generic call returns a map string as the error message for a thrift exception field, but a generic call using dynamicgo returns a json string.
    ex.)
    - original: `remote or network error[remote]:  map[string]interface {}{"code":400, "msg":"this is an exception"}`
    - dynamicgo: `remote or network error[remote]:  {"code":400,"msg":"this is an exception"}`
  - HTTP generic call
    HTTP generic call with dynamicgo does not support thrift exception field handling (marked as a TODO).
- Type conversion

  - Unable to set string for bool type
    In the original way of Kitex, even if a bool type is specified as a string (ex. "true"), it can be encoded, but dynamicgo generates an error during encoding.
  - Unable to convert string to int8/int16/int32/int64/float64 for i8/i16/i32/i64/double fields (**Fixed in the latest Kitex version v0.7.1 / internal v1.13.1**)
    In the original way of Kitex, even when an int8/int16/int32/int64/float64 type is specified as a string, it can be converted to the corresponding type, but dynamicgo way does not convert and causes an error during encoding. If you need to use string for i8/i16/i32/i64/double fields, you can set `String2Int64` of the conv.Options `true`, but please note that an int64 value will be written as a string in decoding when `String2Int64=true`.
  - Unable to set string for void type (json generic) (**Fixed in the latest Kitex version v0.7.1 / internal v1.13.1**)
    This is regarding server-side generic call handler function which returns void.
    In the original Kitex way, when encoding, void is written in the response whenever the message is any string, not just `descriptor.Void{}`, but encoding with dynamicgo just accepts only `descriptor.Void{}`.

```go
// GenericCall ...
func (g *GenericServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (response interface{}, err error) {
   msg := request.(string)
   fmt.Printf("Recv: %v\n", msg)
   return resp, nil
}

[original Kitex way]
resp can be descriptor.Void{} or any string (like "Void")
[dynamicgo way]
resp can be only descriptor.Void{}
```

## Fallback

Note: Generic call using dynamicgo is only activated under the following conditions.

- Encoding:

  - CPU architecture: amd64 && go version >= go1.16
- Decoding:

  - Json generic
    - `DynamicGoEnabled` of `ProviderOption` is true
    - On the server side: the client uses json generic call, or the client does not use json generic call but the transport protocol is **neither** PurePayload (**nor** GRPC of course because this dynamicgo integration is applied only for thrift). For the transport protocols, please refer to [this doc](https://www.cloudwego.io/docs/kitex/tutorials/basic-feature/transport_protocol/).
  - http generic call
    - `DynamicGoEnabled` of `ProviderOption` is true
    - `UseRawBodyForHTTPResp(enable bool)` is enabled

**If these conditions are not met, the original generic call functions will be called**.

| <u>Fallback</u> **condition** | **Encoding**                                    | **Decoding**                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **json**                      | CPU architecture: !amd64 \|\| go version < go1.16 | - `DynamicGoEnabled` of `ProviderOption` is false<br>- Only happens on the server side. The client doesn't use json generic call and the transport protocol is PurePayload |
| **http**                      | CPU architecture: !amd64 \|\| go version < go1.16 | `DynamicGoEnabled` of `ProviderOption` is false \|\|<br>`UseRawBodyForHTTPResp(enable bool)` is **not** enabled                                                              |

## Json generic call example

[code](https://github.com/cloudwego/Kitex/blob/develop/pkg/generic/json_test/generic_test.go#L80)

### Client usage

- Request

Type: JSON string

- Response

Type: JSON string

<u>You do not need to modify your Kitex json generic call code if you use the default dynamicog option.</u>

```go
package main

import (
    "github.com/cloudwego/Kitex/pkg/generic"
     bgeneric "github.com/cloudwego/Kitex/client/genericclient"
)

func main() {
    // Local file idl parsing
    // YOUR_IDL_PATH: thrift file path ex.) ./idl/example.thrift
    // includeDirs: Specify the include paths, by default the relative path of the current file is used to find the include
    p, err := generic.NewThriftFileProviderWithDynamicGo("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Constructing generic call of JSON request and response types
    g, err := generic.JSONThriftGeneric(p)
    // Set generic option for dynamicgo if needed
    //  var dopts []generic.Option
    //  dopts = append(dopts, generic.WithCustomDynamicgoConvOpts(conv.Options{your conv options}))
    //  g, err := generic.JSONThriftGeneric(p, dopts...)
    if err != nil {
        panic(err)
    }
    cli, err := bgeneric.NewClient("psm", g, opts...)
    if err != nil {
        panic(err)
    }
    // 'ExampleMethod' method name must be included in the idl definition
    resp, err := cli.GenericCall(ctx, "ExampleMethod", "{\"Msg\": \"hello\"}")
    // resp is a JSON string
}
```

### Server usage

- Request

Type: JSON string

- Response

Type: JSON string

<u>You do not need to modify your Kitex json generic call code if you use the default dynamicog option.</u>

```go
package main

import (
    "github.com/cloudwego/Kitex/pkg/generic"
    bgeneric "github.com/cloudwego/Kitex/server/genericserver"
)

func main() {
    // Local file idl parsing
    // YOUR_IDL_PATH: thrift file path ex.) ./idl/example.thrift
    p, err := generic.NewThriftFileProviderWithDynamicGo("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Constructing generic call of JSON request and response types
    g, err := generic.JSONThriftGeneric(p)
    // Set generic option for dynamicgo if needed
    //  var dopts []generic.Option
    //  dopts = append(dopts, generic.WithCustomDynamicgoConvOpts(conv.Options{your conv options}))
    //  g, err := generic.JSONThriftGeneric(p, dopts...)
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

## HTTP generic call (data format: json) example

[code](https://github.com/cloudwego/Kitex/blob/develop/pkg/generic/http_test/generic_test.go#L96)

### Client usage

**HTTP generic call only supports client side**.

- Request

Type: *generic.HTTPRequest

- Response

Type: *generic.HTTPResponse

`YOUR_IDL.thrift`

```go
namespace go Kitex.example.server

struct BinaryWrapper {
    1: binary msg (api.body = "msg")
    2: bool got_base64 (api.body = "got_base64")
    3: required i64 num (api.body = "num", api.js_conv="")
    4: optional string str (api.query = "str", go.tag = "json:\"STR\"")
}

service ExampleService {
    BinaryWrapper BinaryEcho(1: BinaryWrapper req) (api.get = '/BinaryEcho', api.baseurl = 'example.com')
}
```

```go
package main

import (
    bgeneric "github.com/cloudwego/Kitex/client/genericclient"
    "github.com/cloudwego/Kitex/pkg/generic"
)

func main() {
    // Local file idl parsing
    // YOUR_IDL_PATH: thrift file path ex.) ./idl/example.thrift
    // includeDirs: Specify the include paths, by default the relative path of the current file is used to find the include
    p, err := generic.NewThriftFileProviderWithDynamicGo("./YOUR_IDL_PATH")
    if err != nil {
        panic(err)
    }
    // Set generic option for dynamicgo
    var dopts []generic.Option
    dopts = append(dopts, generic.UseRawBodyForHTTPResp(true))
    // Constructing generic call of http
    g, err := generic.HTTPThriftGeneric(p, dopts...)
    if err != nil {
        panic(err)
    }
    cli, err := bgeneric.NewClient("psm", g, opts...)
    if err != nil {
        panic(err)
    }
 
    url := "http://example.com/BinaryEcho"

    body := map[string]interface{}{
       "msg":        []byte(mockMyMsg),
       "got_base64": true,
       "num":        "",
    }
    data, err := json.Marshal(body)
    if err != nil {
       panic(err)
    }
    // construct a http request
    req, err := http.NewRequest(http.MethodGet, url, bytes.NewBuffer(data))
    if err != nil {
        panic(err)
    }
    customReq, err := generic.FromHTTPRequest(req) // Considering that the business may use third-party http request, you can construct your own conversion function
    // customReq *generic.HttpRequest
 
    // Since the method for http generic is obtained from the http request via the bam rule, just fill in the blanks
    resp, err := cli.GenericCall(ctx, "", customReq)
    realResp := resp.(*generic.HttpResponse)
    // The body will be stored in RawBody of HTTPResponse as []byte type.
    // Without using dynamicgo, the body will be stored in Body of HTTPResponse as map[string]interface{} type.
    node, err := sonic.Get(gr.RawBody, "msg")
    val, err := node.String() // get the value of "msg"
    println(val == base64.StdEncoding.EncodeToString([]byte(mockMyMsg))) // true
    _, ok := gr.Body["msg"]
    println(ok) // false
}

----------
// HTTPResponse ...
type HTTPResponse struct {
   Header      http.Header
   StatusCode  int32
   RawBody     []byte // this field is set only when generic.UseRawBodyForHTTPResp(true) is set
   Body        map[string]interface{}
   GeneralBody interface{} // body of other representation, used with ContentType
   ContentType MIMEType
   Renderer    Renderer
}
```

You can refer to [the unit test code](https://github.com/cloudwego/kitex/blob/develop/pkg/generic/http_test/generic_test.go#L96) for more details.

## Performance test

The following test results use multiple nested complex structures as payloads for performance tests. The concurrency is controlled at 100, the total number of requests is 2000000, and the server is allocated 4 cores `Intel (R) Xeon (R) Gold 5118 CPU @2.30GHz`. Go version is go1.17.11, and cpu architecture is linux/amd64.

As for 'Version', 'original' means the conventional generic call, 'dynamicgo' refers to a generic call with dynamicgo, and 'fallback' refers to a generic call that doesn't meet the conditions to enable dynamicgo (= normal generic call).

[Source code](https://github.com/cloudwego/Kitex-benchmark/pull/59)

| **Type of generic call** | **Data size** | **Version** | **TPS**   | **TP99** | **TP999** | **Server CPU AVG** | **Client CPU AVG** | **Throughput differences (compare to original**) |
| ------------------------ | ------------- | ----------- | --------- | -------- | --------- | ------------------ | ------------------ | ------------------------------------------------ |
| **json generic**         | 1K            | original    | 14305.05  | 25.86ms  | 61.17ms   | 393.06             | 517.37             | 0%                                               |
|                          |               | dynamicgo   | 26282.09  | 12.27ms  | 48.45ms   | 394.00             | 521.83             | +84%                                             |
|                          |               | fallback    | 14371.31  | 25.67ms  | 60.38ms   | 392.70             | 523.19             | +0.5%                                            |
|                          | 5K            | original    | 4523.32   | 76.38ms  | 113.14ms  | 393.06             | 517.37             | 0%                                               |
|                          |               | dynamicgo   | 13877.92  | 22.48ms  | 56.97ms   | 395.30             | 546.33             | +207%                                            |
|                          |               | fallback    | 4528.60   | 75.84ms  | 111.34ms  | 392.70             | 523.19             | +0.1%                                            |
|                          | 10K           | original    | 2595.68   | 130.63ms | 190.90ms  | 394.18             | 523.92             | 0%                                               |
|                          |               | dynamicgo   | 9180.51   | 34.99ms  | 83.01ms   | 396.12             | 555.33             | +254%                                            |
|                          |               | fallback    | 2600.34   | 130.81ms | 189.28ms  | 393.98             | 531.17             | +0.2%                                            |
| **http generic**         | 1K            | original    | 74563.40  | 5.75ms   | 9.42ms    | 281.82             | 1487.58            | 0%                                               |
|                          |               | dynamicgo   | 113614.37 | 2.70ms   | 5.64ms    | 373.70             | 1015.46            | +52%                                             |
|                          |               | fallback    | 74741.62  | 5.69ms   | 9.45ms    | 283.28             | 1493.95            | +0.2%                                            |
|                          | 5K            | original    | 16442.08  | 57.39ms  | 91.49ms   | 168.52             | 1508.09            | 0%                                               |
|                          |               | dynamicgo   | 48715.66  | 5.90ms   | 11.36ms   | 391.27             | 1140.84            | +196%                                            |
|                          |               | fallback    | 16457.00  | 58.37ms  | 90.48ms   | 165.49             | 1509.61            | +0.1%                                            |
|                          | 10K           | original    | 8002.70   | 97.59ms  | 149.83ms  | 149.53             | 1524.45            | 0%                                               |
|                          |               | dynamicgo   | 26857.57  | 9.47ms   | 21.94ms   | 394.42             | 1138.70            | +236%                                            |
|                          |               | fallback    | 8019.39   | 97.11ms  | 149.50ms  | 148.03             | 1527.77            | +0.2%                                            |


