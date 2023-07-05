---
title: '案例'
linkTitle: '用户案例'
menu:
  main:
    weight: 40
---

{{< blocks/cover title="谁在使用CloudWeGo" image_anchor="bottom" height="min" >}}

<p>
CloudWeGo 项目介绍小蓝书 &nbsp&nbsp
<a id="file_download_bluebook" href="https://github.com/cloudwego/community/raw/main/CloudWeGo_BlueBook_Project_Introduction.pdf"><i class="fas fa-download"></i></a>
</p>
<p class="lead mt-5">CloudWeGo 用户实践案例分享</p>

{{< /blocks/cover >}}

<div class="container l-container--padded">

<div class="row">
</div>

<div class="row">
<div class="col-12 col-lg-12">
<p class="my-3">
CloudWeGo 是一套由字节跳动开源的、可快速构建企业级云原生架构的中间件集合，专注于微服务通信与治理，具备高性能、高扩展性、高可靠的特点，满足不同业务在不同场景的诉求。
此外，CloudWeGo 也重视与云原生生态的集成，支持对接主流注册中心、Prometheus 监控以及 OpenTelemetry & OpenTracing 链路追踪等。
目前 CloudWeGo 已经在诸多企业和相关业务落地，涉及到电商、证券、游戏、企业软件、基础架构等诸多领域，详见下面案例介绍。
</p>

{{< cardpane >}}
{{< card header="华兴证券在混合云原生架构下的 Kitex 实践" img="/img/usedby/huaxing.png">}}
华兴证券是 CloudWeGo 企业用户，使用 Kitex 框架完成混合云部署下的跨机房调用。完成搭建针对 Kitex 的可观测性系统，以及在 K8s 同集群和跨集群下使用 Kitex 的落地实践。<br/><br/>
<a href='{{< relref "huaxingsec" >}}'>了解更多</a>
{{< /card >}}

{{< card header="Kitex 在森马电商场景的落地实践" img="/img/usedby/semir.png">}}
近些年电商行业高速发展，森马电商线上业务激增，面临着高并发、高性能的业务场景需求。森马正式成为 CloudWeGo 的企业用户，通过使用 Kitex 接入 Istio，极大地提高了对高并发需求的处理能力。<br/><br/>
<a href='{{< relref "semir" >}}'>了解更多</a>
{{< /card >}}

{{< card header="飞书管理后台平台化改造的演进史" img="/img/usedby/feishu.png">}}
飞书管理后台是飞书套件专为企业管理员提供的信息管理平台，通过引入 Kitex 泛化调用对飞书管理后台进行平台化改造，提供一套统一的标准和通用服务，实现了飞书管理后台作为企业统一数字化管理平台的愿景。<br/><br/>
<a href='{{< relref "feishu" >}}'>了解更多</a>
{{< /card >}}

{{< card header="CloudWeGo 在贪玩游戏 SDK 接口上的应用实践" img="/img/usedby/tanwan.png">}}
作为一个游戏公司，此前基于 php 的架构在性能和稳定性均存在较大的瓶颈，在转 Go 并落地了 CloudWeGo 之后，性能、稳定性、业务弹性、开发效率均得到显著提升，实现了降本增效。<br/><br/>
<a href='{{< relref "tanwan" >}}'>了解更多</a>
{{< /card >}}

{{< card header="Kitex 在数美科技可用性治理的落地实践践" img="/img/usedby/ishumei.png">}}
数美科技对外主要提供 SaaS 服务，内部是一个典型的机器学习系统，面临可用性挑战，在落地 Kitex 框架后，可用性和稳定性均得到了极大的提升。<br/><br/>
<a href='{{< relref "shumei" >}}'>了解更多</a>
{{< /card >}}

{{< card header="字节跳动微服务体系下接口测试平台实践" img="/img/usedby/bytedance.png">}}
字节跳动的微服务体系多样化，接口测试平台作为一款通用的平台型产品，通过 Kitex 客户端泛化调用的实现方式，带来了用户规模化、运维成本降低、响应时延降低等收益成果。<br/><br/>
<a href='{{< relref "interface_testing" >}}'>了解更多</a>
{{< /card >}}

{{< /cardpane >}}

</div>
</div>
</div>

<script>
  document.getElementById("file_download_bluebook").addEventListener("click", function(){
    gtag('event', 'file_download_bluebook', {
      "event_name": "file_download_bluebook",
    });

  })
</script>
