---
date: 2023-06-15
title: "CloudWeGo: A leading practice for building enterprise cloud native middleware!"
projects: ["CloudWeGo"]
linkTitle: "CloudWeGo: A leading practice for building enterprise cloud native middleware!"
keywords:
  [
    "CloudWeGo",
    "middleware",
    "Kitex",
    "microservice framework",
    "ByteDance Open Source",
    "open source",
    "cloud native",
  ]
description: "This article provides an overview of CloudWeGo"
author: <a href="https://github.com/vinijaiswal" target="_blank">Vini Jaiswal</a>
---

## CloudWeGo Overview

[CloudWeGo](/) is a set of microservices middleware developed by ByteDance that can be used to quickly build enterprise-class cloud-native architectures. It is a collection of high-performance, high-extensible, and highly-reliable projects that are focused on microservices communication and governance. It contains many components, including the RPC framework [Kitex](https://github.com/cloudwego/kitex), the HTTP framework [Hertz](https://github.com/cloudwego/hertz), the basic network library Netpoll, inter-process communication library [shmipc](https://github.com/cloudwego/shmipc-go), Rust-based RPC framework [Volo](https://github.com/cloudwego/volo) etc.

## CloudWeGo Background

ByteDance uses Golang as its main development language, and supports the reliable communication of tens of thousands of Golang microservices. With our experience in microservices having undergone a massive traffic, we decided to offer open source software in order to enrich the community’s ecology and launched CloudWeGo in September 2021. CloudWeGo is not only an external open source project, but also a real ultra-large-scale enterprise-level project. We are looking forward to enriching the Golang product system of the cloud native community through CloudWeGo and helping other companies to build cloud-native architectures in a rapid and convenient way. We also hope to attract developers in the open source community, to maintain and improve this project together, provide support for multiple scenarios, and enrich product capabilities. Because the projects under CloudWeGo depend on many internal basic tool libraries, we also open sourced the basic Golang tool libraries used internally, and maintain them in [bytedance/gopkg](https://github.com/bytedance/gopkg).

Another language that we are committed to advancing is the Rust language that delivers exceptional performance, safety, and low-level control capabilities. Through our open-source projects and contributions, ByteDance aims to provide developers, enterprises, and Rustaceans with robust support in developing RPC microservices and building cloud-native distributed systems. ByteDance's contribution includes the development of Volo, a lightweight, high-performance, scalable, and user-friendly Rust RPC framework. Leveraging the latest features of Rust, Volo showcases exceptional performance and efficiency. ByteDance has extensively used Volo within its own infrastructure, implementing multiple business and foundational components, surpassing expectations and highlighting its superiority compared to similar solutions written in other languages. Another project is Monoio, a thread-per-core Rust runtime with io_uring/epoll/kqueue. Monoio is designed to offer maximum efficiency and performance by leveraging advanced features of Rust and a unique IO abstraction that minimizes copying. Its inclusion within CloudWeGo ensures robust support for various scenarios and enhances the overall capabilities of the project.

ByteDance's dedication to Rust extends beyond Volo and Monoio. Through our commitment to simplicity and user-friendly tools, such as the Volo command-line tool, ByteDance actively contributes to lowering the barriers for developers to adopt Rust and leverage its full potential.

## Key Features

Some of the key features of CloudWeGo include:

### **High performance**:

Highly performant nature of CloudWeGo projects stems from our implementation of asynchronous RPC, streaming RPC, event-driven programming, and support for protocols like HTTP/2. These design choices and features work together to deliver superior speed, responsiveness, and efficiency, enabling CloudWeGo projects to handle demanding workloads and achieve excellent performance benchmarks.

### **High extensibility**:

CloudWeGo is designed to allow users to customize and expand its functionality according to their specific requirements. CloudWeGo achieves this by providing a modular or layered design that offers a set of interfaces and default implementation options. By utilizing a modular design, CloudWeGo, as seen in Kitex and Hertz, allows users to extend or inject their own implementations into the framework. This means that developers have the flexibility to tailor the behavior of the framework to suit their needs. They can replace or enhance default implementations with their own custom implementations, enabling them to adapt CloudWeGo to specific use cases or integrate seamlessly with other libraries and tools.

### **High reliability**:

CloudWeGo prioritizes stability and dependability in its projects, providing a reliable framework for developers and enterprises. Through rigorous quality assurance, including code review and testing, potential issues are identified and addressed early on before they impact production environments. CloudWeGo as a whole emphasizes the prevention of any potential losses or disruptions. This is achieved through careful PR integration, extensive testing, and continuous monitoring. CloudWeGo optimizes projects to handle high workloads, ensuring stability and reliability even under heavy load. Feedback from the community helps drive improvements and prompt issue resolution. By adhering to strict quality standards, CloudWeGo projects strive to deliver stable and reliable software.

### **Microservices communication and governance**:

CloudWeGo's Governance feature encompasses service governance modules such as service registry, discovery, load balancing, circuit breaker, rate limiting, retry, monitoring, tracing, logging, and diagnosis. These modules enhance the management, control, and reliability of services within the CloudWeGo framework. They enable dynamic service discovery, load distribution, fault tolerance, performance optimization, and comprehensive monitoring and diagnostics. The Governance feature ensures efficient and reliable service operations in the CloudWeGo ecosystem.

Here are some of the benefits of using CloudWeGo:

- Speed: CloudWeGo offers the ability to accelerate application development by providing a set of pre-built components and libraries. These components and libraries provide essential functionalities, such as networking, database integration, security, and more. They are designed to be easily integrated into applications, reducing the need for building complex functionalities from scratch. With CloudWeGo's speedy development ecosystem, developers can focus on their application's core logic, leverage existing components, and deliver robust solutions in a shorter timeframe. This enables faster time-to-market, increased development efficiency, and ultimately enhances the overall speed of application development.
- Cost savings: By adopting CloudWeGo and its projects such as Kitex, Hertz, Sonic, and others, users can benefit from significant cost savings. This is achieved through reduced CPU and memory consumption compared to older frameworks or similar projects. CloudWeGo's modern framework is designed to be highly optimized and efficient, resulting in minimized software development overhead. Internally at ByteDance, we moved to using the modern high-performance framework that has proven instrumental in saving substantial resources. With CloudWeGo, users can optimize their resource allocation and achieve cost efficiency while leveraging the powerful capabilities and features provided by the framework.
- Security: CloudWeGo prioritizes security, offering a range of features and measures to ensure application security. The framework incorporates secure design principles, implementing industry best practices. It provides built-in authentication and authorization mechanisms for secure user access control. By leveraging the Rust programming language, CloudWeGo benefits from its inherent security advantages, such as strong type safety and memory safety, reducing the risk of common vulnerabilities. The open-source nature of CloudWeGo allows for community contributions and wider security audits, ensuring continuous improvement and prompt vulnerability mitigation. With CloudWeGo, developers can build applications with confidence, knowing that security is prioritized at every level of the framework.

## Use Cases

CloudWeGo can be used to build a variety of applications, including microservices-based applications, cloud-native applications, real-time applications, IoT applications, and other applications.
Some of the applications include:

- Microservices-based applications: CloudWeGo provides a comprehensive set of features for microservices communication and governance, such as service discovery, routing, and orchestration. This makes it easy to build and manage microservices-based applications.
- Cloud-native applications: CloudWeGo is designed to be used in cloud-native environments. It can be used to build applications that are scalable, reliable, and secure.
- Real-time applications: CloudWeGo supports streaming and asynchronous messaging. This makes it a good choice for building real-time applications, such as chat applications and streaming media applications.
- Other applications: CloudWeGo can be used to build a variety of other applications, such as web applications, mobile applications, gaming applications and enterprise applications. Let's explore some of the industry adoption:
  - **Gaming**: CloudWeGo offers several benefits for the gaming industry. It enables game developers to scale their infrastructure to handle increased player demands, optimize performance, and simplify their business logic through service splitting. With components like current limiting, monitoring, and service registration/discovery, CloudWeGo ensures efficient resource utilization, enhanced responsiveness, and seamless coordination between game components. Additionally, the integration with OpenTelemetry provides valuable monitoring and diagnostics capabilities for developers to optimize their game services and deliver an exceptional gaming experience. Overall, CloudWeGo empowers the gaming industry by providing a scalable, efficient, and streamlined infrastructure for game development and operations.
  - **Security**: In the security industry, CloudWeGo's adoption, specifically through the Kitex framework, brings significant benefits. Organizations can establish observability systems to monitor and analyze the performance of security services. This enables the identification of potential issues and ensures smooth operation. CloudWeGo also offers solutions for service stress testing, allowing organizations to optimize performance and ensure stability during high-load scenarios. Additionally, CloudWeGo addresses challenges related to different connection types within Kubernetes clusters, enabling efficient and secure communication between services. The framework provides specific solutions tailored to the security industry, helping organizations overcome obstacles and optimize their security infrastructure effectively.
  - **E-commerce**: CloudWeGo's Kitex framework offers a powerful solution for e-commerce companies dealing with high-concurrency and high-performance challenges. By integrating Kitex with technologies like Istio, businesses can significantly improve their ability to handle peak traffic and ensure synchronized order processing. This enables efficient communication with multiple e-commerce platforms and prevents issues like overselling. The adoption of CloudWeGo and Kitex, along with the use of a cloud-native service mesh like Istio, enhances the overall performance, scalability, and reliability of e-commerce systems, providing businesses with a competitive edge in the rapidly evolving e-commerce industry.

## Getting Started

To begin your journey with CloudWeGo projects, you can refer to our [comprehensive documentation](/docs/), which provides step-by-step instructions. Additionally, we regularly publish insightful blogs on various topics, including the latest innovations in [Kitex](https://github.com/cloudwego/kitex), [Hertz](https://github.com/cloudwego/hertz), [Monoio](/blog/2023/04/17/introducing-monoio-a-high-performance-rust-runtime-based-on-io-uring/), [Shmipc](https://github.com/cloudwego/shmipc-go), and [Volo](https://github.com/cloudwego/volo). We also publish best practices blogs and have a dedicated blog that explores best practices for using [Kitex without a proxy](https://www.cncf.io/blog/2023/01/11/kitex-proxyless-practice-traffic-lane-implementation-with-istio-and-opentelemetry/). These resources serve as valuable references to help you make the most of CloudWeGo's offerings and stay up-to-date with the latest developments in the ecosystem.

## Contributing

The CloudWeGo project is subdivided into subprojects under:

- [Kitex](https://github.com/cloudwego/kitex) (Kitex & Kitex ecosystem & kitex-contrib)
- [Hertz](https://github.com/cloudwego/hertz) (Hertz & Hertz ecosystem & hertz-contrib)
- [Netpoll](https://github.com/cloudwego/netpoll) (Netpoll & Netpoll ecosystem)
- [Shmipc](https://github.com/cloudwego/shmipc-go) (shmipc-spec & shmipc-go)
- [Volo](https://github.com/cloudwego/volo) (Volo & Volo ecosystem & volo-rs & Motore & Pilota)
- [Website & Docs](https://github.com/cloudwego/community) (cloudwego.github.io & community)

Kitex is equipped with built-in governance strategies and expansion interfaces for frictionless integration into the microservice system. Hertz is a Go HTTP framework with high-performance and strong-extensibility for building micro-services. Netpoll is aimed at scenarios that demand high performance on RPC scenarios. Shmipc is a high performance inter-process communication library, built on Linux's shared memory technology and uses unix or tcp connection to do process synchronization and finally implements zero copy communication across inter-processes. Volo is a high-performance and strong-extensibility Rust RPC framework that helps developers build microservices. Each component of CloudWeGo can be used separately.

We welcome you to [contribute](https://github.com/cloudwego/community/blob/main/CONTRIBUTING.md) by submitting issues and PRs to build CloudWeGo together. Contributing to CloudWeGo involves various roles and responsibilities within the project's GitHub organization. The roles include Member, Committer, Reviewer, Approver, and Maintainer. Members are active contributors in the community and are expected to participate in discussions and make multiple contributions to the project. Committers are active code contributors and play a role in reviewing and approving code contributions. Reviewers have expertise in the codebase and provide feedback on contributions. Approvers review and approve code contributions, ensuring their holistic acceptance. Maintainers are responsible for setting technical direction, making design decisions, and ensuring the overall health of a subproject. The responsibilities and privileges of each role vary, but they all contribute to the growth and success of CloudWeGo. The responsibilities of contributor roles in CloudWeGo are outlined in our [community membership document](https://github.com/cloudwego/community/blob/main/COMMUNITY_MEMBERSHIP.md).

We are excited for more developers to join, and also look forward to CloudWeGo helping more and more companies quickly build cloud-native architectures. Feel free to raise an issue in [Github](https://github.com/cloudwego) if you have any questions. Furthermore, you can join our [Discord](https://discord.gg/jceZSE7DsW) to keep updated with the latest news.

## Community and Support

At ByteDance, we try to make the projects friendly to external users, and our internal projects will also use this open source project as a library for iterative development. CloudWeGo follows a key principle of maintaining one set of code internally and externally, iterating them as a whole. It has been gratifying to see Kitex gain 6000 stars, Hertz gain 3800+ stars and Netpoll gain 3600+ stars since its launch. More about all these projects can be found under our [cloudwego github repository](https://github.com/cloudwego).

### Maintenance

A complete microservice system builds upon a basic cloud ecosystem. No matter how the microservices are developed; based on the public cloud, a private cloud or your own infrastructure, additional services (including service governance platform, monitoring, tracing, service registry and discovery, configuration and service mesh etc) and some customized standards are needed to provide better service governance. At Bytedance, we have complete internal services to support the microservice system, but these services can not be open sourced in the short term. So, how will CloudWeGo maintain a set of codes internally and externally, and iterate them as a whole?

Projects in CloudWeGo are not coupled with internal ecosystem. For example, Netpoll is directly migrated to open source libraries, and our internal dependencies are adjusted to open source libraries. Kitex’s code is split into two parts, including the core of Kitex which has been migrated to the open source library, and the encapsulated internal library which will provide transparent upgrades for internal users. For open source users who use Kitex, they can also extend Kitex and integrate Kitex into their own microservice system. We hope, and expect, that more developers will contribute their own extensions to [kitex-contrib](https://github.com/kitex-contrib), [hertz-contrib](https://github.com/hertz-contrib) and [volo-rs](https://github.com/volo-rs) providing help and convenience for more users.

## Conclusion

CloudWeGo is a rapidly growing project with a large and active community. It is a great choice for developers who are looking to build enterprise-class cloud native applications. If you are looking for a high-performance, extensible, and reliable middleware solution for your cloud native applications, then CloudWeGo is a great choice.

![image](/img/logo.png)
