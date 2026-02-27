---
title: CloudWeGo 社区会议 3.25
linkTitle: CloudWeGo 社区会议 3.25
date: 2022-03-25
weight: 3
description: >
---

**会议主题：** CloudWeGo 社区会议 3.25

**参会人员：** YangruiEmma, liu-song, baiyutang, yccpt, AshleeT, Authorixy, Dianjun Suo, bodhisatan, CoderPoet, Quan Hu, li-jin-gou, JZK-Keven, EastHorse, GuangmingLuo, Xiwen Li, joway, jasondeng1997, HeyJavaBean.

**会前必读：** [官网](/)；
https://github.com/cloudwego

## 议程 1 ：新成员自我介绍

内容：社区新成员和首次参加社区会议的内部成员分别进行自我介绍，主要包含个人基本情况、历史贡献和个人未来规划。

## 议程 2 ：Kitex 单测任务进展介绍

1. **领取进度：** 10/14。
2. **如何认领任务：** 在任务认领页面下方的评论中，留言你需要认领的项目，之后会分配给你。
3. **提交 PR 注意事项 ：**

   a. 提交 PR 一定要关联 Issue (可以在 PR 描述里面进行 Issue 关联)。

   b. Kitex 单测任务的 PR 的描述前缀统一使用 Test，便于相关同学进行 review。

   c. 提交了 PR之后，可以将 PR 发送在群里，方便后续跟进。

4. **提交 PR 时间要求：** 认领之后半个月内提交 PR，便于后续的意见修改和调试。

## 议程 3：源码分析落地

1. **参考案例：** 具体可以参考 Go-zero 和 Kratos 开源社区。例如：对框架一些较好的设计进行解读，提供“扩展阅读”文档，目录可以涵盖“日志组件介绍”、“令牌桶限流”等文档内容。
2. **后续规划：**

   a. 草拟源码分析目录大纲：① 目录结构和内容可以参考 CloudWeGo 官网目录；② 源码分析目录文档完成后，可以发在群里或者在 Github 上提交 Issue ，方便大家讨论修改；③ 认领单测任务的同学可以关注一下源码分析活动，助于更好地了解模块的功能。

   b. 宣传推广：后续会讨论宣传方案（例如征文比赛），也鼓励做出贡献的同学寻找渠道进行推广。

## 议程4：Q&A

**Q：写 Retry 的单测时，Retry 的单测其实是要配合 Kitex 的 Client 一起使用的。但是如果要把单测写到 Retry 下面的话，就需要引一个 Client 才能去写，这样就导致 Client 单测下面可能也有 Retry ，会存在一个循环依赖的问题？**

A：确实存在循坏依赖的情况。对于这种情况，可以使用 mock，比如你需要用到 Client，那你可能要专门去 mock 一个 Client；除此之外，单测使用 xxx_test package，也可以解决循环依赖的问题。

## 议程5：社区建议

欢迎大家将参与社区建设期间遇到的任何问题和想法发在群里，同社区成员一起沟通。内容不限于 Kitex、Netpoll 代码库、CloudWeGo 官网、宣传渠道等。
