---
title: "Glossary"
linkTitle: "Glossary"
weight: 6
keywords: ["Monolake", "Rust", "Proxy", "Glossary"]
---

## Glossary

| Term                | Description |
|---------------------|-------------|
| Monolake            | Framework for developing high-performance network services like proxies and gateways |
| Monolake Proxy      | A reference HTTP proxy implementation using monolake |
| Monoio              | The async runtime used by the framework, providing efficient I/O operations based on io_uring |
| Foundational Crates | Crates that provide low-level, core functionality and building blocks for the monolake ecosystem. Examples: monoio-transports, service-async, certain-map. |
| Framework Crates    | Crates that represent the higher-level, user-facing parts of the monolake framework. Examples: monolake-core, monolake-service. |
| monolake-core       | Foundational crate that provides a robust framework for worker orchestration, service deployment, and lifecycle management. |
| monolake-service    | Foundational crate that provides a collection of services for building high-performance, modular HTTP servers and Thrift services. |
| service-async       | A foundational crate that introduces a refined Service trait with efficient borrowing and zero-cost abstractions, as well as utilities for service composition and state management. |
| Service             | A modular component that provides a specific functionality. Defined using the Service trait from the service-async crate. |
| Service Chain       | A composition of multiple services, where the output of one service is the input of the next. Enabled by the FactoryStack and FactoryLayer from service-async. |
| Service Factory     | A component that is responsible for creating and managing instances of services. |
| FactoryLayer        | A trait from the service-async crate that defines how to wrap one factory with another, creating a new composite factory. |
| FactoryStack        | An abstraction from the service-async crate that manages a stack of service factories, enabling the creation of complex service chains. |
| MakeService         | A trait implemented by service factories to create instances of services that implement the Service trait. |
| AsyncMakeService    | An asynchronous version of the MakeService trait, allowing for more complex service composition. |
| certain-map         | A foundational crate that provides a typed map data structure, ensuring the existence of specific items at compile-time, useful for managing data dependencies between services. |
| monoio-transports   | A foundational crate that provides high-performance, modular networking capabilities, including connectors and utilities for efficient network communications. |
| Connector Trait     | A trait defined in the monoio-transports crate that provides a common interface for establishing network connections, allowing for modular and composable network communication solutions. |