---
title: "使用 Thrift 反射提升泛化调用性能"
date: 2023-12-17
weight: 5
keywords: ["反射", "泛化调用"]
description: "使用 Thrift 反射提升泛化调用性能"
---

## 什么是 Thrift 反射？

一句话总结，**类似于** [pb reflec](https://pkg.go.dev/google.golang.org/protobuf/reflect/protoreflect)，**不依赖静态代码对 Thrift 数据进行增删改查写**。

反射即采用特定的泛型来描述运行时的任意数据，相比于静态的 struct 具有 **增删查改灵活、不依赖于静态代码** 的特点。当前 [dynamicgo](https://github.com/cloudwego/dynamicgo) 实现了一套 thrift binary 协议的反射 API，按使用场景大致分为 Thrift Value/Node 和 Thrift DOM 两种。

## Thrift Value/Node

用于 rpc 数据包中**较少量字段的增删改查**。对于给定的路径（field id/field name/map key/list index），基于编码带有的数据类型**跳过字节流中不必要的数据节点**，**定位到所需数据在字节流的起止区间**进行处理。具体使用场景包括 **敏感字段擦除、数据包裁剪 、协议转换**等。dynamicgo 提供了 [thrift/generic.Value](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#type-value) 和 [thrift/generic.Node](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#type-node) 两种封装：前者可以支持基于 FieldName 进行查找，但是需要绑定动态类型描述 TypeDescriptor；后者不支持基于 FieldName（但支持 FieldID）进行查找，因此也不需要动态类型描述。

## Thrift DOM

通过 **文档对象树模型**来**描述全量反序列化的 Thrift 数据**。由于 Thrift 协议本身具有自描述能力，我们可以将其反序列化到一种特定的树型结构中，来进行更为复杂的**容器遍历、字段位移**等操作。具体业务场景包括 BFF 服务中的 **DSL 映射、数据包合并**等。dynamicgo 提供了 [thrift/generic.PathNode](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#type-pathnode) 的封装，可以不需要绑定动态类型描述来处理任意复杂度的 thrift 数据。

## 为什么要用 Thrift 泛型 替代 Kitex Map/JSON 泛化调用？

一句话总结：**性能更好**。

Thrift 泛型需求一般来源于 **rpc 泛化调用、http<>rpc 协议转换**等中心化 API 网关\BFF 场景，往往具有高性能的要求。但是 Kitex Map/JSON 泛化调用在当前 map+interface 模式下实现，由于其不可避免的带来大量的碎片化堆内存分配，其性能远差于正常代码生成模式的 kitex rpc 服务。相比之下，无论是 Thrift Value 高效的 skip 算法，还是 Thrift DOM 精心设计的内存结构，都能有效避免了大量的运行时的内存分配及中间编解码转换。详细设计与实现见 [introduction.md](https://github.com/cloudwego/dynamicgo/blob/main/introduction.md)。

具体对比结果见下文【测试数据】部分。

## 使用示例

下面将演示如何基于 **kitex-二进制泛化 +dynamicgo** 进行泛化调用。注不熟悉的 kitex-二进制泛化同学可以先参阅[泛化调用文档](https://www.cloudwego.io/docs/kitex/tutorials/advanced-feature/generic-call/#1-binary-generic)。

完整示例：

- [代码](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/reflect_test.go)
- [IDL](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/idl/example.thrift)

## Server （Thrift Value + DOM）

1. 首先实现一个 kitex/generic/Server 接口的类型，内部将 thrift-binary message 拆包为 methodName，seqID， request body

```go
// ExampleValueServiceImpl ...
type ExampleValueServiceImpl struct{}

// GenericCall ...
func (g *ExampleValueServiceImpl) GenericCall(ctx context.Context, method string, request interface{}) (interface{}, error) {
    // get and unwrap body with message
    in := request.([]byte)

    // unwarp thrift message and get request body
    methodName, _, seqID, _, body, err := dt.UnwrapBinaryMessage(in)
    if err != nil {
        return nil, err
    }

    // biz logic
    resp, err := ExampleServerHandler(body)
    if err != nil {
        return nil, err
    }

    // wrap response as thrift REPLY message
    return dt.WrapBinaryBody(resp, methodName, dt.REPLY, 0, seqID)
}
```

2. 由于这里使用 Thrift Value 需要具体绑定对应 IDL 的动态类型描述，可以在初始化阶段进行加载（注：这里不考虑动态更新，如果需要可以自行实现一个原子更新全局变量）

```go
var (
    ExampleReqDesc *dt.TypeDescriptor
    ExampleRespDesc *dt.TypeDescriptor
    StrDesc *dt.TypeDescriptor
    BaseLogidPath []dg.Path
    DynamicgoOptions = &dg.Options{}
)

func initDescriptor() {
    sdesc, err := dt.NewDescritorFromPath(context.Background(), "idl/example.thrift")
    if err != nil {
        panic(err)
    }
    ExampleReqDesc = sdesc.Functions()["ExampleMethod"].Request().Struct().FieldById(1).Type()
    ExampleRespDesc = sdesc.Functions()["ExampleMethod"].Response().Struct().FieldById(0).Type()
    StrDesc = ExampleReqDesc.Struct().FieldById(1).Type()
    BaseLogidPath = []dg.Path{dg.NewPathFieldName("Base"), dg.NewPathFieldName("LogID")}
}
```

3. 将 request body 传递给业务 handler 进行处理逻辑，具体操作基于 dynamicgo/thrift.Value 的封装 API 进行。路径传递有两种方式（假设 A 为 Struct 字段名，B 为 Map key）：

   1. 一次性传入：`Value.GetByPath([]Path{NewPathFieldName(A), NewPathStrKey(B)})`
   2. 链式调用：`Value.FieldByName(A).GetByStr(B)`

```go
 // biz logic
func ExampleValueServiceHandler(request []byte) (resp []byte, err error) {
    // wrap body as Value
    req := dg.NewValue(ExampleReqDesc, request)
    if err != nil {
        return nil, err
    }

    required_field := ""
    logid := ""
    // if B == true then get logid and required_field
    if b, err := req.FieldByName("B").Bool(); err == nil && b {
        if e := req.GetByPath(BaseLogidPath...); e.Error() != ""{
            return nil, e
        } else {
            logid, _ = e.String()
        }
        if a := req.FieldByName("TestMap").GetByStr("a"); a.Error() != "" {
            return nil, a
        } else {
            required_field, _ = a.FieldByName("Bar").String()
        }
    }

    // make response with checked values
    return MakeExampleRespBinary(RespMsg, required_field, logid)
}

```

4. 处理完 request 之后，基于 dynamicgo/thrift.PathNode 进行构造 response 进行返回

```go

// MakeExampleRespBinary make a Thrift-Binary-Encoding response using ExampleResp structured DOM
// Except msg, required_field and logid, which are reset everytime
func MakeExampleRespBinary(msg string, require_field string, logid string) ([]byte, error) {
    dom := dg.PathNode{
        Node: dg.NewTypedNode(thrift.STRUCT, 0, 0),
        Next: []dg.PathNode{
            {
                Path: dg.NewPathFieldId(1),
                Node: dg.NewNodeString(msg),
            },
            {
                Path: dg.NewPathFieldId(2),
                Node: dg.NewNodeString(require_field),
            },
            {
                Path: dg.NewPathFieldId(255),
                Node: dg.NewTypedNode(thrift.STRUCT, 0, 0),
                Next: []dg.PathNode{
                    {
                        Path: dg.NewPathFieldId(1),
                        Node: dg.NewNodeString(logid),
                    },
                },
            },
        },
    }
    return dom.Marshal(DynamicgoOptions)
}
```

5. 最后，注册并启动二进制泛化 server

```go
func initServer() {
    // init special server
    addr, _ := net.ResolveTCPAddr("tcp", ":9009")
    g := generic.BinaryThriftGeneric()
    svr := genericserver.NewServer(new(ExampleValueServiceImpl), g, server.WithServiceAddr(addr))
    go func() {
        err := svr.Run()
        if err != nil {
            panic(err)
        }
    }()
    time.Sleep(500 * time.Millisecond)
}
```

## Client （Thrift Node + DOM）

1. 初始化二进制泛化 client

```go
var cli genericclient.Client

func initClient() {
    g := generic.BinaryThriftGeneric()
    genericCli, _ := genericclient.NewClient("destServiceName", g, client.WithHostPorts("127.0.0.1:9009"))
    cli = genericCli
}
```

2. 构造业务请求，基于 dynamicgo/generic.PathNode 进行

```go
// MakeExampleReqBinary make a Thrift-Binary-Encoding request using ExampleReq structured DOM
// Except B, A and logid, which are reset everytime
func MakeExampleReqBinary(B bool, A string, logid string) ([]byte, error) {
    dom := dg.PathNode{
        Node: dg.NewTypedNode(thrift.STRUCT, 0, 0),
        Next: []dg.PathNode{
            {
                Path: dg.NewPathFieldId(1),
                Node: dg.NewNodeString("Hello"),
            },
            {
                Path: dg.NewPathFieldId(2),
                Node: dg.NewNodeInt32(1),
            },
            {
                Path: dg.NewPathFieldId(3),
                Node: dg.NewTypedNode(thrift.LIST, thrift.STRUCT, 0),
                Next: []dg.PathNode{
                    {
                        Path: dg.NewPathIndex(0),
                        Node: dg.NewTypedNode(thrift.STRUCT, 0, 0),
                        Next: []dg.PathNode{
                            {
                                Path: dg.NewPathFieldId(1),
                                Node: dg.NewNodeString(A),
                            },
                        },
                    },
                },
            },
            {
                Path: dg.NewPathFieldId(4),
                Node: dg.NewTypedNode(thrift.MAP, thrift.STRUCT, thrift.STRING),
                Next: []dg.PathNode{
                    {
                        Path: dg.NewPathStrKey("a"),
                        Node:  dg.NewTypedNode(thrift.STRUCT, 0, 0),
                        Next: []dg.PathNode{
                            {
                                Path: dg.NewPathFieldId(1),
                                Node: dg.NewNodeString(A),
                            },
                        },
                    },
                },
            },
            {
                Path: dg.NewPathFieldId(6),
                Node: dg.NewTypedNode(thrift.LIST,  thrift.I64, 0),
                Next: []dg.PathNode{
                    {
                        Path: dg.NewPathIndex(0),
                        Node: dg.NewNodeInt64(1),
                    },
                    {
                        Path: dg.NewPathIndex(1),
                        Node: dg.NewNodeInt64(2),
                    },
                    {
                        Path: dg.NewPathIndex(2),
                        Node: dg.NewNodeInt64(3),
                    },
                },
            },
            {
                Path: dg.NewPathFieldId(7),
                Node: dg.NewNodeBool(B),
            },
            {
                Path: dg.NewPathFieldId(255),
                Node: dg.NewTypedNode(thrift.STRUCT, 0, 0),
                Next: []dg.PathNode{
                    {
                        Path: dg.NewPathFieldId(1),
                        Node: dg.NewNodeString(logid),
                    },
                    {
                        Path: dg.NewPathFieldId(2),
                        Node: dg.NewNodeString("a.b.c"),
                    },
                    {
                        Path: dg.NewPathFieldId(3),
                        Node: dg.NewNodeString("127.0.0.1"),
                    },
                    {
                        Path: dg.NewPathFieldId(4),
                        Node: dg.NewNodeString("dynamicgo"),
                    },
                },
            },
        },
    }
    return dom.Marshal(DynamicgoOptions)
}
```

3. 封装 thrift binary message，发起二进制泛化调用

```go
func TestThriftReflect(t *testing.T) {
    log_id := strconv.Itoa(rand.Int())

    // make a request body
    req, err := MakeExampleReqBinary(true, ReqMsg, log_id)
    test.Assert(t, err == nil, err)

    // wrap request as thrift CALL message
    buf, err := dt.WrapBinaryBody(req, Method, dt.CALL, 1, 0)
    test.Assert(t, err == nil, err)

    // generic call
    out, err := cli.GenericCall(context.Background(), Method, buf, callopt.WithRPCTimeout(1*time.Second))
    test.Assert(t, err == nil, err)

    // unwrap REPLY message and get resp body
    _, _, _, _, body, err := dt.UnwrapBinaryMessage(out.([]byte))
    test.Assert(t, err == nil, err)

    // biz logic...
    ExampleClientHandler(t, body, log_id)
}
```

4. ExampleClientHandler 为具体业务逻辑，这里可根据业务需要先将 response body 封装成 dynamicgo/generic.Node **或** PathNode (DOM），并基于其 API 进行业务逻辑处理

```go
// biz logic...
func ExampleClientHandler_Node(response []byte, log_id string) error {
    // make dynamicgo/generic.Node with body
    resp := dg.NewNode(dt.STRUCT, response)

    // check node values by Node APIs
    msg, err := resp.Field(1).String()
    if err != nil {
        return err
    }
    if msg != RespMsg {
        return errors.New("msg does not match")
    }
    require_field, err := resp.Field(2).String()
    if err != nil {
        return err
    }
    if require_field != ReqMsg {
        return errors.New("require_field does not match")
    }

    return nil
}

func ExampleClientHandler_DOM(response []byte, log_id string) error {
    // get dom from memory pool
    root := clientRespPool.Get().(*dg.PathNode)
    root.Node = dg.NewNode(dt.STRUCT, response)

    // load **first layer** children
    err := root.Load(false, DynamicgoOptions)
    if err != nil {
        return err
    }
    // spew.Dump(root) // -- only root.Next is set
    // check node values by PathNode APIs
    require_field2, err := root.Field(2, DynamicgoOptions).Node.String()
    if err != nil {
        return err
    }
    if require_field2 != ReqMsg {
        return errors.New("require_field2 does not match")
    }

    // load **all layers** children
    err = root.Load(true, DynamicgoOptions)
    if err != nil {
        return err
    }
    // spew.Dump(root) // -- every PathNode.Next will be set if it is a nesting-typed (LIST/SET/MAP/STRUCT)
    // check node values by PathNode APIs
    logid, err := root.Field(255, DynamicgoOptions).Field(1, DynamicgoOptions).Node.String()
    if logid != log_id {
        return errors.New("logid not match")
    }

    // recycle DOM
    root.ResetValue()
    clientRespPool.Put(root)
    return nil
}
```

注意，这里使用了**内存池化来进行 DOM 的取用**，可大幅提升 Thrift 反序列化性能。

## 性能测试

- [数据](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/idl/example.thrift)
- 代码

  - [Thrift reflect](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/reflect_test.go)
  - [Map](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/map_test.go)

- 环境

  - goos: darwin
  - goarch: amd64
  - cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz

- 测试结果

小数据 (266B)

```go
BenchmarkThriftMapExample-16                    9633        109521 ns/op        7622 B/op        138 allocs/op
BenchmarkThriftReflectExample_Node-16          14732         74397 ns/op        4416 B/op         76 allocs/op
BenchmarkThriftReflectExample_DOM-16           14666         84119 ns/op        4435 B/op         76 allocs/op
```

中数据（1766B）

```go
BenchmarkThriftMapExample-16                    3484        310349 ns/op      179561 B/op       2250 allocs/op
BenchmarkThriftReflectExample_Node-16          10813        108230 ns/op       45291 B/op        478 allocs/op
BenchmarkThriftReflectExample_DOM-16           10000        115363 ns/op       45412 B/op        478 allocs/op
```

大数据（150KB）

```go
BenchmarkThriftMapExample-16                      57      18063936 ns/op    17491551 B/op     220247 allocs/op
BenchmarkThriftReflectExample_Node-16            322       3671377 ns/op     4332477 B/op      50029 allocs/op
BenchmarkThriftReflectExample_DOM-16             321       3719926 ns/op     4333837 B/op      50032 allocs/op
```

可以看到，随着数据量级不断增加，Thrift 反射相比 map 泛化的性能优势越来越大（可达 3 倍以上）

## Tips:

### 根据 IDL 快速构造 DOM

可以使用 [generic.DescriptorToPathNode ](https://github.com/cloudwego/dynamicgo/tree/main/thrift/generic#func-descriptortopathnode)进行快速构造 struct DOM（**零值）**

```go
svc, err := thrift.NewDescritorFromPath(context.Background(), IDLPATH)
desc := svc.Functions()[METHODNAME].Request().Struct().FieldById(1).Type() // ex: service.METHOD(1: req)

var dom = new(PathNode)
err := DescriptorToPathNode(desc, dom, &Options{})
```

然后根据业务逻辑遍历 DOM 去修改特定字段

```go
for i, v := range dom.Next {
    if v.Path.Type() == PathTypeFieldName && v.Path.Str() == "XXXX" {
        dom.Next[i] = NewNodeString("YYYY")
    }
    ....
}
```

### 根据 样本请求 快速构造 Node/Value

假定业务可以通过某种方式获取到下游服务的一个正常请求的 thrift message 二进制数据，则可以将其作为全局常量（或定时异步更新），每次 [NewNode(](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#func-newnode))+[Set](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#func-node-setbypath)()更新特定业务字段来实现快速构造 Node

```go
var sampleRequestData []byte // get it by RPC requestX.Write() ...

func GetNewRequest(idXX int, nameXX string) []byte {
    n := NewNode(thrift.STRUCT, sampleRequestData)
    n.SetMany([]PathNode{
        {Path:NewPathFieldId(1), Node:NewNodeInt64(idXXX)},
        {Path:NewPathFieldId(2), Node:NewNodeString(nameXX)},
    }, opts)
    data, err := n.Marshal(opts)
    return data
}
```

## 注意

1. 当前 dynamicgo 仅支持 **thrift-binary** 编码方式
2. 当前 二进制泛化 仅支持 **thrift-framed** 传输协议
