---
date: 2024-03-16
title: "Kitex 支持 Dubbo 协议：助力多语言云原生生态融合"
projects: ["Kitex"]
linkTitle: "Kitex 支持 Dubbo 协议：助力多语言云原生生态融合"
keywords: ["Kitex", "CloudWeGo", "云原生", "开源", "Golang", "Java", "Dubbo"]
description: "本文介绍了 Kitex 支持与 Dubbo 互通，成功帮助企业完成 Java 转 Go 的落地案例。"
author: <a href="https://github.com/DMwangnima" target="_blank">DMwangnima</a>
---

## 背景

Kitex 是字节跳动基础架构服务框架团队推出的 Go 微服务 RPC 框架，支持 Thrift、Kitex Protobuf、gRPC 等消息协议，具有高性能、强可扩展的特点。于 2021 年 9 月正式开源后，已在多家外部企业成功落地，为他们带来了真实的成本、性能和稳定性收益。

很多企业用户在使用 Kitex 改造服务的过程中，需要 Kitex 能与现有的 Dubbo 框架实现的服务进行通信，这与 CloudWeGo 社区积极拓展生态的目标不谋而合，因此 Dubbo 互通项目 [codec-dubbo](https://github.com/kitex-contrib/codec-dubbo) 应运而生。

在社区同学的热情帮助下，目前 codec-dubbo 能做到 Kitex 与 Dubbo-Java，Kitex 与 Dubbo-Go 互通，支持 Dubbo 用户向 Kitex 迁移。

![image](/img/blog/Kitex_Dubbo_interoperate/kitex_dubbo_interoperate.png)

本文将以方正证券利用 Kitex 与 codec-dubbo 成功进行服务改造为例，对改造过程中使用到的 codec-dubbo 主要功能进行阐述，并简要分析其中的实现细节。

## 企业落地案例

方正证券原有的服务采用 Java 和 Dubbo 框架编写，两者稳定且经过了大量场景的验证，符合他们的生产和开发需求。以请求量较大的小方个股详情页为例，高峰期的接口 QPS 在 3-4k，使用 16 台 16 Core 64G 虚拟机进行承载。

随着云原生架构的兴起，凭借内存占用与执行效率的优势以及天然适配云原生，Go 逐渐成为构建企业服务的重要技术选项。为了更好地降本增效，综合考虑成本、性能和稳定性等因素后，他们决定在新建应用上由 Java 转向 Go，引入 Kitex，Hertz 等 CloudWeGo 项目进行服务开发与重构，并整体迁移至 Kubernetes 环境。

在重构过程中，codec-dubbo 凭借接近原生 Kitex + Thrift 的使用体验以及对 Dubbo 概念的良好支持，降低了使用和理解成本，成功帮助他们解决了 Kitex <-> Dubbo 的互通问题，让 Kitex 服务顺利调用原有的 Dubbo 服务。

目前，使用了 codec-dubbo 的 Kitex 服务已成功上线，稳定运行两个月。还是以小方个股详情页为例，Kitex 和 Hertz 承载了该页面一半左右的接口，在 QPS 不变的情况下，只需要提供 12 个 4 Core 4G Pod，降低资源占用效果显著。

## codec-dubbo 功能特性

### Dubbo 协议编解码器

Dubbo 服务主要使用 Dubbo 协议进行通信，为了支持 Kitex <-> Dubbo 互通，我们需要在 Kitex 中实现 Dubbo 协议。得益于 Kitex 优秀的扩展性，codec-dubbo 根据 Kitex 提供的 Codec 接口实现了 DubboCodec 这一核心编解码器，只需在初始化时注入 DubboCodec 便能使用 Dubbo 协议。

### 类型映射与拓展

#### 类型映射

Dubbo 主要使用 Hessian2 序列化协议进行 Payload 的编解码，它最大的特点是自描述序列化类型，即不依赖外部 Schema 或接口定义。序列化过程依赖编程语言类型和 Hessian2 类型之间的映射，以 Go 类型转化为 Java 类型为例：

![image](/img/blog/Kitex_Dubbo_interoperate/types_convert_process.png)

经过分析，我们发现 Hessian2 的基础类型系统与 Thrift 基本重合。为了保证 Kitex + codec-dubbo 的使用体验与 Kitex + Thrift 基本一致，我们基于 Thrift IDL 来生成 Kitex Dubbo-Hessian2 脚手架代码，此时类型转化过程如下所示：

![image](/img/blog/Kitex_Dubbo_interoperate/types_convert_process_with_thrift.png)

参考 Dubbo 官方的 [dubbo-go-hessian2](https://github.com/apache/dubbo-go-hessian2) 类型映射，codec-dubbo 提供如下类型映射(此处仅包含部分映射，更多注意事项请参考 codec-dubbo Readme )：

|  **THRIFT 类型**  |    **Go 类型**     | **HESSIAN2 类型** |     **JAVA 类型**     |
| :---------------: | :----------------: | :---------------: | :-------------------: |
|        i32        |       int32        |        int        |   java.lang.Integer   |
|      double       |      float64       |      double       |   java.lang.Double    |
|      string       |       string       |      string       |   java.lang.String    |
|     list<i32>     |     \[\]int32      |       list        |     List<Integer>     |
|   list<double>    |    \[\]float64     |       list        |     List<Double>      |
|   list<string>    |     \[\]string     |       list        |     List<String>      |
|  map<bool, i32>   |  map\[bool\]int32  |        map        | Map<Boolean, Integer> |
| map<bool, double> | map\[bool\]float64 |        map        | Map<Boolean, Double>  |
| map<bool, string> | map\[bool\]string  |        map        | Map<Boolean, String>  |

根据 codec-dubbo 提供的类型映射，我们能很轻松地将 Dubbo 接口定义转化为 Thrift IDL，并使用 Kitex 命令行工具生成项目脚手架代码，最终注入 DubboCodec 完成 Kitex -> Dubbo 的通信。以下方 Dubbo 接口定义为例：

```java
package org.cloudwego.kitex.samples.api;

public interface GreetProvider {
    GreetResponse Greet(GreetRequest req) throws Exception;
}

public class GreetRequest implements Serializable {
    String req;

    public GreetRequest(String req) {
        this.req = req;
    }
}

public class GreetResponse implements Serializable {
    String resp;

    public GreetResponse(String resp) {
        this.resp = resp;
    }
}
```

对应的 api.thrift 文件如下所示，需要注意到其中的结构体定义都需要加上 `JavaClassName` 的注解，对应 Dubbo 接口定义中的 package + 类名。

```thrift
struct GreetRequest {
    1: required string req,
} (JavaClassName="org.cloudwego.kitex.samples.api.GreetRequest")

struct GreetResponse {
    1: required string resp,
} (JavaClassName="org.cloudwego.kitex.samples.api.GreetResponse")

service GreetService {
    GreetResponse Greet(1: GreetRequest req)
}
```

使用 Kitex 命令行工具，并指定协议为 Hessian2：

```shell
kitex -module demo-client -protocol Hessian2 ./api.thrift
```

之后初始化 DubboCodec 并将其注入 Kitex ，利用生成代码编写以下 Client 端代码即可实现 Kitex -> Dubbo 调用：

```go
javaClass := "org.cloudwego.kitex.samples.api.GreetProvider"
cli, err := greetservice.NewClient("helloworld",
    // 指定想要访问的服务端地址，也支持 ZooKeeper 服务发现
    client.WithHostPorts("127.0.0.1:21000"),
    // 配置 DubboCodec
    client.WithCodec(
        // 指定想要调用的 Dubbo Interface
        dubbo.NewDubboCodec(dubbo.WithJavaClassName(javaClass))
    ),
)
if err != nil {
    panic(err)
}

resp, err := cli.Greet(context.Background(),
    &hello.GreetRequest{Req: "world"})
if err != nil {
    klog.Error(err)
    return
}
klog.Infof("resp: %s", resp.Resp)
```

Kitex + codec-dubbo Server 端流程与 Client 端基本类似，具体例子可参考项目主页。

#### 类型拓展

Hessian2 schema-free 的特性导致 Dubbo 的实现“过于灵活”，可以使用任意类型。为了适配 Dubbo Hessian2 的类型使用灵活性，codec-dubbo 支持类型拓展，其中主要包括自定义映射与 Java 常用类型拓展。

##### 自定义映射

Java 的基础类型有与之对应的包装类型，例如 `boolean` 与 `java.lang.Boolean`。类型映射中默认将 Go 的 类型映射到 Java 的 `java.lang.Boolean` 类型并不能覆盖到使用 `boolean` 的情况。

为了统一用户使用体验，让他们在 Kitex 侧只需使用 `bool` 类型，我们可以在 Thrift 的方法定义后面加上 `hessian.argsType="boolean"` 注解，利用 thriftgo 的 IDL 反射功能，提前生成 IDL 元信息并注入 codec-dubbo，便可以在运行时动态地将默认映射类型 `java.lang.Boolean` 改写成 `boolean` 。具体 Thrift 定义如下所示：

```thrift
service EchoService {
    bool EchoBoolean(1: bool req) (hessian.argsType="boolean")
}
```

与 `boolean` 和 `java.lang.Boolean` 类似，其他 Java 基础类型和包装类型也能通过这种方式进行自定义映射，此时 codec-dubbo 提供的完整类型映射如下：

|  **THRIFT 类型**  |    **GO 类型**     | **HESSIAN2 类型** |  **默认 JAVA 类型**   |           **可拓展 JAVA 类型**           |
| :---------------: | :----------------: | :---------------: | :-------------------: | :--------------------------------------: |
|        i32        |       int32        |        int        |   java.lang.Integer   |                   int                    |
|      double       |      float64       |      double       |   java.lang.Double    |      double float / java.lang.Float      |
|      string       |       string       |      string       |   java.lang.String    |                    \-                    |
|     list<i32>     |     \[\]int32      |       list        |     List<Integer>     |       int\[\] / ArrayList<Integer>       |
|   list<double>    |    \[\]float64     |       list        |     List<Double>      | double\[\] / ArrayList<Double> float\[\] |
|   list<string>    |     \[\]string     |       list        |     List<String>      |      String\[\] / ArrayList<String>      |
|  map<bool, i32>   |  map\[bool\]int32  |        map        | Map<Boolean, Integer> |        HashMap<Boolean, Integer>         |
| map<bool, double> | map\[bool\]float64 |        map        | Map<Boolean, Double>  |         HashMap<Boolean, Double>         |
| map<bool, string> | map\[bool\]string  |        map        | Map<Boolean, String>  |         HashMap<Boolean, String>         |

##### java 常用类型拓展

由于 Thrift 类型的局限性，我们无法直接使用 Java 类库中提供的常用类型。为此，codec-dubbo 在 [codec-dubbo/java](https://github.com/kitex-contrib/codec-dubbo/tree/main/java) 包中维护了 Thrift 不支持的 Java 类型(例如 `java.lang.Object` 、 `java.util.Date` )以及与之对应的 [java.thrift](https://github.com/kitex-contrib/codec-dubbo/blob/main/java/java.thrift) ，同时借助 thriftgo 提供的 idl-ref 功能，我们可以直接在 Thrift IDL 中引用这些类型并生成相应代码。当前的 java.thrift 如下所示：

```thrift
struct Object {} (JavaClassName="java.lang.Object")

struct Date {} (JavaClassName="java.util.Date")

struct Exception {} (JavaClassName="java.lang.Exception")
```

为了启用这些类型，我们需要在 Thrift IDL 中使用 `include "java.thrift"` 导入它们，并且在使用 Kitex 命令行工具生成代码时添加 `-hessian2 java_extension` 参数来拉取该拓展包。

Kitex 命令行工具会自动下载 java.thrift ，你也可以手动下载后放到项目的根目录。引用 java.thrift 中类型的 Thrift IDL 示例：

```thrift
include "java.thrift"

service EchoService {
    // java.lang.Object
    i64 EchoString2ObjectMap(1: map<string, java.Object> req)
    // java.util.Date
    i64 EchoDate(1: java.Date req)
}
```

### 方法重载

Go 原生不支持方法重载，只能通过定义多个方法来达到类似重载的效果。为了将 Go 中的多个方法映射到 Java 中的重载方法，与自定义映射一节类似，我们在 Thrift 的方法定义后面加上 `JavaMethodName` 标签，借助 thriftgo 的 IDL 反射功能在运行时动态地将 Go 侧原本的方法名改写成 `JavaMethodName` 指定的 Java 侧中的重载方法。

以 Java 侧的 EchoMethod 为例：

```java
String EchoMethod(Boolean req);
String EchoMethod(Integer req);
String EchoMethod(int req);
String EchoMethod(Boolean req1, Integer req2);
```

我们编写如下 Thrift 定义，即可完成 Go 与 Java 间的重载方法映射，注意到 `JavaMethodName` 和 `hessian.argsType` 可以同时使用：

```thrift
service EchoService {
    string EchoMethodA(1: bool req) (JavaMethodName="EchoMethod")
    string EchoMethodB(1: i32 req) (JavaMethodName="EchoMethod")
    string EchoMethodC(1: i32 req) (JavaMethodName="EchoMethod", hessian.argsType="int")
    string EchoMethodD(1: bool req1, 2: i32 req2) (JavaMethodName="EchoMethod")
}
```

### 异常处理

codec-dubbo 将 Java 中的异常映射为 Go 中的错误，这些错误统一实现以下接口：

```go
type Throwabler interface {
    Error() string
    JavaClassName() string
    GetStackTrace() []StackTraceElement
}
```

根据 Dubbo 官方推荐的异常处理实践以及企业用户目前的需求，我们将异常划分为常见异常与自定义异常，同时兼顾用户的基础需求以及可扩展需求。

#### 常见异常

codec-dubbo 在 [pkg/hessian2/exception](https://github.com/kitex-contrib/codec-dubbo/tree/main/pkg/hessian2/exception) 包中提供了 Java 常见的异常，目前支持 `java.lang.Exception` 。

常见异常无需 Kitex 命令行工具的支持，直接引用即可，以下是 Client 端提取异常和 Server 端返回异常的示例。

##### Client端提取异常

```go
resp, err := cli.Greet(context.Background(),
    &hello.GreetRequest{Req: "world"})
if err != nil {
    // FromError 返回 Throwabler
    exceptionRaw, ok := hessian2_exception.FromError(err)
    if !ok {
        // 视作常规错误处理
    } else {
        // 若不关心 exceptionRaw 的具体类型，直接调用 Throwabler 提供的方法即可
        klog.Errorf("get %s type Exception", exceptionRaw.JavaClassName())
        // 若想获得 exceptionRaw 的具体类型，需要进行类型转换，但前提是已知该具体类型
        exception := exceptionRaw.(*hessian2_exception.Exception)
    }
}
```

##### Server端返回异常

```go
func (s *GreetServiceImpl) Greet(ctx context.Context, req *hello.GreetRequest) (resp *hello.GreetResponse, err error) {
    return nil, hessian2_exception.NewException("Your detailed message")
}
```

#### 自定义异常

Java 中的自定义异常往往会继承一个基础异常，这里以 `CustomizedException` 为例，`CustomizedException` 继承了 `java.lang.Exception` ：

```java
public class CustomizedException extends Exception {
    private final String customizedMessage;

    public CustomizedException(String customizedMessage) {
        super();
        this.customizedMessage = customizedMessage;
    }
}
```

得益于 thriftgo 支持生成嵌套结构体，为了在 Kitex 侧定义与之对应的异常，我们在 Thrift 中编写如下定义：

```thrift
exception CustomizedException {
    // thrift.nested=“true” 注解让 thriftgo 生成嵌套结构体
    1: required java.Exception exception (thrift.nested="true")
    2: required string customizedMessage
}(JavaClassName="org.cloudwego.kitex.samples.api.CustomizedException")
```

注意 `exception` 字段的注解 `thrift.nested="true"` ，它让 thriftgo 生成嵌套结构体，达到类似继承的效果。

和 Java 常用类型扩展一样，需要在使用 kitex 脚手架工具生成代码时添加 `-hessian2 java_extension` 参数来拉取拓展包，生成代码如下：

```go
type EchoCustomizedException struct {
    java.Exception `thrift:"exception,1,required" frugal:"1,required,java.Exception" json:"exception"`

    CustomizedMessage string `thrift:"customizedMessage,2,required" frugal:"2,required,string" json:"customizedMessage"`
}
```

使用方法与常见异常一致，此处不再赘述。

### 服务注册与发现

Dubbo 同时提供**接口级**与**应用级**服务注册发现模型，根据企业用户当前的生产环境需要，我们选择优先实现基于 zookeeper 的**接口级**模型：Dubbo registry-zookeeper。

与我们熟知的应用级模型不同，接口级模型需要维护接口名 => 服务(不同于微服务，更接近 Handler )的映射关系，一个接口名会映射到多个服务 ，这些服务可能会存在于同一个进程中。

考虑到 Dubbo 的接口级服务模型与 Kitex 的服务模型差别较大，且 Dubbo registry-zookeeper 应绑定 codec-dubbo 使用，因此不考虑修改 kitex-contrib 中原有的 registry-zookeeper，让 dubbo registry-zookeeper 成为 codec-dubbo 的一个子 go module 统一进行开发与维护。

综合考虑 Dubbo 接口级服务模型、Kitex API 与用户的使用体验，我们提供以下的配置层次：

1.  [registry/options.go](https://github.com/kitex-contrib/codec-dubbo/blob/main/registries/zookeeper/registry/options.go) 与 [resolver/options.go](https://github.com/kitex-contrib/codec-dubbo/blob/main/registries/zookeeper/resolver/options.go) 中的 WithServers 和 WithRegistryGroup 函数提供注册中心级别的配置，分别指定 zookeeper 的地址和这些 zookeeper 所属的组。用户使用这些函数生成 Kitex 中 `registry.Registry` 和 `discovery.Resolver` 实例。

2.  服务级别的配置由 `client.WithTag` 与 `server.WithRegistryInfo` 进行传递，[registries/common.go](https://github.com/kitex-contrib/codec-dubbo/blob/main/registries/common.go) 提供 Tag keys ，这些 key 与 Dubbo 中的服务元数据一一对应。

#### resolver 示例

```go
intfName := "org.cloudwego.kitex.samples.api.GreetProvider"
res, err := resolver.NewZookeeperResolver(
    // 指定 zookeeper 服务器的地址，可指定多个，请至少指定一个
    resolver.WithServers("127.0.0.1:2181"),
)
if err != nil {
    panic(err)
}
cli, err := greetservice.NewClient("helloworld",
    // 配置 ZookeeperResolver
    client.WithResolver(res),
    // 指定想要调用的 dubbo Interface
    client.WithTag(registries.DubboServiceInterfaceKey, intfName),
)
if err != nil {
    panic(err)
}
// 使用 cli 进行 RPC 调用
```

#### registry 示例

```go
intfName := "org.cloudwego.kitex.samples.api.GreetProvider"
reg, err := registry.NewZookeeperRegistry(
    // 指定 zookeeper 服务器的地址，可指定多个，请至少指定一个
    registry.WithServers("127.0.0.1:2181"),
)
if err != nil {
    panic(err)
}

svr := greetservice.NewServer(new(GreetServiceImpl),
    server.WithRegistry(reg),
    // 配置dubbo URL元数据
    server.WithRegistryInfo(&kitex_registry.Info{
        Tags: map[string]string{
            registries.DubboServiceInterfaceKey: intfName,
            // application请与dubbo所设置的ApplicationConfig保持一致，此处仅为示例
            registries.DubboServiceApplicationKey: "application-name",
        }
    }),
)
// 启动 svr
```

## 总结

Kitex 支持了 Dubbo 协议，是 CloudWeGo 助力多语言云原生生态融合的一大步，解决了众多企业用户 Java 转 Go 、 Java 与 Go 并存的痛点，欢迎大家试用和接入；如果在使用过程遇到任何问题，可以加入我们的飞书用户群，或者在 Github 上给我们提反馈。

[Kitex]: https://github.com/cloudwego/kitex
[codec-dubbo]: https://github.com/kitex-contrib/codec-dubbo
