---
title: "Implemented Extension"
date: 2024-03-04
weight: 12
description: >
---

Based on the extension capabilities of Kitex, Kitex has also implemented many common component extensions around the microservices ecosystem, all of which are stored in [kitex-contrib](https://github.com/kitex-contrib), allowing developers to directly integrate the corresponding components through these extensions.

## Registry

Kitex provides unified interfaces, Registry and Resolver, for implementing service registration and service discovery capabilities.

Currently, it has interfaced with most of the mainstream registries in the industry and offers some related capability extensions:

- [registry-etcd](https://github.com/kitex-contrib/registry-etcd): Integrating Etcd registry with Kitex.
- [registry-consul](https://github.com/kitex-contrib/registry-consul): Integrating Consul registry with Kitex.
- [registry-eureka](https://github.com/kitex-contrib/registry-eureka): Integrating Eureka registry with Kitex.
- [registry-nacos](https://github.com/kitex-contrib/registry-nacos): Integrating Nacos registry with Kitex.
- [registry-polaris](https://github.com/kitex-contrib/registry-polaris): Integrating Polaris registry with Kitex.
- [registry-servicecomb](https://github.com/kitex-contrib/registry-servicecomb): Integrating ServiceComb registry with Kitex.
- [registry-zookeeper](https://github.com/kitex-contrib/registry-zookeeper): Integrating Zookeeper registry with Kitex.
- [resolver-dns](https://github.com/kitex-contrib/resolver-dns): Service discovery based on DNS.
- [resolver-rule-based](https://github.com/kitex-contrib/resolver-rule-based): Service discovery based on custom rules.

## Configuration Center

To facilitate users to quickly integrate common microservices governance features, Kitex offers many configuration center extensions. Developers can use configuration centers to dynamically configure service governance features.

Here are the configuration center extensions already implemented by the framework:

- [config-consul](https://github.com/kitex-contrib/config-consul): Integrating Consul configuration center with Kitex.
- [config-nacos](https://github.com/kitex-contrib/config-nacos): Integrating Nacos configuration center with Kitex.
- [config-etcd](https://github.com/kitex-contrib/config-etcd): Integrating Etcd configuration center with Kitex.
- [config-apollo](https://github.com/kitex-contrib/config-apollo): Integrating Apollo configuration center with Kitex.
- [config-zookeeper](https://github.com/kitex-contrib/config-zookeeper): Integrating Zookeeper configuration center with Kitex.
- [config-file](https://github.com/kitex-contrib/config-file): Dynamic configuration based on local files.

## Observability

Kitex offers two main interfaces to achieve observability: Logger, for implementing logging; and Tracer, for implementing metric monitoring and tracing.

As an important feature of the microservices ecosystem, Kitex also provides corresponding extensions for various aspects of observability:

- Logging: In terms of logging, Kitex includes and uses a logging extension developed based on Go's standard log library by default, and also provides logging extensions for Go's mainstream log libraries logrus, zap, and slog.

- Metrics: Kitex provides monitoring extensions based on Prometheus and OpenTelemetry.

- Tracing: Kitex offers tracing extensions based on OpenTracing and OpenTelemetry.

Repositories for observability extensions include:

- [tracer-opentracing](https://github.com/kitex-contrib/tracer-opentracing): Tracing implementation based on OpenTracing.
- [monitor-prometheus](https://github.com/kitex-contrib/monitor-prometheus): Monitoring extension based on Prometheus.
- [obs-opentelemetry](https://github.com/kitex-contrib/obs-opentelemetry): Observability expansion based on OpenTelemetry, and provides logging extensions based on logrus, zap, and slog log libraries.

## Service Governance

Kitex provides extension functions related to service governance to enhance the management capabilities and quality of services. Through these extensions, developers can implement more complex service governance strategies.

Repositories related to service governance extensions include:

- [xds](https://github.com/kitex-contrib/xds): Integrates xDS modules, allowing Kitex services to run in a Proxyless mode and be uniformly managed by the service mesh.
- [opensergo](https://github.com/kitex-contrib/opensergo): Supports the OpenSergo service governance standard, enabling quick integration with Sentinel for traffic governance.
- [loadbalance-tagging](https://github.com/kitex-contrib/loadbalance-tagging): Load balancing strategy based on tags, suitable for scenarios with stateful services or multi-tenant services.

## Protocol

Kitex provides the Codec and PayloadCodec interfaces to support the framework's extension in multiple protocols, facilitating communication between different frameworks.

Currently, Kitex has docked with the [Dubbo](https://cn.dubbo.apache.org/zh-cn/) framework:

- [codec-dubbo](https://github.com/kitex-contrib/codec-dubbo): Dubbo codec, supporting encoding and decoding of Dubbo protocol, allowing interoperability with the Dubbo framework.
