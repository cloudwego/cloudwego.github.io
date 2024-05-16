---
title: "Frugal"
date: 2022-08-26
weight: 7
keywords: ["Frugal", "Codec", "Thrift"]
description: "Frugal 是一款可以不生成编解码代码、基于 JIT 的高性能动态 Thrift 编解码器，在大部分场景性能表现也比生成代码做编解码更好。"
---

Github 项目主页: https://github.com/cloudwego/frugal

## 使用方法

### Kitex 集成

说明：

1. Server 端和 Client 端 **可以独立使用** frugal；
   1. 传输的数据都是按标准 thrift 协议进行编码的；
2. 如 Server 端开启 Frugal，需确保 Client 端指定了 Framed 或 TTHeaderFramed 协议；
3. 如使用 slim 模板，必须指定 PayloadCodec 为开启 frugal；

#### 生成脚手架

Kitex 命令行工具内建了集成 frugal 的能力。

##### 命令行参数

###### **Frugal Tag: -thrift frugal_tag**

生成带有 frugal tag 的 Go struct，例如：

```go
type Request struct {
    Message string `thrift:"message,1" frugal:"1,default,string" json:"message"`
}
```

说明：

1. frugal 强依赖该 tag，例如 set 和 list 在 golang 对应的类型都是 slice，需通过 tag 区分；
2. 如无 frugal tag，kitex 会自动 fallback 到默认的 Go 编解码代码（前提是没使用 slim 模板）；
3. 如果不希望生成 frugal tag，可使用 -thrift frugal_tag = false。

Kitex >= v0.5.0 **默认**指定了该参数；旧版本需重手动指定该参数、执行 kitex 命令，例：

```bash
kitex -thrift frugal_tag -service service_name idl/api.thrift
```

###### **Pretouch: -frugal-pretouch**

在 `init()` 里生成调用 `frugal.Pretouch` 方法的代码，预处理（JIT 编译）所有请求/响应类型，减少首次请求耗时。

frugal 默认在首次编解码时调用 JIT Compiler，这会导致首次请求耗时较长。

例：

```bash
kitex -frugal-pretouch -service service_name idl/api.thrift
```

###### **Slim 模板: -thrift template=slim**

> 请升级 thriftgo 到 v0.3.0（或以上）；旧版本生成的 struct 在 optional 字段的编解码上存在问题。

不生成 Thrift 编解码的 Go 源码（该代码实现了 thrift.TProtocol 接口），以减少代码量，提高 IDE 加载及编译速度。附：使用 slim 模板生成的[样例代码](https://github.com/cloudwego/kitex-examples/blob/v0.2.2/kitex_gen/slim/api/echo.go)。

frugal 用 JIT 生成编解码代码，不依赖生成的 Go 编解码代码。

例：

```bash
kitex -thrift frugal_tag,template=slim -service service_name idl/api.thrift
```

注：开启 Slim 会导致在不支持 frugal 的情况下无法 fallback、只能报错（例如 arm 架构，或无法从请求头中获取 thrift payload 的长度）。

##### 示例用法

建议使用最新版 Kitex（>= v0.5.0）和 thriftgo（>= v0.3.0）。

###### **保守版**

```bash
kitex -thrift frugal_tag -service service_name idl/api.thrift
```

说明：

1. 新版 Kitex （>=0.5.0）默认会生成 frugal tag；
2. 不使用 pretouch：在单个项目里不一定所有类型都会被引用；可尝试打开后观察是否影响启动速度；
3. 不使用 slim 模板：在不支持 frugal 的场景可以 fallback 到生成的 Thrift 编解码代码；

###### **激进版**

```bash
kitex -thrift frugal_tag,template=slim -frugal-pretouch -service service_name idl/api.thrift
```

说明：

1. 开启 pretouch：可能会导致进程启动变慢
2. 启用 slim 模板：在不支持 frugal 的场景无法 fallback 到生成的 Thrift 编解码代码，只能报错；

#### Kitex Server

##### 注意事项

**请确保** Client 端指定了 Framed 模式（或 TTHeaderFramed）

- 使用 Framed 模式可以保证请求头包含 payload size
- 如果无法获取到 Payload Size，目前 Kitex Server 只能 fallback 到 Go 编解码代码
- 如开启 slim 模板，则无法 fallback，会报错 “decode failed, codec msg type not match”

##### server.Option

Server 初始化时的相关参数。

###### **server.WithPayloadCodec**

用于启用 Frugal 编解码器：

```go
server.WithPayloadCodec(
    thrift.NewThriftCodecWithConfig(thrift.FrugalRead | thrift.FrugalWrite)
)
```

注：如报错（找不到符号），说明当前 kitex 版本 + go 版本的组合不支持 frugal，例如 Go 1.21 + Kitex v0.7.1（Kitex 通过条件编译屏蔽不支持的版本）。

##### 示例代码

> 参考 [kitex-examples: frugal/server.go](https://github.com/cloudwego/kitex-examples/blob/v0.2.2/frugal/server.go)

```go
package main

import (
    "context"

    "github.com/cloudwego/kitex-examples/kitex_gen/api"
    "github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
    "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
    "github.com/cloudwego/kitex/server"
)

type EchoImpl struct{}

func (e EchoImpl) Echo(ctx context.Context, req *api.Request) (r *api.Response, err error) {
    return &api.Response{Message: req.Message}, nil
}

func main() {
    code := thrift.NewThriftCodecWithConfig(thrift.FrugalRead | thrift.FrugalWrite)
    svr := echo.NewServer(new(EchoImpl), server.WithPayloadCodec(code))
    err := svr.Run()
    if err != nil {
        panic(err)
    }
}
```

#### Kitex Client

Client 初始化时的相关参数。

##### client.Option

###### **client.WithPayloadCodec**

用于启用 Frugal 编解码器：

```go
client.WithPayloadCodec(
    thrift.NewThriftCodecWithConfig(thrift.FrugalRead | thrift.FrugalWrite)
)
```

注：如报错（找不到符号），说明当前 kitex 版本 + go 版本的组合不支持 frugal，例如 Go 1.21 + Kitex v0.7.1（Kitex 通过条件编译屏蔽不支持的版本）。

###### **client.WithTransportProtocol**

用于开启 Framed 模式，在 thrift pure payload 前增加 4 个字节（int32）用于告诉对端 payload size

```go
client.WithTransportProtocol(transport.Framed)
```

注：

1. 如不指定 Framed，可能存在如下问题:
   1. Server 端可能无法用 frugal 解码（因为读不到 Payload Size，详见 "Kitex Server -> 注意事项"）；
   2. Server 端不会返回 Framed Payload，Client 可能无法用 frugal 解码（因为读不到 Payload Size）；
2. 如果目标 Server 不支持 Framed，则不应指定。不影响 Client 侧使用 frugal 编码；但 Server 回包如不是 Framed，Client 可能无法用 frugal 解码（这种情况慎用 slim 模板）；
3. 也可使用 TTHeaderFramed（即 `TTHeader | Framed` 位与结果）。

##### 示例代码

```go
package main

import (
    "context"

    "github.com/cloudwego/kitex-examples/kitex_gen/api"
    "github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
    "github.com/cloudwego/kitex/client"
    "github.com/cloudwego/kitex/pkg/klog"
    "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
    "github.com/cloudwego/kitex/transport"
)

func main() {
    codec := thrift.NewThriftCodecWithConfig(thrift.FrugalRead | thrift.FrugalWrite)
    framed := client.WithTransportProtocol(transport.Framed)
    server := client.WithHostPorts("127.0.0.1:8888")
    cli := echo.MustNewClient("a.b.c", server, client.WithPayloadCodec(codec), framed)
    rsp, err := cli.Echo(context.Background(), &api.Request{Message: "Hello"})
    klog.Infof("resp: %v, err: %v", rsp, err)
}
```

### 直接使用 Frugal

某些场景（例如录制流量）可直接使用 frugal 编解码。

#### 构造 Go Struct

frugal 的 JIT 编译器依赖带 frugal tag 的 Go struct。

**注意：**

1. 由于一个方法的请求可能有多个参数，需要构造一个将这些参数按顺序封装起来的 struct，例如 Kitex 生成的结构体 [EchoEchoArgs](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L469) 封装了 [Request](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L12)；
2. 请求的响应虽然只有一个参数，但也要封装成一个 struct，例如 [EchoEchoResult](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L641) 封装了 [Response](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L176)；
3. 具体可参考[示例代码](https://github.com/cloudwego/kitex-examples/blob/v0.2.2/frugal/codec/frugal.go)。

##### 使用 kitex 命令行工具

参见上文 “Kitex 集成 -> 代码生成”。

注：kitex 通过调用 thriftgo 生成代码。

##### 使用 thriftgo (>= v0.3.0)

安装 thriftgo ( >= v0.3.0):

```bash
go install -v github.com/cloudwego/thriftgo@latest
```

基于 Thrift IDL 生成 Go struct:

```go
thriftgo -r -o thrift -g go:frugal_tag,template=slim,package_prefix=github.com/example echo.thrift
```

##### 手动编写（不建议）

请参考 thriftgo 生成的 struct （例：[Request](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L12)、[Response](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L176)）。

注意：

1. 每个字段都应有 frugal tag；
2. 对于 optional 字段，需在 `InitDefault()` 方法里写入默认值；
3. 需要构造封装请求/响应参数的结构体（例：[EchoEchoArgs](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L469)、[EchoEchoResult](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L641)）

#### 编码

如只想用 thrift 编码（例如替代 json），可直接调用 `frugal.EncodeObject(..)` 方法。

如想生成符合 [Thrift Binary protocol encoding](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md) 的 Thrift Payload（可发送给 Thrift Server），编码结果应含：

1. Thrift Magic Number：int16，固定值 0x8001
2. MessageType：int16，枚举值 CALL=1, REPLY=2, Exception=3, Oneway=4
3. MethodName：长度（int32） + 名称（[]byte）
4. Sequence ID：int32
5. 序列化后的请求/响应数据

其中 1~4 可以直接引用 Kitex 的实现， 5 可以调用 `frugal.EncodeObject(buf, nil, data)` 生成。

注：`data` 应是一个将所有请求/响应参数按顺序封装起来的 struct（例如 Kitex 生成的结构体 [EchoEchoArgs](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L469)、[EchoEchoResult](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L641)），具体可参考[示例代码](https://github.com/cloudwego/kitex-examples/blob/v0.2.2/frugal/codec/frugal.go)。

#### 解码

根据 [Thrift Binary protocol encoding](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md)，解码结果应包括：

1. MethodName
2. MessageType
3. Sequence ID
4. 请求/响应数据

其中 1~3 的解码可以引用 Kitex 的实现，4 的解码可调用 `frugal.DecodeObject(buf, data)` 完成。

注：`data` 应是一个将所有请求/响应参数按顺序封装起来的 struct（例如 Kitex 生成的结构体 [EchoEchoArgs](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L469)、[EchoEchoResult](https://github.com/cloudwego/kitex-examples/blob/v0.2.1/kitex_gen/api/echo.go#L641)），具体可参考[示例代码](https://github.com/cloudwego/kitex-examples/blob/v0.2.2/frugal/codec/frugal.go)。

#### 示例代码

请参见：[kitex-examples: frugal/codec/frugal.go](https://github.com/cloudwego/kitex-examples/blob/v0.2.2/frugal/codec/frugal.go)

## 注意事项

### Slim 模板

#### 解码需 Payload Size：建议指定 Framed

Kitex 解码时，需从 Header 中获取 Payload Size，以截取完整 Thrift PurePayload，供 frugal 解码。

如启用了 Slim 模板，但无法从请求或相应的 Header 里获取到 Payload Size，**Kitex 无法 fallback，只能报错**：

> codec msg type not match with thriftCodec

因此如果目标 Server 兼容 Framed，建议默认指定 Framed（或 TTHeaderFramed）。

#### ARM 架构支持：暂未实现

由于 frugal 目前不支持 ARM 架构，**有 ARM 架构需求的项目请勿使用 slim 模板**

- 在 Mac M1/M2 上开发时，可暂用 Rosetta 兼容 frugal
- slim 模板不生成 Go 编解码代码（仅 JIT 编解码），因此**无法 fallback** 到默认的编解码方案

## 性能测试数据

传统的 Thrift 编解码方式，要求用户必须要先生成编解码代码，Frugal 通过 JIT 编译技术在运行时动态生成编解码机器代码，避免了这一过程。

基于 JIT 技术 Frugal 可以生成比 Go 语言编译器性能更好的机器代码，在多核场景下，Frugal 的性能最高可达传统编解码方式的 5 倍左右。

性能测试数据如下：

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

## FAQ

### 如何不生成 frugal tag？

> 默认生成的 frugal tag 不影响性能，建议保留。

执行 kitex 命令行工具时加上参数 `-thrift frugal_tag=false`。

注意：

1. 如果不生成 frugal_tag，会导致无法启用 frugal
   1. Thrift 的 set 和 list 在 golang 生成的类型一样，编码无法区分，所以需要 tag；
   2. kitex 检测到请求/响应类型不包含 tag，无法使用 frugal，则会 fallback 到标准的 thrift 编解码方式。
2. 如果开启 slim 模式，必须生成 frugal tag

### Kitex Client 报错 encode failed: codec msg type not match with thriftCodec

Client 端报错信息如下：

> failed with error: remote or network error[remote]: encode failed, codec msg type not match with thriftCodec

可能原因：

- 使用了 slim 模板，但**没有**指定 client.PayloadCodec 开启 frugal 编解码器
- 使用了 slim 模板，但**没有**生成带 frugal tag 的代码

### Kitex Server 报错 decode failed, codec msg type not match with thriftCodec

日志信息如下（或在 client 端收到的响应里包含该错误信息）：

> decode failed, codec msg type not match with thriftCodec

可能原因：

- 使用了 slim 模板，但**没有**指定 server.PayloadCodec 开启 frugal 编解码器
- 使用了 slim 模板，但**没有**生成带 frugal tag 的代码
- Client 端**没有**指定 Transporting Protocol 为 Framed 或 TTHeaderFramed

### frugal: type mismatch: 11 expected, got 10

> 根据 [Thrift binary protocol](https://github.com/apache/thrift/blob/master/doc/specs/thrift-binary-protocol.md), 11 是 BINARY（或string），10 是 I64 类型（不是 IDL 里的字段编号）

当前 IDL 定义的是 string 类型，但是报文里是 I64，导致无法正确解码。

请检查上下游的 IDL 是否一致、生成的编解码代码是否与 IDL 一致（可能没有用新的 IDL 重新生成代码，或没有正确提交到 git）。

### 从 decode 结果获取的字符串内容乱码

frugal <= v0.1.3 解码 string 类型时，默认使用 NOCOPY 模式（直接引用解码入参的 []byte）；而在 Kitex 里该入参会被回收后复用，导致 string 的「值」被修改。

新版本默认禁用了 NOCOPY 模式，升级后即可修复。

### 编译 Kitex 项目时报错 undefined: thrift.FrugalRead

可能原因：

1. 使用了不支持的版本 go 编译：使用 go1.16 ~ go1.21 进行编译
2. 使用了不支持当前 Go 版本的 Kitex 版本：请升级到最新版 Kitex
   1. 例如：Kitex v0.7.1 在用 go1.21 编译时禁用了 frugal（发布该 Kitex 版本时 frugal 尚未支持 go1.21），需要升级到 Kitex >= v0.7.2

### slim 模板下，Optional 字段解码时未填充默认值

已知问题：旧版本 thriftgo 在 slim 模板下未生成 `InitDefault()` 方法。

需升级到 thriftgo >= v0.3.0, 并重新生成 slim 模板代码。

### frugal EncodeObject 报错 unexpected EOF: 38 bytes short

由于 `frugal.EncodeObject` 需要传入一个 buf，Kitex 的实现是先调用 `frugal.EncodeSize(data)` 计算所需 buf 的长度，分配 buf，再编码 data。

在「计算完 buf 大小」之后、「编码data」之前，业务代码可能会并发读写 data，导致实际编码数据超过预期（可能会越界报错，甚至panic）。

这种情况不属于 frugal 的 bug，需要业务代码自查，避免修改已传给 Kitex 的 Request/Response （包括其中的字段，特别是 string、slice 等非固定长度类型）。

### frugal EncodeObject panic

可能是旧版本的问题，建议升级到最新版（ >= v0.1.8）

```bash
go get github.com/cloudwego/frugal@latest
```

如果问题依然存在，请确认被 encode 的对象没有被并发读写（包括间接引用的其他对象）。

例如读取一个正被设置为空串的字符串，可能会读到无效的 string（StringHeader.Data = nil && StringHeader.Len > 0），导致在编码时 出现 "nil pointer error" panic 。
