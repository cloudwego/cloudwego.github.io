---
date: 2022-03-25
title: "An Article to Learn About ByteDance Microservices Middleware CloudWeGo"
linkTitle: "An Article to Learn About ByteDance Microservices Middleware CloudWeGo"
description: >
author: <a href="https://github.com/GuangmingLuo" target="_blank">GuangmingLuo</a>, <a href="https://github.com/YangruiEmma" target="_blank">YangruiEmma</a>, <a href="https://github.com/pkumza" target="_blank">Ma Zi'ang</a>
---

In the cloud native era, infrastructures across all industries are undergoing a microservice architecture transformation, and all internet companies are concerned about R&D efficiency and stability. Developers who want to build microservices can never forgo supporting microservice governance, such as governance platforms, monitoring, tracing, registration/discovery, configuration centers, service mesh, etc. With Golang gradually becoming the dominating programming language in the cloud native era, there is a strong demand for Golang-based microservices middleware in the open source community.

ByteDance also faces these problems. In 2014, ByteDance introduced Golang to solve the high concurrency problem faced by push services with persistent connections; and two years later, the technical team launched a framework called Kite based on Golang, and rolled out Ginex after lightly encapsulating the open-source project Gin. In QCon 2021, Guozhu Cheng, the head of ByteDance's infrastructure/service framework team, said that the launch of these two original frameworks has greatly promoted Golang's adoption within the company.

However, due to evolutions of related technologies and demanding business requirements, the deeply coupled Kite and Thrift are difficult to be transformed and improved on the network model or codec level, and therefore continuous feature delivery will inevitably cause code bloat and blocked iterations. In the second half of 2019, the ByteDance technical team began to redesign the Golang RPC framework. At the same time, in order to get better performance in network communication, support connection multiplexing and sense connection status, they developed their own network library Netpoll.

ByteDance refactored Kite as Kitex, designed revolving around performance and scalability, and released it in October 2020 for internal use. As of September 2021, there are 30, 000+ online microservices using Kitex, most of which can benefit from boosted CPU and alleviated latency after using the new framework.

"After Kitex became widely used within ByteDance, we decided to gradually entail our practice open-source revolving around microservices and keep it in line with the outside." ByteDance CloudWeGo technical experts said, "But there are many microservice-related projects, and each project is open-source alone, which is not friendly to external users. So we named the project as CloudWeGo and gradually enabled the entire internal microservice system to be open-source, using open-source libraries internally and externally. Each project iterates mainly with open-source libraries."

On September 8, 2021, ByteDance officially announced the open source CloudWeGo.

## CloudWeGo

CloudWeGo is a set of microservice middleware developed by ByteDance with high performance, strong scalability and stability. It focuses on microservice communication and governance, and meets the demands of different businesses in various scenarios. CloudWeGo also focuses on integration with the cloud native ecology, supporting K8s registry, Prometheus, and OpenTracing.

CloudWeGo currently has 4 repositories: Kitex, Netpoll, Thriftgo and netpoll-http2, featuring the RPC framework – Kitex and the network library – Netpoll. Kitex is equipped with built-in governance strategies and expansion interfaces for frictionless integrations into the microservice system. Netpoll is aimed at scenarios where demand high performance.

Each component of CloudWeGo can be used separately. "Many people worry that Kitex would be a heavy-weight framework. In fact, Kitex does not couple any other component including Netpoll. Users can also optionally integrate some of Kitex's built-in governance functions. Netpoll is a network library that can work separately with other RPC frameworks and HTTP frameworks. Thriftgo is a Thrift IDL parser and code generator. It is also a stand-alone tool and provides a customizable, plug-in mechanism for the code generation." ByteDance CloudWeGo technical experts said, "We will continue to move all other internal projects to the open-source track, such as HTTP framework Hertz, shared memory-based IPC communication library ShmIPC, etc., to provide microservices support for wider scenarios."

## Advantages&disadvantages

The close connection between microservice middleware and business is the foundation of the entire business architecture; so the selection of technology requires special care. Our selection criteria mainly depend on two aspects：

* It can address practical business problems and is ready for production with massive traffic, and is easy to use, governable, mature and stable.
* The technology is open-source; and the number of Stars, project activity (Issues & PRs), document update frequency, and release cycle of the open-source project are stable and reliable.

The advantage of CloudWeGo is that it has already been tested with massive traffic amid the real production deployment in ByteDance. Providing a practical example that can be referred to attest for its stability and reliability. "One of the characteristics of CloudWeGo is high performance, but at the beginning of the development, we often confront performance bottlenecks. So we improved network library and Thrift serialization specifically. The optimization process was prolonged, with a bottleneck taking a long time to test and fine-tune repetitively. We have also published two articles "ByteDance Go RPC Framework Kitex Performance Optimization Practice" and "ByteDance on the Go Network Library Practice" to share our optimization practices." ByteDance CloudWeGo technical experts said.

Compared to similar projects, the CloudWeGo R&D team considered not only its performance and strong scalability, but also ease of use. "Taking Kitex as an example, it is currently inferior to some open-source frameworks in terms of the diversity of governance functions. But from the perspective of performance, scalability, and user experience, Kitex showcases the following advantages. Kitex supports a variety of protocols, because it mainly applies Thrift. Kitex has also made performance improvements for Thrift support. If using Thrift, Kitex will be the best choice." ByteDance CloudWeGo technical experts remark on the benefits of using CloudWeGo.

In addition, in order to uphold a key principle of maintaining one set of code internally and externally, iterating them as a whole, ByteDance has directly migrated projects without coupling the internal ecology to the CloudWeGo open-source library, and adapt the internal dependency for the open-source library. For Kitex, which requires integrated governance functions into the microservice system, the open-source team is splitted into the internal and external code, migrating Kitex's core code to the open source library. The internal library encapsulates a shell to ensure that updates are transparent to users. And the modules that integrate internal governance features are retained in the internal library as extensions of Kitex. In the future, ByteDance will continue to migrate new features that have been internally validated for stability to open-source libraries.

Inside ByteDance, in order to facilitate Kitex's integration into the internal governance system, Kitex provides a Byted Suite extension, integrating the internal registry, configuration center, monitoring, etc. Internal Service Mesh has been implemented on a large scale. Kitex determines whether it is a Service Mesh mode based on the information of the service, if so, Kitex will uninstall the governance components, and the governance functions will sink into Service Mesh. As an attempt to speed up the performance of communication with Service Mesh, Kitex separately extends the TransHandler module to integrate the self-developed ShmIPC, and communicates with Service Mesh through ShmIPC. Subsequently, Kitex's extension to ShmIPC and the ShmIPC library will also be open-source.

However, CloudWeGo has its own limitations. ByteDance CloudWeGo technical experts told InfoQ: The richness and diversity of CloudWeGo functions are not enough, pending further improvement. ByteDance's technical team will solicit the needs of external users, provide support, and welcome more developers to contribute. At present, the performance advantages of Kitex Server are obvious, but the performance of the Client side with Server, and we will focus on improving the Client in the future. The primary goal is to make default scenarios compatible with each other, with negligible performance overhead. "The launch of the open source has attracted public attention, and we observed some stress test comparisons showing that Kitex performance was mediocre, mainly because the stress test scenario was not aligned. We will consider providing better performance strategies for the open-source community."

# Open Source is Not About Completing KPIs

At present, CloudWeGo is dynamic in the community. Before the official announcement of open source, Kitex gained 1.2k stars and Netpoll gathered 700+ stars within one month. After ByteDance officially announced the open source CloudWeGo on September 8, as of early October, the overall number of stars in the project has exceeded 4,800 and has been included in the CNCF landscape. The overall star number of the project has exceeded 4800, and it has been included in the CNCF landscape.

![](https://bytedance.feishu.cn/space/api/box/stream/download/asynccode/?code=ODM0YTUyMDQzM2VkMGQ4YjhjMTBlNWQ3MGI2MGYxMTRfR1FUSndybzlGTHlGbHN4V0NrOEo3R25FSmRkRkZsbjRfVG9rZW46Ym94Y256UW9OdWJjTXF2NlZKaDRuajVUTVVmXzE2NDgxOTM2NTU6MTY0ODE5NzI1NV9WNA)

ByteDance CloudWeGo technical experts said, "We have received a lot of feedback from the community. For example, many users call for Protobuf. In response to this feedback, we plan to implement Kitex performance optimizations for Protobuf support. We welcome you to submit issues and PRs to CloudWeGo. We've also set up customized support for enterprises and organizations to use Kitex and Netpoll, and hope that CloudWeGo will truly become a universal, available open-source solution to microservices communication and governance in the future."

Regarding "open source", ByteDance CloudWeGo technology experts have a clear vision: "Completing KPIs is not the purpose of this open source project." A healthy open-source model focuses on open sharing, co-growth, and long-termism. CloudWeGo recognizes individual participation, community values, and the sense of belonging brought by open source community."

"As a beneficiary and participant of the open source project, ByteDance also hopes to become a promoter and leader of the open source project. It hopes to gift excellent internal practices to the open source community, build and enrich the open source ecosystem in the infrastructure field together with the community, and provide wider and better choices for developers and enterprises for their technology selection." ByteDance CloudWeGo technology experts said, "We embrace the open source culture, listen to community feedback, actively meet user's needs, provide Chinese and English documentations, and develop guidelines quickly, to facilitate and support community developers to understand CloudWeGo and participate in contributions."

**Project address:** [https://github.com/cloudwego](https://github.com/cloudwego)

**Interviewees:** ByteDance CloudWeGo technical experts (Guangming Luo, Rui Yang, Ziang Ma).

