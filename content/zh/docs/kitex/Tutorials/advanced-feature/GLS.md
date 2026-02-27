---
title: "Goroutine-Local-Storage 功能使用"
date: 2023-11-29
weight: 11
keywords: ["GLS", "上下文"]
description: "协程上下文隐式传递"
---

## Introduction

GLS 用于存储 goroutine 内的上下文信息，作用类似于 context。相比 context 有如下优势：

1. **不需要显式传递**，在任意函数位置都可调用 CurSession() 获取上下文（如果有）
2. **可以在父子\*\***协程\***\*间传递**（需要开启选项）

框架目前主要使用 GLS 进行 context 备份，以避免用户误传 context 导致链路透传信息（如 logid、metainfo 等）丢失

## Server 端开启请求 context 备份

- 选项开启
  - 使用 server option WithContextBackup；
  - 第一个参数 enable 表示开启备份功能；
  - 第二个选项 async 表示开启异步隐式透传（表示对 go func() 异步调用中的 context 也进行透明兜底）

```go
svr := xxx.NewServer(new(XXXImpl), server.WithContextBackup(true, true))

```

- 环境变量调整 localsession [管理选项](https://github.com/cloudwego/localsession/blob/main/manager.go#L24)
  1. 首先在【Server 端开启 WithContextBackup】
  2. 环境变量中配置 `CLOUDWEGO_SESSION_CONFIG_KEY``=[{是否开启异步透传}][,{全局分片数}][,{GC间隔}]`，三个选项都为可选，**空表示使用默认值**
     1. ex: `true,10,1h ` 表示 开启异步 + 分片 10+1 小时 GC 间隔

## Client 端开启请求 context 兜底

- 选项开启
  - 使用 client option `client.``WithContextBackup``(handler)`；
  - 参数 handler 表示业务自定义的备份逻辑 BackupHandler，其签名为

```go
func(prev, cur context.Context) (ctx context.Context, backup bool)

```

- prev 参数表示备份的 context
- cur 参数表示当前 client 拿到的 context
- ctx 返回值表示用户处理完成的最终 context
- backup 返回值表示是否继续进行 localsession[ 内置的兜底备份](https://github.com/cloudwego/localsession/blob/main/backup/metainfo.go#L54)，当前主要是 metainfo Persistent KVS 的透传

```go
var expectedKey interface{}
cli := client.New(serverName, client.WithContextBackup(func(prev, cur context.Context) (ctx context.Context, backup bool) {
    if v := cur.Value(expectedKey); v != nil {
    // expectedKey exists, no need for recover context
        return cur, false
    }
    // expectedKey doesn't exists, need recover context from prev
    ctx = context.WithValue(cur, expectedKey, prev.Value(expectedKey))
    return ctx, true
})

```
