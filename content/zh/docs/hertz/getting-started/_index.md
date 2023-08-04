---
title: "快速开始"
linkTitle: "快速开始"
weight: 2
description: >

---

## 准备 Golang 开发环境

1. 如果您之前未搭建 Golang 开发环境，可以参考 [Golang 安装](https://golang.org/doc/install)。
2. 推荐使用最新版本的 Golang，或保证现有 Golang 版本 >= 1.15。小于 1.15 版本，可以自行尝试使用但不保障兼容性和稳定性。
3. 确保打开 go mod 支持 (Golang >= 1.15时，默认开启)。

> 目前，Hertz 支持 Linux、macOS、Windows 系统。

## 快速上手

在完成环境准备后，可以按照如下操作快速启动 Hertz Server：

1. 在当前目录下创建 hertz_demo 文件夹，进入该目录中。
2. 创建 `main.go` 文件。
3. 在 `main.go` 文件中添加以下代码。

    ```go
    package main

    import (
        "context"

        "github.com/cloudwego/hertz/pkg/app"
        "github.com/cloudwego/hertz/pkg/app/server"
        "github.com/cloudwego/hertz/pkg/common/utils"
        "github.com/cloudwego/hertz/pkg/protocol/consts"
    )

    func main() {
        h := server.Default()

        h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
                ctx.JSON(consts.StatusOK, utils.H{"message": "pong"})
        })

        h.Spin()
    }
    ```

4. 生成 `go.mod` 文件。

    ```bash
    go mod init hertz_demo
    ```

5. 整理 & 拉取依赖。

    ```bash
    go mod tidy
    ```

6. 运行示例代码。

    ```bash
    go run hertz_demo
    ```

    如果成功启动，你将看到以下信息：

    ```bash
    2022/05/17 21:47:09.626332 engine.go:567: [Debug] HERTZ: Method=GET    absolutePath=/ping   --> handlerName=main.main.func1 (num=2 handlers)
    2022/05/17 21:47:09.629874 transport.go:84: [Info] HERTZ: HTTP server listening on address=[::]:8888
    ```

    接下来，我们可以对接口进行测试：

    ```bash
    curl http://127.0.0.1:8888/ping
    ```

    如果不出意外，我们可以看到类似如下输出：

    ```bash
    {"message":"pong"}
    ```   

## 代码自动生成工具 hz

hz 是 Hertz 框架提供的一个用于生成代码的命令行工具，可以用于生成 Hertz 项目的脚手架。

### 安装命令行工具 hz

首先，我们需要安装使用本示例所需要的命令行工具 hz：

1. 确保 `GOPATH` 环境变量已经被正确地定义（例如 `export GOPATH=~/go`）并且将 `$GOPATH/bin` 添加到 `PATH` 环境变量之中（例如 `export PATH=$GOPATH/bin:$PATH`）；请勿将 `GOPATH` 设置为当前用户没有读写权限的目录。
2. 安装 hz：`go install github.com/cloudwego/hertz/cmd/hz@latest`。

更多 hz 使用方法可参考: [hz](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/)。

### 确定代码放置位置

1. 若将代码放置于 `$GOPATH/src` 下，需在 `$GOPATH/src` 下创建额外目录，进入该目录后再获取代码：

    ```bash
    mkdir -p $(go env GOPATH)/src/github.com/cloudwego
    cd $(go env GOPATH)/src/github.com/cloudwego
    ```

2. 若将代码放置于 `GOPATH` 之外，可直接获取。

### 生成/编写示例代码

1. 在当前目录下创建 hertz_demo 文件夹，进入该目录中。
2. 生成代码 `hz new`，若当前不在 `GOPATH`，需要添加 `-module` 或者 `-mod` flag 指定一个自定义的模块名称。详细参考[这里](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/usage/usage/)。
3. 整理 & 拉取依赖。

    ```bash
    go mod init # 当前目录不在 GOPATH 下不需要 `go mod init` 这一步
    go mod tidy
    ```

### 运行示例代码

完成以上操作后，我们可以直接编译并启动 Server。

```bash
go build -o hertz_demo && ./hertz_demo
```

如果成功启动，你将看到以下信息：

```bash
2022/05/17 21:47:09.626332 engine.go:567: [Debug] HERTZ: Method=GET    absolutePath=/ping   --> handlerName=main.main.func1 (num=2 handlers)
2022/05/17 21:47:09.629874 transport.go:84: [Info] HERTZ: HTTP server listening on address=[::]:8888
```

接下来，我们可以对接口进行测试：

```bash
curl http://127.0.0.1:8888/ping
```

如果不出意外，我们可以看到类似如下输出：

```bash
{"message":"pong"}
```

到现在，我们已经成功启动了 Hertz Server，并完成了一次调用。

## 更多示例

参考：[代码示例](/zh/docs/hertz/tutorials/example/)
