---
title: "泛化调用接入 dynamicgo 指南"
date: 2023-12-17
weight: 4
keywords: ["generic-call","dynamicgo"]
description: "泛化调用接入 dynamicgo 指南；高性能泛化调用实现"
---

## 背景

[Dynamicgo](https://github.com/cloudwego/dynamicgo) 提供了高效的 thrift 数据处理。Kitex 通过集成 Dynamicgo 实现了更高性能的 JSON/HTTP 泛化调用。

注意：当前**仅支持用于 JSON 泛化调用和 JSON 格式的 HTTP 泛化调用（数据格式：json）**。

## 新旧方式的使用差异

用法与原始 Kitex 泛化调用基本相同，但有以下区别。

### Descriptor

- Descriptor provider

  - Thrift idl provider
    在 Kitex 的原始方式中，我们有一些函数（例如 `NewThriftFileProvider`）来解析 idl 并返回 `DescriptorProvider`，其中包括 `ServiceDescriptor` 的通道。
    在新的方式中，由于 dynamicgo 使用的 `Descriptor` 与 `Kitex/generic` 不同，我们提供了 3 个新函数来解析 idl 并返回 dynamicgo 的 `ServiceDescriptor`。
    - `NewThriftFileProviderWithDynamicGo(path string, includeDirs ...string)`：创建 thriftFileProvider，它从给定的路径实现 DescriptorProvider 并包含目录
    - `NewThriftContentProviderWithDynamicGo(main string, includes map[string]string)`：创建 ThriftContentProvider 它实现了 DescriptorProvider 与动态从内容
      - 您可以 IDL 与旧方法相同的方法 `UpdateIDL`
    - `NewThriftContentWithAbsIncludePathProviderWithDynamicGo(mainIDLPath字符串，包括map[string]string）`：创建 ThriftContentWithAbsIncludePathProvider 实现 DescriptorProvider（absinclude path）和从 content
      - 您可以与旧方法相同的方法更新 IDL
- Provider option

  - `GetProviderOption` 是一个接口，其中包含一个 func `Option（）` 来获取 `ProviderOption`。ProviderOption 有一个 bool 字段 `DynamicGoEnable`，它指示是否启用了 Dynamicgo。
  - 上面提到的三个 idl parse 函数返回的 provider 实现了 `GetProviderOption`。基本上，当用户调用三个 idl parse 函数中的一个时，`DynamicGoExpected` 将为 true，但如果在函数内部获取 Dynamicgo 的 provider 失败，则为 false。

### Call options

- Dynamicgo conv 选项
  Dynamicgo 需要设置自己的转换[选项](https://github.com/cloudwego/dynamicgo/blob/main/conv/api.go#L50)：`conv. Options`。json/超文本传输协议泛化调用的默认 `conv.Options` 如下：

```go
DefaultJSONDynamicgoConvOpts = conv.Options{
   WriteRequireField: true,
   WriteDefaultField: true,
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

&emsp;&emsp;如果您想使用自定义的 `conv. Options`，可以通过下面的选项进行设置：

&emsp;&emsp;- `WithCustomDynamicgoConvOpts(optsconv. Options）`：自定义的 json/超文本传输协议的 conv 选项

- 仅用于 HTTP 泛化调用的选项
  在 Kitex 原始超文本传输协议泛化调用（数据格式：json）中，resp body 的类型为 `map[string]interface{}`，存储在 `HTTPResponse.Body` 中。然而，在带有 Dynamicgo 的超文本传输协议泛化调用（数据格式：json）中，**resp body 的类型将是 json 字符串，它存储在** `HTTPResponse.RawBody` **中**。
  我们提供了一个函数 `UseRawBodyForHTTPResp(enablebool）`，以便您可以根据自己的偏好选择响应类型。使用 rawbody 将大幅提升性能，推荐使用。

## Break Change

- Thrift Exception 信息

  - JSON 泛化调用
    原始泛化调用和使用 Dynamicgo 的泛化调用在 thrift 异常字段的错误信息上存在差异。原始泛化调用返回一个 map 字符串作为 thrift 异常字段的错误信息，但是使用 Dynamicgo 的泛化调用返回一个 json 字符串。例如：
    - 先前：`remote or network error[remote]:  map[string]interface {}{"code":400, "msg":"this is an exception"}`
    - 使用 Dynamicgo：`remote or network error[remote]:  {"code":400,"msg":"this is an exception"}`
  - HTTP generic call （TODO）
    HTTP 的泛化调用不支持 thrift 异常字段处理。
- 类型转换

  - Bool <> string：在 Kitex 的原始方式中，即使 IDL 声明为 bool 类型的字段值为字符串（例如"true"），它也可以被编码，但是 Dynamicgo 在编码过程中会产生错误。

## Fallback

由于当前 dynamicgo 仅支持 x86-64 环境，因此仅在以下条件下才会激活使用 Dynamicgo 的泛化调用。

- CPU 架构：amd64 && go 版本 >=go1.16
- JSON 泛化

  - `ProviderOption.DynamicGoEnable` 值为 true
  - 在服务器端：客户端使用 json 泛化调用，或者客户端不使用 json 泛化调用但传输协议**不是** PurePayload。
- HTTP 泛化

  - `ProviderOption.DynamicGoEnable` 值为 true
  - `UseRawBodyForHTTPResp(enablebool）` 已启用

**如果不满足这些条件，将 fallback 到原来的泛化调用实现。**

| **开启条件** | 宿主机环境                  | 选项                                                                                                                                    |
| ------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **json**     | CPU 架构：amd64 && go>=1.16 | - `ProviderOption` 的 `DynamicGoEnable` 为 true<br>- 客户端使用 泛化调用，或者其传输协议使用的是 TTHeader、Framed、TTHeaderFramed 中的一种 |
| http         | CPU 架构：amd64 && go>=1.16 | - `ProviderOption` 的 `DynamicGoEnable` 为 true <br>- `UseRawBodyForHTTPResp(true）` **启用（可选）**                                       |

## JSON 泛化调用示例

[完整代码](https://github.com/cloudwego/Kitex/blob/develop/pkg/generic/json_test/generic_test.go#L80)

### 客户端使用

- 请求

类型：JSON 字符串

- 回应

类型：JSON 字符串

<u>如果使用默认的 Dynamicog 选项，则不需要修改 Kitex JSON 泛化调用代码。</u>

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

### 服务端使用

- 请求

类型：JSON 字符串

- 回应

类型：JSON 字符串

<u>如果使用默认的 Dynamicog 选项，则不需要修改 Kitex JSON 泛化调用代码。</u>

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

## HTTP 通用调用（数据格式：json）示例

[完整代码](https://github.com/cloudwego/Kitex/blob/develop/pkg/generic/http_test/generic_test.go#L96)

### 客户端使用

**HTTP 泛化调用仅支持客户端。**

- 请求

类型：*generic.HTTPRequest

- 回应

类型：*generic.HTTPResponse

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
    
    // Construct the request, or get it from ginex
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
    customReq, err := generic.FromHTTPRequest(req) // Considering that the business may use third-party http request, you can construct your own conversion function
    // customReq *generic.HttpRequest
    // Since the method for http generic is obtained from the http request via the bam rule, just fill in the blanks
    
    resp, err := cli.GenericCall(ctx, "", customReq)
    realResp := resp.(*generic.HttpResponse)
    realResp.Write(w) // Write back to ResponseWriter for http gateway
    
     // The body will be stored in RawBody of HTTPResponse as []byte type.
    // Without using dynamicgo, the body will be stored in Body of HTTPResponse as map[string]interface{} type.
    node, err := sonic.Get(gr.RawBody, "msg")
    val, err := node.String() // get the value of "msg"
    println(val == base64.StdEncoding.EncodeToString([]byte(mockMyMsg))) // true
    _, ok := gr.Body["msg"]
    println(ok) // false
}
```

## 性能测试

以下测试结果使用多个嵌套复杂结构作为性能测试的 payload，并发控制在 100，请求总数 2000000，服务器分配 4 核 `Intel（R）Xeon（R）Gold 5118CPU@2.30GHz`。Go 版本为 go1.17.11，cpu 架构为 linux/amd64。

“original”是指传统的泛化调用，“dynamicgo”是指使用 dynamicgo 泛化调用，“fallback”是指不满足启用 dynamicgo 条件的泛化调用（=普通泛化调用）。

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


