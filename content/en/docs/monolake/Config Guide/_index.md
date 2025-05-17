---
title: "Config Guide"
linkTitle: "Config Guide"
weight: 5
description: "Comprehensive guide to configuring monolake proxy"
---

# Proxy Configuration Guide

This document explains how to configure monolake proxy using a custom configuration file. It covers how to set up **HTTP**, **HTTPS**, and **Unix Domain Socket (UDS)** proxies, configure routing, and customize server settings.

## Overview of the Configuration File

The configuration file is divided into sections that define various proxy servers, runtime settings, and routes. Each server has specific configuration options, such as the listener type (socket, UNIX domain socket), upstream connections, and HTTP-related settings.

### Configuration File Structure

1. **Runtime Configuration (`[runtime]`)**  
   Defines the runtime environment and settings for the proxy service.

2. **Server Configuration (`[servers.<name>]`)**  
   Defines individual proxy servers. Each server can be an HTTP, HTTPS, or UDS proxy with customizable settings for listener type, upstream connections, and routing.

3. **Routes (`[[servers.<name>.routes]]`)**  
   Specifies how incoming requests are routed to upstream endpoints.

---

## 1. Runtime Configuration

The `[runtime]` section configures global settings for the proxy service. Here are the key fields:

```toml
[runtime]
runtime_type = "io_uring"  # Type of runtime to use (e.g., legacy, io_uring)
worker_threads = 2       # Number of worker threads
entries = 1024           # Number of entries for io_uring
```

- **`runtime_type`**: Defines the type of runtime to use, such as `legacy` or `io_uring`. The choice of runtime impacts performance and system resources.
- **`worker_threads`**: Specifies the number of worker threads the proxy service will use. Increasing this number may improve handling of concurrent requests.
- **`entries`**: Sets the number of entries for `io_uring` (if used). This controls the number of concurrent I/O operations that can be managed.

---

## 2. Server Configuration

The `[servers]` section defines individual proxy servers. You can configure each proxy server's listener, upstream connection settings, and other specific options.

### HTTP Proxy Configuration

```toml
[servers.demo_http]
name = "monolake.rs"  # Proxy name
listener = { type = "socket", value = "0.0.0.0:8080" }  # Listener configuration
upstream_http_version = "http11"  # HTTP version for upstream connections
http_opt_handlers = { content_handler = true }  # Enable HTTP optional handlers
http_timeout = { server_keepalive_timeout_sec = 60, upstream_connect_timeout_sec = 2, upstream_read_timeout_sec = 2 }
```

- **`name`**: Specifies the name of the proxy server. This can be used to identify the server in logs or other configuration sections.
- **`listener`**: Defines where the server will listen for incoming connections. In this case, the server listens on `0.0.0.0:8080`.
- **`upstream_http_version`**: Sets the HTTP version used for connections to upstream servers. Here, it uses HTTP/1.1. Use **http2** for HTTP/2.
- **`http_opt_handlers`**: Enables or disables HTTP optional handlers.
- **`http_timeout`**: Configures various HTTP timeouts, such as:
  - `server_keepalive_timeout_sec`: The timeout for keeping the connection alive with the client.
  - `upstream_connect_timeout_sec`: The timeout for establishing a connection to upstream servers.
  - `upstream_read_timeout_sec`: The timeout for reading data from upstream servers.

### HTTPS Proxy Configuration

```toml
[servers.demo_https]
name = "tls.monolake.rs"  # Proxy name
listener = { type = "socket", value = "0.0.0.0:8081" }  # Listener configuration
tls = { chain = "examples/certs/server.crt", key = "examples/certs/server.key" }
```

- **`tls`**: Specifies the TLS certificates required for HTTPS encryption. You must provide paths to the certificate chain (`server.crt`) and private key (`server.key`).

### Unix Domain Socket (UDS) Proxy Configuration

```toml
[servers.demo_uds]
name = "uds.monolake.rs"  # Server name
listener = { type = "unix", value = "/tmp/monolake.sock" }  # Listener configuration
```

- **`listener`**: This server listens on a Unix Domain Socket (`/tmp/monolake.sock`). UDS is useful for communication between processes on the same machine without using network protocols.

---

## 3. Routing Configuration

Each proxy server can have multiple routes configured to forward requests to upstream endpoints.

### Example Routes for HTTP Proxy

```toml
[[servers.demo_http.routes]]
path = '/'  # Route path
upstreams = [{ endpoint = { type = "uri", value = "http://ifconfig.me/" } }]  # Upstream endpoint

[[servers.demo_http.routes]]
path = '/{*p}'  # Wild card route path
upstreams = [ { endpoint = { type = "uri", value = "https://httpbin.org/xml" } } ]
```

- **`path`**: The route path for which this configuration applies. For example, the route `/` forwards requests to the endpoint `http://ifconfig.me/`.
- **`upstreams`**: A list of upstream endpoints. Each endpoint can be a URI (either HTTP or HTTPS) to which the proxy server forwards the request.
- **Wildcard Routes**: You can use `{*p}` as a wildcard to capture all paths and forward them to an endpoint. This is helpful when you want to handle a wide range of URLs.

## 4. Applying the Configuration

Monolake will **automatically detect changes** to the configuration file and apply the updated settings without needing to manually restart the service.

### Key Behavior of the File Watcher:
- **Automatic Detection**: When the configuration file is **replaced** (e.g., the old config file is replaced with a new one), the file watcher will automatically detect the change.
- **Graceful Transition for Active Connections**:
  - If the new configuration updates an existing proxy service, **any existing connections** (those established before the update) will continue to use the old configuration settings.
  - **New connections** (those established after the configuration change) will use the **latest configuration**.
- This ensures that the service remains stable for active users while applying the updated configuration for all new users.

### Steps:
1. **Replace the Configuration File**: Replace the current configuration file with the new version containing your desired changes (e.g., new routes, updated listener settings, or updated certificates).
2. **File Watcher Detection**: The file watcher will automatically detect the replacement and apply the new configuration to the proxy service.
3. **Automatic Application**: The updated configuration is applied to any new incoming connections. Existing connections continue using the configuration that was active when they were established.
4. **Verify**: Check the proxy service logs or metrics to confirm that the new configuration is being applied to new connections, while existing connections are unaffected.

This approach allows for **seamless updates** to the proxy service, minimizing downtime and ensuring that changes are immediately reflected for new connections without disrupting active ones.

---
