---
title: CloudWeGo 社区会议 4.21
linkTitle: CloudWeGo 社区会议 4.21
date: 2022-04-21
weight: 5
description: >
---

**会议主题：** CloudWeGo 社区会议 4.21

**参会人员：** YangruiEmma, liu-song, baiyutang, yccpt, AshleeT, CoderPoet, Quan Hu, li-jin-gou, JZK-Keven, EastHorse, GuangmingLuo, HeyJavaBean, jayantxie, ppzqh, Shizheng Hou, andrewshan, simon0-o, yiyun, Wanqi Su, Zheming Li, Xianjie Yao, LoveScotty.

**会前必读：** [官网](/)；
https://github.com/cloudwego

## 议程 1 ：新成员自我介绍

内容：社区新成员分别进行自我介绍，主要包含个人基本情况、开源贡献经历和后续参与社区规划。

## 议程 2 ：Kitex 单测任务回顾、总结、建议

(@GuangmingLuo 负责介绍)

1. **完成进度：** 2/14
2. **提交 PR 注意事项 ：**

   a. 写 PR 描述：直接写 Issue 的编号即可，**不要写 Fix 和 Resolve**。

   b. 提交 PR 前：完成本地 Coding 后，**运行**`gofumpt -l -extra -w .`，检测代码是否存在语法、 License等问题。Contributor 在本地 Fix 这些问题后，能够顺利通过 CI 流程检测，顺利进入 review 环节。

   c. 提交 PR 时：若 PR 处于 Working In Progress 状态，大家在提交 PR 时可以选择 **Draft PR **，或者在 PR 描述中**加入 \*\***WIP\***\* 标识**，便于 Reviewer 优先处理完成状态的 PR。

   d. 单测描述：需要在描述部分清晰、详细说明单测方法的**场景**，便于后续快速、准确地 Review 代码逻辑。

3. **后续安排：** 将完成的 PR 正式地 Release 在 Kitex V0.3.0 中，并在 **Release Notes** 中公示。

## 议程 3：Kitex 源码解析活动介绍与讨论

（@baiyutang 负责介绍）

1. **介绍：** 源码解析活动方案草案主要包含六大模块：学习资料、设计理念、目标、课题、解读思路、产出形式。

   a. “目标”：① 作为 Contributor 的学习产出；② 作为框架新人的学习资料；③ 丰富社区资源和内容，提高 Kitex 的知名度。

   b. “课题”：包括 Kitex 模块设计及调用链路、服务治理、框架公共模块等内容。

   c. “解读思路”：包括代码设计现状、设计背景、Q&A、最佳实践等内容。

2. **后续安排：** 确定源码解读的优先级，继续补充、优化文档内容。

## 议程 4：Kitex 与阿里云 Nacos + Trace 对接工作进展介绍与讨论

（@li-jin-gou 负责介绍）

1. **背景介绍：** 我们希望将 [Demo(Easy-Note) ](https://github.com/cloudwego/kitex-examples/pull/27)部署到阿里云，主要的工作是验证 Kitex 接入阿里云的 ARMS 的链路追踪 和 MSE 的 Nacos 注册中心。

2. **工作开展：** 目前主要进行了 Kitex Nacos 扩展改造，包括改造初始化方式、设置环境变量和默认值、自定义 Logger 注入等。

3. **后续安排：** 相关实践文档在完成正式验证和完善后，将通过官方渠道，对外发布。

## 议程 5：Kitex 对接开源服务治理 SDK 方案介绍与讨论

（@jayantxie 负责介绍)

1. **背景介绍：** 为方便 Kitex 用户上云，计划对接腾讯的开源服务治理平台 Polaris，通过集成 [go sdk](https://github.com/polarismesh/polaris-go/tree/main/examples/quickstart)，满足诸如熔断限流和动态路由等 Polaris 平台的治理能力。

2. **方案介绍：** 目前存在两种方案设计，二者之间的区别主要体现在接入方式的不同。由于我们需要结合两个框架，此时必然会有一个框架的接口需要被调整改动。其中，方案一，倾向于保留 Kitex 现有框架的设计；方案二，倾向于保留 Polaris 的接口。经过讨论，决定采用方案一，详见 [Issue](https://github.com/cloudwego/kitex/issues/421)。

## 议程 6：社区建议

大家围绕源码解析文章的收集、发布形式展开了讨论。

1. **收集形式：** ① 建议将其以“ RPC 框架学习百科全书”，或者“框架学习指南”的形式，作为开源活动放在社区里，由大家进行内容补充；② 也可以以任务认领的形式发布社区，邀请社区成员参与源码解析。

2. **发布形式：** ① 可以考虑通过公众号宣传；② 也可以发布在 CloudWeGo 官网 和 Github 的 Wiki 里面。

## 议程 7：Q&A

**Q：我们是否也要把对接阿里云的相关基础设施统一放在一个 Suite 里面？**

A：目前还没有对接服务治理，我们的规划是：第一阶段支持注册中心和可观测系统的接入。比如，对Nacos 注册中心这块做了一些无侵入式配置的扩展对接，然后我们通过 OpenTelemetry 去接入阿里云的可观测系统；第二阶段，我们准备通过 Middleware 或 Suite 的方式对接开放服务治理的能力。现阶段的工作主要是对 Kitex 的 [Nacos registry](https://github.com/kitex-contrib/registry-nacos) 展开了优化，然后结合 OpenTelemetry 这一扩展，去重构 Kitex Easy-Note Demo。

**Q：单测每次 CI 都会出报告吗？上次想加到 awesome go ，但是他们对覆盖度有要求。**

A：可以点进 CI 的 Show all checks 查看测试报告，同时，在[单测新手任务](https://github.com/cloudwego/kitex/issues/372)完成之后，项目整体的单测覆盖率提高之后，我们也可以去设置覆盖率的门禁，后续 CI 检测会去检查单测覆盖率，并且输出到 PR 评论中。

## 相关资讯

截至 4 月 21 日，历时 5 个月，**CloudWeGo-Kitex** 完成了 3000 Stars 到 **4000 Stars** 的跨越，来到新的里程碑！
