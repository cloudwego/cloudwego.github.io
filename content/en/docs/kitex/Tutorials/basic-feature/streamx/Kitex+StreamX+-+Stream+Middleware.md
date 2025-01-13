---
title: "StreamX Middleware"
date: 2025-01-13
weight: 2
keywords: ["Stream Middleware"]
description: ""
---

## Middleware Type

### Stream Recv/Send Middleware

**Trigger timing** : Called when streaming messages

#### Type definition

```go
type StreamRecvEndpoint func(ctx context.Context, stream Stream, res any) (err error)
type StreamSendEndpoint func(ctx context.Context, stream Stream, req any) (err error)

type StreamRecvMiddleware func(next StreamRecvEndpoint) StreamRecvEndpoint
type StreamSendMiddleware func(next StreamSendEndpoint) StreamSendEndpoint
```

**Parameter description** :

- Directly obtain the current stream object
- Res/req both represent real requests and responses.
- Behavior before and after calling the Next function:

| Middleware type      | Before calling Next                                                                                                    | After calling Next                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| StreamRecvMiddleware | - The data is not really collected, just called the stream. Recv () function.<br><br>- Res parameter is empty          | - Data received or encountered an error<br><br>- The res parameter has a real value                |
| StreamSendMiddleware | - The data was not actually sent, just called the stream.Send () function<br><br>- The req parameter is a real request | - Data transmission completed or encountered an error<br><br>- The req parameter is a real request |

#### Examples

**Usage scenario** : Inject relevant business logic when the stream receives/sends messages.

```go
svr, err := xxx.NewServer(
    //...
    streamxserver.WithStreamRecvMiddleware(func(next streamx.StreamRecvEndpoint) streamx.StreamRecvEndpoint {
        return func(ctx context.Context, stream streamx.Stream, res any) (err error) {
            // ctx has user's token
            token, ok := metainfo.GetPersistentValue(ctx, "user_token")
            // check token balance
            if !hasBalance(token) {
                return fmt.Errorf("user dont have enough balance: token=%s", token)
            }
            return next(ctx, stream, res)
        }
    }),
)
```

## Inject Middleware

#### Inject Client Middleware

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

#### Inject Server Middleware

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
