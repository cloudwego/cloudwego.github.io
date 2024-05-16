---
title: "环境准备"
linkTitle: "环境准备"
weight: 2
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "环境准备"]
description: "Kitex 开发环境准备"
---

Kitex 作为一款 Golang 微服务 RPC 框架，需要准备的环境包括**语言环境**与**代码生成工具**。

> **注意：务必完成此小节内容**

## Golang

**Go**（又称**Golang**）是 Google 开发的一种静态强类型、编译型、并发型，并具有垃圾回收功能的编程语言。

- Go 语言的环境准备参考 [Golang 安装](https://go.dev/doc/install)
- 推荐使用最新版本的 Golang，我们保证最新三个正式版本的兼容性(现在 >= **v1.17**)。
- 确保打开 go mod 支持 (Golang >= 1.15时，默认开启)
- 在 Windows 环境使用，需要 kitex 版本 >= v0.5.2

完成安装后打开终端并输入 `go version` ，正确输出 Go 版本以及系统架构信息代表安装成功。例如

```bash
$ go version

// output
go version go1.19.12 darwin/arm64
```

安装成功后，你可能需要设置一下国内代理：

```bash
go env -w GOPROXY=https://goproxy.cn
```

## 代码生成工具

在安装代码生成工具前，确保 `GOPATH` 环境变量已经被正确地定义（例如 `export GOPATH=~/go`）并且将`$GOPATH/bin`添加到 `PATH` 环境变量之中（例如 `export PATH=$GOPATH/bin:$PATH`）；请勿将 `GOPATH` 设置为当前用户没有读写权限的目录。

Kitex 中使用到的代码生成工具包括 IDL 编译器与 kitex tool。了解更多有关代码生成工具的内容，参见[代码生成](/zh/docs/kitex/tutorials/code-gen/)

### IDL 编译器

IDL 编译器能够解析 IDL 并生成对应的序列化和反序列化代码，Kitex 支持 Thrift 和 protobuf 这两种 IDL，这两种 IDL 的解析分别依赖于 thriftgo 与 protoc。

在快速开始章节中，我们使用到 Thrift IDL，故需要安装 thriftgo，执行以下命令即可：

```bash
go install github.com/cloudwego/thriftgo@latest
```

protobuf 编译器安装可见 [protoc](https://github.com/protocolbuffers/protobuf/releases)。

安装成功后，执行 `thriftgo --version` 可以看到具体版本号的输出（版本号有差异，以 x.x.x 示例）：

```bash
$ thriftgo --version
thriftgo x.x.x
```

### kitex tool

**kitex** 是 Kitex 框架提供的用于生成代码的一个命令行工具。目前，kitex 支持 thrift 和 protobuf 的 IDL，并支持生成一个服务端项目的骨架。kitex 的使用需要依赖于 IDL 编译器确保你已经完成 IDL 编译器的安装。

执行以下命令：

```bash
go install github.com/cloudwego/kitex/tool/cmd/kitex@latest
```

安装成功后，执行 `kitex --version` 可以看到具体版本号的输出（版本号有差异，以 x.x.x 示例）：

```bash
$ kitex --version
vx.x.x
```
