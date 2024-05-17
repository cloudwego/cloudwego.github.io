---
title: "GLS Feature Usage"
date: 2023-11-29
weight: 11
keywords: ["GLS", "context"]
description: "Goroutine local storage for implicitly pass context"
---

## Server side enable request context backup

- Option on
  - Use the server option `WithContextBackup`;
  - The first parameter `enable` indicates that the GLS is enabled;
  - The second option, `async`, means to enable asynchronous implicitly pass-through (indicating that the context in the asynchronous call to go func () is also transparent fallback)

```go
svr := xxx.NewServer(new(XXXImpl), server.WithContextBackup(true, true))

```

- Adjust localsession [management options](https://github.com/cloudwego/localsession/blob/main/manager.go#L24) by environment variables
  - First, enable `WithContextBackup` on the Server side.
  - Configure `CLOUDWEGO_SESSION_CONFIG_KEY ``= [{Whether to enable asynchronous pass-through}] [, {Global sharding number}] [, {GC interval}] in environment variables `, all three options are optional, **null means use default value**
    - Ex: `true,10,1h ` means, turn on asynchronous + sharding 10 buckets + 1 hour GC interval

## Client start request context fallback

- Option on
  - Use the client option `WithContextBackup`;
  - The parameter handler represents the backup logic BackupHandler customized by the business.

```go
func(prev, cur context.Context) (ctx context.Context, backup bool)

```

- `Prev` parameter represents the context of the backup
- `Cur` parameter represents the context obtained by the current client
- `Ctx` return value represents the final context where the user completes processing
- `Backup` return value indicates whether to continue localsession [built-in fallback backup ](https://github.com/cloudwego/localsession/blob/main/backup/metainfo.go#L54), mainly metainfo Persistent KVS pass-through at present

```go
var expectedKey interface{}
cli := xxx.NewClient(serverName, client.WithContextBackup(func(prev, cur context.Context) (ctx context.Context, backup bool) {
    if v := cur.Value(expectedKey); v != nil {
    // expectedKey exists, no need for recover context
        return cur, false
    }
    // expectedKey doesn't exists, need recover context from prev
    ctx = context.WithValue(cur, expectedKey, prev.Value(expectedKey))
    return ctx, true
})

```
