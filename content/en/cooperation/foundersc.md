---
type: docs
title: "Founder Securities - Financial Technology Cloud-native Microservices Implementation"
linkTitle: "Founder-Securities"
weight: 7
---

概述：本文将详细介绍方正证券金融科技工程院在云原生微服务建设实践经验，分享包含 3 个方面：

1. 微服务治理工作
2. 微服务可观测性工作
3. 微服务接口管理
   上述能力统一集成到了方正公司的夸克开发平台上。

## 方正证券微服务建设实践介绍

2023 年年初我们启动了微服务体系建设，其中注册中心采用的 [ZooKeeper][ZooKeeper]，Web 和 RPC 应用框架分别采用的 CloudWeGo 的 [Hertz][Hertz] 和 [Kitex][Kitex]。

目前我们进入到了微服务建设的深水区，主要涉及到**微服务治理**，**可观测性能力**，**接口管理**等相关工作内容，下面将分别从概念、实现原理等方面来详细介绍。

## 微服务治理能力建设

### 概念

微服务架构下，随着业务量的逐步增加，服务的数量也会逐步增加。基于此背景，随着业务的发展，对服务的管控难度会越来越大，服务治理的作用就是为了解决服务拆分所引发的一系列问题，以让服务更稳定地运行，涉及的主题包含了服务注册与发现、负载均衡、服务熔断、服务降级、服务限流等。
夸克平台提供的超时、重试以及服务端限流的功能，均基于 [Kitex][Kitex] 的相关能力而来，目前所使用的注册中心为 ZooKeeper（缩写 zk），因此相关的动态配置也是借助 zk 来实现，通过将配置写入到 zk，来通知 server 端、client 端完成相关功能的开启。

### 介绍

1. 流量控制

   流量控制的粒度为服务级别，下图所示中，该服务每秒最多处理1000个请求，超额的请求将被直接关闭掉：
   ![huaxing_ratelimit](/img/users/foundersc/foundersc1.png)

2. 重试配置

   重试配置的粒度为方法级别，用来配置当前服务对指定服务的某个方法发出的请求失败的情况下，如何进行重试：
   ![huaxing_retry](/img/users/foundersc/foundersc2.png)

3. 超时配置

   超时配置的粒度为方法级别，用来配置当前服务对指定服务的某个方法请求的最大耗时，超过该值时，当前服务会断开连接：
   ![huaxing_timeout](/img/users/foundersc/foundersc3.png)
   各个配置的具体作用详见配置说明

### 实现原理与细节

server 端、client 端均通过扩展 [Kitex][Kitex] 的 suite 来完成相关配置的动态注入。

#### server端

通过如下代码对 Kitex server 进行配置：

```go
server.WithSuite(zooKeeperServer.NewSuite("Kitex-server", zooKeeperClient))
```

其中，`zooKeeperServer.NewSuite("Kitex-server", zooKeeperClient)`会返回一个suite实例，注入给服务器的 `Options` 中包含了limiter配置：

```go
func (s *zooKeeperServerSuite) Options() []server.Option {
    opts := make([]server.Option, 0, 2)
    // WithLimiter实现中，在zk中注册了监听器，每当数据变化，动态更新Limiter的相关配置，以达到限流目的
    opts = append(opts, WithLimiter(s.service, s.zooKeeperClient, s.opts))
    return opts
}
```

基于以上内容，可以发现，server 端的 suite 中默认只配置了 limiter，[Kitex][Kitex] 框架目前只支持两类 limiter：

1. Connections limiter（限制最大连接数量）
2. Qps limiter（限制最大qps）

在使用 zk 作为注册中心时，两者都可以通过配置动态调整，变化之后配置值均通过 zk 的监听器获取到：

```go
// zk数据变化时的回调方法
onChangeCallback := func(restoreDefault bool, data string, parser zooKeeper.ConfigParser) {
   lc := &limiter.LimiterConfig{}
   if !restoreDefault && data != "" {
      err := parser.Decode(data, lc)
      if err != nil {
         klog.Warnf("[zooKeeper] %s server zooKeeper config: unmarshal data %s failed: %s, skip...", dest, data, err)
         return
      }
   }
   // 将zk中的数据动态更新到配置中
   opt.MaxConnections = int(lc.ConnectionLimit)
   opt.MaxQPS = int(lc.QPSLimit)
   u := updater.Load()
   if u == nil {
      klog.Warnf("[zooKeeper] %s server zooKeeper limiter config failed as the updater is empty", dest)
      return
   }
   if !u.(limit.Updater).UpdateLimit(opt) {
      klog.Warnf("[zooKeeper] %s server zooKeeper limiter config: data %s may do not take affect", dest, data)
   }
}
// path，对于limiter，其值为：/KitexConfig/{ServiceName}/limit
zooKeeperClient.RegisterConfigCallback(context.Background(), path, uniqueID, onChangeCallback)
```

#### client端

类似 server 端，client 端也有同样的配置：

```go
bizService.NewClient("Kitex-client",
client.WithSuite(zooKeeperclient.NewSuite("Kitex-server", "Kitex-client", zooKeeperClient)))
```

client 端的 suite，包含的 Option 如下：

```go
func (s *zooKeeperClientSuite) Options() []client.Option {
    opts := make([]client.Option, 0, 7)
    opts = append(opts, WithRetryPolicy(s.service, s.client, s.zooKeeperClient, s.opts)...)
    opts = append(opts, WithRPCTimeout(s.service, s.client, s.zooKeeperClient, s.opts)...)
    opts = append(opts, WithCircuitBreaker(s.service, s.client, s.zooKeeperClient, s.opts)...)
    return opts
}
```

即，客户端支持重试、超时、熔断三种动态配置。相关的处理均是通过zk客户端的回调方法来达到动态更新的效果。

**超时配置的额外说明**

对于超时，其配置方法的具体实现如下：

```go
func WithRPCTimeout(dest, src string, zooKeeperClient zooKeeper.Client, opts utils.Options) []client.Option {
    // ...
    return []client.Option{
        client.WithTimeoutProvider(initRPCTimeoutContainer(path, uid, dest, zooKeeperClient)),
        client.WithCloseCallbacks(func() error {
            // cancel the configuration listener when client is closed.
            zooKeeperClient.DeregisterConfig(path, uid)
            return nil
        }),
    }
}
```

最终通过调用 Kitex 提供的`client.WithTimeoutProvider`方法来完成超时相关的具体配置。对于超时，存在以下不同的配置方法：

```go
func WithRPCTimeout(d time.Duration) Option {
    // ...
}

func WithConnectTimeout(d time.Duration) Option {
    // ...
}

func WithTimeoutProvider(p rpcinfo.TimeoutProvider) Option {
    // ...
}
```

其中，`WithTimeoutProvider`设置的超时时间会被`WithRPCTimeout`、`WithConnectTimeout`设置的值所覆盖，因此如果在创建 Kitex client 时，调用过`WithRPCTimeout`或者`WithConnectTimeout`，会导致动态配置无法生效。

### 配置说明

#### 超时

对应的zk节点：`/kitexConfig/{ClientName}/{ServiceName}/rpc_timeout`

写入的配置格式如下：

```json
{
  "*": {
    "conn_timeout_ms": 100,
    "rpc_timeout_ms": 800
  },
  "GetDemoInfo": {
    "rpc_timeout_ms": 300
  },
  "GetDemoInfo3": {
    "rpc_timeout_ms": 300
  }
}
```

**字段含义**
`conn_timeout_ms`：建立一条新连接的最大等待时间；
`rpc_timeout_ms`：一次 rpc 调用的最大用时；

#### 重试

对应的zk节点：`/kitexConfig/{ClientName}/{ServiceName}/retry`

写入的配置格式如下：

```json
{
  "GetDemoInfo": {
    "enable": true,
    "type": 0,
    "failure_policy": {
      "stop_policy": {
        "max_retry_times": 2,
        "max_duration_ms": 9000,
        "cb_policy": {
          "error_rate": 0.1
        }
      }
    }
  },
  "GetDemoInfo5": {
    "enable": true,
    "type": 0,
    "failure_policy": {
      "stop_policy": {
        "max_retry_times": 2,
        "max_duration_ms": 9000,
        "cb_policy": {
          "error_rate": 0.1
        }
      }
    }
  }
}
```

**字段含义**

| 配置项          | 默认值 | 说明                                                                                                                                                 | 限制            |
| --------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| max_retry_times | 2      | 最大重试次数，不包含首次请求。如果配置为 0 表示停止重试。                                                                                            | 合法值：[0-5]   |
| max_duration_ms | 0      | 累计最大耗时，包括首次失败请求和重试请求耗时，如果耗时达到了限制的时间则停止后续的重试。0 表示无限制。注意：如果配置，该配置项必须大于请求超时时间。 |                 |
| error_rate      | 10%    | 重试熔断错误率阈值, 方法级别请求错误率超过阈值则停止重试。                                                                                           | 合法值：(0-30%] |

#### 限流

此配置为服务全局配置，因此 zk 节点路径只包含 serviceName：`/kitexConfig/{ServiceName}/limit`

写入的配置格式如下：

```json
{
  "qps_limit": 100
}
```

## 微服务可观测性能力建设

### 概念

服务观测性建设指的是在分布式系统中建立和完善监控、日志、追踪等工具和技术，以便全面、及时地了解系统的运行状态和性能指标。

一个完善的观测性工具，可以为业务系统带来诸多好处：

1. 能及时发现和解决问题；
2. 使团队能够更清晰地了解系统的整体运行情况和内部交互关系；
3. 可以了解系统的负载情况、资源利用率和趋势变化，以支持容量规划和资源优化；
4. 通过日志和追踪系统记录系统的操作日志和请求轨迹，可以跟踪和分析用户操作行为、异常请求和安全事件，提高系统的安全性和可靠性。

### 介绍

服务详细信息，用来展示服务本身的整体运行情况，包含了黄金监控指标(QPS、Latency和 Error Ratio)、SLO 和 runtime相关信息等：
![huaxing_grafana](/img/users/foundersc/foundersc4.png)

拓扑图，用来展示服务间的上下游依赖关系：
![huaxing_topology](/img/users/foundersc/foundersc5.png)

调用链数据，包含了服务间每次调用的详细信息：
![huaxing_trace](/img/users/foundersc/foundersc6.png)

### 实现原理与细节

![huaxing_otel](/img/users/foundersc/foundersc7.jpg)

目前模板代码中已经集成了 [OpenTelemetry][OpenTelemetry] 客户端，生成的 [Hertz][Hertz]、[Kitex][Kitex] 服务默认拥有可观测数据(Metrics + Tracing)上报能力。

详细信息可以参考：[kitex-contrib/obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry) 和 [hertz-contrib/obs-opentelemetry](https://github.com/hertz-contrib/obs-opentelemetry)

> [OpenTelemetry][OpenTelemetry] (OTel) 是一个开源可观测性框架，可允许开发团队以统一的单一格式生成、处理和传输遥测数据。它是由云原生计算基金会 (CNCF) 开发的，旨在提供标准协议和工具，以便收集指标、日志和跟踪并将其发送到监测平台。
> OpenTelemetry 提供独立于供应商的 SDK、API 和工具。OpenTelemetry 正在快速成为云原生应用程序领域内主导的可观测性遥测数据标准。如果组织想要做好准备以满足未来的数据需求，而且不想被锁定到某一特定供应商，也不想受限于其既有技术，那么采用 OpenTelemetry 对其至为关键。

#### Trace( 跟踪)

Tracing 提供了从请求开始接收到处理完毕的整个生命周期的全貌。

服务在接收到请求后，从元信息（Kitex）或 http header（Hertz）中启用链路追踪。如果元信息或 HTTP header 中没有 Tracing 信息，将自动启用新的链路追踪。服务进程内通过 context 来传递链路信息。

接入方式：

```go
// for Hertz
tracer, cfg := hertztracing.NewServerTracer()
h := server.Default(tracer)
h.Use(hertztracing.ServerMiddleware(cfg))
```

```go
// for Kitex
svr := echo.NewServer(new(DemoImpl),
    server.WithSuite(tracing.NewServerSuite()),
    server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),)
```

Tracing 信息上报到 OpenTelemetry Collector 中，然后透传给 Jaeger。可以在 Jaeger 中查询链路相关信息。

提供统一的日志打印器 fzlog，默认打印 tracing 的相关信息。

```json
{
  "file": "get_repositories.go:33",
  "func": "gitlab.fzzqft.com/ifte-quark/quark-api/biz/service.(*GetRepositoriesService).Run",
  "level": "info",
  "msg": "GetRepositoriesService Run req: page:1 limit:10 service_name:\"kitex\"",
  "span_id": "aa26bab58cdf6806",
  "time": "2024-04-23 15:59:40.609",
  "trace_flags": "01",
  "trace_id": "f714dbe2a96b1882dfc4b81909e55643"
}
```

日志被采集处理后，可以在日志平台上通过 `trace_id` 来查询整个链路的相关日志信息。

#### Metrics(指标)

Metrics 是衡量系统性能和行为的关键数据，如请求速率、响应时间、错误率等。指标通常被收集、聚合和可视化，以便监视系统的健康状况并进行趋势分析。

目前，每个服务各自上报自身的 Metrics 数据，统一存储在 Prometheus/VictoriaMetrics 中，最终使用 grafana 形成监控面板。

下面通过QPS、请求耗时、错误率这三个常见的服务描述指标来展示如何使用服务上报的 Metrics 数据。

- QPS：基于QPS的定义，我们只需要获取到实时请求数量，即可计算出 QPS，上报的数据中，`http_server_duration_count` 的值与请求数量一致，因此可以使用此 Metric 来完成 QPS 的计算。

  ```bash
  sum(rate(http_server_duration_count{service_name="$service_name"}[$__rate_interval]))
  ```

  上述 promQL 中，rate 函数的作用是计算某个 Metric 在指定时间段内的增长率，最终得到的结果为指定时间段内的平均请求数量。

- 请求耗时：由于是一个统计数据，这里选择使用平均值来表示服务请求的耗时情况，通过指定时间段内的所有请求总耗时➗指定时间段内的请求数量得到平均耗时：

  ```bash
  sum(rate(http_server_duration_sum{service_name="$service_name"}[$__rate_interval])) by (application) /
  sum(rate(http_server_duration_count{service_name="$service_name"}[$__rate_interval])) by (application)
  ```

- 错误率：先过滤出错误请求数量，除以总请求数量即可得到错误率
  ```bash
  round((1 - (sum(rate(http_server_duration_count{service_name="$service_name",http_status_code=~"^(2|3).*"}
  [$__interval]))/sum(rate(http_server_duration_count{service_name="$service_name"}[$__interval])))), 0.0001)
  ```

#### 拓扑图

通过聚合中提到的 Metric 数据来展示整体的服务间依赖关系，上报数据中有`service_name`以及`source`和`target`信息，通过 PromSQL 的`sum`操作符即可获取到服务上下游信息。

## 微服务接口管理能力建设

### 概念

- IDL

  接口描述语言（Interface Description Language，缩写IDL），是用来描述软件组件接口的一种计算机语言。 IDL通过一种独立于编程语言的方式来描述接口，使得在不同平台上运行的对象和用不同语言编写的程序可以相互通信交流。

- 接口管理

  Kitex(RPC)服务均基于IDL来实现，接口管理平台主要提供接口平台化的方式来管理RPC服务的IDL产物，便于开发者管理和调用RPC接口。

- 接口测试

  Kitex(RPC)服务存在测试不可达的情况，接口测试平台用户解决该问题，便于测试、开发通过平台发起RPC请求完成调试。

### 介绍

- 接口管理平台(操作方法见图示）
  ![huaxing_interface_1](/img/users/foundersc/foundersc8.png)
  ![huaxing_interface_2](/img/users/foundersc/foundersc9.png)
  ![huaxing_interface_3](/img/users/foundersc/foundersc10.png)
- 接口测试平台（调试Kitex(RPC)接口）
  ![huaxing_interface_test](/img/users/foundersc/foundersc11.png)

### 实现原理与细节

- 接口管理

  此前我们使用的是独立仓库配合 gitlabci 的方式来管理 [Kitex][Kitex] 服务的 IDL 产物：
  ![huaxing_interface_impl](/img/users/foundersc/foundersc12.jpg)
  在实际使用过程中，存在以下痛点：

  1. 调用方需要通过小窗方式（私聊）获取IDL产物仓库的地址、分支或版本号
  2. 服务提供方式需要同时关注服务项目仓库和对应的产物仓库
  3. Gitlabci 强依赖 runner，新的 group 需要找管理员配置才可用
  4. 无法与现有的 CICD 流程深度绑定

  为解决上述问题与痛点，故设计开发了接口管理平台。
  ![huaxing_interface_platform](/img/users/foundersc/foundersc13.jpg)

  服务在构建打包时，触发 IDL 产物更新流程，平台将自动检测服务类型，并生成对应的 IDL 产物提交到 gitlab 独立仓库中。用户也可以在平台中手动创建或更新 IDL 产物。调用方只需复制执行 import 路径命令，就能获取对应版本的服务依赖。

- 接口测试
  ![huaxing_interface_test_logic](/img/users/foundersc/foundersc14.jpg)
  基于 Kitex PB 的 JSON 映射泛化调用实现。用户在平台上选择对应服务和接口，平台自动解析对应的 IDL 文件，给出默认的请求参数（json 格式）。发送请求后，平台通过泛化调用的方式向目标服务发起一次 RPC 请求，并将结果返回。

## 小结

目前的微服务体系已经能满足大部分的技术类需求，但是在云原生的体系之下计划走得更远一些：

1. 服务治理，依赖云原生服务网格（ServiceMesh）能力来治理流量，同时把其他应用框架的东西向的流量一起纳入进来。
2. 可观测性，OpenTelemetry 是一套与语言无关、与应用框架无关的解决方案，通过统一语义，计划将 Java 的 Web（Springboot）和 RPC（Dubbo）体系一起纳管进来。
3. 接口管理，未来计划将 RPC 和 HTTP 接口统一管理，自动生成接口用例。

[Kitex]: http://github.com/cloudwego/kitex
[Hertz]: http://github.com/cloudwego/hertz
[OpenTelemetry]: https://opentelemetry.io/
[ZooKeeper]: https://github.com/apache/zookeeper
