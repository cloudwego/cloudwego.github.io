---
title: "协议扩展"
linkTitle: "协议扩展"
weight: 3
description: >

---

Hertz 的分层设计使得协议扩展变得容易起来，使用者可自行扩展协议或使用 ALPN 协议升级，其定义在 `pkg/protocol/server.go` 中

### 扩展接口

```go
type Server interface {
   Serve(c context.Context, conn network.Conn) error
}
```

### 集成到 Hertz

目前 Hertz 虽有协议扩展的能力，但未将该配置暴露出来，如有需求，可提 issue 讨论或自行修改源码。只需要将协议注册到 engine 的 `protocolServers` 字段中即可。
