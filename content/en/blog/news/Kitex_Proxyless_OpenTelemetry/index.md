---
date: 2022-12-20
title: "Kitex Proxyless Practice：Traffic Lane Implementation with Istio and OpenTelemetry"
projects: ["Kitex"]
linkTitle: "Kitex Proxyless Practice：Traffic Lane Implementation with Istio and OpenTelemetry"
keywords: ["CloudWeGo", "Proxyless", "Traffic Route", "Lane", "Bookinfo"]
description: "This blog mainly introduces the realization of traffic routing based on Kitex Proxyless and the bookinfo demo rewrote with Kitex and Hertz. 
The purpose is to demonstrate how to use xDS to realize traffic lane in a practical way."
author: <a href="https://github.com/CoderPoet" target="_blank">CoderPoet</a>, <a href="https://github.com/GuangmingLuo" target="_blank">Guangming Luo</a>
---

> Preface: Kitex Proxyless enables the Kitex service to interact directly with istiod without envoy sidecar. It dynamically obtains service governance rules
> delivered by the control plane based on the xDS protocol and converts them to Kitex rules to implement some service governance functions, such as traffic routing.
> Based on Kitex Proxyless, Kitex can be managed by Service Mesh without sidecar. Besides, the governance rule Spec, governance control plane, governance delivery protocol,
> and heterogeneous data governance capability can be unified under multiple deployment modes. By rewriting the bookinfo project using Kitex and Hertz, it demonstrates how to implement a traffic lane using xDS protocol.

## 01 Introduction

### **Kitex Proxyless**

[Kitex][Kitex] is a Golang RPC framework open-sourced by ByteDance that already natively supports the xDS standard protocol and can be managed by Service Mesh in Proxyless way.
Refer to this doc for detailed design: [Proposal: Kitex support xDS Protocol](https://github.com/cloudwego/kitex/issues/461).
Official doc is also available here at [Kitex/Tutorials/Advanced Feature/xDS Support](/docs/kitex/tutorials/advanced-feature/xds/)

Kitex Proxyless Simply means that Kitex services can interact directly with istiod without envoy sidecar and dynamically obtain service governance rules delivered by the control plane based on the xDS protocol.
And those rules will be translated into Kitex corresponding rules to implement some service governance functions (such as traffic routing which is the focus of this blog).

Based on Kitex Proxyless, Kitex application can be managed by Service Mesh in a unified manner without sidecar, and thus the governance rule Spec, governance control plane,
governance delivery protocol, and heterogeneous data governance capability can be unified under multiple deployment modes.

![image](/img/blog/Kitex_Proxyless/unify_architecture.svg)

### Traffic Routing

Traffic routing refers to the ability to route traffic to a specified destination based on its specific metadata identifier.

Traffic routing is one of the core capabilities in service governance and one of the scenarios that Kitex Proxyless supports in the first place.

The approach of [Kitex][Kitex] implementing traffic routing base on xDS is as follows:

![image](/img/blog/Kitex_Proxyless/2.png)

Specific procedure:

1. Add an xDS Router MW to Pick Cluster (routing) and watch LDS and RDS of target services.
1. Aware of LDS changes and extract the Filter Chain and inline RDS in the LDS of the target service.
1. Aware of RDS changes and obtain the route configuration of the target service based on VirtualHost and ServiceName matching. (Prefix, suffix, exact, and wildcard are supported)
1. The routing rules in the matched RDS are traversed and processed. The routing rules are divided into two parts (refer to the routing specification definition) :

- Match:
  - Path(required): Extract Method from rpcinfo for matching;
  - HeaderMatcher(optional): Extract the corresponding metadata KeyValue from the metainfo and match it.
- Route：
  - Cluster ：Standard Cluster.
  - WeightedClusters(Weight routing) : cluster is selected according to weight within MW.
  - Write the selected Cluster to the EndpointInfo.Tag for later service discovery.

As you can see, traffic routing is a process of selecting the corresponding SubCluster according to certain rules.

## 02 Traffic Lane

Based on traffic routing capability, we can extend many usage scenarios, such as: A/B testing, canary release, blue-green release, etc., and the focus of this paper: Traffic Lane.

The traffic lane can be understood as splitting a group of service instances in a certain way (such as deployment environment), and based on the routing capability and global metadata,
so that traffic can flow in the specified service instance lanes in accordance with the exact rules (logically similar to lanes in a swimming pool). Traffic lane can be used for full-path grey release.

In Istio we typically group instances with DestinationRule subset, splitting a service into multiple subsets (e.g. Based on attributes such as version and region)
and then work with VirtualService to define the corresponding routing rules and route the traffic to the corresponding subset. In this way, the single-hop routing capability in the lane is realized.

However, traffic routing capability alone is not enough to realize traffic lane. We need a good mechanism to accurately identify the traffic
and configure routing rules for each hop traffic based on this feature when a request spans multiple services.

As shown in the following figure: Suppose we want to implement a user request that is accurately route to the v1 version of service-b.
The first thought might be to put a `uid = 100` in the request header and configure the corresponding VirtualService to match the `uid = 100` in the header.

![image](/img/blog/Kitex_Proxyless/3.png)

But it has several obvious drawbacks for this approach:

1. **Not common enough**: If a specific business attribute (such as uid) is used as a traffic route matching rule, the business attribute must be manually transmitted through the full path.
   This is highly intrusive to business and requires business cooperation. In addition, when we want to use other business attributes, all services on the full path need to change to adapt. Therefore, it is a very unusual practice.
1. Routing rules are prone to frequent changes, resulting in **rule overcrowding**. Routing rules are identified by specific business attributes (for example: uid) is used as a traffic route matching rule.
   If you want to change a business attribute or set a routing rule for other users, you need to modify the original routing rule or repeatedly define multiple routing rules for different business attributes, which easily causes route rule overcrowding and is difficult to maintain.

Therefore, in order to achieve uniform traffic routing across the full path, we also need to use a more general traffic dyeing and the capability to transmit the dye identifier through the full path.

### Traffic Dyeing

Traffic dyeing refers to marking the request traffic with a special identifier and carrying this identifier in the full request path.
The so-called traffic lane means that all services in the path sets traffic routing rules based on the uniform gray traffic dyeing identifier so that the traffic can be accurately controlled in different lanes.

Usually, traffic dyeing is done at the gateway layer, and the metadata in the original request is converted into corresponding dye identifiers according to certain rules (conditions and proportions).

- **Dyeing by conditions**: when the request metadata meets certain conditions (such as `uid = 100` in the request header and cookie matching), the current request is marked with a dye identifier.
- **Dyeing by proportions**: the request is marked with a dye identifier in proportion.

With a unified traffic dyeing mechanism, we do not need to care about specific business attribute identifiers when configuring routing rules. We only need to configure routes based on the dye identifiers.
The specific service attributes are abstracted into conditional dyeing rules to be more universal. Even if the business attributes change, the routing rules do not need to change frequently.

#### Dye Identifier Transmitting

The dyed identifier is usually transmitted through the Tracing Baggage, which is used to pass business custom KV attributes through the entire call chain (full-path), such as traffic dyeing identifiers and business identifiers such as AccountID.

![image](/img/blog/Kitex_Proxyless/4.png)

We usually use the Tracing Baggage mechanism to transmit the corresponding dye identifiers through the full-path. Most of the Tracing frameworks support the Baggage concept, such as: OpenTelemetry, Skywalking, Jaeger, etc.

With a set of universal full-path transmitting mechanism, the service only needs to config the tracing once, and there is no need to adapt every time the service attribute identifier changes.

Next part introduces and demonstrates how to implement the traffic lane based on Kitex Proxyless and OpenTelemetry Baggage by using a specific engineering example.

## 03 Demo Introduction：Bookinfo

The demo is a rewriting of the [Istio Bookinfo](https://istio.io/latest/zh/docs/examples/bookinfo/) project using [Hertz][Hertz] and [Kitex][Kitex]:

- Use **istiod** as the xDS server and the entry for CRD configuration and delivery.
- Use **wire** to implement dependency injection;
- Use **opentelemetry** to implement full path tracing;
- Use [Kitex-xds](https://github.com/kitex-contrib/xds) and **opentelemetry baggage** to implement a traffic lane in proxyless mode;
- Implement a [Bookinfo](https://github.com/cloudwego/biz-demo/blob/main/bookinfo/README_CN.md) UI using **arco-design** and **react**.

### Business Architecture

In keeping with Bookinfo, the overall business architecture is divided into four separate microservices:

- `productpage` - This microservice calls `details` and `reviews`;
- `details` - This microservice contains information about the book;
- `reviews` - This microservice contains book related reviews. It also calls `ratings`;
- `ratings` - This microservice contains ratings information consisting of book reviews.

`reviews` are available in three versions:

- The v1 version calls the ratings service and uses one ⭐️ to display the ratings.
- The v2 version invokes the ratings services, and use five ⭐⭐⭐⭐⭐⭐ to display the ratings.
- The v3 version won't call the ratings service

![image](/img/blog/Kitex_Proxyless/bookinfo.svg)

### Diagram of Traffic Lanes

The whole call chain is divided into 2 lanes:

- Base lane: Undyed traffic is routed to the base lane.
- Branch lane: dyed traffic is routed to the branch lane of reviews-v2 ->ratings-v2.

![image](/img/blog/Kitex_Proxyless/lane.svg)

### Traffic Dyeing

The gateway is responsible for traffic dyeing. For example, the request with `uid=100` in the request header is dyed and carries baggage of `env=dev`.

![image](/img/blog/Kitex_Proxyless/dyeing.svg)

The dye mode may vary according to different gateways. For example, when we select istio ingress as the gateway, we can use **EnvoyFilter + Lua** to write the gateway dye rules.

### Workload Labeling

1. Label the workload with corresponding version identifier.

Take service `reviews` as an example. You only need to label the corresponding pod with `version: v1`.

![image](/img/blog/Kitex_Proxyless/8.png)

2. Set a series of subsets for the service based on the DestinationRule:

- Productpage: v1
- Reviews: v1、v2、v3
- Ratings: v1、v2

![image](/img/blog/Kitex_Proxyless/9.png)

### Traffic Routing Rules

The gateway has already dyed the request header with `uid=100` and automatically loaded `env=dev` baggage,
so we only need to match the route according to the header. Here is an example of the route rule configuration:

![image](/img/blog/Kitex_Proxyless/10.png)

### Check the Effect

1. Base Lane

Requests without `uid=100` header in the inbound traffic are automatically routed to the base lane, which is a round-robin of v1 and v3 of `reviews` service resulting in a round-robin score of 0 and 1.

![image](/img/blog/Kitex_Proxyless/bookstore_base.png)

2. Branch Lane

We use the **mod-header** plug-in of the browser to simulate the scenario where the `uid=100` is carried in the inbound traffic request header.

![image](/img/blog/Kitex_Proxyless/12.png)

Click the refresh button again, you can find that the request hits the branch lane, and the traffic lane takes effect successfully.

![image](/img/blog/Kitex_Proxyless/bookstore_branch.jpeg)

## 04 Summary and Outlook

So far, we have implemented a complete full-path traffic lane based on Kitex Proxyless and OpenTelemetry.
And we can set corresponding routing rules for Kitex based on Istio standard governance rule Spec without Envoy sidecar.

In addition to traffic routing capabilities, Kitex Proxyless is also continuously iterating and optimizing to meet more requirements for data plane governance capabilities.
As an exploration and practice of Service Mesh data plane, Proxyless not only can enrich the deployment form of data plane, but also hopes to continuously polish [Kitex][Kitex],
enhance its ability in open source ecological compatibility, and create a more open and inclusive microservice ecosystem.

## 05 Relevant Project

Here is a list of the projects involved in the demo:

- biz-demo: https://github.com/cloudwego/biz-demo
- kitex: https://github.com/cloudwego/kitex
- hertz: https://github.com/cloudwego/hertz
- kitex-xds: https://github.com/kitex-contrib/xds
- kitex-opentelemetry: https://github.com/kitex-contrib/obs-opentelemetry
- hertz-opentelemetry: https://github.com/hertz-contrib/obs-opentelemetry

This demo has been submitted in the biz-demo repository, and will be optimised continuously. biz-demo will include some complete demos based on CloudWeGo technology stack with certain business scenarios.
The original intention is to provide valuable references for enterprise users to use CloudWeGo in production. Contributors are always welcomed to participate in the contribution of CloudWeGo biz-demo. Let's try something fun together.

[Kitex]: https://github.com/cloudwego/kitex
[Hertz]: https://github.com/cloudwego/hertz
[biz-demo]: https://github.com/cloudwego/biz-demo
