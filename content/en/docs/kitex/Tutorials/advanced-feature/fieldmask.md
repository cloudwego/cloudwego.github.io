---
title: "Serialize Data Ondemands"
date: 2024-09-29
weight: 9
keywords: ["Serialize Data Ondemands"]
description: ""
---

## **What is thrift FieldMask**?

![](static/img/docsstatic/img/docs/kitex/Tutorials/advanced-feature/IQptbzlBdoFcPcxGbCwlSqpmgcb.png)

FieldMask is inspired by <u>[Protobuf](https://protobuf.dev/reference/protobuf/google.protobuf/#field-mask)</u> and used to indicate the data that users care about, and filter out useless data, during a RPC call, in order to reduce network package size and accelerate serializing/deserializing process. This technology has been widely used among Protobuf <u>[services](https://netflixtechblog.com/practical-api-design-at-netflix-part-1-using-protobuf-fieldmask-35cfdc606518)</u>.

## **How to construct a FieldMask**?

To construct a fieldmask, you need two things:

- Thrift Path for describing the data you want
- Type Descriptor for validating the thrift path you pass is compatible with thrift message definition (IDL)

### **Thrift Path**

#### **What is the thrift path**?

A path string represents an arbitrary endpoint of a thrift object. It is used for locating data from thrift root message, and defined from-top-to-bottom. For example, a thrift message defined as below:

```go
struct Example {
    1: string Foo,
    2: i64 Bar3: Example Self
}
```

A thrift path `$.Foo` represents the string value of Example.Foo, and `$.Self.Bar` represents the secondary layer i64 value of Example.Self.Bar Since thrift has four nesting types (LIST/SET/MAP/STRUCT), thrift paths should also support locating elements in all these types' objects, not only STRUCT.

#### **Syntax**

Here are basic hypothesis:

- `fieldname` is the field name of a field in a struct, it **MUST ONLY** contain '[a-zA-Z]' alphabet letters, integer numbers and char '_'.
- `index` is the index of an element in a list or set, it **MUST ONLY** contain integer numbers.
- `key` is the string-typed key of an element in a map. It can contain any letters, but it **MUST** be a quoted string.
- `id` is the integer-typed key of an element in a map, it **MUST ONLY** contain integer numbers.
- except `key`, ThriftPath **shouldn't** contains any blank chars (\n\r\b\t)

Here is detailed syntax:

- ThriftPath | Description
- -- | --
- $	| the root object,every path must start with it.
- .fieldname | get the child field of a struct corepsonding to fieldname. For example, $.FieldA.ChildrenB
- [index,index...] | get any number of elements in an List/Set corepsonding to indices. Indices must be integer.For example: $.FieldList[1,3,4] .Notice: a index beyond actual list size can written but is useless.
- {"key","key"...} | get any number of values corepsonding to key in a string-typed-key map. For example: $.StrMap{"abcd","1234"}
- {id,id...} | get the child field with specific id in a integer-typed-key map. For example, $.IntMap{1,2}
- * | get ALL fields/elements, that is: $.StrMap{*}.FieldX menas gets all the elements' FieldX in a map Root.StrMap; $.List[*].FieldX means get all the elements' FieldX in a list Root.List.
- 

#### **Agreement Of Implementation**

- **A empty mask means "PASS ALL**" (all fields are "PASS")
- For map of neither-string-nor-integer typed key, only '*' token is allowed as keys
- Required fields **CAN** be not in mask ("Filtered") while they will still be written as **current values**.

  - Tips: If you want the required field not in the mask to be written as a zero value, you can enable the option -`thrift field_mask_zero_required ` and regenerate the code. It should be noted that the STRUCT type also writes a zero value (only writes a FieldStop (0)) - this means that if the STRUCT contains a required field, it may cause the other party to report an error
- FieldMask settings must **start from the root object**.

  - Tips: If you want to set FieldMask from a non-root object and make it effective, you need to **add** -`thrift field_mask_halfway` **options and regenerate the code** . However, there is a latent risk: if different parent objects reference the same child object, and these two parent objects set different fieldmasks, only one parent object's fieldmask relative to this child object will be effective.

#### **Visibility（Black-list or White-list**)

By default, a field in mask means "**PASS**" (**will be** serialized/deserialized),  and the other fields not in mask means "REJECT" (**won't be** serialized/deserialized) -- which is so-called "**White List**"

However, we allow user to use fieldmask as a "**Black List**", as long as enable option `Options.BlackList`. Under such mode, a field in the mask means "REJECT", and the other fields means "PASS". See [main_test.go](https://github.com/cloudwego/kitex-tests/blob/feat/fieldmask_test/thriftrpc/fieldmask/main_test.go) for detailed usage

### **Type Descriptor**

Type descriptor is the runtime representation of a message definition, in aligned with <u>[Protobuf Descriptor](https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/descriptor.proto)</u>. To get a type descriptor, you must enable thrift reflection feature first, which was introduced in thriftgo <u>[v0.3.0](https://github.com/cloudwego/thriftgo/pull/83)</u>. You can generate related codes for this feature using option `with_reflection`.

## **How to use FieldMask**?

See [main_test.go](https://github.com/cloudwego/kitex-tests/blob/feat/fieldmask_test/thriftrpc/fieldmask/main_test.go) for details.

1. First, you must generates codes for this feature using two options `with_fieldmask` and `with_reflection` （ex: [fieldmask.thrift](https://github.com/cloudwego/kitex-tests/blob/feat/fieldmask_test/idl/fieldmask.thrift))

```
$ kitex -thrift with_field_mask -thrift with_reflection ${your_idl}
```

2. Create a fieldmask in the initializing phase of your application (recommended), or just in the bizhandler before you return a response

```go
import (
    "sync""github.com/cloudwego/thriftgo/fieldmask"
    nbase "github.com/cloudwego/thriftgo/test/golang/fieldmask/gen-new/base"
)

var fieldmaskCache sync.Mapfunc 

// initialize request and response fieldmasks and cache them
func init() {
    // construct a fieldmask with TypeDescriptor and thrift paths
    respMask, err := fieldmask.NewFieldMask((*fieldmask0.BizResponse)(nil).GetTypeDescriptor(), 
    "$.A")
    if err != nil {
            panic(err)
    }
    fmCache.Store("BizResponse", respMask)
    
    reqMask, err := fieldmask.NewFieldMask((*fieldmask0.BizRequest)(nil).GetTypeDescriptor(), 
    "$.B", "$.RespMask")
    if err != nil {
            panic(err)
    }
    fmCache.Store("BizRequest", reqMask)
}
```

3. Now you can set fieldmask with generated API `Set_FieldMask()` on your request or response object. Then the kitex itself will notice the fieldmask and using it during request/response's serialization, in either client-side or server-side.

- server-side

```go
func (s *BizServiceImpl) BizMethod1(ctx context.Context, req *biz.BizRequest) (resp *biz.BizResponse, err error) {
    resp := biz.NewBizResponse() // resp = biz.NewBizResponse
    resp.A = "A"
    resp.B = "B"
    // try set resp's fieldmask
    respMask, ok := fmCache.Load("BizResponse")
    if ok {
        resp.Set_FieldMask(respMask.(*fieldmask.FieldMask))
    }
    return resp, nil
}
```

- client-side

```go
req := fieldmask0.NewBizRequest()
req.A = "A"
req.B = "B"
// try set request's fieldmask
reqMask, ok := fmCache.Load("BizRequest")
if ok {
    req.Set_FieldMask(reqMask.(*fieldmask.FieldMask))
}
resp, err := cli.BizMethod1(context.Background(), req)
```

4. Once you set fieldmask for request/response, the other side will only receive the real values of non-required fields that the fieldmask sets, or zero values of required fields that fieldmask doesn't mask

- client-side

```go
if resp.A == "" { // resp.A in mask
    t.Fail()
}
if resp.B != "" { // resp.B not in mask
    t.Fail()
}
```

- Server-side

```go
if req.A != "" { // req.A not in mask
    return nil, errors.New("request must mask BizRequest.A!")
}
if req.B == "" { // req.B in mask
    return nil, errors.New("request must not mask BizRequest.B!")
}
```

## **How to pass FieldMask between programs**?

Generally, you can add one binary field to your request definition to carry a fieldmask, and explicitly serialize/deserialize the fieldmask you are using into/from this field. We provide two encapsulated API for serialization/deserialization:

- <u>[thriftgo/fieldmask.Marshal()/Unmarshal()](https://github.com/cloudwego/thriftgo/blob/9e8d1cafba62a37789c431270a816ad35a6c46e0/fieldmask/serdes.go)</u>: Package functions, serialize/deserialize fieldmask into/from binary bytes. We recommend you to use this API rather than the last one, because it is **much faster** due to using cache -- Unless your application is lack of memory.
- <u>[FieldMask.MarshalJSON()/UnmarshalJSON()](https://github.com/cloudwego/thriftgo/blob/9e8d1cafba62a37789c431270a816ad35a6c46e0/fieldmask/serdes.go)</u>: Object methods, serialize/deserialize fieldmask into/from JSON bytes (not recommended)

For example, we can pass the response's fieldmask as **a** **binary-typed field of request** like:

- client-side

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

- Server-side

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

## Performance

Mainly depends on the ratio of pruned data. See <u>[baseline_test.go](https://github.com/cloudwego/kitex-tests/blob/feat/fieldmask_test/codegen/fieldmask/baseline_test.go)</u>

```
goos: darwin
goarch: amd64
cpu: Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz
BenchmarkFastWriteSimple/full-16        47.70 ns/op        0 B/op          0 allocs/op
BenchmarkFastWriteSimple/half-16        46.61 ns/op        0 B/op          0 allocs/op
BenchmarkFastReadSimple/full-16         115.1 ns/op       80 B/op          2 allocs/op
BenchmarkFastReadSimple/half-16         103.6 ns/op       48 B/op          1 allocs/op
BenchmarkFastWriteNesting/full-16      4505 ns/op          0 B/op          0 allocs/op
BenchmarkFastWriteNesting/half-16      2121 ns/op          0 B/op          0 allocs/op
BenchmarkFastReadNesting/full-16      13864 ns/op      11874 B/op        173 allocs/op
BenchmarkFastReadNesting/half-16       7938 ns/op       5273 B/op         77 allocs/op
```

Cases:

- Simple: one-layer-fields struct, data size 114B
- Nesting: two-layer-fields struct, data size 6455B
- FastWrite: serialization test
- FastRead: deserialization test
- full: generate with_fieldmask API, but not use fieldmask
- half: generate with_fieldmask API and use fieldmask to mask half of the data

## Getting the code (WIP)

This feature is under development now. If you want to try, you can **get the branch codes** and **install corresponding binary tool**.

- Thriftgo

  - Cmd tool ： >= v0.3.12

  ```go
  go install github.com/cloudwego/thriftgo@v0.3.12
  ```

  - lib

```bash
go get github.com/cloudwego/thriftgo@v0.3.12
```

- Kitex : >= v0.10.0

  - Cmd tool

  ```go
  go install github.com/cloudwego/kitex/tool/cmd/kitex@v0.10.0
  ```
  - lib

  ```go
  go get github.com/cloudwego/kitex@v0.10.0
  ```
