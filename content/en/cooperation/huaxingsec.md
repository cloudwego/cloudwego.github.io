---
type: docs
title: "华兴证券：混合云原生架构下的 Kitex 实践"
linkTitle: "huaxingsec"
weight: 3
---
### 案例介绍
![huaxingsec](/img/users/huaxingsec/logo.png)

华兴证券是 CloudWeGo 企业用户，使用 Kitex 框架完成混合云部署下的跨机房调用。

企业用户如何搭建针对 kitex 的可观测性系统？如何在 K8s 集群下使用 Kitex ?

华兴证券后端研发工程师，DevOps 负责人张天将从以下 4 个方面介绍 Kitex 在多机房 K8s 集群下的实践经验，包括：
1. 针对 Kitex 的可观测性系统搭建经验；
2. 服务压力测试中遇到的问题以及解决方案；
3. Kitex 的不同连接类型在 K8s 同集群/跨集群调用下的一些问题和解决方案；
4. 实践中遇到的其他问题以及解决方案；


### Kitex 的可观性系统搭建

**华兴证券 CloudWeGo-Kitex 使用情况**

首先介绍下我们团队的 Kitex 使用情况。去年 6 月 1 日。我们团队成立。Kitex 在 7 月 12 日发布了首个版本，10 天后我们就引入了 Kitex。选择 Kitex 的原因是：我们团队早期成员比较了解 Kitex，为了快速支撑业务迭代和验证，选择最熟悉的框架，不但使用上比较习惯，对性能和功能方面也比较有把握。后来也支撑了我们 APP 的快速上线。大约 4 个月之后就上线了 APP 的第一个版本。






