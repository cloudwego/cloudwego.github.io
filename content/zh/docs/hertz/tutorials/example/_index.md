---
title: "代码示例"
linkTitle: "代码示例"
weight: 1
keywords: ["Hertz", "hertz-examples", "Bizdemo", "Server", "Client", "Hz"]
description: "Hertz 提供了一系列示例代码旨在帮助用户快速上手 Hertz 并了解 Hertz 的特性。"
---

Hertz 提供了一系列示例代码旨在帮助用户快速上手 Hertz 并了解 Hertz 的特性，参考 [hertz-examples](https://github.com/cloudwego/hertz-examples) 以获取更多信息。

## Bizdemo

### hertz_gorm

- [hertz_gorm](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_gorm) ：在 hertz server 中使用 gorm 的示例

### hertz_gorm_gen

- [hertz_gorm_gen](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_gorm_gen) ：在 hertz server 中使用 gorm/gen & proto IDL 的示例

### hertz_jwt

- [hertz_jwt](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_jwt) ：在 hertz server 中使用 jwt 的示例

### hertz_session

- [hertz_session](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/hertz_session) ：在 hertz server 中使用分布式 session 和 csrf 的示例

### tiktok_demo

- [tiktok_demo](https://github.com/cloudwego/hertz-examples/tree/main/bizdemo/tiktok_demo) ：拥有用户、视频、互动、社交功能的仿 tiktok hertz server

### hz_kitex_demo

- [hz_kitex_demo](https://github.com/cloudwego/hertz-examples/tree/main/hz_kitex_demo) ：hertz 和 kitex 配合使用的示例

## Server

### 启动 Hertz

- [hello](https://github.com/cloudwego/hertz-examples/tree/main/hello) ：启动对于 hertz 来说相当于 "hello world" 的示例

### 配置

- [config](https://github.com/cloudwego/hertz-examples/tree/main/config) ：配置 hertz server 的示例

### 协议

- [HTTP1](https://github.com/cloudwego/hertz-examples/tree/main/protocol/http1) : hertz 使用 HTTP1 协议的示例
- [TLS](https://github.com/cloudwego/hertz-examples/tree/main/protocol/tls) : hertz 使用 TLS 协议的示例
- [HTTP2](https://github.com/hertz-contrib/http2/tree/main/examples) : hertz 使用 HTTP2 协议的示例
- [HTTP3](https://github.com/hertz-contrib/http3/tree/main/examples/quic-go) : hertz 使用 HTTP3 协议的示例
- [Websocket](https://github.com/hertz-contrib/websocket/tree/main/examples) : hertz 使用 Websocket 协议的示例
- [SSE](https://github.com/hertz-contrib/sse/tree/main/examples) : hertz 使用 SSE 协议的示例

### 路由

- [Route](https://github.com/cloudwego/hertz-examples/tree/main/route) ：注册路由、使用路由组、参数路由的示例

### 中间件

- [basic_auth](https://github.com/cloudwego/hertz-examples/tree/main/middleware/basicauth) ：使用 basic auth 中间件的示例
- [CORS](https://github.com/cloudwego/hertz-examples/tree/main/middleware/CORS) ：使用 CORS 中间件的示例
- [custom](https://github.com/cloudwego/hertz-examples/tree/main/middleware/custom) ：自定义中间件的示例
- [pprof](https://github.com/cloudwego/hertz-examples/tree/main/middleware/pprof) ：使用 pprof 中间件的示例
- [requestid](https://github.com/cloudwego/hertz-examples/tree/main/middleware/requestid) ：使用 RequestID 中间件的示例
- [gzip](https://github.com/cloudwego/hertz-examples/tree/main/middleware/gzip) ：在 hertz server 中使用 gzip 中间件的示例
- [csrf](https://github.com/cloudwego/hertz-examples/tree/main/middleware/csrf) ：在 hertz server 中使用 csrf 中间件的示例
- [loadbalance](https://github.com/cloudwego/hertz-examples/tree/main/middleware/loadbalance/round_robin) ：在 hertz server 中使用 loadbalance 中间件的示例
- [Recovery](/zh/docs/hertz/tutorials/basic-feature/middleware/recovery/) ：使用 Recovery 中间件的示例
- [jwt](https://github.com/hertz-contrib/jwt/tree/main/example/basic) ：使用 jwt 中间件的示例
- [i18n](https://github.com/hertz-contrib/i18n/tree/main/example) ：使用 i18n 中间件的示例
- [session](https://github.com/hertz-contrib/sessions/tree/main/_example) ：使用 session 中间件的示例
- [KeyAuth](https://github.com/hertz-contrib/keyauth/tree/main/example) ：使用 KeyAuth 中间件的示例
- [Swagger](https://github.com/hertz-contrib/swagger/tree/main/example/basic) ：使用 Swagger 中间件的示例
- [access log](https://github.com/hertz-contrib/logger/tree/main/accesslog/example) ：使用 access log 中间件的示例
- [Secure](https://github.com/hertz-contrib/secure/tree/main/example/custom) ：使用 Secure 中间件的示例
- [Sentry](https://github.com/hertz-contrib/hertzsentry) ：使用 Sentry 中间件的示例
- [Casbin](https://github.com/hertz-contrib/casbin/tree/main/example) ：使用 Casbin 中间件的示例
- [ETag](https://github.com/hertz-contrib/etag/tree/main/example) ：使用 ETag 中间件的示例
- [Cache](https://github.com/hertz-contrib/cache/tree/main/example) ：使用 Cache 中间件的示例
- [Paseto](https://github.com/hertz-contrib/paseto/tree/main/example) ：使用 Paseto 中间件的示例

### 参数绑定及验证

- [binding](https://github.com/cloudwego/hertz-examples/tree/main/binding) ：参数绑定及验证的示例

### 获取参数

- [parameters](https://github.com/cloudwego/hertz-examples/tree/main/parameter) ：获取 query、form、cookie 等参数的示例

### 文件

- [file](https://github.com/cloudwego/hertz-examples/tree/main/file) ：关于如何上传，下载文件和搭建静态文件服务的示例

### 渲染

- [render](https://github.com/cloudwego/hertz-examples/tree/main/render) ：渲染 json, html, protobuf 的示例

### 重定向

- [redirect](https://github.com/cloudwego/hertz-examples/tree/main/redirect) ：重定向到内部/外部 URI 的示例

### 流式读/写

- [streaming](https://github.com/cloudwego/hertz-examples/tree/main/streaming) ：使用 hertz server 流式读/写的示例

### 优雅退出

- [graceful_shutdown](https://github.com/cloudwego/hertz-examples/tree/main/graceful_shutdown) ：hertz server 优雅退出的示例

### 单元测试

- [unit_test](https://github.com/cloudwego/hertz-examples/tree/main/unit_test) ：使用 hertz 提供的接口不经过网络传输编写单元测试的示例

### 链路追踪

- [tracer](https://github.com/cloudwego/hertz-examples/tree/main/tracer) ：hertz 使用 Jaeger 进行链路追踪的示例

### 监控

- [monitoring](https://github.com/cloudwego/hertz-examples/tree/main/monitoring) ：hertz 使用 Prometheus 进行指标监控的示例

### 多端口服务

- [multiple_service](https://github.com/cloudwego/hertz-examples/tree/main/multiple_service) ：使用 Hertz 启动多端口服务的示例

### 适配器

- [adaptor](https://github.com/cloudwego/hertz-examples/tree/main/adaptor) ：使用 adaptor 集成基于 `http.Handler` 接口开发的工具, 包含使用 [jade](https://github.com/Joker/jade) 作为模版引擎的示例

### Sentinel

- [sentinel](https://github.com/cloudwego/hertz-examples/tree/main/sentinel) ：sentinel-golang 结合 hertz 使用的示例

### 反向代理

- [reverseproxy](https://github.com/cloudwego/hertz-examples/tree/main/reverseproxy) ：在 hertz server 中使用反向代理的示例

### Hlog

- [standard](https://github.com/cloudwego/hertz-examples/tree/main/hlog/standard) ：使用 hertz 默认实现的日志的示例
- [custom](https://github.com/cloudwego/hertz-examples/tree/main/hlog/custom) ：日志扩展的示例
- [zap](https://github.com/cloudwego/hertz-examples/tree/main/hlog/zap) ：在 hertz server 中对接 zap 和 lumberjack 的示例
- [logrus](https://github.com/cloudwego/hertz-examples/tree/main/hlog/logrus) ：在 hertz server 中对接 logrus 和 lumberjack 的示例
- [zerolog](https://github.com/cloudwego/hertz-examples/tree/main/hlog/zerolog) ：在 hertz server 中对接 zerolog 和 lumberjack 的示例
- [slog](https://github.com/cloudwego/hertz-examples/tree/main/hlog/slog) ：在 hertz server 中对接 slog 和 lumberjack 的示例

### Opentelemetry

- [opentelemetry](https://github.com/cloudwego/hertz-examples/tree/main/opentelemetry) ：使用 obs-opentelemetry 的示例用于对接 opentelemetry

### HTTP Trailer

- [trailer](https://github.com/cloudwego/hertz-examples/tree/main/trailer) ：使用 HTTP Trailer 的示例

## Client

### 发送请求

- [send_request](https://github.com/cloudwego/hertz-examples/tree/main/client/send_request) ：使用 hertz client 发送 http 请求的示例

### 配置

- [client_config](https://github.com/cloudwego/hertz-examples/tree/main/client/config) ：配置 hertz client 的示例

### TLS

- [tls](https://github.com/cloudwego/hertz-examples/tree/main/protocol/tls) ：hertz client 发送 tls 请求的示例

### 添加请求内容

- [add_parameters](https://github.com/cloudwego/hertz-examples/tree/main/client/add_parameters) ：使用 hertz client 添加请求参数的示例

### 上传文件

- [upload_file](https://github.com/cloudwego/hertz-examples/tree/main/client/upload_file) ：使用 hertz client 上传文件的示例

### 中间件

- [middleware](https://github.com/cloudwego/hertz-examples/tree/main/client/middleware) ：使用 hertz client middleware 的示例

### 流式读响应

- [streaming_read](https://github.com/cloudwego/hertz-examples/tree/main/client/streaming_read) ：使用 hertz client 流式读响应的示例

### 正向代理

- [forward_proxy](https://github.com/cloudwego/hertz-examples/tree/main/client/forward_proxy) ：使用 hertz client 配置正向代理的示例

### HTTP Trailer

- [trailer](https://github.com/cloudwego/hertz-examples/tree/main/trailer) ：使用 HTTP Trailer 的示例

## Hz

### 基于 Thrift 生成服务端代码

- [thrift](https://github.com/cloudwego/hertz-examples/tree/main/hz/thrift) ：使用 hz 与 thrift 生成服务端代码的示例

### 基于 Protobuf 生成服务端代码

- [protobuf](https://github.com/cloudwego/hertz-examples/tree/main/hz/protobuf) ：使用 hz 与 protobuf 生成服务端代码的示例

### 客户端代码生成

- [hz_client](https://github.com/cloudwego/hertz-examples/tree/main/hz/hz_client) ：使用 hz 生成客户端代码的示例

### 自定义模板

- [template](https://github.com/cloudwego/hertz-examples/tree/main/hz/template) ：使用 hz 自定义模版生成服务端代码的示例

### 接入第三方插件

- [plugin](https://github.com/cloudwego/hertz-examples/tree/main/hz/plugin) ：使用 hz 接入第三方插件的示例
