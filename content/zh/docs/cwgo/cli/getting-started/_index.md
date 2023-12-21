---
title: "快速开始"
linkTitle: "快速开始"
weight: 2
description: >
---

cwgo 是 CloudWeGo All in one 代码生成工具，整合了各个组件的优势，提高开发者提体验。

## 准备 Golang 开发环境

1. 如果您之前未搭建 Golang 开发环境， 可以参考 [Golang 安装](https://golang.org/doc/install)
1. 推荐使用最新版本的 Golang，我们保证最新两个正式版本的兼容性(现在 >= **v1.18**)。
1. 确保打开 go mod 支持 (Golang >= 1.15 时，默认开启)
1. cwgo 暂时没有针对 Windows 做支持，如果本地开发环境是 Windows 建议使用 [WSL2](https://docs.microsoft.com/zh-cn/windows/wsl/install)

在完成环境准备后，接下来将帮助你快速上手 cwgo。

## 安装 cwgo 工具

```shell
go install github.com/cloudwego/cwgo@latest
```

用 go 命令来安装是最简单的，你也可以选择自己从源码构建和安装。要查看 cwgo 的安装位置，可以用：

```shell
go list -f {{.Target}} github.com/cloudwego/cwgo
```

要使用 thrift 或 protobuf 的 IDL 生成代码，需要安装相应的编译器：[thriftgo](https://github.com/cloudwego/thriftgo) 或 [protoc](https://github.com/protocolbuffers/protobuf/releases)。

thriftgo 安装：

```shell
GO111MODULE=on go install github.com/cloudwego/thriftgo@latest
```

protoc 安装

```shell
# brew 安装
brew install protobuf
```

```shell
# 官方镜像安装，以 macos 为例
wget https://github.com/protocolbuffers/protobuf/releases/download/v3.19.4/protoc-3.19.4-osx-x86_64.zip
unzip protoc-3.19.4-osx-x86_64.zip
cp bin/protoc /usr/local/bin/protoc
# 确保 include/google 放入 /usr/local/include下
cp -r include/google /usr/local/include/google
```

首先，我们需要安装使用本示例所需要的命令行代码生成工具：

1. 确保 `GOPATH` 环境变量已经被正确地定义（例如 `export GOPATH=~/go`）并且将`$GOPATH/bin`添加到 `PATH` 环境变量之中（例如 `export PATH=$GOPATH/bin:$PATH`）；请勿将 `GOPATH` 设置为当前用户没有读写权限的目录
2. 安装 cwgo：`go install github.com/cloudwego/cwgo@latest`
3. 安装 thriftgo：`go install github.com/cloudwego/thriftgo@latest`

安装成功后，执行 `cwgo --version` 和 `thriftgo --version` 应该能够看到具体版本号的输出（版本号有差异，以 x.x.x 示例）：

```shell
cwgo --version
vx.x.x

thriftgo --version
vx.x.x

protoc --version
libprotoc x.x.x
```

### 确定代码放置位置

1. 若将代码放置于 `$GOPATH/src` 下，需在 `$GOPATH/src` 下创建额外目录，进入该目录后再获取代码：

   ```shell
   mkdir -p $(go env GOPATH)/src/github.com/cloudwego
   cd $(go env GOPATH)/src/github.com/cloudwego
   ```

2. 若将代码放置于 GOPATH 之外，可直接获取

## 注意事项

cwgo 底层使用 [kitex](/zh/docs/kitex/tutorials/code-gen/code_generation/)、[hz](/zh/docs/hertz/tutorials/toolkit/)、[gen](https://gorm.io/gen/index.html) 工具，所以其相应的工具规范也需要遵守，如 [kitex 的注意事项](/zh/docs/kitex/tutorials/code-gen/code_generation/#%E4%BD%BF%E7%94%A8-protobuf-idl-%E7%9A%84%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)和 [hz 的注意事项](/zh/docs/hertz/tutorials/toolkit/cautions/)。

## 使用

cwgo 的具体使用请参考[命令行工具](/zh/docs/cwgo/tutorials/cli)

下面以 thrift 为例

1. 首先创建一个目录

   ```shell
   mkdir -p $GOPATH/src/local/cwgo_test
   cd $GOPATH/src/local/cwgo_test
   ```

2. 创建一个 idl 目录

   ```shell
   mkdir idl
   ```

3. 编写 idl/hello.thrift 文件

   ```thrift
   # idl/hello.thrift
   namespace go hello.example

   struct HelloReq {
       1: string Name (api.query="name"); // 添加 api 注解为方便进行参数绑定
   }

   struct HelloResp {
       1: string RespBody;
   }

   service HelloService {
       HelloResp HelloMethod(1: HelloReq request) (api.get="/hello");
   }
   ```

4. 生成项目 layout

   静态命令行

   ```shell
   cwgo server -service=a.b.c -type HTTP  -idl=idl/hello.thrift
   ```

   动态命令行

   ![动态命令行](/img/docs/cwgo_dynamic.gif)

5. 编译运行

   ```shell
   go mod tidy && go mod verify
   sh build.sh && sh output/bootstrap.sh
   ```

6. 发起调用

   ```shell
   curl http://127.0.0.1:8080/ping
   pong
   ```

恭喜你！至此你成功编写了一个 Cwgo 的服务端，并完成了一次调用！
