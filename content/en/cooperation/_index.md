---
title: 'cooperation'
linkTitle: 'cooperation'
menu:
  main:
    weight: 50
---

{{< blocks/cover title="谁在使用CloudWeGo" image_anchor="bottom" height="min" >}}

<p class="lead mt-5">CloudWeGo 用户实践案例分享</p>

{{< /blocks/cover >}}

<div class="container l-container--padded">

<div class="row">
</div>

<div class="row">
<div class="col-12 col-lg-12">
<p class="my-3">
CloudWeGo 是一套字节跳动内部微服务中间件集合，具备高性能、强扩展性和稳定性的特点，专注于解决微服务通信与治理的难题，满足不同业务在不同场景的诉求。此外，CloudWeGo 也重视与云原生生态的集成，支持对接 K8s 注册中心、Prometheus 监控以及 OpenTracing 链路追踪等。
</p>

{{< cardpane >}}
{{< card header="华兴证券：混合云原生架构下的 Kitex 实践" >}}
华兴证券是 CloudWeGo 企业用户，使用 Kitex 框架完成混合云部署下的跨机房调用。落地完成企业用户如何搭建针对kitex的可观测性系统，如何在K8s集群下使用Kitex等实践。<br/><br/>
<a href='{{< relref "huaxingsec" >}}'>了解更多</a>
{{< /card >}}
{{< card header="Kitex在森马电商场景的落地实践" >}}
近些年电商行业高速发展，森马电商线上业务激增，面临着高并发、高性能的业务场景需求。森马正式成为 CloudWeGo 的企业用户，通过使用 Kitex 接入 Istio，极大地提高了对高并发需求的处理能力。<br/><br/>
<a href='{{< relref "semir" >}}'>了解更多</a>
{{< /card >}}

{{< card header="飞书管理后台平台化改造的演进史" >}}
飞书管理后台是飞书套件专为企业管理员提供的信息管理平台，通过引入 Kitex 泛化调用对飞书管理后台进行平台化改造，提供一套统一的标准和通用服务，实现了飞书管理后台作为企业统一数字化管理平台的愿景。<br/><br/>
<a href='{{< relref "feishu" >}}'>了解更多</a>
{{< /card >}}

{{< /cardpane >}}

</div>
</div>
</div>
