---
title: "Connectors"
linkTitle: "Connectors"
weight: 3
description: "Deep dive into monoio-transport's modular connector architecture, connection composition patterns, and layered network protocols"
---

# Connector Trait

The core of the [monoio-transports](https://docs.rs/monoio-transports/latest/monoio_transports/) crate is its modular and composable connector architecture, which allows developers to easily build complex, high-performance network communication solutions.

At the heart of this design is the [Connector](https://docs.rs/monoio-transports/latest/monoio_transports/connectors/trait.Connector.html) trait, which defines a common interface for establishing network connections:

```rust
pub trait Connector<K> {
    type Connection;
    type Error;
    fn connect(&self, key: K) -> impl Future<Output = Result<Self::Connection, Self::Error>>;
}
```

## Stacking Connectors

Connectors can be easily composed and stacked to create complex connection setups. For example, let's say you want to create an HTTPS connector that supports both HTTP/1.1 and HTTP/2 protocol

```rust
use monoio_transports::{
    connectors::{TcpConnector, TlsConnector},
    HttpConnector,
};

// Create a TCP connector
let tcp_connector = TcpConnector::default();

// Create a TLS connector on top of the TCP connector, with custom ALPN protocols
let tls_connector = TlsConnector::new_with_tls_default(tcp_connector, Some(vec!["http/1.1", "h2"]));

// Create an HTTP connector on top of the TLS connector, supporting both HTTP/1.1 and HTTP/2
let https_connector: HttpConnector<TlsConnector<TcpConnector>, _, _> = HttpConnector::default();
```

In this example, we start with a basic [TcpConnector](https://docs.rs/monoio-transports/latest/monoio_transports/connectors/struct.TcpConnector.html), add a [TlsConnector](https://docs.rs/monoio-transports/latest/monoio_transports/connectors/struct.TlsConnector.html) on top of it to provide TLS encryption, and then wrap the whole stack with an HttpConnector to handle both HTTP/1.1 and HTTP/2 protocols. This modular approach allows you to easily customize the connector stack to suit your specific needs.

# Connector Types

The [monoio-transports](https://docs.rs/monoio-transports/latest/monoio_transports/) crate provides several pre-built connector types that you can use as building blocks for your own solutions. Here's a table outlining the available connectors:

| Connector Type | Description |
|---------------|-------------|
| [TcpConnector](https://docs.rs/monoio-transports/latest/monoio_transports/connectors/struct.TcpConnector.html) | Establishes TCP connections |
| [UnixConnector](https://docs.rs/monoio-transports/latest/monoio_transports/connectors/struct.UnixConnector.html) | Establishes Unix domain socket connections |
| [TlsConnector](https://docs.rs/monoio-transports/latest/monoio_transports/connectors/struct.TlsConnector.html) | Adds TLS encryption to an underlying L4 connector, supporting both native-tls and rustls backends |
| [HttpConnector](https://docs.rs/monoio-transports/latest/monoio_transports/http/struct.HttpConnector.html) | Handles HTTP protocol negotiation and connection setup |
| [PooledConnector](https://docs.rs/monoio-transports/latest/monoio_transports/pool/struct.PooledConnector.html) | Provides connection pooling capabilities for any underlying connector |

