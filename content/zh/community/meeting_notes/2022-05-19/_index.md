---
title: CloudWeGo 社区会议 5.19
linkTitle: CloudWeGo 社区会议 5.19
date: 2022-05-19
weight: 6
description: >
---

**会议主题**：CloudWeGo 社区会议 5.19

**参会人：** YangruiEmma, ag9920, Jiang Xuewu, liu-song, Joway, yccpt, Huang Yuting, CoderPoet, li-jin-gou, GuangmingLuo, simon0-o, scotty, yiyun, Authorixy, JZK-Keven, bodhisatan, ppzqh, Jacob953, Ivnszn, cyyolo, debug-LiXiwen, baize

**会前必读：** [官网](/)
https://github.com/cloudwego

**录屏链接：** https://bytedance.feishu.cn/minutes/obcn3zdn1g46avv887i11ms9?from=from_copylink

### 议程 1 ：社区近期项目开源规划介绍 @GuangmingLuo

1. 介绍新的开源项目 Frugal，欢迎感兴趣的同学熟悉并参与此项目。Kitex 下一个版本正式支持 Frugal，Kitex 新版本发布之后正式对外发文分享与宣传 Frugal。
2. Hertz 预计会在 5 月底或者 6 月初正式对外开源。正式开源后会发布会发布新手任务（代码层面 + 文档翻译），欢迎大家踊跃参与。

---

### 议程 2 ：Kitex 单测任务进展梳理 @GuangmingLuo

1. **完成进度：7/14**
2. **提交 \*\***PR\***\* 注意事项：**

   1. 一定注意 CI 报错，及时修复错误；
   2. 遵守 Issue Description 提到的要求；
   3. 提交 PR 的同学加快进度，团队内部负责 Review 的同学加紧跟进。争取在 5 月份的下一个版本发布之前，可以合入这些 PR。
   4. 需要 Rebase 的 Develop 代码单测错误已得到修复，Rebase 一下 Develop 分支代码即可解决。

3. 因疫情影响，目前居家办公，给所有贡献者邮寄礼物进程会推迟，复工后统一邮寄。请同学们不用过于担心，承诺的礼物一定送到。

---

### 议程 3：Kitex 对接 xDS 方案介绍 @ppzqh @CoderPoet

1. 相关文档：[Kitex 对接 xDS 总体技术方案设计](https://bytedance.feishu.cn/docx/doxcnQMRyKL6OcOg0lFR7W3PQIg?from=from_copylink)
2. 提炼功能，在 Kitex 上面提一个 Issue，对要做的 Feature 做背景和方案概述，拆分开发工作量，方便社区里面感兴趣的同学参加。
3. 会议后已建好 Issue：https://github.com/cloudwego/kitex/issues/461

---

### 议程 4：Kitex mall demo 介绍 @bodhisatan

1. 很多 RPC 框架都有一个偏官方的电商 Demo，如 Kratos 和 Go-zero。
2. 相关文档：[KiteX mall demo](https://bytedance.feishu.cn/docx/doxcnH8H3YudKN2vxC3BDgoEb7c)
3. 拆分细化任务之后，号召社区交流群及社区用户群的同学来参与，同时对外宣传。
4. 目前社区任务分工：@daidai21(付韦虎) @@clark(王伟超)

---

### 议程 5：Kitex 源码分析活动介绍 @yiyun

1. 背景：
   a. 从 Java 转到 Golang 或者 Go 语言的同学对 Kitex 有学习需求；
   b. 高校同学参加开源夏令营和培训活动，关注到 Kitex。
2. 活动地址：https://github.com/cloudwego/community/issues/24
3. 产出：
   a. 导师：整体梳理 Kitex 模块，把各个技术点的学习资料做成一套从 0 到 1 的学习笔记。（第一期导师@clark(王伟超) ）
   b. 学生：学习笔记、源码解读文章。

---

### 议程 6：CloudWeGo 公众号官宣 @yiyun

1. 公众号定位：发布包括但不限于社区运行状态、社区新闻、项目版本发布、重要节点活动宣传、Committer 专访。
2. 官宣：https://mp.weixin.qq.com/s/nSybru-NMdZmdaaQgLM2bQ

---

### 议程7：新成员自我介绍

1. 新成员名单：ag9920 baize Jacob953
2. 社区新成员分别进行自我介绍，主要包含个人基本情况、开源贡献经历和后续参与社区工作内容。

---

#### 相关资讯：

新的开源项目 Frugal 已经 Public，欢迎大家熟悉了解并积极参与。
地址：https://github.com/cloudwego/frugal。
