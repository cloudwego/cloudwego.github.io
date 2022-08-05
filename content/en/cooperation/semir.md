---
type: docs
title: "Kitex 在森马电商场景的落地实践"
linkTitle: "semir"
weight: 2
---

随着企业用户逐渐增多，面对不同场景下不同需求和技术问题，CloudWeGo 团队将会持续分享不同企业的落地实践，包含不同行业面临的技术问题、选型参考和最终落地性能和使用分享，来帮助更多用户开始使用 CloudWeGo 。

### 森马电商订单流转中心——天枢
Dubbo3从理念到设计再到实现最大的变革之一在于全面遵循云原生环境，做到了面向未来，为了达到这个目标dubbo本身做了相当重要的取舍。
在“取”这个层面，Dubbo3众多核心组件已经面向云原生升级，支持 Kubernetes 平台调度，实现了服务生命周期与容器生命周期的对齐，Serverless、Native Image等机制都在计划之中。

在“舍”这个层面，Dubbo3割舍了以往要求开发人员遵守并熟知的Dubbo启动、销毁、注册等生命周期事件，Dubbo3自身设配了Kubernetes基础设施定义的生命周期事件(probe)，并且将服务的定义与注册下沉到了Kubernetes Service，重新划定了dubbo和k8s基础设施的边界。



### 作者
梁东坡
