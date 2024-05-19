---
title: "Example code"
linkTitle: "Example code"
weight: 1
keywords: ["Hertz", "hertz-examples", "Bizdemo", "Server", "Client", "Hz"]
description: "Hertz provides a series of code examples designed to help users get start with Hertz and be familiar with its features."
---

Hertz provides a series of code examples designed to help users get start with Hertz and be familiar with its features. Refer to [hertz-examples](https://github.com/cloudwego/hertz-examples) for more information.

## Bizdemo

### hertz_gorm

- [hertz_gorm](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_gorm) ：Example of using gorm in hertz server

### hertz_gorm_gen

- [hertz_gorm_gen](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_gorm_gen) ：Example of using gorm/gen & proto IDL in hertz server

### hertz_jwt

- [hertz_jwt](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_jwt) ：Example of using jwt in hertz server

### hertz_session

- [hertz_session](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_session) ：Example of using distributed session and csrf in hertz server

### tiktok_demo

- [tiktok_demo](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/tiktok_demo) ：A simple hertz server that provides user, video, interactive, and social backend services for tiktok app

### hz_kitex_demo

- [hz_kitex_demo](https://github.com/cloudwego/hertz-examples/tree/main/hz_kitex_demo) ：Example of using hertz and kitex together

## Server

### Run hertz

- [hello](https://github.com/cloudwego/hertz-examples/tree/main/hello) ：Example of launching a hertz "hello world" application

### Config

- [config](https://github.com/cloudwego/hertz-examples/tree/main/config) ：Example of configuring hertz server

### Protocol

- [HTTP1](https://github.com/cloudwego/hertz-examples/tree/main/protocol/http1) : Example of hertz using HTTP1 protocol
- [TLS](https://github.com/cloudwego/hertz-examples/tree/main/protocol/tls) : Example of hertz using TLS protocol
- [HTTP2](https://github.com/hertz-contrib/http2/tree/main/examples) : Example of hertz using HTTP2 protocol
- [HTTP3](https://github.com/hertz-contrib/http3/tree/main/examples/quic-go) : Example of hertz using HTTP3 protocol
- [Websocket](https://github.com/hertz-contrib/websocket/tree/main/examples) : Example of hertz using Websocket protocol
- [SSE](https://github.com/hertz-contrib/sse/tree/main/examples) : Example of hertz using SSE protocol

### Route

- [Route](https://github.com/cloudwego/hertz-examples/tree/main/route) ：Examples of registering routes, using route groups, and parameter routes

### Middleware

- [basic_auth](https://github.com/cloudwego/hertz-examples/tree/main/middleware/basicauth) ：Example of using basic auth middleware
- [CORS](https://github.com/cloudwego/hertz-examples/tree/main/middleware/CORS) ：Example of using the CORS middleware
- [custom](https://github.com/cloudwego/hertz-examples/tree/main/middleware/custom) ：Example of custom middleware
- [pprof](https://github.com/cloudwego/hertz-examples/tree/main/middleware/pprof) ：Example of using pprof middleware
- [requestid](https://github.com/cloudwego/hertz-examples/tree/main/middleware/requestid) ：Example of using RequestID middleware
- [gzip](https://github.com/cloudwego/hertz-examples/tree/main/middleware/gzip) ：Example of using gzip middleware in hertz server
- [csrf](https://github.com/cloudwego/hertz-examples/tree/main/middleware/csrf) ：Example of using csrf middleware in hertz server
- [loadbalance](https://github.com/cloudwego/hertz-examples/tree/main/middleware/loadbalance/round_robin) ：Example of using loadbalance middleware in hertz server
- [Recovery](/zh/docs/hertz/tutorials/basic-feature/middleware/recovery/) ：Example of using Recovery middleware
- [jwt](https://github.com/hertz-contrib/jwt/tree/main/example/basic) ：Example of using jwt middleware
- [i18n](https://github.com/hertz-contrib/i18n/tree/main/example) ：Example of using i18n middleware
- [session](https://github.com/hertz-contrib/sessions/tree/main/_example) ：Example of using session middleware
- [KeyAuth](https://github.com/hertz-contrib/keyauth/tree/main/example) ：Example of using KeyAuth middleware
- [Swagger](https://github.com/hertz-contrib/swagger/tree/main/example/basic) ：Example of using Swagger middleware
- [access log](https://github.com/hertz-contrib/logger/tree/main/accesslog/example) ：Example of using access log middleware
- [Secure](https://github.com/hertz-contrib/secure/tree/main/example/custom) ：Example of using Secure middleware
- [Sentry](https://github.com/hertz-contrib/hertzsentry) ：Example of using Sentry middleware
- [Casbin](https://github.com/hertz-contrib/casbin/tree/main/example) ：Example of using Casbin middleware
- [ETag](https://github.com/hertz-contrib/etag/tree/main/example) ：Example of using ETag middleware
- [Cache](https://github.com/hertz-contrib/cache/tree/main/example) ：Example of using Cache middleware
- [Paseto](https://github.com/hertz-contrib/paseto/tree/main/example) ：Example of using Paseto middleware

### Parameter binding and validation

- [binding](https://github.com/cloudwego/hertz-examples/tree/main/binding) ：Example of parameter binding and validation

### Get Parameters

- [parameters](https://github.com/cloudwego/hertz-examples/tree/main/parameter) ：Example of getting query, form, cookie, etc. parameters

### Documents

- [file](https://github.com/cloudwego/hertz-examples/tree/main/file) ：Examples of file upload, file download, and static file services

### Render

- [render](https://github.com/cloudwego/hertz-examples/tree/main/render) ：Example of render body as json, html, protobuf, etc

### Redirect

- [redirect](https://github.com/cloudwego/hertz-examples/tree/main/redirect) ：Example of a redirect to an internal/external URI

### Streaming read/write

- [streaming](https://github.com/cloudwego/hertz-examples/tree/main/streaming) ：Example of streaming read/write using hertz server

### Graceful shutdown

- [graceful_shutdown](https://github.com/cloudwego/hertz-examples/tree/main/graceful_shutdown) ：Example of hertz server graceful shutdown

### Unit test

- [unit_test](https://github.com/cloudwego/hertz-examples/tree/main/unit_test) ：Example of writing unit tests using the interface provided by hertz without network transmission

### Tracing

- [tracer](https://github.com/cloudwego/hertz-examples/tree/main/tracer) ：Example of hertz using Jaeger for link tracing

### Monitoring

- [monitoring](https://github.com/cloudwego/hertz-examples/tree/main/monitoring) ：hertz Example of metrics monitoring with Prometheus

### Multiple service

- [multiple_service](https://github.com/cloudwego/hertz-examples/tree/main/multiple_service) ：Example of using hertz with multiple services

### Adaptor

- [adaptor](https://github.com/cloudwego/hertz-examples/tree/main/adaptor) ：Example of using adaptor to integrate hertz with package built for `http.Handler` interface , including a demonstration on using [jade](https://github.com/Joker/jade)
  as template engine.

### Sentinel

- [sentinel](https://github.com/cloudwego/hertz-examples/tree/main/sentinel) ：Example of using sentinel-golang in hertz

### Reverse proxy

- [reverseproxy](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy) ：Example of using reverse proxy in hertz server

### Hlog

- [standard](https://github.com/cloudwego/hertz-examples/tree/main/hlog/standard) ：Example of using Hertz's default implementation for logging
- [custom](https://github.com/cloudwego/hertz-examples/tree/main/hlog/custom) ：Example of log extension
- [zap](https://github.com/cloudwego/hertz-examples/tree/main/hlog/zap) ：Example of docking with zap and lumberjack in hertz server
- [logrus](https://github.com/cloudwego/hertz-examples/tree/main/hlog/logrus) ：Example of docking with logrus and lumberjack in hertz server
- [zerolog](https://github.com/cloudwego/hertz-examples/tree/main/hlog/zerolog) ：Example of docking with zerolog and lumberjack in hertz server
- [slog](https://github.com/cloudwego/hertz-examples/tree/main/hlog/slog) ：Example of docking with slog and lumberjack in hertz server

### Opentelemetry

- [opentelemetry](https://github.com/cloudwego/hertz-examples/tree/main/opentelemetry) ：Example of using obs opentelemetry for docking with opentelemetry

### HTTP Trailer

- [trailer](https://github.com/cloudwego/hertz-examples/tree/main/trailer) ：Example of using HTTP Trailer

## Client

### Send request

- [send_request](https://github.com/cloudwego/hertz-examples/tree/main/client/send_request) ：Example of sending an http request using the hertz client

### Client config

- [client_config](https://github.com/cloudwego/hertz-examples/tree/main/client/config) ：Example of configuring the hertz client

### TLS

- [tls](https://github.com/cloudwego/hertz-examples/tree/main/protocol/tls) ：Example of hertz client sending a tls request

### Add parameters

- [add_parameters](https://github.com/cloudwego/hertz-examples/tree/main/client/add_parameters) ：Example of adding request parameters using the hertz client

### Upload file

- [upload_file](https://github.com/cloudwego/hertz-examples/tree/main/client/upload_file) ：Example of uploading a file using the hertz client

### Middleware

- [middleware](https://github.com/cloudwego/hertz-examples/tree/main/client/middleware) ：Example of using the hertz client middleware

### Streaming read

- [streaming_read](https://github.com/cloudwego/hertz-examples/tree/main/client/streaming_read) ：Example of a streaming read response using the hertz client

### Forward proxy

- [forward_proxy](https://github.com/cloudwego/hertz-examples/tree/main/client/forward_proxy) ：Example of configuring a forward proxy using the hertz client

### HTTP Trailer

- [trailer](https://github.com/cloudwego/hertz-examples/tree/main/trailer) ：Example of using HTTP Trailer

## Hz

### Generate server code based on Thrift

- [thrift](https://github.com/cloudwego/hertz-examples/tree/main/hz/thrift) ：Example of using hz with thrift to generate server code

### Generate server code based on Protobuf

- [protobuf](https://github.com/cloudwego/hertz-examples/tree/main/hz/protobuf) ：Example of using hz with protobuf to generate server code

### Generate client code

- [hz_client](https://github.com/cloudwego/hertz-examples/tree/main/hz/hz_client) ：Example of using hz to generate client code

### Custom templates

- [template](https://github.com/cloudwego/hertz-examples/tree/main/hz/template) ：Example of using hz custom templates to generate server code

### Three-party plugins

- [plugin](https://github.com/cloudwego/hertz-examples/tree/main/hz/plugin) ：Example of using hz to access third-party plugins
