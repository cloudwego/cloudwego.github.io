---
title: CloudWeGo 社区会议 7.14
linkTitle: CloudWeGo 社区会议 7.14
date: 2022-07-14
weight: 10
description: >
---

**会议主题** ：CloudWeGo 社区会议 7.14

**参会人** ：GuangmingLuo, Cheng Guozhu, simon0-o, welkeyever, YangruiEmma, liu-song, Ivnszn, CoderPoet, li-jin-gou, joway, bodhisatan,
Fan Guangyu, Jacob953, Wang Yafeng, gova, Huang Xiaolong, Zhang Guiyuan, chenzBin, yccpt, jayantxie, baiyutang, skyenought, yiyun, rogerogers, Zhou Xinyi, baize, LhdDream, Li Congyan, Liu Jia

**会前必读** ：[官网](/)；https://github.com/cloudwego

### 议程 1 ：新人自我介绍

1. 新成员名单：@王亚峰 @张桂元 @周鑫宜 @rogerogers
2. 社区新成员分别进行自我介绍，主要包含个人基本情况、开源贡献经历和后续参与社区工作内容。

---

### 议程 2 ：Hertz-Contrib/Limiter 组件分享 @LhdDream

1. 介绍PPT：[过载保护-限流算法.pptx](https://bytedance.feishu.cn/file/boxcnfVCs9Nh6JxfqDkVG2MqyrQ?from=from_copylink)
2. 相关讨论：

- **Q：** 造成 CPU 负载的因素很多，如何判断这是通过访问量或者高并发请求产生的负载？有时用户的加码程序或者某些在系统上跑的程序也会导致 CPU 负载很高，会不会有限流失误的问题？
- **A：** 如果一个程序出现了问题，CPU 已经负载很高的时候，也没有必要再承担一个请求，因为这个机器的性能已经达到了负荷。

3. 后续补充限流算法相关案例和使用算法的趋势图，方便直观感受使用这个组件带来的收益。

---

### 议程 3 ：Hertz-Contrib/Obs-Opentelemetry 设计与应用场景介绍 @CoderPoet

1. 地址：github.com/hertz-contrib/obs-opentelemetry

- 默认提供开箱即用 OpenTelemetry Provider；
- 对 Hertz 做了一些 Instrumentation，主要有三点：

  - Tracing
    - Support server and client Hertz http tracing
    - Support automatic transparent transmission of peer service through http headers // 基于对端服务信息透传，实现服务拓扑能力
  - Metrics
    - Support Hertz http metrics [R.E.D] // 做 http metrics 的埋点，实现一些服务的黄金指标
    - Support service topology map metrics [Service Topology Map] // 基于 http headers 透传对端服务信息，生成 Service Topology Map
    - Support go runtime metrics
  - Logging
    - Extend Hertz logger based on logrus
    - Implement tracing auto associated logs // 拓展 Hertz logger 接口，基于 logrus hook 机制，从 Context 里面提取相应的 trace context 放到日志里，通过这样的模式实现 trace context 和日志的串联

2. OpenTelemetry 目标是实现 Tracing/Metrics/Logging 三个数据的互联互通，但三者本身的成熟度上不同步，在社区状态中，Tracing 基本都是 Stable，Metrics 只有 API 和协议是 Stable 状态，Logging 是 Draft 状态。相关链接：https://opentelemetry.io/status/
3. Hertz 并不是把 Logging 的 API 集成起来，而只是把协议里面提到的比如 Log Model、Trace ID 如何定义等规范集成，所以即使 Logging 没有达到一定成熟度，也可以使用。关于使用场景：

- 如果想要实现全链路观测，可以直接集成该。比如访问 Hertz Server 和 Kitex Server 会有一个简单的链路串联，可以输入一些自定义的属性，并且默认也会帮你输入根据 OpenTelemetry 语法规范做的、协议相关的属性；
- 如果想自动做请求维度的一些 RED 指标，比如计算 QPS，只要去把数据源导入就可以做相应的面板绘制；
- Runtime Metrics 也做了自动集成，可以在 Dashboard 里面绘制相应状态；
- 最新的 Jaeger 已经原生支持 OTLP Protocol 获取协议，相当于我们的库可以直接跟 Jaeger Collector 做集成，不需要用 OpenTelemetry Collector 做数据中转。

使用场景：github.com/cloudwego/hertz-examples/tree/main/opentelemetry

4. 相关讨论：

- **Q：** 如果在 Hertz 使用 Obs 扩展，比如有一个 Trace ID，想快速找到有问题的请求，有没有可能就是把这个 Trace ID 或者是能够唯一标识这一次链路追踪的 ID 返回到 Response 里面去呢？
- **A：** 目前对于这种错误链路，可以在尾采样中做异常全采，不用借助 Response，可以直接在链路搜索里面找到相应的错误那条 Trace，然后看它上游或者下游哪些地方发生了异常。

---

### 议程 4：关于 Hertz-Template 的优化建议与讨论 @skyenought

1. 相关文档：[关于 Hertz template 的新 feat](https://ybwflbcn12.feishu.cn/docx/doxcnyQKMUgeqiwNWH8q7zzPeYg)

原本如果要定义 Template，所有内容都写在 YAML 文件里，需要转移符号判断文本，这样看起来可读性比较差、耦合度高。解决方案是不使用 Body 关键字，添加 TemplatePath，只描述Template 文件在这个项目中的位置，这样分散开来比较方便修改和浏览。经过逻辑判断，要保证 Body 和 TemplatePath 不能同时使用，这样可能会造成混乱。如果是 Body 就直接读 Body 的值，如果是 TemplatePath 就通过 IO 把内容读进来以后再进行模版分析。优化实现有待进一步讨论。

2. 相关文档：[Hertz 和 Kitex 对于 IDL 的不同处理](https://ybwflbcn12.feishu.cn/docx/doxcnjXcdN1lYRCDbUkZwLAVokz)

**Q：** CloudWeGo 一个组织中，代码风格却大不相同。Kitex 因为有 Netpoll 存在，只针对 Linux 环境，所以对后缀不做限定。Hertz 在 Go net, windows 和 Linux 环境都可进行开发，它拥有强规定。它们为什么不能统一风格呢？

**A：** Apache Thrift 的官方并没有对 Thrift 文件后缀有明确规定，从长期大量的实践来看，有很多用户不会把 Thrift 文件的后缀给改为 `.Thrift`。在内部，以 HTTP 的 IDL 举例，基本都是以 Thrift 或者 PB 的形式存在，所以说我们没有考虑制定拓展名。

---

### 议程 5： 关于新增的 Biz-Demo 的后续规划 @GuangmingLuo

1. 地址：https://github.com/cloudwego/biz-demo
2. 新增 Biz-Demo 仓库。第一，存放同时集成 Hertz example 和 Kitex example 的案例；第二，存放各行各业最佳企业落地实践 Examples。正式呼吁感兴趣的同学提交有价值的业务案例！
3. 提交案例可以帮助同学从新手期向成熟期过渡，同时可以更深入地了解各个技术栈，得到较大的自我提升。后续会将好的 Business Demo 做一些推广，在官网上和公众号上都会有展示。参考案例：https://github.com/cloudwego/kitex-examples/pull/28

---

### 议程 6：Hertz 源码解读活动介绍 @yiyun

1. 源码解读活动一期结束，对于 RPC 相关基础知识整理了 1.6 万字，可以在 Community 仓库查看。
2. 源码解读活动二期已经开始，期间有四期直播分享：

- 了解 HTTP 框架的设计；
- 上手企业级 HTTP 框架 Hertz 的操作实践；
- CSG 一期源码解读优秀成员分享如何进行源码解读；
- 社区 Committer 和 Go 夜读作者分享，如何规划自己的代码学习和提升路径。

欢迎大家关注 CloudWeGo 公众号获取相关信息。

活动相关资料 Issue 地址：https://github.com/cloudwego/community/issues/33

第一期直播回顾：https://meetings.feishu.cn/s/1i38ftnck0f18?src_type=3&disable_cross_redirect=true

第二期直播回顾：https://meetings.feishu.cn/s/1i3fsqit6jchu?src_type=3
