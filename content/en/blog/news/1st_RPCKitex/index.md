---
date: 2022-09-30
title: "Kitex: Unifying Open Source Practice for a High-Performance RPC Framework"
projects: ["Kitex"]
linkTitle: "Kitex: Unifying Open Source Practice for a High-Performance RPC Framework"
keywords:
  [
    "CloudWeGo",
    "RPC framework",
    "Kitex",
    "microservice framework",
    "ByteDance Open Source",
    "open source",
  ]
description: "This article provides an overview of CloudWeGo - Kitex, a high-performance RPC framework, including its origins, development history, and the progress made since its open-source release a year ago. It covers the evolution of functional features, contributions from the community to the ecosystem, and successful implementation practices by enterprises. It highlights the growth and improvements Kitex has undergone, showcasing its commitment to delivering a robust and efficient solution for RPC communication in various scenarios."
author: <a href="https://github.com/cloudwego" target="_blank">CloudWeGo Team</a>
---

## From Development to Open Source Transition

Many researchers and practitioners may have just learned about CloudWeGo, so let's first introduce the relationship between CloudWeGo and [Kitex](https://github.com/cloudwego/kitex).

## CloudWeGo and Kitex

Kitex is CloudWeGo's first open-source microservice framework, designed to empower developers in building high-performance and extensible microservices using Golang. Kitex encompasses the entire stack, including the network library, serialization library, and framework implementation, making it a comprehensive self-developed RPC framework.

One notable feature of Kitex is its support for the gRPC protocol. Leveraging the official gRPC source code, Kitex optimizes the gRPC implementation, resulting in superior performance compared to the official gRPC framework. This sets Kitex apart from other Golang frameworks that offer open-source support for the gRPC protocol. Developers seeking both gRPC functionality and high-performance capabilities will find Kitex to be an excellent choice.

In addition to Kitex, CloudWeGo has recently introduced two other projects to its open-source lineup: [Hertz](https://github.com/cloudwego/hertz), a Golang HTTP framework, and [Volo](https://github.com/cloudwego/volo), a Rust RPC framework. Alongside these microservice frameworks, CloudWeGo offers various high-performance foundational libraries and general microservice capabilities as open-source resources. To explore more of CloudWeGo's open-source sub-projects, visit the [official CloudWeGo website](/) for additional information and resources.
![image](/img/blog/Kitex_architecture_explained_en/1.png)

Based on feedback from the community, there have been discussions surrounding whether Kitex is an open-source Key Performance Indicator (KPI) project of ByteDance, as well as concerns about its stability and continuity. We can responsibly state that Kitex is not a KPI project, but rather a genuine project derived from ByteDance's extensive internal practical experience. Since its open-source release, we have consistently maintained consistency between the internal and external development efforts of Kitex. This consistency, coupled with the alignment of internal and external codebases, has ensured the continuous iteration and improvement of Kitex. To address any remaining concerns, let us provide you with a detailed overview of Kitex's development and open-source process.
![image](/img/blog/Kitex_architecture_explained_en/2.png)

## Kitex Development History

In 2014, ByteDance began adopting Golang as a programming language. The internal services of ByteDance were established in 2015, where the Thrift protocol was chosen for RPC (Remote Procedure Call) scenarios, and an internal RPC framework was supported. In 2016, the first Golang RPC framework called Kite was officially launched. During the initial stages of rapid company growth, the primary focus is on quickly implementing requirements and addressing relatively simple scenarios. Therefore, there may not be extensive considerations in the design process. This approach is reasonable since the exploration phase lacks complete clarity on which scenarios will require support, and excessive consideration can lead to over-design issues.

As business scenarios became more complex, the demand for diversified functionalities increased, resulting in a rise in the number of access services and calls each year. Kite, the initial Golang RPC framework, eventually proved inadequate to support subsequent iterations. Recognizing this, a new project called Kitex was initiated in 2019, following over three years of online service. The official version of Kitex was released in early 2020, and by the end of the same year, over 10,000 services within Byte were connected to Kitex, showcasing its widespread adoption.

From 2014 to 2020, Golang has served as the primary programming language for business development within ByteDance, positioning the company as one of the industry leaders in terms of Golang application adoption. Our service framework enables reliable communication among tens of thousands of Golang microservices. Through extensive verification of numerous microservices and handling substantial traffic, we have developed relatively mature microservice best practices. To contribute to the cloud-native community and enrich the Golang product ecosystem, we decided to open-source our internal practices. In 2021, under the CloudWeGo brand, we officially released Kitex as the first open-sourced service framework. As of August this year, Kitex has provided support for over **60,000** internal services at ByteDance, reaching peak **QPS (Queries Per Second) in the hundreds of millions**.
![image](/img/blog/Kitex_architecture_explained_en/3.png)

You might still have lingering questions regarding the comprehensive microservice system and its integration with the fundamental cloud ecosystem. Whether it's in a public or private cloud environment, additional services are essential to support microservice governance. These services include governance platforms, registration centers, configuration centers, monitoring tools, traceability systems, service grids, and other customized specifications. ByteDance has developed a comprehensive set of internal services to support its microservice system. However, due to constraints, these services cannot be open-sourced in the short term.

Now, how does CloudWeGo maintain a unified codebase internally and externally while ensuring seamless iteration?
In addressing this issue, let's examine the module division of Kitex. The Kitex module is divided into three distinct parts. Firstly, there is **Kitex Core**, situated in the middle. This component defines the hierarchical structure of the framework, implements the core logic of the interface, and provides the default implementation of the interface.

On the left, we have **Kitex Tool**, which encompasses the implementation related to the generated code. The generated code tool is acquired by compiling this package and includes features such as IDL parsing, verification, code generation, and plug-in support.

To enhance user convenience and offer more flexible extensions, the main capabilities have been separated as independent open-source basic libraries. Some examples include Thriftgo, Thrift-validator plug-in, and Fastpb. These independent libraries enable users to leverage specific functionalities and extend Kitex as needed.

On the right, Kitex Byted represents an extended implementation of Byte's internal basic **capabilities** integration. At the outset, we consolidated internal capabilities as extensions within a single package, allowing for streamlined integration.
![image](/img/blog/Kitex_architecture_explained_en/4.png)

By following this approach, we have been able to open-source specific parts of Kitex, namely Kitex Core and Tool. We achieved this by splitting the codebase, migrating the core code and tools of Kitex to the open-source library, and integrating internal extension modules as Kitex extensions while keeping them in the internal library. Additionally, we encapsulated a shell layer within the internal library to ensure seamless upgrades for internal users without significant impact.

However, Kitex's open-source journey goes beyond simple code splitting. In February 2021, we initiated preparations for Kitex's open-source release. Despite the scalability of Kitex allowing for decoupling and integration with internal infrastructure, Kitex still relies on certain internal basic libraries. Therefore, to facilitate the open-source process, we first identified the dependent libraries and collaborated with relevant developers to open-source the [bytedance/gopkg](https://github.com/bytedance/gopkg) library. This library is jointly maintained by CloudWeGo and ByteDance's language team and includes enhancements to the capabilities of the Golang standard library. Interested developers can follow and utilize this library as a valuable resource.
![image](/img/blog/Kitex_architecture_explained_en/5.png)

After successfully open-sourcing the gopkg library, we made necessary code adjustments to ensure compatibility for open-source adaptation. In July 2021, Kitex was officially open-sourced, and the internal version began utilizing the open-source library. However, considering the substantial number of internal microservices relying on Kitex, we prioritized a smooth transition for internal services. Consequently, we opted not to make an initial public announcement about the open-source release. Once we confirmed the stability and compatibility of the open-source version, we proceeded with an official public release in September 2021. The announcement confirmed the open-source nature of Kitex and welcomed external developers to explore and contribute.

By providing insights into Kitex's development and open-source history, our aim is to address concerns that external developers may have regarding whether Kitex is a KPI project. We want to assure them that Kitex is a community-driven open-source project backed by our commitment to stability, compatibility, and continuous improvement.

### The Value of Open Source

Towards the end of the first part, let's briefly discuss the value that open source brings to us. Although Kitex was not initially developed solely for open source purposes, its implementation has been oriented towards open source from the start. **Kitex** itself is a project that has undergone extensive internal implementation within our organization. By open sourcing Kitex, our aim is to enable more users to swiftly build microservices internally.

At the same time, open source allows us to gather valuable feedback from communities and enterprises. It also attracts external developers to contribute their expertise and insights. This collective engagement helps drive the evolution of Kitex towards supporting multiple scenarios and enriching its capabilities, making it applicable to a wider range of contexts and organizations.

This symbiotic process of open source fosters a positive cycle of mutual benefit and facilitates a win-win scenario for all involved parties.
![image](/img/blog/Kitex_architecture_explained_en/6.png)

## A Year-long Review of Open Source Changes

### Framework Metrics

Before delving into the one-year open source changes of Kitex, let us first discuss the key metrics that should be considered when choosing a framework.

### Scalability

A framework's scalability is crucial in determining its suitability for different platforms. If a framework is tightly coupled with internal capabilities and cannot be easily transplanted or expanded to support various scenarios, it may present challenges when used externally.

### Usability

The ease of use of a framework can be evaluated from two perspectives. Firstly, for business developers, a framework that requires meticulous attention to its internal details may not be suitable for teams with high research and development efficiency requirements. Secondly, for framework-oriented secondary developers who provide custom support, a framework with excessive expansion capabilities or insufficient scalability may impose limitations and high expansion costs.

### Richness of Functions

While a framework can be customized based on extensibility, it is important to consider that not all developers have the capacity for extensive custom development. An ideal framework should offer a range of options for different expansion capabilities, allowing developers to select and combine them according to their underlying infrastructure and specific environment.

### High Performance

While the preceding three points are crucial considerations during the initial framework selection, as service scale and resource consumption increase, performance becomes an indispensable factor. It is imperative to prioritize performance when choosing a framework to avoid future issues such as the need for framework replacement or forced customized maintenance.

Regarding the measurement indicators mentioned above, Kitex may not have achieved perfection in all areas, but these four elements have been carefully considered during its design and implementation. We are committed to ensuring a well-rounded framework that addresses these aspects without compromising on any one of them.

## Features

The following is an overview of several significant functional features that have been introduced in Kitex's open source journey over the past year.

### Proxyless

Proxyless is a feature in Kitex that caters to open source scenarios. During the initial stages of Kitex's open source release, there were internal discussions on whether to support xDS integration with [Istio](https://github.com/istio/istio). For external users, leveraging Istio allows for the quick establishment of a basic microservices architecture, resolving issues such as service discovery, traffic routing, and configuration delivery. However, utilizing the complete Istio solution necessitates the introduction of Envoy, which can increase operational and maintenance costs. Moreover, using the official Envoy solution directly may result in performance degradation, additional CPU overhead, and increased latency.

If Kitex can directly connect to Istio, users would be able to benefit from some of Istio's capabilities while avoiding the performance loss, deployment complexity, and maintenance costs associated with Envoy. However, in the early days of open source, we did not encounter clear user demands, so we did not provide high-quality support for this.
![image](/img/blog/Kitex_architecture_explained_en/7.png)

Later on, the gRPC team also introduced Proxyless support, and Istio officials adopted Proxyless as a recommended approach for Istio usage. Kitex has now implemented support for Proxyless, primarily focusing on service discovery integration. The extensions supported by xDS have been open sourced separately in the [kitex-contrib/xds](https://github.com/kitex-contrib/xds) library and will undergo further enhancements in the future. To learn how to use Kitex to connect with Istio, please refer to the [README](https://github.com/istio/istio/blob/master/README.md) documentation.

### JSON and Protobuf generalized Call Support

Initially, Kitex provided support for HTTP generalization in gateway scenarios, as well as Map and binary generalization for common service scenarios. However, after open sourcing Kitex, user feedback highlighted the need for JSON and Protobuf generalization, leading to their subsequent implementation.

The generalization of Protobuf is also used in API gateway scenarios. While the original data format for HTTP generalization is JSON, the serialization of JSON can be bulky and inefficient, which negatively impacts performance. As a result, many mobile interfaces opt to transmit data using Protobuf due to its more compact representation. To address this demand, Kitex now includes support for Protobuf generalization.
![image](/img/blog/Kitex_architecture_explained_en/8.png)

Currently, Kitex's generalization primarily focuses on the back-end Thrift service. Whether it's Protobuf, Map, or JSON, Kitex combines IDL analysis on the calling side to encode the data mappings into Thrift packets and send them to the back-end service.

Now, you may wonder why the generalization is implemented on the calling side instead of the server side. Typically, when we think of generalization, we imagine the server parsing and processing the generalized request, with the caller providing a corresponding generalized client. However, generalization comes with a certain cost, making it less suitable for regular RPC scenarios. Moreover, generalization is meant for all back-end services, including those written in different languages like Golang, Java, C++, Python, Rust, and more. If every language framework had to support generalization, the cost would be significantly high. Additionally, achieving convergence across different language frameworks is a lengthy process. Considering these factors, Kitex supports generalization on the calling side. This approach allows for greater flexibility and enables users to take advantage of generalization selectively based on their specific needs.

### Enhanced Retry Capability

When Kitex was open sourced last year, it already supported the retry function. Initially, there were two types of retries available: timeout retry and Backup Request.
For timeout retry, only the timeout exception was retried. However, to further improve the success rate of requests, users expressed the need to retry other exceptions or based on specific user-defined status codes. It became evident that supporting only timeout retry was insufficient to meet user requirements. In response, Kitex introduced retries with specified results. Users can now specify other exceptions or a particular type of response for which they want retries, and the framework will retry according to the specified results.

Additionally, when users configure retries, if they set retries through code configuration, it will take effect for all RPC methods of the entire Client. However, users desired the ability to apply different retry strategies to different RPC methods. Different RPC methods may have varying requirements for indicators. For instance, some users may prefer using Backup Request to reduce delay, while others may prioritize exception retry to improve the success rate. To address this need, the new version of Kitex supports request granular configuration for retries.
The example below illustrates the usage of request granularity retry configuration. For example, if the RPC method is Mock, then when initiating an RPC call, we can configure a calloptspecified, and this request will adopt the specified retry strategy.
![image](/img/blog/Kitex_architecture_explained_en/9.png)

### Thrift Validator

Thrift-gen-validator is a tool plug-in for Thriftgo, that enhances the code generation process. It allows users to describe and enforce constraints on the generated `struct`'s `IsValid()` error method based on annotations defined in the Thrift IDL. This ensures the legality of field values. Usually when making an RPC call, the user may verify the validity of some fields. If the user directly writes these verification codes, the investment cost will be high. To address this, we provide annotation support. As long as users define annotations in IDL according to the specified format, Kitex can help users generate verification code.

The example below demonstrates the usage of code generation commands and an IDL annotation definition. By specifying the Thrift Validator plugin during code generation, our tool will parse the annotations and generate the required validation code. We are also currently contributing the Thrift Validator functionality to Apache Thrift.
![image](/img/blog/Kitex_architecture_explained_en/10.png)

## Performance Optimization

After highlighting the important functional features, let's move on to discussing several performance optimization features.

### Thrift High-Performance Codec

[Frugal](https://github.com/cloudwego/frugal) is a dynamic Thrift codec that offers high-performance capabilities by leveraging Just-in-Time (JIT) compilation, eliminating the need for code generation. While we have already optimized the official Thrift codec and introduced FastThrift as part of our pre-open source optimization efforts, we wanted to further enhance performance by incorporating the design principles from our open source high-performance JSON library, Sonic. As a result, we have implemented the Thrift JIT codec in Frugal.
The table below illustrates a performance comparison between Frugal, combined with Kitex, and FastThrift.
![image](/img/blog/Kitex_architecture_explained_en/frugal.png)

It is evident that Frugal offers superior RPC performance in most scenarios. In addition to its performance advantages, Frugal provides another benefit: it eliminates the need to generate codec code. Compared to Protobuf, Thrift's generated code tends to be heavier. A complex IDL can generate files with tens of thousands of lines of code, which users are responsible for maintaining. Frugal simplifies this process by only requiring the generation of structure code, removing the need for codec code generation.

To learn how to use Frugal in conjunction with Kitex, you can refer to the repository's [Readme](https://github.com/cloudwego/frugal#readme) file. users can also utilize Frugal as a standalone high-performance codec for Thrift. In the future, [Kitex](https://github.com/cloudwego/kitex) may consider incorporating Frugal as the default codec option.

### Protobuf High-Performance Codec

We primarily focused on supporting Thrift internally; however, we recognized that external users are more inclined towards using Protobuf or gRPC after the open-source release. Consequently, taking inspiration from Kitex FastThrift's optimization approach, we re-implemented the generated code for Protobuf.
Starting from version v0.4.0, if users employ Kitex tools to generate Protobuf code, the default generation will include [Fastpb][Fastpb] codec code. Furthermore, when initiating RPC calls, Kitex will also utilize [Fastpb][Fastpb] as the default serialization option.

The figures below illustrate a performance comparison between [Fastpb][Fastpb] and the official Protobuf serialization library. It is evident that Fastpb outperforms the official library in terms of efficiency, memory allocation, encoding, and decoding.

- FastWrite: **(ns/op) ↓67.8% ，(B/op) ↓83.9%**
- FastRead: **(ns/op) ↓41.5% ，(B/op) ↓4.5%**

### gRPC Performance Optimization

In the early days of open sourcing Kitex, our focus on stability and performance optimization for gRPC was relatively limited, as there were fewer internal use cases. However, after receiving feedback from numerous external users, we made dedicated efforts to address issues and optimize the performance of gRPC. In the middle of this year, we officially contributed these optimizations to the open-source library, which was released in version v0.4.0.

The figure below provides a comparison of unary request throughput between Kitex-gRPC and the official gRPC framework before and after optimization. On the left side, you can see the throughput comparison before optimization.

The figure below provides a comparison of unary request throughput between Kitex-gRPC and the official gRPC framework before and after optimization. On the left side, you can see the throughput comparison before optimization. At relatively low concurrency, Kitex's throughput does not exhibit an advantage over the official gRPC framework. However, when using Fastpb, Kitex's throughput performance improves compared to the pre-optimization stage. Despite this improvement, the low-concurrency throughput is still lower than that of the official gRPC framework. On the right side of the figure, you can observe the throughput comparison after optimization. The throughput has increased by 46% - 70% compared to the pre-optimization stage, and when compared to the official gRPC framework, the throughput has increased by 51% - 70%.
![image](/img/blog/Kitex_architecture_explained_en/13.png)

The right side of the figure below presents a comparison of latency for the optimized Unary requests. In scenarios where Kitex achieves a much higher throughput than the official gRPC framework, Kitex also demonstrates significantly lower latency compared to gRPC. Additionally, after optimization, Kitex exhibits improved delay performance overall.
![image](/img/blog/Kitex_architecture_explained_en/14.png)

Now let's examine the performance comparison of streaming requests in a stress test. Prior to optimization, Kitex's performance for streaming requests, even under low concurrency, did not outperform the gRPC framework. However, after optimization, Kitex's throughput surpasses that of the official gRPC, as demonstrated in the figure below. It is worth noting that while Kitex achieves high throughput under low concurrency, the latency remains relatively consistent. However, as concurrency increases, the latency diverges. Consequently, in terms of performance, Kitex's implementation of the gRPC protocol exhibits clear advantages over the official framework.
![image](/img/blog/Kitex_architecture_explained_en/15.png)

While Kitex may not have achieved complete functional alignment at this stage, it is capable of fulfilling the requirements of the majority of scenarios. Moreover, we are committed to ongoing efforts to further align and enhance its functionality in the future.

## Development with Community and Advancement of Ecosystem and Enterprise Integration

### Kitex's Community-Driven Ecosystem Expansion

Since its open-source release, we have been thrilled by the enthusiastic response from developers. Recognizing our team's limitations in rapidly building an extensive Kitex ecosystem for external users, we have relied on the invaluable support of the community over the past year. Through collaborative efforts, Kitex has received significant contributions in areas such as service registration/discovery, observability, and service governance, with notable advancements in service registration/discovery. We have successfully integrated with mainstream open-source registration centers, and although further enhancements are required, we now possess the capability to help external users build robust microservice architectures, leveraging our existing support and expanding feature set.

While we acknowledge the need for further enrichment in our docking capabilities, we are proud to state that, in conjunction with our existing support, Kitex already possesses the necessary features to facilitate the construction of microservice architectures for external users.
![image](/img/blog/Kitex_architecture_explained_en/16.png)

We extend our heartfelt appreciation to the developers who have actively contributed to the growth of the CloudWeGo community. To explore the extensive ecosystem surrounding Kitex, we invite you to visit the [kitex-contrib](https://github.com/kitex-contrib) repository in our open-source warehouse.

### Working with External Companies

Our primary goal with the open-source release of Kitex was to assist external companies in swiftly establishing enterprise-level cloud-native architectures. Since then, we have been delighted to receive interest and engagement from notable organizations such as Semir, Huaxing Securities, Tanwan Games, and Heduo Technology. Their valuable feedback and specific requirements have shed light on unique usage scenarios and challenges distinct from our internal use cases, necessitating our attention, support, and optimization efforts.

We are thrilled to witness the successful application of Kitex in these enterprise environments. In fact, during the CloudWeGo Meetup held on June 25th of this year, R&D professionals from [Semir](https://mp.weixin.qq.com/s/JAurW4P2E3NIduFaVY6jew) and [Huaxing Securities](https://mp.weixin.qq.com/s/QqGdzp-7rTdlxedy6bsXiw) shared their internal experiences and practical use cases, further validating the effectiveness and value of Kitex in real-world scenarios.
![image](/img/blog/Kitex_architecture_explained_en/17.png)

In addition to the above companies, we have also provided consultation to private inquiries from various organizations regarding usage issues. We are very grateful for the support and feedback from these corporate users. As mentioned earlier, gathering feedback from the community and enterprises plays a crucial role in driving the evolution of Kitex to support a wide range of scenarios. If enterprise users have any specific needs or requirements, we encourage them to reach out to us.

## How to use Kitex to Integrate with Existing Infrastructure

Here is a brief introduction on how to use Kitex to integrate with your internal infrastructure. Let's take ByteDance as an example, there are extensions in the open source library within the internal warehouse. These extensions are designed to integrate internal capabilities specific to ByteDance. Within the BytedSuite, Kitex can be initialized to cater to various scenarios. Users simply need to add an option configuration while constructing the Client and Server components to achieve seamless integration. To ensure a hassle-free experience, we have incorporated this configuration within the generated scaffolding code. This means that users no longer need to specifically focus on integrating internal capabilities. Furthermore, we plan to share details about how this configuration is embedded in the generated code. By doing so, secondary developers working with external frameworks will be able to provide integration capabilities to business development teams in a similar manner.
![image](/img/blog/Kitex_architecture_explained_en/18.png)

## Summary and Future Perspectives

### Summarize

This blog introduces the following key points:

1. The transition of Kitex from an internally used framework to an open-source framework while ensuring compatibility between internal and external versions.
2. Overview of important functional features and performance optimizations released during the past year of open source.
3. The origination and development of Kitex's ecosystem with contributions from the community, examples of enterprise adoption, and elegant integration of internal capabilities using Kitex.

### Future Perspectives

1. Collaborate with the community to further enrich the ecosystem and foster active participation from developers.
2. Enhance the usability of Kitex by incorporating engineering practices and providing greater convenience for microservice developers.
3. Continuously improve the BDThrift ecosystem and optimize support for Protobuf and gRPC.
4. Explore and implement additional feature support and open sourcing, such as ShmIPC (shared memory IPC), QUIC (Quick UDP Internet Connections), and generalization for Protobuf.

By pursuing these goals, Kitex aims to meet the evolving needs of users and further strengthen its position as a reliable and efficient framework for building cloud-native architectures.

[Kitex]: https://github.com/cloudwego/kitex
[Frugal]: https://github.com/cloudwego/frugal
[Fastpb]: https://github.com/cloudwego/fastpb
[Istio]: https://github.com/istio/istio
