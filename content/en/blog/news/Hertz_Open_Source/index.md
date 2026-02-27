---
date: 2022-06-21
title: "Hertz, an Ultra Large Scale Enterprise-Level Microservice HTTP Framework, is Now Officially Open Source!"
projects: ["Hertz"]
linkTitle: "Hertz, an Ultra Large Scale Enterprise-Level Microservice HTTP Framework, is Now Officially Open Source!"
keywords:
  [
    "CloudWeGo",
    "http framework",
    "large scale high performance",
    "Hertz",
    "ByteDance Open Source",
    "open source",
  ]
description: "This article introduces Hertz, the official open source ultra-large-scale enterprise-level microservice HTTP framework developed by ByteDance"
author: <a href="https://github.com/cloudwego" target="_blank">CloudWeGo Team</a>
---

Today, after more than a year of internal use and iteration at ByteDance, **[Hertz](https://github.com/cloudwego/hertz)**, a **high-performance enterprise-level HTTP framework**, is officially open-sourced on [CloudWeGo](https://github.com/cloudwego)! Hertz has become the largest HTTP framework within ByteDance, with more than **10,000** online services and a peak QPS (Query Per Second) of more than **40 million**. It has the characteristics of high usability, easy expansion, and low latency. For the ByteDance service framework team and CloudWeGo, [Hertz](https://github.com/cloudwego/hertz) will not only be an open source project, but also a real ultra-large-scale enterprise-level practice.

Project website: https://github.com/cloudwego/hertz

In the future, ByteDance infrastructure team will iterate on the Hertz open source library, maintaining a unified codebase both internally and externally, and facilitating iterative evolution to enhance user experience.

## Hertz Overview

[Hertz](https://github.com/cloudwego/hertz) is a high-usability, high-performance, highly extensible, and low-latency Golang HTTP framework that assists developers in building microservices. Originally, the HTTP framework used within ByteDance was an encapsulation of the Gin framework, which offered advantages such as ease of use and a comprehensive ecosystem. However, as the internal business continued to grow, the demand for high performance and versatility rapidly increased.

[Gin](https://github.com/gin-gonic/gin), being a secondary development of Golang's native net/http, faced limitations in terms of on-demand expansion and performance optimization. In order to meet the evolving business needs and effectively serve major functions, the ByteDance service framework team embarked on research based on their self-developed networking library, [Netpoll](https://github.com/cloudwego/netpoll). This research led to the development of the internal framework, Hertz, which exhibits enhanced performance and stability when faced with enterprise-level requirements. Hertz also facilitates business development and addresses evolving technical requirements. In July 2021, Hertz officially launched version 1.0.

After over a year of internal usage at ByteDance, the Hertz framework has become the largest HTTP framework within the organization. It boasts more than 10,000 online services and reaches a peak QPS of over 40 million. In addition to being utilized by various business lines, Hertz also serves numerous internal core components, such as the function computing platform FaaS, stress testing platform, gateways, and Service Mesh control plane. It has received positive feedback regarding its usage.
In such a large-scale scenario, Hertz demonstrates remarkable stability and performance. Bugs and kernel issues are promptly identified and rectified. Furthermore, Hertz maintains a set of codes both internally and externally, providing a strong foundation for the open-source Hertz framework.

## Features

Key features of Hertz include:

### Stability

In a large-scale environment, Hertz exercises caution during every PR integration and release. Great care is taken to avoid any potential losses, which can amount to millions or even more. A standardized PR and release process has been formulated, requiring review by experienced developers for every code merge. Each PR and version release is to be tested for a period of time, and fully tested. Various testing scenarios, including compatibility, high concurrency, and package size, are employed to minimize risks.

### High Usability

Hertz prioritizes the ability to write correct code quickly during development. When designing the API, Hertz considers user usage habits and draws inspiration from the industry's mainstream framework API usage. Continuous iteration and user feedback contribute to the framework's refinement. For instance, many users hope that the Client also has the ability to trace. For this reason, Hertz Client supports middleware capabilities. Additionally, the Client supports stream processing in proxy scenarios. Middleware and stream processing are designed with the user's actual habits in mind, promoting faster development of correct code. Hertz also provides a one-click command-line tool for code generation, enhancing the framework's ease of use.

### Easy expandability

Hertz employs a layered design, offering a range of interfaces and default extension implementations for users to expand upon. Details regarding [Hertz extension](/zh/docs/hertz/tutorials/framework-exten/) can be found on the [CloudWeGo official website](/). The framework's layered design enhances its scalability. Currently, only stable capabilities are open-sourced, with more planned for the future. Please refer to the [Hertz roadmap](https://github.com/cloudwego/hertz/blob/develop/ROADMAP.md) for further details.

### Low latency

Hertz utilizes the internally developed high-performance network library, [Netpoll](https://github.com/cloudwego/netpoll), by default. In certain special scenarios, Hertz demonstrates advantages in terms of QPS and delay compared to the go net package.

For performance data, please refer to the Echo data in the figure below. Internal testing has shown significant reduction in resource usage, including a **30%-60% decrease in CPU usage** for services predominantly utilizing frameworks and gateway services. For detailed performance data, please refer to: https://github.com/cloudwego/hertz-benchmark.

![image](/img/blog/Hertz_Open_Source/Echo.png)

### Command line tool

Hertz provides a simple and user-friendly command-line tool called Hz. Users simply need to provide an Interface Definition Language (IDL). Based on the defined interface information, Hz can generate project scaffolding with a single click, enabling users to use Hertz out of the box. Additionally, Hz offers update capabilities, allowing users to update the scaffolding when changes are made to the IDL. Currently, Hz supports two IDL definitions: Thrift and Protobuf. The command-line tool provides a range of built-in options that can be tailored to individual needs. It relies on the official Protobuf compiler and the self-developed Thriftgo compiler, both of which support custom code plug-ins for generating templates that meet specific requirements.

Since the launch of Hertz, the internal response has been excellent. It has been extensively used in various scenarios including front-end and back-end communication, as well as gateway, upload, download, and proxy scenarios. The supported interaction modes encompass not only ping-pong but also streaming and chunk interactions. Hertz supports multiple protocols such as HTTP1, HTTP2, and Websocket. Managing such complex interaction scenarios and modes poses significant challenges to the usability and stability of Hertz's Server and Client components. In response, Hertz promptly addresses user needs and establishes a stability test service that simulates real-world and complex online scenarios as accurately as possible. With a high single-test coverage rate, Hertz ensures that the code logic functions normally and reliably.

## Internal and external version maintenance

ByteDance possesses a comprehensive internal microservice system, and the team places significant emphasis on open source development and commitment. This principle applies to both the Hertz project and CloudWeGo's [Kitex](https://github.com/cloudwego/kitex) project, ensuring consistency between internal and external versions. The core capabilities of the project have been migrated to the open source library, with only one internal layer of encapsulation. This approach facilitates enterprise upgrades without disruptions, thus guaranteeing long-term maintenance commitments. All open source features will be released after undergoing internal stability verification.

Moving forward, the team will continue to iterate based on the Hertz open source library, promptly addressing community needs and issues to enhance user experience and ensure a reliable framework. Hertz developers can also leverage its flexible expansion capabilities to meet specific business requirements. Furthermore, external developers are encouraged to [contribute](https://github.com/cloudwego/hertz/blob/develop/CONTRIBUTING.md) to the community, collaboratively constructing an HTTP framework with a comprehensive ecosystem, exceptional performance, and user-friendly features.

## Roadmap

For the infrastructure team, Hertz represents not only an open source project but also a genuine ultra-large-scale enterprise-level practice. By open sourcing Hertz, our aim is to enrich the Golang middleware system within the cloud-native community, enhance the CloudWeGo ecosystem, and enable more developers and enterprises to build cloud-native large-scale distributed systems. We aspire to provide modern, resource-efficient technical solutions.

As mentioned earlier, Hertz has currently open sourced only the internally verified stable components. However, we intend to further enhance the framework by pursuing the following objectives:

- **Cloud native capability support**: Integrate support for the xDS API to dynamically obtain service configurations from Istio.
- **Multi-protocol support**: Hertz currently only open-sources HTTP1. In the future, we will open-source other protocols, such as HTTP2, Websocket, ALPN, etc., to provide developers with support for micro-service requirements in more scenarios. If you have a need, you can also submit an issue and let us know your needs for quick support.
- **Improved command-line tools**: Continuously iterate on Hz, integrating various commonly used middleware and providing modular construction capabilities, enabling users to select the required components as needed.
- **Enhanced ecosystem support**: Since Hertz does not adopt go net's data structure, additional ecosystem support is required. In the initial batch of open source releases, we have included CORS, Trace, and Metrics. In the future, we plan to support additional aspects such as reverse proxy and Session.
- **Iteration based on user feedback**: Following the project's open sourcing, we will iterate based on developer feedback and requirements.

We welcome everyone to [contribute](https://github.com/cloudwego/hertz/blob/develop/CONTRIBUTING.md) by submitting issues and PRs to [Hertz](https://github.com/cloudwego/hertz), fostering collaborative development. We eagerly anticipate the involvement of more developers and anticipate Hertz aiding enterprises in swiftly constructing cloud-native architectures. Enterprise users are invited to migrate and utilize Hertz, and we will provide dedicated technical support and communication. Feel free to [join our Discord community](https://discord.gg/jceZSE7DsW) for further consultations and assistance.

## Related Links

- Project [address](https://github.com/cloudwego/hertz)
- Community [ecosystem](https://github.com/hertz-contrib)
- Hertz benchmark [blog](/blog/2023/02/24/getting-started-with-hertz-performance-testing-guide/)
