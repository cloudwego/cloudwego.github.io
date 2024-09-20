---
title: "按需序列化使用指南"
date: 2024-09-20
weight: 1
keywords: ["按需序列化使用指南"]
description: ""
---

## 什么是 Thrift FieldMask？

FieldMask 是受到 <u>[Protobuf](https://protobuf.dev/reference/protobuf/google.protobuf/#field-mask) </u>的启发，用于在 RPC 调用时**指示用户关心的数据并过滤掉无用的数据**的一种手段。该技术不但可以在 RPC 服务中实现**特定字段的屏蔽**，同时还可以**减少消息传输开销**以提升服务性能，目前已广泛应用于 Protobuf<u>[服务](https://netflixtechblog.com/practical-api-design-at-netflix-part-1-using-protobuf-fieldmask-35cfdc606518)</u>中。

对于 thrift RPC 服务来说，有如下潜在使用场景：

- 下发字段管控。如 隐私合规，请求打包 等业务
- 减少公共结构体中带来的冗余字段传输。如多个业务方调用同一个 A 服务由 统一公共仓库 生成的 kitex client

## 使用方式

### 更新生成代码

首先，您必须使用两个选项生成此功能的代码 `with_fieldmask` 和 `with_reflection`

```
$ kitex -thrift with_field_mask -thrift with_reflection ${your_idl}
```

### **构建 FieldMask**

要构建字段掩码，您需要两件事：

- ThriftPath - 用于描述您想要（或屏蔽）的字段
- 类型描述符 TypeDescriptor  - 用于验证您传递的 Thrift 路径是否与消息定义（IDL）兼容

#### ThriftPath

表示 Thrift 消息的任意**一个端点**位置的路径字符串。它用于从 Thrift 根消息出发中定位数据，**自顶向下**定义。例如，有如下的 Thrift 消息：

```go
struct Example {
    1: string Foo,
    2: i64 Bar: Example Self
}
```

ThriftPath `$.Foo` 表示 Example.Foo 的字符串值，`$.Self.Bar` 表示第二层 i64 值 Example.Self.Bar。Thrift 路径还支持在所有四种嵌套类型（LIST/SET/MAP/STRUCT）类型的对象中定位元素（见下文），而不仅仅是 STRUCT。实际构建 `NewFieldmask` 需要**多个 thrift path 进行组合**。

##### 详细**语法**

这是基本假设：

- `fieldname` 是结构体中字段的字段名，它**必须只**包含'[a-zA-Z]'字母，整数和字符'_'。
- `index` 是列表或集合中元素的索引，它**必须只**包含整数。
- `key` 是映射中元素的字符串类型键。它可以包含任何字母，但**必须**是带引号的字符串。
- `id` 是映射中元素的整型键，它**必须只**包含整数。
- 除 `key` 中之外，ThriftPath 任何位置都不能含有空白（\n\r\b\t）字符

这是详细的语法：

ThriftPath | Description
-- | --
$ | 根对象，每个路径都必须以它开头。
.`fieldname` | 获取结构体中的 fieldname 子字段。例如，$. Fielda.ChildrenB。如果 fieldname 是路径终点且改字段为复杂类型（map/list/struct），则表示获取该字段下的所有子字段。
[`index`,`index`...] | 获取 List 中的特定 index 的元素。索引必须是整数。例如：$. FieldList[1,3,4]。注意：可以编写超出实际列表大小的索引，但是实际无用。
{"`key`","`key`"...} | 获取字符串类型键的映射中的特定 key 的值。例如：$. StrMap{""abcd""，""1234""} 
{`id`,`id`...} | 获取整数类型键的映射中具有特定 id 的子字段。例如，$.IntMap{1,2}
\* | 获取所有字段/元素，即：$. StrMap{*} 表示获取映射 Root.StrMap 所有元素；$.List[*] 表示或者 List 中的所有元素。

#### **类型描述符**

类型描述符是消息定义的运行时表示，定位与<u>[Protobuf 描述符](https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/descriptor.proto)</u>一致。详见 [Thriftgo 反射使用文档](https://www.cloudwego.io/zh/docs/kitex/tutorials/code-gen/thrift-reflection/)

要获得类型描述符，您必须先启用 thrift 反射功能，该功能是在 thriftgo <u>[v0.3.0](https://github.com/cloudwego/thriftgo/pull/83) </u>中引入的。您可以使用选项 `with_reflection` 为此功能生成相关代码。生成成功后，每个 STRUCT 类型都将带上 GetTypeDescriptor**() **这个函数。

#### 示例

下面，我们以[一个 IDL](https://github.com/cloudwego/kitex-tests/blob/feat/fieldmask_test/idl/fieldmask.thrift) 为例，展示 fieldmask 的使用方式。具体代码详见 [main_test. go](https://github.com/cloudwego/kitex-tests/blob/feat/fieldmask_test/thriftrpc/fieldmask/main_test.go)。

```thrift
namespace go fieldmask

struct BizRequest {
    1: string A 
    2: required string B
    3: optional binary RespMask //这里用于传递fieldmask
}

struct BizResponse {
    1: string A 
    2: required string B
    3: string C
}

service BizService {
    BizResponse BizMethod1(1: BizRequest req)
}
```

您可以在应用程序的**初始化**阶段创建一个字段掩码（建议），或者**每次在 返回响应/发出请求 之前**在 bizhandler 中创建一个字段掩码。

```go
import (
    "sync"
    "github.com/cloudwego/thriftgo/fieldmask"
)

var fieldmaskCache sync.Map 

// initialize request and response fieldmasks and cache them
func init() {
    // construct a fieldmask with TypeDescriptor and thrift paths
    respMask, err := fieldmask.NewFieldMask(
        (*fieldmask0.BizResponse)(nil).GetTypeDescriptor(), 
        "$.A")
    if err != nil {
            panic(err)
    }
    fmCache.Store("BizResponse", respMask)
    
    reqMask, err := fieldmask.NewFieldMask(
        (*fieldmask0.BizRequest)(nil).GetTypeDescriptor(), 
        "$.B", "$.RespMask")
    if err != nil {
            panic(err)
    }
    fmCache.Store("BizRequest", reqMask)
}
```

（OPTION）如果你想将你的 fieldmask 设置为黑名单模式（什么是黑名单见【可见性】），可以在创建时开启选项 `[Options.BlackListMode](https://github.com/cloudwego/thriftgo/blob/main/fieldmask/mask.go#L111)`：

```go
// black list mod
    respMaskBlack, err := fieldmask.Options{BlackListMode: true}.NewFieldMask((*fieldmask0.BizResponse)(nil).GetTypeDescriptor(), "$.A", "$.B")
    if err != nil {
        panic(err)
    }
    fmCache.Store("BizResponse-Black", respMaskBlack)
    reqMaskBlack, err := fieldmask.Options{BlackListMode: true}.NewFieldMask((*fieldmask0.BizRequest)(nil).GetTypeDescriptor(), "$.A")
    if err != nil {
        panic(err)
    }
    fmCache.Store("BizRequest-Black", reqMaskBlack)
```

### 设置 FieldMask 到序列化对象（当前进程使用）

现在你可以在你的**请求或响应对象**上使用生成的 API `Set_FieldMask` 设置字段掩码。然后 kitex 本身会注意到字段掩码，并在请求/响应的序列化过程中使用它，无论是客户端还是服务器端。

- 服务端

```go
type BizResponse struct {
    A          string `thrift:"A,1" frugal:"1,default,string" json:"A"`
    B          string `thrift:"B,2,required" frugal:"2,required,string" json:"B"`
    C          string `thrift:"C,3" frugal:"3,default,string" json:"C"`
    _fieldmask *fieldmask.FieldMask
}

func (s *BizServiceImpl) BizMethod1(ctx context.Context, req *biz.BizRequest) (resp *biz.BizResponse, err error) {
    resp := biz.NewBizResponse() // resp = biz.NewBizResponse
    resp.A = "A"
    resp.B = "B"
    resp.C = "C"
    // try set resp's fieldmask
    respMask, ok := fmCache.Load("BizResponse")
    if ok {
        resp.Set_FieldMask(respMask.(*fieldmask.FieldMask))
    }
    return resp, nil
}
```

- 客户端

```go
req := biz.NewBizRequest()
req.A = "A"
req.B = "B"
// try set request's fieldmask
reqMask, ok := fmCache.Load("BizRequest")
if ok {
    req.Set_FieldMask(reqMask.(*fieldmask.FieldMask))
}
resp, err := cli.BizMethod1(context.Background(), req)
```

### **传递 FieldMask（对端使用）**

如果你想要通知对端服务屏蔽特定字段，目前您可以在你的请求定义中**添加一个二进制字段**来携带字段掩码，并将您正在使用的字段掩码**显式序列化**到该字段中。我们提供了两个封装的 API 用于序列化/反序列化：

- <u>[thriftgo/fieldmask. Marshal/Unmarshal](https://github.com/cloudwego/thriftgo/blob/9e8d1cafba62a37789c431270a816ad35a6c46e0/fieldmask/serdes.go)</u>：包函数，将 Fieldmask 序列化/反序列化二进制字节。**我们建议您使用这个 API 而不是下面一个，因为由于使用缓存，它要快得多——除非您的应用程序缺少内存或者需要频繁更新 fieldmask**。
- <u>[字段掩码. MarshalJSON/UnmarshalJSON](https://github.com/cloudwego/thriftgo/blob/9e8d1cafba62a37789c431270a816ad35a6c46e0/fieldmask/serdes.go)</u>：FieldMask 对象方法，将字段掩码序列化/反序列化为/从 JSON 字节（不推荐）

例如，我们可以将响应的字段掩码作为请求的**一个 binary 类型字段**进行传递，例如：

- 客户端设置&传递

```go
type BizRequest struct {
    A          string `thrift:"A,1" frugal:"1,default,string" json:"A"`
    B          string `thrift:"B,2,required" frugal:"2,required,string" json:"B"`
    RespMask   []byte `thrift:"RespMask,3,optional" frugal:"3,optional,binary" json:"RespMask,omitempty"`
}

func TestClient() {
    req := fieldmask0.NewBizRequest()
    req.A = "A"
    req.B = "B"
        
    // try get response's fieldmask
    respMask, ok := fmCache.Load("BizResponse")
    if ok {
            // serialize the respMask
            fm, err := fieldmask.Marshal(respMask.(*fieldmask.FieldMask))
            if err != nil {
                    t.Fatal(err)
            }
            // let request carry fm
            req.RespMask = fm
    }
    
    resp, err := cli.BizMethod1(context.Background(), req)
}
```

- 服务器端接受&处理

```go
// BizMethod1 implements the BizServiceImpl interface.
func (s *BizServiceImpl) BizMethod1(ctx context.Context, req *fieldmask0.BizRequest) (resp *fieldmask0.BizResponse, err error) {
    resp = fieldmask0.NewBizResponse()
    resp.A = "A"
    resp.B = "B"
    
    // check if request carries a fieldmask
    if req.RespMask != nil {
        println("got fm", string(req.RespMask))
        fm, err := fieldmask.Unmarshal(req.RespMask)
        if err != nil {
            return nil, err
        }
        // set fieldmask for response
        resp.Set_FieldMask(fm)
    }
   
    return
}
```

### 最终效果

一旦您为请求/响应设置了 fieldmask，另一方将仅接收到 fieldmask 设置的非必需字段的真实值，或者 fieldmask 未屏蔽的必需字段的零值。业务预期效果如下

- 客户端

```go
if resp.A == "" { // resp.A in mask
    t.Fatal()
}
if resp.B == "" { // resp.B not in mask, but it's required, so still written
    t.Fail()
}
if resp.C != "" { // resp.C not in mask
    t.Fail()
}
```

- 服务器端

```go
if req.A != "" { // req.A not in mask
    return nil, errors.New("request must mask BizRequest.A!")
}
if req.B == "" { // req.B in mask
    return nil, errors.New("request must not mask BizRequest.B!")
}
```

### 查看 FieldMask（Reflection of FieldMask）

如果业务有需要检查对端传入的 FieldMask 并实现特定业务逻辑，我们提供了一下 API：

- 类型：使用 [fieldmask.Type()](https://pkg.go.dev/github.com/cloudwego/thriftgo@v0.3.12/fieldmask#FieldMask.Type) 获取当前 fieldmask 类型
- 定位：使用 [fieldmask.GetPath()](https://pkg.go.dev/github.com/cloudwego/thriftgo@v0.3.12/fieldmask#FieldMask.GetPath) 定位到**某个 thrift path 下的**节点
- 遍历：使用 [fiedmask.ForEachChild()](https://pkg.go.dev/github.com/cloudwego/thriftgo@v0.3.12/fieldmask#FieldMask.ForEachChild) 遍历**当前 fieldmask 的** **下一层** 节点

详细使用见[ mask_test.go](https://github.com/cloudwego/thriftgo/blob/main/fieldmask/mask_test.go#L23)

## 注意事项

### 可见性（黑名单 or 白名单）

**FieldMask 默认为白名单 ：**掩码中的一个字段表示“**通过**”（**将被** 序列化/反序列化），不在掩码中的字段表示“**过滤**”（**不会被**序列化/反序列化）。

但是也允许用户将 FieldMask **设置为黑名单，**需要在创建时开启选项 `Options.BlackListMode`。此时掩码中的一个字段表示“**过滤**”（**不将被** 序列化/反序列化），不在掩码中的字段表示“**通过**”（**会被**序列化/反序列化）。具体如何使用详见 [main_test. go](https://github.com/cloudwego/kitex-tests/blob/feat/fieldmask_test/thriftrpc/fieldmask/main_test.go)。

### **实现约定**

- **空的 fieldmask 表示“全部通过”**（无论黑名单还是白名单）
- 对于既不是 string 也不是 int 类型建的 map，**只允许'*'标记作为键**
- 安全起见，Required 字段可以不在掩码中（过滤），但是它们序列化时**仍将被写入当前值**。

  - Tips：如果想不在掩码中的 required 字段写成零值，可以开启选项 -`thrift field_mask_zero_required` 并重新生成代码。需要注意的是，STRUCT 类型也写零值（写入一个 FieldStop(0)）——这意味着， 如果该 STRUCT 中含有 required 字段会可能会引起对端报错
- FieldMask 设置**必须从请求/响应根对象开始（IDL 中定义的 method 的 respXX/requstXX 结构体），并对整个对象生效**

  - Tips：如果您想从某一非根对象设置 FieldMask 并生效，需要**添加** -`thrift field_mask_halfway` **选项并重新生成代码**。但是这样会有一个潜在风险：如果不同父对象引用了同一个子对象，并且这两个父对象分别设置了不同的 fieldmask，那只有其中一个父对象相对于这个子对象的 fieldmask 会生效。

### 性能

- 构建 fieldmask 的开销很高。但是考虑到大部分业务需求中不会频繁更新 fieldmask，建议用户采用上述示例中的 `init()+sync.Map` 方式构建和获取。同样，传输 fieldmask 也有一定开销，因此建议使用 thriftgo 提供的 fieldmask.Marshal()/Unmarshal() 进行（见【**传递 FieldMask**】）
- 序列化性能：主要取决于**过滤数据的比例，过滤比例越大最终服务序列化性能越好**。参见<u>[baseline_test. go](https://github.com/cloudwego/kitex-tests/blob/feat/fieldmask_test/codegen/fieldmask/baseline_test.go)</u>

```
goos: darwin
goarch: amd64
cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz
BenchmarkFastWriteNesting/full-16      4505 ns/op          0 B/op          0 allocs/op
BenchmarkFastWriteNesting/half-16      2121 ns/op          0 B/op          0 allocs/op
BenchmarkFastReadNesting/full-16      13864 ns/op      11874 B/op        173 allocs/op
BenchmarkFastReadNesting/half-16       7938 ns/op       5273 B/op         77 allocs/op
```

案例解释：

- Nesting：两层字段结构体，数据大小 6455B
- FastWrite：序列化测试
- FastRead：反序列化测试
- full：开启 with_field_mask 选项生成，但不使用字段掩码
- half：开启 with_field_mask 选项生成，并使用字段掩码来过滤一半的数据

## 获取代码

这个功能目前正在开发中，如果你想尝试，可以**获取分支代码，**并**安装相应的二进制工具**。

- ThriftGo：版本应 >= v0.3.12

  - 命令行工具：用 thriftgo -version 确认；如版本较低，可手动安装最新版：

  ```go
  go install github.com/cloudwego/thriftgo@latest
  ```
  - go.mod: 使用 go get 更新项目依赖

  ```bash
  go get github.com/cloudwego/thriftgo@latest
  ```
- Kitex 命令行：版本应 >= v0.10.0

  - 命令行工具

  ```go
  go install github.com/cloudwego/kitex/tool/cmd/kitex@latest
  ```
  - 框架

  ```go
  go get github.com/cloudwego/kitex@latest
  ```
