---
title: "Overview"
linkTitle: "Overview"
weight: 1
keywords: ["HTTP", "volo", "Features", "Performance"]
description: "Volo-HTTP Features、Performance。"
---

## CloudWeGo-Volo

Volo-HTTP is a Rust language HTTP microservice framework , using [Motore](https://github.com/cloudwego/motore) implemented based on AFIT and RPITIT as the middleware abstraction layer , and combined with the internal needs of ByteDance .
It is characterized by high ease of use, high performance and strong scalability. Using Volo-HTTP, you can quickly develop a microservice based on the HTTP protocol.

### Features

#### High Performance

Rust is known for its high performance and safety. We always **take high performance as our goal** in the design and implementation process, 
reduce the overhead of each place as much as possible, and improve the performance of each implementation.

#### Easy to Use

  Rust is known for being hard to learn and hard to use, 
  and we want to make it as easy as possible for users to use the Volo framework and write microservices in the Rust language, 
  providing the most ergonomic and intuitive coding experience possible. 
  Therefore, we make ease of use one of our most important goals.

  For example, we provide the volo command line tool for bootstrapping HTTP projects.

  You can add any type that implements the Extractor trait to the request parameters in the handler to use it as needed, 
  and you can also return any type that implements `IntoResponse` as a handler.

  Volo-HTTP already implements these traits for most of the built-in types, so you can just focus on writing the business logic inside the handler.

  We also provide a middleware mechanism based on the layer model, so you can easily use the middleware by calling the `layer` method of `route`.

#### Strong Scalability

  Volo-HTTP uses `Motore` as its middleware abstraction, which is powered by AFIT and RPITIT.

  Through RPITIT, we can avoid many unnecessary Box memory allocations, improve ease of use, 
  and provide users with a more friendly programming interface and a more ergonomic programming paradigm.

  Benefiting from Rust's powerful expression and abstraction capabilities, through the flexible middleware Service abstraction, 
  developers can **process HTTP requests and responses** in a very unified form.

  For example, service governance functions such as service discovery and load balancing can be implemented 
  in the form of services without the need to implement Trait independently.

  We have also created an organization [volo-rs](https://github.com/volo-rs), any contributions are welcome.
    
## Related Projects

- [`motore`](https://github.com/cloudwego/motore)

## Related Articles

- [China's First Rust-based RPC Framework - Volo is Officially Open Source!](https://www.cloudwego.io/blog/2022/08/30/chinas-first-rust-based-rpc-framework-volo-is-officially-open-source/)
- [Introducing Monoio: a high-performance Rust Runtime based on io-uring](https://www.cloudwego.io/blog/2023/04/17/introducing-monoio-a-high-performance-rust-runtime-based-on-io-uring/)
