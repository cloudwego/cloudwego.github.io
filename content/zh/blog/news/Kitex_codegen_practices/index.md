---
date: 2024-09-20
title: "如何让你的 Kitex 生成代码击败 99% 的用户"
projects: ["Kitex"]
linkTitle: "如何让你的 Kitex 生成代码击败 99% 的用户"
keywords: ["Kitex", "代码生成", "Thrift", "命令行"]
description: "本文将介绍如何使用 Kitex Tool 的特性功能，来获得更小的产物体积和更快的生成速度。"
author: <a href="https://github.com/HeyJavaBean" target="_blank">HeyJavaBean</a>
---

## 前言

### 为什么要生成代码

框架开发有两种常见的风格： Code First 和 Schema First

简单来说，Code First 就是先写代码，再由代码生成数据模型和接口规范（比如先代码写一个 http 接口，然后用 Swagger 来生成 API 信息）

而 RPC 开发更多是 Schema First ，因为 RPC 服务可能是跨语言的，不一定会先写代码，而是用 Thrift、Protobuf 这些通用的 IDL 来描述接口和结构体，再生成对应语言、对应框架的具体代码。

（btw，用 IDL 生成 RPC 代码通常也比手搓一堆结构体和 Getter Setter 要方便不少）

Kitex RPC 开发步骤也是先写 IDL，再由 Kitex Tool 生成 Golang 代码：
1. IDL 里的结构体定义会被生成为 Golang 的桩结构体（和一些 Getter Setter）
2. IDL 里 Service 和 Method 会被生成为 NewKitexClient、NewKitexServer、KitexServiceInfo 这些框架使用相关的脚手架函数

但如果你仔细观察过 kitex_gen 的内容，会发现上面代码占比并不多，主要是 FastRead、FastWrite 这些序列化相关的函数占了很多行。

这是因为静态生成的序列化方性能会更高一些。（可以 hardcode 生成 hardcode 类型、字段名称等，不用走反射、减少函数调用等等.....）

此外，一些 Kitex 的功能特性也是基于生成的代码来实现的，例如 Unknown Fields 和 Field Mask

所以，如果你想运行一个 Kitex RPC 服务，就需要根据 IDL 来生成这些桩代码。

### 生成代码里有什么

以 Thrift 场景为例，Kitex Tool 生成内容的目录如下：

```
kitex_gen/
├── base                                     
│   ├── base.go        // 结构体桩代码 + 普通的序列化代码                      
│   ├── k-base.go      // FastCodec 序列化代码                
│   └── k-consts.go                      
└── test                                       
├── example.go      // 结构体桩代码 + 普通的序列化代码       
├── k-consts.go               
├── k-example.go    // FastCodec 序列化代码     
└── myservice       // 创建 Kitex Client/Server 的脚手架
├── client.go               
├── invoker.go            
├── myservice.go        
└── server.go
```

其中，结构体相关的代码占据了大部分体积，例如 Getter Setter、FastRead、FastWrite：

| 方法名                                                                                 | 描述&用途                                     | CodeGen 内容长度 |
| -------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------- |
| InitDefault                                                                            | Frugal 场景需要                               | 短               |
| GetXXXField/SetXXXField/IsSetXXXX                                                      | GetterSetter，部分 interface 需要             | 短               |
| Read/ReadFieldX/Write/writeFieldX                                                      | 原生 Apache Codec                             | 长               |
| String                                                                                 | Stringer                                      | 短               |
| DeepEqual/FieldXXXDeepEqual                                                            | set 去重提速                                  | 长               |
| DeepCopy                                                                               | RPAL 场景需要                                 | 短               |
| ThriftService 模板                                                                     | ServiceInterface 描述接口定义                 | 短               |
| XXXClientFactory、XXXClientProtocol                                                    | 旧的 ThriftClient 代码，不再有用              | 较长             |
| XXXProcessor                                                                           | 旧的 Thrift Processor 代码，不再有用          | 较长             |
| XXXServiceMethodArgs/Result                                                            | Thrift 为 Method 的入参和返回值单独生成的类型 | 短               |
| GetFirstArgument/GetResult                                                             | args、result 专用                             | 短               |
| FastRead/FastReadFieldX/FastWrite/FastWriteNocopy/BLength/fastWriteFieldX/fieldXLength | FastCodec 编解码                              | 长               |
| GetOrSetBase/GetOrSetBaseResp                                                          | 特殊的 Base 相关接口，框架内部使用            | 短               |

### 产物过大会怎么样

现在很多服务都有了自己的 IDL 大仓库，在字节的内部场景中，甚至出现了 6.8G 的超大型 IDL 仓库，包含了上百万个 commit

这种情况下，随着业务迭代，IDL 的内容新增和相互引用不断增加（大家没事都不会去删 IDL，所以只会越来越大），所以生成 kitex_gen 之后，不管有的没的，产物体积可能会非常大

体积太大了，会导致：
1. 生成耗时也很长，影响研发效率
2. Goland 加载索引要很久，或者根本无法加载，没自动补全了，代码都不知道怎么写了
3. Git 提交的时候内容巨大，Git 仓库也越来越大了，当 Git 仓库超过 500MB 后，[甚至可能 go get 都拉不下来了](https://github.com/golang/go/issues/29210)
4. 编译很慢、甚至编译时符号表过大[直接编译失败](https://github.com/golang/go/issues/17378)

所以这种时候，不得不提到产物优化治理了（顺便能让生成速度更快）

## 优化手段

过去半年，我们对生成速度和体积优化进行了一轮探索，总结了不少有用的手段。

虽然由于历史包袱或其他原因，我们没把这些手段直接作为 kitex tool 的默认行为，但也经过了稳定的验证和一些字节内部场景的落地接入

如果你的服务也受代码生成的困扰，下面的方法总有一款适合你~

### IDL 裁切

特点：大幅减少产物体积、提高生成速度

#### 简介

简单来说，很多项目的 Thrift IDL 有大量冗余内容，只需要生成所有 Method 直接或者间接引用到的结构体就好了，其他无关内容可以剔除掉。

IDL 裁切工具能自动完成这个过程，使得 Kitex 代码生成速度和产物体积都得到很大的优化。根据一些字节内部大仓库的试点，生成耗时减半、产物体积减少 60%+ （你的 IDL 越大，里面的冗余内容越多，效果越好）

#### 使用

在 kitex 命令执行时，额外添加 `-thrift trim_idl`
```
kitex -module xx -thrift trim_idl xxxx.thrift
```

工具在执行时，会解析 IDL 然后只保留所有 Method 直接或间接用到的结构体，以最快的速度生成最简洁的产物，并同时输出一个裁切效果的报告：

![image](/img/blog/Kitex_codegen_practices/wanring.jpg)


#### 进阶

> 有这样一种场景，某个超大 IDL 有 100 个 Method，但 A 团队只用其中 5 个 Method，B 团队只用另外 10 个 Method，对于每个团队而言，不需要生成 100 个 Method 以及所有的结构体

裁切工具提供了 -method ，细粒度到方法级别做裁切，以解决上面提到的场景，详见[指定 Method 裁切](https://www.cloudwego.io/zh/docs/kitex/tutorials/code-gen/idl_trimmer)

### no_fmt 提速

特点：代码生成提速 50%

#### 简介

在分析一些复杂 IDL 场景生成慢的火焰图时，发现 Kitex Tool 里有一个比较 interesting 的情况：生成代码后，对产物进行 go fmt 整理的耗时居然占了一半

![image](/img/blog/Kitex_codegen_practices/profile.png)


所以，如果你不是很关心产物代码的格式整不整齐，可以直接跳过这个操作，生成速度马上就快 50% 了

虽然很粗暴，但确实很有用 😂

（当然我们也试过对火焰图左边的 template 底层的反射开销做优化，预估快 20%，但改造和影响有点大。直接无脑去掉 no_fmt 提速 50% 后，速度就已经可以接受了，所以就没继续搞了）

字节内部的产物平台通过该方式，代码生成耗时 P90 从 80s 下降到了 20s ，节约了了 60s (70%)

#### 使用

在 kitex 命令执行时，额外添加 `-thrift no_fmt` 即可
```
kitex -module xx -thrift no_fmt xxxx.thrift
```

产物会有一些空行或者缩进上的不整齐，但往往 kitex_gen 里面的大量内容都是没人看的，所以也无所谓了

### 删除 Processor

特点：产物体积减小约 10%，速度等比提升

v0.10.0+ 后的 kitex tool 已默认使用该策略

#### 简介

因为一些历史原因（以前对照 apache thrift 的一些无用实现），kitex_gen 会有些没用的代码，形如 XXXClientFactory、XXXClientProtocol、XXXProcessor：

这部分代码原本是 apache thrift 场景用来创建 service 和 client 的，但在 kitex 中，会单独生成 xxxservice 目录，以及 client.go、server.go 这些 kitex server 和 kitex client 的实现。

经确认，在 Kitex 场景下，这部分内容已经完全没被使用了（业务代码里也不会引用到），所以可以从生成代码里逐渐把这些内容移除掉。从 IDL 测试的平均值来看，产物体积优化约 10%，速度略微提升

#### 使用

在 Kitex 代码生成工具 v0.10.0 之后，会自动不生成这部分内容

如果你的工具是旧版本，添加 `-thrift no_processor` 参数即可
```
kitex -module xx -thrift no_processor xxxx.thrift
```

补充说明

一般情况下，你可以放心的去掉这部分代码，因为确实用不到。但以防意外，如果 v0.10.0 的默认去除行为确实影响到你的代码了，导致编译失败等情况，可以通过 `-thrift no_processor=false` 来阻止这一行为：
```
kitex -module xx -thrift no_processor=false xxxx.thrift
```

并联系 Cloudwego 社区，进行后续支持

### 删除 Deep Equal

特点：产物体积减小约 20%，速度等比例提升

#### 简介

Kitex 对 Thrift IDL 的 set 类型生成是数组，会进行去重检查

默认情况下，会为每个结构体生成 DeepEqual 方法，因为静态生成的性能好。如果不生成，就默认用反射库的 reflect.DeepEqual （性能慢）

如果在用不到 set 或用的不多的场景下，可以不生成 DeepEqual 方法来节约体积

#### 使用

添加参数 `-thrift gen_deep_equal=false`
```
kitex -module xxx -thrift gen_deep_equal=false xxx.thrift
```

#### 注意

剔除这个来优化产物的前提是不对 set 有大量使用，如果 set 使用的地方很多，或者 set 里的元素数量很大，那么可能会有性能下降的问题

但如果你在使用 set 之前，已经对写入的元素做了去重检查，那其实 Kitex 框架里的这步二次检查就是多余的了，可以考虑使用 -thrift validate_set=false 来关闭检查，反而节约一次多余的计算开销

后续我们会针对 Deep Equal 以及 Set 的去重用法做更合理的实现，保证产物精简高效

### 删除 Apache Codec

特点：产物体积减小约 50%，速度等比例提升

#### 背景

> 为什么 Kitex 代码里有两套编解码

kitex_gen 里会生成 Apache Codec 和 Fast Codec 两套编解码。Fast Codec 性能更好，但需要从协议里读到 payload size 才能用，所以只有 TTHeader、Framed 场景能用
绝大多服务都接入了使用 TTHeader，或手动设置了 Framed，所以直接用 Fast Codec

这就有了一个想法： 对大部分服务，Apache Codec 占了快 50% 的体积，而且基本没用，只是用来兜底的
如果能让 Thrift Buffered 也能走 Fast Codec，就没必要保留 Apache Codec 了
可以把服务的默认协议从 Buffered 改为 Framed

#### 简介

在 Kitex v0.10.0 里，我们实现了一个 SkipDecoder，可以让 Thrift Buffered 场景也能走 Fast Codec 编解码，而不需要 Apache Codec 兜底了，通过这个功能，你就可以在仓库里少生成一半的代码

同时 Kitex v0.10.0 也把默认协议设置为了 Framed，进一步减少了线上的 Apache Codec 使用空间。

#### 使用

保证你的 Kitex 版本高于 v0.10.0
重新做代码生成，添加 `-thrift no_default_serdes` 参数
```
kitex -module xxx -thrift no_default_serdes xxx.thrift
```

这样生成的代码就没有 Apache Codec 内容，少了一大半体积
开启 Skip Decoder，在 NewClient 或 NewServer 的时候添加如下参数：

```
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

这样，当你的服务收到 Thrift Buffered 报文时，会通过 SkipDecoder + FastCodec 完成编解码，不再依赖 Apache Codec

#### 注意

Skip Decoder 功能已经正式发布了，但还需手动开启。后续计划 Skip Decoder 默认启用

一旦使用了 `-thrift no_default_serdes` 从生成代码里去除了 Apache Codec，对应的 Kitex Client /  Kitex Server 要添加 Skip Decoder 配置，否则当收到对端的 Thrift Buffered 报文时，会无法解析，所有请求报错失败！

Apache Codec 的序列化实现是读一段内容解析一段内容，而 Skip Decoder 和 Fast Codec 的序列化实现都是一次读完所有内容然后整体解析，这样虽然速度更快了，但占用内存会多一些。绝大部分情况无所谓。但如果你的服务比较特殊，比如一次读的内容非常大，为了避免内存过大，明确设置过禁用 Fast Codec，通过 Apache Codec 来编解码，这种场景下，请谨慎考虑这个特性。

#### 低版本如何操作

如果 Kitex 版本低于 v0.10.0，没有 SkipDecoder 能力来兜底 Thrift Buffered 场景，但也想删除 Apache Codec 来治理产物体积，思路如下

1. 确保你的服务，以及上下游服务，都不采用 Thrift Buffered 协议，如果是 Kitex，那么把他们至少都设置为 Framed 协议，这样就走不到 Apache Codec 的逻辑了

2. 生成代码添加 `-thrift no_default_serdes` 来减少一半的产物体积

这样做有一些风险点：

如果某个服务考虑漏了，发送了 Buffered 协议，那么这些请求都会失败

如果你的下游有一些很旧的其他框架（例如老版本的 Java 框架），不支持 Buffered 协议，那么这条链路就不能这么搞

所以推荐还是升级 Kitex 版本到 v0.10.0，用 Skip Decoder 的能力来兜底

### Frugal

特点：产物体积减小约 90%，速度等比例提升

#### 简介

Frugal 是一款动态的不需要编解码代码的 Thrift 编解码器，通过启用 slim 模板，Kitex 可以只生成 Golang Types，上文提到的 Apache Codec 和 Fast Codec 都不需要了，编解码在运行时通过反射或 JIT 实现。这样可以大幅减少生成的代码量，减少 IDE 加载时间，相比正常的 kitex_gen，体积缩小 90%，且性能仍然较高。

#### 使用

说来话长，步骤相对较多，详见：https://github.com/cloudwego/frugal

#### 注意

目前 Frugal 是基于 JIT 实现的，所以：
- JIT 首次编解码耗时会长一些，可能会影响首批请求的耗时 
- 也可以在服务启动时就通过 Pretouch 预热，但当 IDL 非常复杂的时候，启动时间会增加 
- 目前不支持 Unknown Fields 特性 
- 在 ARM64 场景还处在试验性的支持中

#### 其他

近期我们实现了一个基于 Golang 反射版的 Frugal，对不同系统的兼容性较好，而且也不会有太严重的首次耗时，后续会更新文档和相关使用方式

长期规划中，我们期望 Frugal 能逐渐广泛落地，让绝大多数 Kitex 项目不再需要生成大量代码，只有当对性能有更高要求的场景，才使用 FastCodec 这种静态生成的编解码。

### 进阶: 工具 SDK 化

速度预计优化 10%~25%，易用性和维护性有提升

> 这是个进阶功能，如果你是某个 Kitex Tool 相关的代码生成项目维护者，可能会对你有帮助

#### 简介

当要使用 Kitex Tool 生成代码，以往都只能安装 Kitex Tool （以及 Thriftgo、Validator 等工具链），然后执行命令来触发。一些代码生成项目，是通过在 Golang 代码里起一个进程，通过 os.Exec 来调用本地的 Kitex Tool，实现代码生成的。

之前这样设计是想着能跨语言、插件进程可拔插，不过实际场景用到的很少。所以在 v0.11.0 之后，Kitex Tool 提供了 SDK 化调用的能力，可以通过引入依赖包 + Golang 函数来生成代码，而无需再安装 Kitex Tool、Thriftgo、Validator 插件等一系列工具链了

#### 使用

首先引入依赖包： `import "github.com/cloudwego/kitex/tool/cmd/kitex/sdk"`

接口签名如下：
```
func RunKitexTool(wd string, plugins []plugin.SDKPlugin, kitexArgs ...string) error
```

参数含义：
- wd：想在哪个路径下执行 kitex tool 命令
- plugins：想同时内嵌执行哪些插件，例如 Validator 插件，也实现了对应的接口。一般用不到，写 nil 即可
- kitexArgs：想执行哪些参数，按 kitex tool 的常规写法来，然后空格拆分成数组传入即可
- 一个例子：想在当前目录执行 kitex -module my_mod xxx.thrift，按下面方式写就可以了
- err := sdk.RunKitexTool(os.Getwd(), nil, "-module", "my_mod", "xxx.thrift")

适用场景

> 普通开发者不用太关心，日常用不到

这种使用方式中，不需要安装 thriftgo（而且不会有自升级行为），直接内嵌 thriftgo 函数调用省掉了进程调用和数据传输的开销，在一些复杂场景，生成速度能提高 10%~25%，而且更易于维护或集成使用。

如果你在开发某种封装了 Kitex 的代码生成器或者代码生成平台，那么可以通过这种方式来代替 os.Exec 调用 Kitex 命令行，同时也省去了维护本地 kitex tool、thriftgo 二进制文件。

后续 Kitex Tool 将默认内嵌 Thriftgo SDK，就不再需要单独安装 Thriftgo 或者关系工具版本关系了

## 我们还在做什么

一些还在探索的产物优化&生成提速手段

### FastCodec 高性能重构

我们正在重构一版 FastCodec 的代码生成实现，预期会占用更少的代码体积，具有更好的编解码性能，并且与现在的实现完全兼容。开发完成后，我们会生成这套更好的 FastCodec 内容。

### 增量代码更新

有时候一组 IDL 有上千个，但每次改动 diff 只有一点（比如添加了一个字段之类的），刷新生成代码就要等上很久，大部分生成的内容都和之前没区别，在做无用功。如果能对变动的 IDL 单独更新，就能极大缩短时间

目前 Kitex Tool 从技术上是可以做到这点的，但需要结合具体的生成场景来看如何集成

### 冗余字段消除

当前由于代码产物过大、版本管理困难等原因，各业务线往往使用  公共代码生成仓库来管理生成产物。但是同一套 IDL 面向不同服务场景往往有不同的数据字段下发规则，此时某一使用公共结构体的客户端就会产生冗余字段。此外，随着业务逻辑的迭代，IDL 中也可能有大量 事实上无用但是并未删除的废弃 Field 字段。这些情况都会转化为不必要的 thrift 编解码开销，最终导致服务性能下降。因此我们希望通过某种方式来判断业务主进程中 实际没有使用到的字段，前置到 kitex tool 中进行预处理，最终优化掉其产生的不必要性能开销。（前文提到的 IDL 裁切是删减没用的结构体，而这种手动能更精准的清理无用的结构体字段、并减少编译和序列化开销）
