---
title: "SkipDecoder"
date: 2024-06-20
weight: 10
keywords: ["SkipDecoder", "精简产物"]
description: "开启 SkipDecoder ，突破 Frugal 与 FastCodec 的协议限制，精简代码产物"
---

## 背景

对于 Thrift 序列化协议，当前为了更好的性能基本都搭配 Thrift Framed 传输协议(e.g. TTHeader, TTHeaderFramed) 使用 FastCodec 或者 Frugal。但为了兼容少量使用 Thrift Buffered 传输协议的服务，Kitex 仍然会生成符合官方接口要求的 Apache Thrift Codec 代码。(详情请参考 [Framed 与 Buffered](https://github.com/apache/thrift/blob/master/doc/specs/thrift-rpc.md#framed-vs-unframed-transport))

这部分代码体积庞大，平均占比接近百分之四十，但是使用场景却很少。移除这部分产物能有效地提高 IDE 加载速度和编译速度。

当前 thriftgo(>= v0.3.7)可以使用`-thrift no_default_serdes`来减少这部分的代码生成：

```shell
kitex -thrift no_default_serdes path/to/idl
```

为了在移除掉这部分代码的同时，可以兼容 Thrift Buffered 协议，我们在 **Kitex v1.16.0** 推出了 SkipDecoder 用于达成这一目标。

## 原理介绍

Thrift Buffered 协议在 Header 中并没有表明 Payload 的长度，因此并不能直接将 Payload 截取出来交由 FastCodec 或 Frugal 处理。

那么我们可以很自然地想到，如果在解析 Thrift Buffered 协议时，逐字节地解析 Payload，从而将完整的 Payload 喂给 FastCodec 和 Frugal，就能完全避免使用 Apache Thrift Codec。而这正是 SkipDecoder 的原理。

以下是在 Thrift Buffered 协议场景下，使用 SkipDecoder 和不使用 SkipDecoder 的流程对比：

![img](/img/docs/skip_decoder_process_comparison.png)

## 裁剪效果

以某个很复杂的 IDL 为例。

裁剪前：

```
117M    kitex_gen
```

裁剪后：

```
74M    kitex_gen
```

可裁剪 36% 的生成代码，接近 40%，效果显著。

## 使用

1.  使用 `-thrift no_default_serdes` 移除 Apache Thrift Codec ，重新生成代码

    ```shell
    kitex -thrift no_default_serdes path/to/your/idl
    ```

    该功能需要 thriftgo 版本 >= 0.3.7，推荐使用最新版本。

2.  配置开启 SkipDecoder

    请明确在第一步中生成的代码用于什么目的：

- 用于构造 Client 调用下游服务

  - 配合 FastCodec
  
    ```go
    import (
        "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
        "demo/kitex_gen/kitex/samples/echo/echoservice"
    )
    
    func main() {
        cli := echoservice.MustNewClient("kitex.samples.echo", 
            client.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FastRead|thrift.FastWrite|thrift.EnableSkipDecoder)),
        )
    }
    ```
    
  - 配合 Frugal
  
    ```go
    import (
        "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
        "demo/kitex_gen/kitex/samples/echo/echoservice"
    )
    
    func main() {
        cli := echoservice.MustNewClient("kitex.samples.echo", 
            client.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FrugalRead|thrift.FrugalWrite|thrift.EnableSkipDecoder)),
        )
    }
    ```
    
- 用于构造 Server 供上游调用

  - 配合 FastCodec
  
    ```go
    import (
        "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
        "demo/kitex_gen/kitex/samples/echo/echoservice"
    )
    
    func main() {
        srv := echoservice.NewServer(handler,
            server.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FastWrite|thrift.FastRead|thrift.EnableSkipDecoder)),
        )
    }
    ```
    
  - 配合 Frugal
  
    ```go
    import (
        "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
        "demo/kitex_gen/kitex/samples/echo/echoservice"
    )
    
    func main() {
        srv := echoservice.NewServer(handler,
            server.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FrugalWrite|thrift.FrugalRead|thrift.EnableSkipDecoder)),
        )
    }
    ```
    
## 注意

1.  `-thrift no_default_serdes` 请务必配合 SkipDecoder 使用

- 上游使用了 `-thrift no_default_serdes`，则上游需开启 SkipDecoder

- 下游使用了 `-thrift no_default_serdes`，则下游需开启 SkipDecoder

    若减少了 Apache Thrift Codec 代码生成，但却没有开启 SkipDecoder，会造成无法反序列化

2.  为了方便识别在开启 SkipDecoder 后可能出现的问题，对错误信息做了特殊处理

- SkipDecoder 解析完整 Payload 期间

    若这个流程出现错误，会包含以下错误信息：

    ```
    caught in SkipDecoder NextStruct phase
    ```

- SkipDecoder 解析完 Payload 后，交给 FastCodec/Frugal 解码

    若这个流程出现错误，会包含以下错误信息：

- 使用 FastCodec

    ```
    caught in FastCodec using SkipDecoder Buffer
    ```

- 使用 Frugal

    ```
    caught in Frugal using SkipDecoder Buffer
    ```

## 性能

在SkipDecoder + FastCodec 场景下，反序列化与 Apache Thrift Codec 相比吞吐提升 10%。

```
Benchmark_Unmarshal_apache/small                     3763096         294.4 ns/op    1980.61 MB/s
Benchmark_Unmarshal_apache/medium                     145512          7525 ns/op    2327.89 MB/s
Benchmark_Unmarshal_apache/large                        6244        190503 ns/op    2329.64 MB/s
Benchmark_Unmarshal_fastcodec_skip/small             4549530         255.3 ns/op    2283.58 MB/s
Benchmark_Unmarshal_fastcodec_skip/medium             186720          6269 ns/op    2794.32 MB/s
Benchmark_Unmarshal_fastcodec_skip/large                7424        161485 ns/op    2748.27 MB/s
```
