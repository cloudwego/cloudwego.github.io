---
title: "Use Thrift reflection to improve generic-call performance"
date: 2023-12-17
weight: 5
keywords: ["dynamic", "thrift", "generic-call"]
description: "Use Thrift reflection to improve generic-call performance"
---

## What is  Thrift Reflection ?

In short, **similar to [pb reflect](https://pkg.go.dev/google.golang.org/protobuf/reflect/protoreflect), it does not rely on static code to add, delete, modify, and write Thrift data** .

Reflection uses specific generics to describe any data at runtime. Compared with static struct, it has the characteristics of **flexible addition, deletion, and modification, and does not depend on static code** . Currently [dynamicgo](https://github.com/cloudwego/dynamicgo) has implemented a set of reflection APIs  for the thrift binary protocol, which can be roughly divided into Thrift Value/Node and Thrift DOM  according to usage scenarios.

## Thrift Value/Node

Used for the **addition, deletion, modification, and lookup of a small number of fields in** rpc data packets . For a given path (field id/field name/map key/list index), based on the data type carried by the encoding , **skip unnecessary data nodes in ByteFlow** , **locate the required data in the start and end intervals of ByteFlow** for processing. Specific usage scenarios include **sensitive field erasure, data packet clipping, protocol conversion** , etc. Dynamicgo provides [thrift/generic. Value ](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#type-value)and [thrift/generic. Node ](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#type-node)two encapsulations: the former can support lookup based on FieldName , but needs to bind dynamic type description TypeDescriptor ; the latter does not support lookup based on FieldName (but supports FieldID) , so it does not require dynamic type description .

## Thrift DOM

The **document object tree model** is used to **describe the full deserialization  of Thrift data** . Since the Thrift protocol itself has self-description ability, we can deserialize it into a specific tree structure for more complex **container traversal , field bit shifting** and other operations. Specific business scenarios include **DSL mapping, data packet merging**, etc. in BFF services. Dynamicgo provides [thrift/generic. PathNode ](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#type-pathnode)encapsulation, which can handle thrift data of arbitrary complexity without binding dynamic type descriptions.

## Why use Thrift generics instead of Kitex Map/JSON generalization calls ?

In short: **better performance** .

Thrift generic requirements generally come from  **rpc  generalization calls, http < > rpc protocol conversion** and other centralized API gateways\ BFF scenarios, often with high performance requirements. However, Kitex Map/JSON generalization calls are implemented in the current map + interface mode, which inevitably brings a large number of fragmented heap memory allocation , and its performance is far worse than that of kitex rpc services in normal code generation mode. In contrast, both the efficient skip algorithm of Thrift Value and the carefully designed memory structure of Thrift DOM can effectively avoid a large number of runtime memory allocation and intermediate codec conversion. See [introduction](https://github.com/cloudwego/dynamicgo/blob/main/introduction.md) for detailed design and implementation.

For specific comparison results, please refer to the section "Test Data" below.

## Usage example

The following will demonstrate how to generalize calls based on **kitex-binary generalization + dynamicgo** . Note unfamiliar kitex-binary generalization colleagues can refer to [generic-call documents ](https://www.cloudwego.io/docs/kitex/tutorials/advanced-feature/generic-call/#1-binary-generic)first.

See the complete example:

- [code](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/reflect_test.go)
- [IDL](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/idl/example.thrift)

## Server （Thrift Value + DOM）

1. First, implement a type of kitex /generic/Server interface, and internally unpack the thrift-binary message into methodName, seqID, request body

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

2. Because the use of Thrift Value here requires specific binding corresponding to the dynamic type description of the IDL , it can be loaded in the initialization stage (Note: Dynamic updates are not considered here , if necessary, you can implement an atomic update global variable)

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

3. Pass the request body to the business handler for processing logic. The specific operation is based on the encapsulation API of dynamicgo/thrift. Value. There are two ways to pass the path (assuming A is the Struct field name and B is the Map key):

   1. One-time pass: `Value.GetByPath([]Path{NewPathFieldName(A), NewPathStrKey(B)})`
   2. Chain call: `Value.FieldByName(A).GetByStr(B)`

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

4. After processing the request, construct a response based on dynamicgo/thrift. PathNode for return

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

5. Finally, register and start the binary generalization server

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

1. Initialize binary generalization client

```go
var cli genericclient.Client

func initClient() {
    g := generic.BinaryThriftGeneric()
    genericCli, _ := genericclient.NewClient("destServiceName", g, client.WithHostPorts("127.0.0.1:9009"))
    cli = genericCli
}
```

2. Construct business request based on dynamicgo/generic. PathNode

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

3. Encapsulates thrift  binary message, initiates binary generalization call

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

4. ExampleClientHandler is specific business logic, here according to business needs first response body package dynamicgo/generic. Node **or** PathNode ( DOM ), and based on its API for business logic processing

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

Note that **memory pooling is used for DOM access** , which can greatly improve Thrift 's deserialization performance.

## Performance testing

- Test [data](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/idl/example.thrift)
- Test code

  - Thrift [reflect](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/reflect_test.go)
  - [Map](https://github.com/cloudwego/kitex/blob/cc85ab10fbdc7519c90ed7b25e2533127a1ddd82/pkg/generic/reflect_test/map_test.go)
- Testing environment

  - goos: darwin
  - goarch: amd64
  - cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz
- Test results

Small Data (266B)

```go
BenchmarkThriftMapExample-16                    9633        109521 ns/op        7622 B/op        138 allocs/op
BenchmarkThriftReflectExample_Node-16          14732         74397 ns/op        4416 B/op         76 allocs/op
BenchmarkThriftReflectExample_DOM-16           14666         84119 ns/op        4435 B/op         76 allocs/op
```

Medium data (1766B)

```go
BenchmarkThriftMapExample-16                    3484        310349 ns/op      179561 B/op       2250 allocs/op
BenchmarkThriftReflectExample_Node-16          10813        108230 ns/op       45291 B/op        478 allocs/op
BenchmarkThriftReflectExample_DOM-16           10000        115363 ns/op       45412 B/op        478 allocs/op
```

Big data (150 KB )

```go
BenchmarkThriftMapExample-16                      57      18063936 ns/op    17491551 B/op     220247 allocs/op
BenchmarkThriftReflectExample_Node-16            322       3671377 ns/op     4332477 B/op      50029 allocs/op
BenchmarkThriftReflectExample_DOM-16             321       3719926 ns/op     4333837 B/op      50032 allocs/op
```

It can be seen that as the data level continues to increase, the performance advantage of Thrift reflection over map generalization is increasing (up to more than 3 times).

## Tips:

### Quickly construct DOM from IDL

You can use [generic.DescriptorToPathNode ](https://github.com/cloudwego/dynamicgo/tree/main/thrift/generic#func-descriptortopathnode)to quickly construct the struct DOM ( **zero value**)

```go
svc, err := thrift.NewDescritorFromPath(context.Background(), IDLPATH)
desc := svc.Functions()[METHODNAME].Request().Struct().FieldById(1).Type() // ex: service.METHOD(1: req)

var dom = new(PathNode)
err := DescriptorToPathNode(desc, dom, &Options{})
```

Then traverse the DOM according to the business logic to modify specific fields

```go
for i, v := range dom.Next {
    if v.Path.Type() == PathTypeFieldName && v.Path.Str() == "XXXX" {
        dom.Next[i] = NewNodeString("YYYY")
    }
    ....
}
```

### Quickly Construct a Node /Value From Sample

Assuming that the business can obtain the thrift message binary data of a normal request to the downstream service in some way, it can be used as a global constant (or timed asynchronous update), and each time [NewNode ( ](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#func-newnode)) + [Set ](https://github.com/cloudwego/dynamicgo/blob/main/thrift/generic/README.md#func-node-setbypath)() updates a specific business field to achieve rapid construction of Node

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

## Attention

1. Currently dynamicgo only supports **thrift-binary**  encoding mode
2. Currently, binary generalization only supports the **thrift-framed** transport protocol

