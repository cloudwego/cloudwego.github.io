---
title: "如何 Mock Client 调用"
linkTitle: "如何 Mock Client 调用"
weight: 1
date: 2024-02-18
description: "介绍如何结合 go mock 来 mock 一个 client 作为桩对象。"
---

## 介绍

在测试时，可能有时并不需要真正 New 一个 Kitex Client，只需要一个 Mock Client 作为桩对象。本文将介绍如何结合 go mock 来达到这个效果。

## 使用方式

### 安装 go mock（mockgen）

```bash
go install go.uber.org/mock/mockgen@latest
```

详见：[go mock](https://github.com/uber-go/mock)

### 使用 go mock

Kitex mock 方式如下：

找到 kitex_gen 目录下的 client，里面有对应的 client 接口，用 go mock 生成 mock client

mac环境下：

```bash
mockgen -source=kitex_gen/xxxx/xxxservice/client.go -destination=xxx/client_mock.go -package=xxx
```

windows环境下：
```bash
mockgen -source kitex_gen/xxxx/xxxservice/client.go -destination xxx/client_mock.go -package xxx
```

该命令会生成 client_mock.go，在测试中使用即可：

```go
// MockHello 实现你想要的 mock 方法
func MockHello(ctx context.Context, req *hello.MyReq, callOptions ...callopt.Option) (*hello1.MyResp, error) {
   return &hello.MyResp{Message: "hello:" + req.Name}, nil
}

// TestClient 测试 mock 函数
func TestClient(t *testing.T) {

   ctrl := gomock.NewController(t)
   defer ctrl.Finish()

   // 获取 go mock 生成的 client
   client := NewMockClient(ctrl)

   // 添加 mock 函数
   client.EXPECT().Hello(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(MockHello).AnyTimes()

   // 发起 mock call
   resp, err := client.Hello(context.Background(), &hello.MyReq{Name: "bd"})
   if err == nil {
      fmt.Println(resp.Message)
   } else {
      fmt.Println(err)
   }
}
```

## 其他

如果不想使用 go mock，或者希望验证 client 的其他能力（例如 tracing），也可以在 NewClient 时指定自定义中间件，按需构造数据。

注意：Kitex Client 内置的中间件都会被执行。
