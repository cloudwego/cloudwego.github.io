---
title: "StreamX 流中间件最佳实践"
date: 2025-01-10
weight: 2
keywords: ["流中间件最佳实践"]
description: ""
---

## 中间件类型

### Stream Recv/Send Middleware

**触发时机**：流收发消息时调用

#### 类型定义

```go
type StreamRecvEndpoint func(ctx context.Context, stream Stream, res any) (err error)
type StreamSendEndpoint func(ctx context.Context, stream Stream, req any) (err error)

type StreamRecvMiddleware func(next StreamRecvEndpoint) StreamRecvEndpoint
type StreamSendMiddleware func(next StreamSendEndpoint) StreamSendEndpoint
```

**参数说明**：

- stream 直接获取当前的流对象
- res/req 均代表真实请求和响应。
- Next 函数调用前后的行为：

| 中间件类型           | Next 调用前                                                             | Next 调用后                                          |
| -------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| StreamRecvMiddleware | - 数据未真正收，刚调用 stream.Recv() 函数<br><br>- res 参数为空         | - 数据已收到或遇到错误<br><br>- res 参数有真实值     |
| StreamSendMiddleware | - 数据未真正发送，刚调用 stream.Send() 函数<br><br>- req 参数为真实请求 | - 数据发送完成或遇到错误<br><br>- req 参数为真实请求 |

#### 使用范例

**使用场景**：流收/发消息时，注入相关业务逻辑。

```go
svr, err := xxx.NewServer(
    //...
    streamxserver.WithStreamRecvMiddleware(func(next streamx.StreamRecvEndpoint) streamx.StreamRecvEndpoint {
        return func(ctx context.Context, stream streamx.Stream, res any) (err error) {
            // ctx 依然含有用户透传的 token
            token, ok := metainfo.GetPersistentValue(ctx, "user_token")
            // 检查 token 是否有账户余额继续维持会话
            if !hasBalance(token) {
                return fmt.Errorf("user dont have enough balance: token=%s", token)
            }
            return next(ctx, stream, res)
        }
    }),
)
```

## 注入中间件

#### 注入 Client Middleware

```go
cli, err := xxx.NewClient(
    "a.b.c",
    streamxclient.WithStreamRecvMiddleware(func(next streamx.StreamRecvEndpoint) streamx.StreamRecvEndpoint {
        return func(ctx context.Context, stream streamx.Stream, res any) (err error) {
           return next(ctx, stream, res)
        }
    }),
    streamxclient.WithStreamSendMiddleware(func(next streamx.StreamSendEndpoint) streamx.StreamSendEndpoint {
        return func(ctx context.Context, stream streamx.Stream, req any) (err error) {
           return next(ctx, stream, req)
        }
    }),
)
```

#### 注入 Server Middleware

```go
server, err := xxx.NewServer(
    // ....
    streamxserver.WithStreamRecvMiddleware(func(next streamx.StreamRecvEndpoint) streamx.StreamRecvEndpoint {
        return func(ctx context.Context, stream streamx.Stream, res any) (err error) {
           return next(ctx, stream, res)
        }
    }),
    streamxserver.WithStreamSendMiddleware(func(next streamx.StreamSendEndpoint) streamx.StreamSendEndpoint {
        return func(ctx context.Context, stream streamx.Stream, req any) (err error) {
           return next(ctx, stream, req)
        }
    }),
)
```
