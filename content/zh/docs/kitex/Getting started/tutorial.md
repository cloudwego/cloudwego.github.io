---
title: "基础教程"
linkTitle: "基础教程"
weight: 4
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "基础教程"]
description: "Kitex 基础教程"
---

开始此章节前，确保你已经了解[前置知识](./pre-knowledge)并完成了[环境准备](./prerequisite.md)。

## 创建项目目录

创建一个目录用于存放后续代码，创建后进入该目录

```shell
mkdir example-server

cd example-server
```

## 编写 IDL

首先我们需要编写一个 IDL，这里以 thrift IDL 为例。

首先创建一个名为 `echo.thrift` 的 thrift IDL 文件。

然后在里面定义我们的服务

```Thrift
namespace go api

struct Request {
  1: string message
}

struct Response {
  1: string message
}

service Echo {
    Response echo(1: Request req)
}
```

## 代码生成

有了 IDL 以后我们便可以通过 kitex 工具生成项目代码了，执行如下命令：

```
kitex -module example -service example-server echo.thrift
```

上述命令中：

- `-module` 表示生成的该项目的 go module 名；**建议使用完整包名**，例如 `github.com/Yourname/exampleserver`
- `-service` 表明我们要生成一个服务端项目，后面紧跟的 `example-server` 为该服务的名字
- 最后一个参数则为该服务的 IDL 文件

生成后的项目结构如下：

```
.
|-- build.sh
|-- echo.thrift
|-- go.mod
|-- handler.go
|-- kitex_gen
|   `-- api
|       |-- echo
|       |   |-- client.go
|       |   |-- echo.go
|       |   |-- invoker.go
|       |   `-- server.go
|       |-- echo.go
|       `-- k-echo.go
|-- kitex_info.yaml
|-- main.go
`-- script
    `-- bootstrap.sh
```

## 拉取依赖

使用 `go mod tidy` 命令拉取项目依赖

如果遇到类似如下报错：

```
github.com/apache/thrift/lib/go/thrift: ambiguous import: found package github.com/apache/thrift/lib/go/thrift in multiple modules

github.com/cloudwego/kitex@v0.X.X/pkg/utils/thrift.go: not enough arguments in call to t.tProt.WriteMessageBegin
```

先执行一遍下述命令，再继续操作：

```
go mod edit -droprequire=github.com/apache/thrift/lib/go/thrift
go mod edit -replace=github.com/apache/thrift=github.com/apache/thrift@v0.13.0
```

这是因为 thrift 官方在 0.14 版本对 thrift 接口做了 breaking change，导致生成代码不兼容。

若想要升级 kitex 版本，执行 `go get -v github.com/cloudwego/kitex@latest` 即可：

## 编写服务逻辑

我们需要编写的服务端逻辑都在 `handler.go` 这个文件中，现在这个文件应该如下所示：

```go
package main

import (
  "context"
  "example/kitex_gen/api" //如果修改了 -module 参数的值，这里的 'example' 也要相应替换
)

// EchoImpl implements the last service interface defined in the IDL.
type EchoImpl struct{}

// Echo implements the EchoImpl interface.
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
  // TODO: Your code here...
  return
}
```

这里的 `Echo` 函数就对应了我们之前在 IDL 中定义的 `echo` 方法。

现在让我们修改一下服务端逻辑，让 `Echo` 服务名副其实。

修改 `Echo` 函数为下述代码或添加你想实现的功能：

```go
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
  return &api.Response{Message: req.Message}, nil
}
```

## 编译运行

kitex 工具已经帮我们生成好了编译和运行所需的脚本：

编译：`sh build.sh`

执行上述命令后，会生成一个 `output` 目录，里面含有我们的编译产物。

运行：`sh output/bootstrap.sh`

执行上述命令后，输出类似如下日志，代表 `Echo` 服务已经开始运行

```
2024/01/18 21:26:36.114595 server.go:83: [Info] KITEX: server listen at addr=[::]:8888
```

## 编写客户端

有了服务端后，接下来就让我们编写一个客户端用于调用刚刚运行起来的服务端。

首先，同样的，先创建一个目录用于存放我们的客户端代码：

```shell
mkdir client
```

进入目录：

```shell
cd client
```

然后用 kitex 命令生成客户端所需的相关代码（如果该目录放在前述 example-server 目录下，则可省略此步，因为 server 代码中包含了 client 所需代码）：

```shell
kitex -module example echo.thrift
```

> 注:
>
> 1. 客户端代码不需要指定 -service 参数，生成的代码在 kitex_gen 目录下；
> 2. -module 参数 **建议使用完整的包名**，例如 `github.com/Yourname/exampleclient`

然后创建一个 `main.go` 文件，就可以开始编写客户端代码了。

### 创建 client

首先让我们创建一个调用所需的 `client`：

```go
import "example/kitex_gen/api/echo" //如果修改了 -module 参数，这里要将 'example' 相应替换成相应的包名
import "github.com/cloudwego/kitex/client"
...
c, err := echo.NewClient("example-server", client.WithHostPorts("0.0.0.0:8888"))
if err != nil {
  log.Fatal(err)
}
```

上述代码中，`echo.NewClient` 用于创建 `client`，其第一个参数为调用的 *服务名*，第二个参数为 *options*，用于传入参数， 此处的 `client.WithHostPorts` 用于指定服务端的地址，更多参数可参考[基本特性](https://www.cloudwego.cn/zh/docs/kitex/tutorials/basic-feature)一节。

#### 调用服务

接下来让我们编写用于发起调用的代码：

```go
import "example/kitex_gen/api"
...
req := &api.Request{Message: "my request"}
resp, err := c.Echo(context.Background(), req, callopt.WithRPCTimeout(3*time.Second))
if err != nil {
  log.Fatal(err)
}
log.Println(resp)
```

上述代码中，我们首先创建了一个请求 `req` , 然后通过 `c.Echo` 发起了调用。

其第一个参数为 `context.Context`，通过通常用其传递信息或者控制本次调用的一些行为，你可以在后续章节中找到如何使用它。

其第二个参数为本次调用的请求。

其第三个参数为本次调用的 `options` ，Kitex 提供了一种 `callopt` 机制，顾名思义——调用参数 ，有别于创建 client 时传入的参数，这里传入的参数仅对此次生效。 此处的 `callopt.WithRPCTimeout` 用于指定此次调用的超时（通常不需要指定，此处仅作演示之用）同样的，你可以在[基本特性](https://www.cloudwego.cn/zh/docs/kitex/tutorials/basic-feature)一节中找到更多的参数。

## 运行客户端

在编写完一个简单的客户端后，我们终于可以发起调用了。

你可以通过下述命令来完成这一步骤：

```
go run main.go
```

如果不出意外，你可以看到类似如下输出：

```
2024/01/18 21:31:26 Response({Message:my request})
```

恭喜你！至此你成功编写了一个 Kitex 的服务端和客户端，并完成了一次调用！

## 总结

- 服务端编写 IDL，使用 kitex 生成代码后填充服务业务逻辑即可运行
- 客户端使用与服务端相同的 IDL，使用 kitex 生成代码后，创建客户端示例，构造请求参数后即可发起调用
- 基于同一 IDL 生成的代码服务端与客户端可以共用

