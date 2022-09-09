---
title: "Frugal"
date: 2022-08-26
weight: 4
description: >
---

[Frugal](https://github.com/cloudwego/frugal) 是一款基于 JIT 编译的高性能动态 Thrift 编解码器。

## 特点

### 无需生成代码

传统的 Thrift 编解码方式，要求用户必须要先生成编解码代码，Frugal 通过 JIT 编译技术在运行时动态生成编解码机器代码，避免了这一过程。

### 高性能

基于 JIT 技术 Frugal 可以生成比 Go 语言编译器性能更好的机器代码，在多核场景下，Frugal 的性能可以达到传统编解码方式的 5 倍左右。

```text
name                                 old time/op    new time/op     delta
MarshalAllSize_Parallel/small-16       78.8ns ± 0%     14.9ns ± 0%    -81.10%
MarshalAllSize_Parallel/medium-16      1.34µs ± 0%     0.32µs ± 0%    -76.32%
MarshalAllSize_Parallel/large-16       37.7µs ± 0%      9.4µs ± 0%    -75.02%
UnmarshalAllSize_Parallel/small-16      368ns ± 0%       30ns ± 0%    -91.90%
UnmarshalAllSize_Parallel/medium-16    11.9µs ± 0%      0.8µs ± 0%    -92.98%
UnmarshalAllSize_Parallel/large-16      233µs ± 0%       21µs ± 0%    -90.99%

name                                 old speed      new speed       delta
MarshalAllSize_Parallel/small-16     7.31GB/s ± 0%  38.65GB/s ± 0%   +428.84%
MarshalAllSize_Parallel/medium-16    12.9GB/s ± 0%   54.7GB/s ± 0%   +322.10%
MarshalAllSize_Parallel/large-16     11.7GB/s ± 0%   46.8GB/s ± 0%   +300.26%
UnmarshalAllSize_Parallel/small-16   1.56GB/s ± 0%  19.31GB/s ± 0%  +1134.41%
UnmarshalAllSize_Parallel/medium-16  1.46GB/s ± 0%  20.80GB/s ± 0%  +1324.55%
UnmarshalAllSize_Parallel/large-16   1.89GB/s ± 0%  20.98GB/s ± 0%  +1009.73%

name                                 old alloc/op   new alloc/op    delta
MarshalAllSize_Parallel/small-16         112B ± 0%         0B        -100.00%
MarshalAllSize_Parallel/medium-16        112B ± 0%         0B        -100.00%
MarshalAllSize_Parallel/large-16         779B ± 0%        57B ± 0%    -92.68%
UnmarshalAllSize_Parallel/small-16     1.31kB ± 0%     0.10kB ± 0%    -92.76%
UnmarshalAllSize_Parallel/medium-16      448B ± 0%      3022B ± 0%   +574.55%
UnmarshalAllSize_Parallel/large-16     1.13MB ± 0%     0.07MB ± 0%    -93.54%

name                                 old allocs/op  new allocs/op   delta
MarshalAllSize_Parallel/small-16         1.00 ± 0%       0.00        -100.00%
MarshalAllSize_Parallel/medium-16        1.00 ± 0%       0.00        -100.00%
MarshalAllSize_Parallel/large-16         1.00 ± 0%       0.00        -100.00%
UnmarshalAllSize_Parallel/small-16       6.00 ± 0%       1.00 ± 0%    -83.33%
UnmarshalAllSize_Parallel/medium-16      6.00 ± 0%      30.00 ± 0%   +400.00%
UnmarshalAllSize_Parallel/large-16      4.80k ± 0%      0.76k ± 0%    -84.10%
```

## 用 Frugal 可以做什么？

### 使用 Frugal 作为 Kitex 的编解码

可以不用再生成大量的编解码代码，使仓库变得干净整洁，review 时也不用再带上一堆无意义的 diff。然后相比于生成的编解码代码，Frugal 的性能更高。

### 在 Thriftgo 生成的 struct 上进行编解码

如果你只需要使用 Thrift 的编解码能力，同时也定义好了 IDL，那么只需要用 [Thriftgo](https://github.com/cloudwego/thriftgo) 生成 IDL 对应的 Go 语言 struct，就可以使用 Frugal 的编解码能力了。

### 直接定义 struct 进行编解码

如果你们连 IDL 都不想有，没问题，直径定义好 Go 语言 struct 后，给每个 Field 带上 Frugal 所需的 tag，就可以直接使用 Frugal 进行编解码了。

## 使用手册

### 配合 Kitex 使用

#### 1. 更新 Kitex 到 v0.4.2 以上版本

```shell
go get github.com/cloudwego/kitex@latest
```

#### 2. 带上 `-thrift frugal_tag` 参数重新生成一次代码

示例：

```shell
kitex -thrift frugal_tag -service a.b.c my.thrift
```

如果不需要编解码代码，可以带上 `-thrift template=slim` 参数

```shell
kitex -thrift frugal_tag,template=slim -service a.b.c my.thrift
```

#### 3. 初始化 client 和 server 时使用 `WithPayloadCodec(thrift.NewThriftFrugalCodec())` option

client 示例：

```go
package client

import (
    "context"

    "github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
)

func Echo() {
    codec := thrift.NewThriftCodecWithConfig(thrift.FastRead | thrift.FastWrite | thrift.FrugalRead | thrift.FrugalWrite)
    cli := echo.MustNewClient("a.b.c", client.WithPayloadCodec(codec))
    ...
}
```

server 示例：

```go
package main

import (
    "log"

    "github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
    "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
    "github.com/cloudwego/kitex/server"
)

func main() {
    codec := thrift.NewThriftCodecWithConfig(thrift.FastRead | thrift.FastWrite | thrift.FrugalRead | thrift.FrugalWrite)
    svr := server.NewServer(new(EchoImpl), server.WithPayloadCodec(codec))

    err := svr.Run()
    if err != nil {
        log.Println(err.Error())
    }
}
```

### 配合 Thriftgo 做 Thrift IDL 的编解码

#### 编写 Thrift 文件

现在假设我们有如下 Thrift 文件：
my.thrift:

```thrift
struct MyStruct {
    1: string msg
    2: i64 code
}
```

#### 使用 Thriftgo 生成代码

定义好需要的 Thrift 文件后，在使用 Thriftgo 生成 Go 语言代码时使用 `frugal_tag` 参数。
示例：

```shell
thriftgo -r -o thrift -g go:frugal_tag,package_prefix=example.com/kitex_test/thrift my.thrift
```

如果不需要编解码代码，可以带上 `template=slim` 参数

```shell
thriftgo -r -o thrift -g go:frugal_tag,template=slim,package_prefix=example.com/kitex_test/thrift my.thrift
```

#### 使用 Frugal 进行编解码

生成所需要的结构体后，直接使用 Frugal 进行编解码即可。
示例：

```go
package main

import (
    "github.com/cloudwego/frugal"
)

func main() {
    ms := &thrift.MyStruct{
        Msg: "my message",
        Code: 1024,
    }
    ...
    buf := make([]byte, frugal.EncodedSize(ms))
    frugal.EncodeObject(buf, nil, ms)
    ...
    got := &thrift.MyStruct{}
    frugal.DecodeObject(buf, got)
    ...
}
```

### 直接定义 struct 进行编解码

#### 定义 struct

现在假设我们需要如下 struct：

```go
type MyStruct struct {
    Msg     string
    Code    int64
    Numbers []int64
}
```

#### 给结构体字段添加 tag

Frugal 所需的 tag 形如 `frugal:"1,default,string"`，其中 `1` 为字段 ID， `default` 为字段的 requiredness， `string` 表示字段的类型。字段 ID 和 字段 requiredness 是必须的，但是字段类型只有当字段为 `list` 、`set` 和 `enum` 时是必须的。

上述的 `MyStruct` 可以添加如下 tag：

```go
type MyStruct struct {
    Msg     string  `frugal:"1,default"`
    Code    int64   `frugal:"2,default"`
    Numbers []int64 `frugal:"3,default,list<i64>"`
}
```

下面是完整的类型示例：

```go
type MyEnum int64

type Example struct {
 MyOptBool         *bool            `frugal:"1,optional"`
 MyReqBool         bool             `frugal:"2,required"`
 MyOptByte         *int8            `frugal:"3,optional"`
 MyReqByte         int8             `frugal:"4,required"`
 MyOptI16          *int16           `frugal:"5,optional"`
 MyReqI16          int16            `frugal:"6,required"`
 MyOptI32          *int32           `frugal:"7,optional"`
 MyReqI32          int32            `frugal:"8,required"`
 MyOptI64          *int64           `frugal:"9,optional"`
 MyReqI64          int64            `frugal:"10,required"`
 MyOptString       *string          `frugal:"11,optional"`
 MyReqString       string           `frugal:"12,required"`
 MyOptBinary       []byte           `frugal:"13,optional"`
 MyReqBinary       []byte           `frugal:"14,required"`
 MyOptI64Set       []int64          `frugal:"15,optional,set<i64>"`
 MyReqI64Set       []int64          `frugal:"16,required,set<i64>"`
 MyOptI64List      []int64          `frugal:"17,optional,list<i64>"`
 MyReqI64List      []int64          `frugal:"18,required,list<i64>"`
 MyOptI64StringMap map[int64]string `frugal:"19,optional"`
 MyReqI64StringMap map[int64]string `frugal:"20,required"`
 MyOptEnum         *MyEnum          `frugal:"21,optional,i64"`
 MyReqEnum         *MyEnum          `frugal:"22,optional,i64"`
}
```

#### 使用 Frugal 进行编解码

直接使用 Frugal 进行编解码即可。
示例：

```go
package main

import (
    "github.com/cloudwego/frugal"
)

func main() {
    ms := &thrift.MyStruct{
        Msg: "my message",
        Code: 1024,
        Numbers: []int64{0, 1, 2, 3, 4},
    }
    ...
    buf := make([]byte, frugal.EncodedSize(ms))
    frugal.EncodeObject(buf, nil, ms)
    ...
    got := &thrift.MyStruct{}
    frugal.DecodeObject(buf, got)
    ...
}
```
