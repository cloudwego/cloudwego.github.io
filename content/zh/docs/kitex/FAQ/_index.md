---
title: "FAQ"
linkTitle: "FAQ"
date: 2021-10-9
weight: 5
keywords: ["Kitex", "HTTP", "Windows", "Thrift", "Q&A"]
description: "Kitex 常见问题解答。"
---

>  **如果无法满足你的需求，请在 [Kitex Github 项目仓库](https://github.com/cloudwego/kitex)提交 Issue，社区维护者会及时跟进处理。**

## Kitex 框架

**Q1: 支持 Windows 吗？**

- 是的。Kitex 在 v0.4.0 版本已支持在 Windows 环境下编译运行了。代码生成工具在 v0.5.2 也支持了 Windows 环境。

**Q2: 是否支持 HTTP？**

- 目前 Kitex 没有支持 HTTP 请求，如果是 API 网关场景，针对 Thrift 提供了 [HTTP 映射的泛化调用](/zh/docs/kitex/tutorials/advanced-feature/generic-call/)，Kitex 会将 HTTP 请求做 Thrift 编码发给服务端。
- HTTP 可以使用 CloudWeGo 开源的 HTTP 框架 [Hertz](/zh/docs/hertz/)。

**Q3: 如何配置开启连接多路复用？**

- 如果使用 Thrift 或 Kitex Protobuf ，开启连接多路复用：服务端配置 WithMuxTransport()，调用端配置 WithMuxConnection(1)。
- 如果使用 gRPC， 默认是连接多路复用。

**Q4: 本地直连场景下，配置长连接池为什么没有生效？**

- 本地测试 ip 需要改成 127.0.0.1，如 client.WithHostPorts("127.0.0.1:8888")。

**Q5: Kitex Protobuf 和 gRPC 协议区别**

- Kitex Protobuf 是 Kitex 自定义的 Protobuf 消息协议，协议格式类似 Thrift。
- gRPC 是对 gRPC 消息协议的支持，可以与 gRPC 框架互通。

**Q6: 出现 Thrift 接口编译问题，如 not enough arguments in call to iprot.ReadStructBegin**

- Kitex 依赖 Thrift v0.13，因为Apache Thrift v0.14 接口有 breaking change，无法直接升级。出现该问题是拉到了新版本的 Thrift，升级版本时建议不使用 -u 参数，可以执行命令固定版本 `go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0`

## Kitex 代码生成工具

**Q1: 安装代码生成工具，出现了 'not enough arguments' 问题**

- 请开启go mod：GO111MODULE=on go get github.com/cloudwego/kitex/tool/cmd/kitex@latest

**Q2: 为什么 IDL 里的 set 生成了 slice?**

- Apache Thrift 官方从 JSON 序列化的角度考虑，v0.11.0 开始，[将 set 的生成类型从 map 改为了 slice](https://issues.apache.org/jira/browse/THRIFT-4011)，Kitex 从兼容性角度考虑，对齐了该行为。

**Q3: 为什么有些字段名字后面多了条下划线?**

- Thrift 的官方实现为了避免命名冲突，限制了以「Result」和「Args」结尾的标识符。 官方 Thrift 的冲突规避策略：当 Thrift 文件中的类型名、Service 名和方法名，以 New 开头 或者 以 Result 或者 以 Args 结尾时，Thrift 会自动在名字末尾添加下划线。参考 https://jira.apache.org/jira/browse/THRIFT-4410，Kitex 使用了 Thriftgo 进行代码生成，Thriftgo 为了尽可能和官方实现保持一致，采取了类似的策略。

**Q4: 新增接口重新生成代码，是否会覆盖handler.go**

- kitex_gen/ 下的生成代码会重新生成覆盖，但服务端的 handler.go 不会覆盖，只会新增对应方法。

**Q5: 请问目前代码生成工具中的模板是否支持用户自定义?**

- 目前没有支持自定义模板的打算，因为传参设计会复杂很多。现在的插件机制完全可以实现任意等价的功能

**Q6: 代码生成工具中的 –type 是否可以通过 IDL 文件扩展名自动确定？**

- Kitex 在 v0.4.0 版本已支持根据文件后缀生成代码，无需再添加 -type 参数。

## CPU 利用率飙升

### error.Is\As 出现热点问题

从 CPU profile 看，`errors.Is` 或 `errors.As` 出现热点问题，甚至 CPU 打满

![](/img/blog/Kitex_self_check/error_is_as.png)

**原因**：自定义 error 里实现了 Unwrap 方法，但该方法实现错误，返回了 error 对象自己，导致死循环，如下

```go
func (e *XError) Unwrap() error {
    if e == nil {
       return nil
    }
    return e.InnerError // 实际上返回了自己
}

func (e *XError) NewXError(outMsg *XError) *XError {
    err := &XError{
       OutCode:    outMsg.OutCode,
       OutMsg:     outMsg.OutMsg,
       InnerError: innerErr(outMsg.Msg),
    }
    err.InnerError = err // 此处指向自己
    return err
}
```

**解决**：Unwrap 返回被封装的 error，否则应该返回 nil，切忌循环引用。

## 超时错误

### context deadline earlier than timeout

**原因**：Kitex Client 对请求超时的实现基于 `context` 中提供的 `context.WithTimeout(ctx, timeout) ` 方法。如果业务传入的 `ctx` 中本身就设置了 `deadline` 且比 RPC 超时时间要短，则以业务传入的 `ctx deadline` 为准。

**解决**：不要为 `ctx` 设置 `deadline`。

**排查方法**：

- 利用 `context.Done()` 方法：在 **rpc** **请求前**输出以下 ctx 信息，如果 `ctx.Done() != nil` 说明设置过 `WithTimeout`、`WithDeadline`

  ```go
  deadline, _ := ctx.Deadline()
  klog.Infof("before rpc call, ctxDone=%t, deadline=%v", ctx.Done() != nil, deadline)
  ```

- 排查代码中调用了 `WithTimeout` 或 `WithDeadline` 或者其他等价操作的地方。有时候并不是你自己直接设置了 `timeout`，**常见是将别的框架使用的 `ctx` 传递给 `kitex client`**，而该 `ctx` 已经被设置过上述几种行为。但无论是哪边修改的，之前从 `Client` 调用的代码段开始倒查 `ctx` 赋值的链路，一定能找到篡改点。你可以使用 `dlv`（ go 调试器）或 `IDE` 的调试模式来帮助排查调用链。

### context canceled by business

**原因**：如果在 Kitex 客户端设置的实际超时截止时间之前，业务代码里调用了 `WithTimeout`、 `WithDeadline` 或 `WithCancel` 返回的 `cancel` 函数，Kitex 会附加额外的信息 `context canceled by business`

**排查方法**：参考上文 `context deadline earlier than timeout` 排查方法

**注意**：如果多个 `goroutine` 共享 `ctx`（典型是启动一个新的 `goroutine` 并将 `ctx` 传递过去）的情况，如果调用该 `ctx` 的 `cancel` 方法，会影响所有 `goroutine`。

## invalid payload 错误

该问题说明是 Client 和 Server 的协议不一致，下面列出一些常见的情况供参考。

可先根据现象快速判断问题是 Client 端还是 Server 端：

- 仅在 Client 端报错，说明 Server 返回的响应不符合预期
  - 例如 Client 请求的是 http server，收到的报文是以 "HTTP/1.1" 开头
- 仅在 Server 端报错，说明 Server 收到的请求不符合预期
  - 例如 HTTP Client 发出的请求，报文以 "GET " 或 "POST "开头

| 报文                                                | 说明                                                         |
| --------------------------------------------------- | ------------------------------------------------------------ |
| **first4Bytes=0x48545450, second4Bytes=0x2f312e31** | 这 8 个字节对应 ASCII "HTTP/1.1"，这是典型的 HTTP Server 响应报文。说明 Kitex Client 请求了 HTTP Server。 |
| **first4Bytes=0x47455420**                          | 这 4 个字节对应 ASCII "GET "，这是典型的 HTTP GET 请求报文。说明 Kitex Server 收到了 HTTP 请求；请勿使用 HTTP Client 直接请求 Kitex Server。 |
| **first4Bytes=0x504f5354**                          | 这 4 个字节对应 ASCII "POST"，这是典型的 HTTP POST 请求报文。说明 Kitex Server 收到了 HTTP 请求；请勿使用 HTTP Client 直接请求 Kitex Server。 |
| **first4Bytes=0x16030100**                          | 这是 TLS 协议的报文，Kitex 默认并不支持 TLS 协议。           |
| **first4Bytes=0x50524920, second4Bytes=0x2a204854** | 这是 HTTP2 的 [PRI](https://httpwg.org/specs/rfc7540.html#ConnectionHeader) 请求，即服务收到了 HTTP2 请求，请检查对应的 Client。 |

**Q1：如何定位请求源？**

- 建议根据 Client IP 排查请求源。

**Q2：为什么报错信息里没有请求的方法名称？**

- 因为请求不包含有效的 RPC 报文，Kitex 无法解析，因此不知道请求了哪个方法（报文的协议都不对，大概率并不是在请求某个 RPC 方法）。

