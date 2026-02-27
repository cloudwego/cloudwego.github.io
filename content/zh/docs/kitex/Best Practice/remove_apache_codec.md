---
title: "Kitex 去 Apache Thrift 用户手册"
linkTitle: "Kitex 去 Apache Thrift 用户手册"
weight: 4
date: 2024-11-29
keywords: ["Kitex", "thrift", "apache"]
description: "介绍 Kitex 去除 Apache Thrift 依赖的计划和注意事项。"
---

# 背景

Kitex 里使用到了 github.com/apache/thrift 库来进行一些编解码，并且也会生成 Apache Codec 原生的编解码代码（位于 kitex_gen 下的 Read、Write 等内容）

但实际使用中，大部分服务不需要这些内容，造成了代码冗余，而且对 apache thrift 的依赖也导致了一系列问题

在后续的版本里，我们打算逐步移除对 Apache Thrift 的依赖。去除后的预期效果：
- kitex_gen 减少近半的产物体积
- 不再有 apache/thrift v0.13.0 版本锁死的问题


# 去 Apache Thrift 依赖库

为了方便表述，以下库分别简称为：

> - github.com/apache/thrift => apache thrift
> - github.com/cloudwego/kitex/pkg/protocol/bthrift => kitex bthrift
> - github.com/cloudwego/gopkg/protocol/thrift => gopkg thrift

Kitex 将分为两个阶段摆脱 go.mod 中对 apache thrift 库的依赖

## 阶段1（v0.11.0）

Kitex 会从生成代码里去除对 apache thrift 的 import 依赖，用 kitex bthrift 和 gopkg thrift 来替代

生成代码里的 import 以及对应的 Read、Write 等方法也会被替换。重新生成代码后，kitex_gen 里对 apache thrift 的 import 依赖也会转为后两者。 

## 阶段2（v0.12.0）

Kitex 将把 bthrift 库变成一个独立的子模块，对 apache thrift 的依赖也被收敛到这个子模块的 go.mod 里。同时，通过配合生成代码的变化，当用户不在 kitex_gen 中生成 apache codec 接口时（详见下文），kitex 项目就不再引入 github.com/apache/thrift 依赖了。

并且所有 thrift 编解码相关的接口用法都会收敛到 gopkg thrift 独立维护（例如 FastCodec interface 定义、fastthrift 工具接口等）

至此，Kitex 的 go.mod 里将不再主动依赖 apache thrift，也不会有 v0.13.0 卡版本等问题

# 去 Apache Codec 生成代码

kitex_gen 里会生成两份序列化代码：FastCodec（cloudwego）、Apache Codec（原生）。

Apache Codec 使用场景很低，大部分服务都通过 FastCodec 来编解码。由于大部分服务都没有使用到 Apache 原生接口，

为了配合移除依赖，kitex_gen 生成代码里也要逐步把 Apache Codec 的生成代码和接口剔除掉。同时也能节省很大的产物体积。

我们将分为三个阶段来完成

## 阶段1 （<= v0.11.0）

通过对 kitex tool 增加参数 -thrift no_default_serdes 可以做到不生成 Apache Codec

在 <=v0.11.0 的版本里，我们还是会保持完全一样的生成行为，不做改变，给用户提供一个过渡缓冲期

如果你想主动去除 Apache Codec，减少一半的产物体积，可以参考文末的「附录」

## 阶段 2 （v0.12.0）

我们会在 kitex_gen 生成的 Apache Codec Read/Write 前添加告警和打点，给用户进行强提醒。同时我们也会协助一些重点服务进行改造。

如果你遇到了服务启动后出现 Warning Apache Codec 的字样，请参考文末附录「如何主动去除」章节，将 Apache Codec 替换为 Fast Codec，获得更高性能的编解码，同时也避免在后续版本我们去除 Apache Codec 给你带来影响。

## 阶段 3 （v0.13.0）

Kitex 将在 v1.18.0 的工具里默认不生成 Apache Codec 代码，完全走 FastCodec。

这样生成的产物体积将只占原来的一半，而且 go.mod 里完全不依赖 github.com/apache/thrift 库
- 用户影响：如果直接使用Apache Codec 做序列化，会显示缺少接口，将受到影响。（不影响 RPC 调用）
- 如果的确有需要，可以通过参数，保留 Apache Codec 生成。版本发布后我们会补充具体的操作手册
- 为了避免 Read Write 接口缺失导致的编译失败，我们也会提供一种 Apache Adaptor 来进行桥接代码生成。后续我们会发布对应使用方法。


## 怎么检查服务是否用到 Apache Codec

虽然 kitex_gen 里去掉了对 apache/thrift 的依赖，但可能你的项目里其他地方还有用到 apache/thrift 的编解码，这种方式较为低效，而且强依赖于 kitex_gen 里生成的 Apache 原生 Read、Write 等接口

Kitex 后续计划默认不再生成这些内容，对下面提到的仍然使用 apache/thrift 的场景，会有影响，建议替换为 Kitex 提供的高效的 FastCodec 编解码，具体方式如下：

### 1. 用到了 Apache/thrift 的库做编解码

如果你的代码中有下面的编解码用法：
```go
func GetThriftBinary(ctx context.Context, msg apache_thrift.TStruct) ([]byte, error) {
    t := apache_thrift.NewTMemoryBufferLen(1024)
    p := apache_thrift.NewTBinaryProtocolFactoryDefault().GetProtocol(t)

    tser := &apache_thrift.TSerializer{
    Transport: t,
    Protocol:  p,
    }

    bs, err := tser.Write(ctx, msg)
    if err != nil {
        return nil, err
    }
    return bs, nil
}

func ParseThriftBinary(msg apache_thrift.TStruct, by []byte) error {
    t := apache_thrift.NewTMemoryBufferLen(1024)
    p := apache_thrift.NewTBinaryProtocolFactoryDefault().GetProtocol(t)

    deser := &apache_thrift.TDeserializer{Transport: t, Protocol: p}
    _ = deser.Transport.Close()
    err := deser.Read(msg, by)
    if err != nil {
        return err
    }
    return nil
}
```

可以使用 Kitex 提供的更高效快速的 [FastCodec](https://github.com/cloudwego/gopkg/blob/main/protocol/thrift/fastcodec.go): 来替代它

```go
// 假设 msg 是一个 kitex_gen 里的结构体，会有 FastRead 和 FastWriteNoCopy 等方法

import github.com/cloudwego/kitex/pkg/utils/fastthrift

// 编码
if msg, ok := data.(thrift.FastCodec); ok {
   payload := thrift.FastMarshal(msg)
}

// 解码
if msg, ok := data.(thrift.FastCodec);ok {
   // buf 是你的 thrift 编码的二进制内容
   err = thrift.FastUnmarshal(buf, msg)
}
```

### 2. 确保使用 FastCodec 作为 Kitex RPC 服务的编解码

关键词搜索：WithPayloadCodec(thrift.NewThriftCodecDisableFastMode(true, true))

如果你的代码仓库里有这段内容，表示 RPC 请求关闭了 FastCodec，采用了性能较低的 Apache 原生 Codec

建议去掉这个 Option，以获得更好的编解码性能

# 附录：如何主动去除 Apache Codec
> 去除 Apache Codec 可以减少接近一半的产物体积，如果你的项目没有上文提到的少数使用情况，可以提前主动配置，不生成这部分代码。
保证你的 Kitex 版本高于 v0.11.0

1. 重新做代码生成，添加 `-thrift no_default_serdes` 参数

```shell
kitex -module xxx -thrift no_default_serdes xxx.thrift
```

这样生成的代码就没有 Apache Codec 内容，少了一大半体积

2. 开启 Skip Decoder，在 NewClient 或 NewServer 的时候添加如下参数：
```go
import (
   "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
   "demo/kitex_gen/kitex/samples/echo/echoservice"
)

func main() {
    cli := echoservice.MustNewClient("kitex.samples.echo",
        client.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FastRead|thrift.FastWrite|thrift.EnableSkipDecoder)),
    )

    srv := echoservice.NewServer(handler,
        server.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FrugalWrite|thrift.FrugalRead|thrift.EnableSkipDecoder)),
    )
}
```

这样，当你的服务收到 Thrift Buffered 报文时，会通过 SkipDecoder + FastCodec 完成编解码，不再依赖 Apache Codec（其他场景，比如 TTHeader 或 Mesh 场景则和之前的逻辑一样不变，都是直接走 FastCodec）
