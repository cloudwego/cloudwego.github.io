---
title: "快速开始"
linkTitle: "快速开始"
weight: 2
keywords: ["Hertz", "开发环境", "快速上手", "代码生成工具"]
description: "Hertz 开发环境准备、快速上手与代码生成工具 hz 基本使用。"
---

## 准备 Golang 开发环境

1. 如果您之前未搭建 Golang 开发环境，可以参考 [Golang 安装](https://go.dev/doc/install)。
2. 推荐使用最新版本的 Golang，或保证现有 Golang 版本 >= 1.16。小于 1.16 版本，可以自行尝试使用但不保障兼容性和稳定性。
3. 确保打开 go mod 支持 (Golang >= 1.15 时，默认开启)。
4. 完成安装后，你可能需要设置一下国内代理：`go env -w GOPROXY=https://goproxy.cn`。

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

更多 hz 使用方法可参考: [hz](/zh/docs/hertz/tutorials/toolkit/)。

### 确定代码放置位置

1. 若将代码放置于 `$GOPATH/src` 下，需在 `$GOPATH/src` 下创建额外目录，进入该目录后再获取代码：

   ```bash
   mkdir -p $(go env GOPATH)/src/github.com/cloudwego
   cd $(go env GOPATH)/src/github.com/cloudwego
   ```

2. 若将代码放置于 `GOPATH` 之外，可直接获取。

### 生成/编写示例代码

1. 在当前目录下创建 hertz_demo 文件夹，进入该目录中。

2. 生成代码

- 直接使用 `hz new`，若当前不在 `GOPATH`，需要添加 `-module` 或者 `-mod` flag 指定一个自定义的模块名称。详细参考[这里](/zh/docs/hertz/tutorials/toolkit/usage/)。
- 通过指定已经定义好的 idl 文件进行代码生成，例如 `hz new -idl hello.thrift`。

  ```thrift
  namespace go hello.world

  service HelloService {
      string Hello(1: string name);
  }
  ```

  执行完毕后, 会在当前目录下生成 Hertz 项目的脚手架, 自带一个 `ping` 接口用于测试。

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

### 更新项目代码

如果需要对项目进行进一步的更新, 应使用 `hz update` 命令, 这里以添加一个 `Bye` 方法为例。

```thrift
namespace go hello.world

service HelloService {
    string Hello(1: string name);
    string Bye(1: string name);
}
```

此时在项目根目录执行 `hz update` 更新项目。

```bash
hz update -idl hello.thrift
```

## 更多示例

参考：[代码示例](/zh/docs/hertz/tutorials/example/)
