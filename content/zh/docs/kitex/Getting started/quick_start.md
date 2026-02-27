---
title: "基础示例"
linkTitle: "基础示例"
weight: 3
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "基础示例"]
description: "Kitex 基础示例"
---

开始此章节前，确保你已经了解**前置知识**并完成了**环境准备**。

## 获取示例代码

- 点击 [此处](https://github.com/cloudwego/kitex-examples/archive/refs/heads/main.zip) 直接下载示例代码仓库
- 使用 `git` 克隆代码仓库：`git clone https://github.com/cloudwego/kitex-examples.git`

## 运行

### 直接运行

1. 进入示例仓库的 `hello` 目录：

   ```shell
   cd kitex-examples/hello
   ```

2. 运行服务端代码：

   ```shell
   go run .

   // 输出类似日志代表运行成功
   2024/01/18 20:35:08.857352 server.go:83: [Info] KITEX: server listen at addr=[::]:8888
   ```

3. 另启一个终端运行客户端代码：

   ```shell
   go run ./client

   // 每隔一秒输出类似日志代表运行成功
   2024/01/18 20:39:59 Response({Message:my request})
   2024/01/18 20:40:00 Response({Message:my request})
   2024/01/18 20:40:01 Response({Message:my request})
   ```

### Docker 运行

1. 进入示例代码仓库：

   ```shell
   cd kitex-examples
   ```

2. 构建 docker 镜像：

   ```shell
   docker build -t kitex-examples .
   ```

3. 运行服务端代码：

   ```shell
   docker run --network host kitex-examples ./hello-server

   // 输出类似日志代表运行成功
   2024/01/18 12:47:34.712415 server.go:83: [Info] KITEX: server listen at addr=[::]:8888
   ```

4. 运行客户端代码：

   ```shell
   docker run --network host kitex-examples ./hello-client

   // 每隔一秒输出类似日志代表运行成功
   2024/01/18 12:48:20 Response({Message:my request})
   2024/01/18 12:48:21 Response({Message:my request})
   2024/01/18 12:48:22 Response({Message:my request})
   ```

恭喜你，你现在成功通过 Kitex 发起了 RPC 调用。

## 新增方法

你已经完成现有示例代码的运行，接下来添加你自己实现的方法并运行起来吧。

打开 `hello` 目录下的 `hello.thrift` 文件，你会看到以下内容：

```Thrift
namespace go api

struct Request {
        1: string message
}

struct Response {
        1: string message
}

service Hello {
    Response echo(1: Request req)
}
```

现在让我们为新方法分别定义一个新的请求和响应，`AddRequest` 和 `AddResponse`，并在 `service Hello` 中增加 `add` 方法：

```Thrift
namespace go api

struct Request {
    1: string message
}

struct Response {
    1: string message
}

struct AddRequest {
  	1: i64 first
  	2: i64 second
}

struct AddResponse {
  	1: i64 sum
}

service Hello {
    Response echo(1: Request req)
    AddResponse add(1: AddRequest req)
}
```

### 生成新代码

运行如下命令后，`kitex` 工具根据 `hello.thrift` 内容自动更新代码文件。

```shell
kitex -module "github.com/cloudwego/kitex-examples" -service a.b.c hello.thrift
```

执行完上述命令后，`kitex` 工具将更新下述文件

1. 更新 `./handler.go`，在里面增加一个 `Add` 方法的基本实现
2. 更新 `./kitex_gen`，里面有框架运行所必须的代码文件

### 补全业务逻辑

上述步骤完成后，`./handler.go` 中会自动补全一个 `Add` 方法的基本实现，类似如下代码：

```go
// Add implements the HelloImpl interface.
func (s *HelloImpl) Add(ctx context.Context, req *api.AddRequest) (resp *api.AddResponse, err error) {
        // TODO: Your code here...
        return
}
```

这个方法对应我们在 `hello.thrift` 中新增的 `Add` 方法，我们要做的就是增加我们想要的业务逻辑代码。例如返回请求参数相加后的结果：

```go
// Add implements the HelloImpl interface.
func (s *HelloImpl) Add(ctx context.Context, req *api.AddRequest) (resp *api.AddResponse, err error) {
        // TODO: Your code here...
        resp = &api.AddResponse{Sum: req.First + req.Second}
        return
}
```

### 新增客户端调用

服务端已经有了 `Add` 方法的处理，现在让我们在客户端增加对 `Add` 方法的调用。

在 `./client/main.go` 中你会看到类似如下的 `for` 循环：

```go
for {
        req := &api.Request{Message: "my request"}
        resp, err := client.Echo(context.Background(), req)
        if err != nil {
                log.Fatal(err)
        }
        log.Println(resp)
        time.Sleep(time.Second)
}
```

现在让我们在里面增加 `Add` 方法的调用：

```go
for {
        req := &api.Request{Message: "my request"}
        resp, err := client.Echo(context.Background(), req)
        if err != nil {
                log.Fatal(err)
        }
        log.Println(resp)
        time.Sleep(time.Second)
        addReq := &api.AddRequest{First: 512, Second: 512}
        addResp, err := client.Add(context.Background(), addReq)
        if err != nil {
                log.Fatal(err)
        }
        log.Println(addResp)
        time.Sleep(time.Second)
}
```

### 重新运行

按照第一次运行示例代码的方法，分别重新运行服务端与客户端代码，看到类似如下输出，代表运行成功：

```shell
// 服务端
2024/01/18 21:07:43.638115 server.go:83: [Info] KITEX: server listen at addr=[::]:8888


// 客户端
2024/01/18 21:07:52 Response({Message:my request})
2024/01/18 21:07:53 AddResponse({Sum:1024})
2024/01/18 21:07:54 Response({Message:my request})
2024/01/18 21:07:55 AddResponse({Sum:1024})
2024/01/18 21:07:56 Response({Message:my request})
2024/01/18 21:07:57 AddResponse({Sum:1024})
```

恭喜你，完成了快速上手的所有内容！
