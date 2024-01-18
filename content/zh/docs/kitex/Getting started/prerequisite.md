---
title: "环境准备"
linkTitle: "环境准备"
weight: 2
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "环境准备"]
description: "Kitex 开发环境准备"
---

Kitex 作为一款 Golang 微服务 RPC 框架，需要准备的环境包括**语言环境**与**代码生成工具**。

## Golang

**Go**（又称**Golang**）是 Google 开发的一种静态强类型、编译型、并发型，并具有垃圾回收功能的编程语言。

- Go 语言的环境准备参考 [Golang 安装](https://go.dev/doc/install)
- 推荐使用最新版本的 Golang，我们保证最新三个正式版本的兼容性(现在 >= **v1.16**)。
- 确保打开 go mod 支持 (Golang >= 1.15时，默认开启)
- 在 Windows 环境使用，需要 kitex 版本 >= v0.5.2

完成安装后打开终端并输入 `go version` ，正确输出 Go 版本以及系统架构信息代表安装成功。例如

```shell
$ go version

// output
go version go1.19.12 darwin/arm64
```

## 代码生成工具

**kitex** 是 Kitex 框架提供的用于生成代码的一个命令行工具。目前，kitex 支持 thrift 和 protobuf 的 IDL，并支持生成一个服务端项目的骨架。

Kitex 所需的代码生成工具包括 kitex 与 IDL 编译器，详情参见[代码生成](https://www.cloudwego.io/zh/docs/kitex/tutorials/code-gen/)

为完成快速开始章节，需安装 kitex 与 thriftgo。

- 确保 `GOPATH` 环境变量已经被正确地定义（例如 `export GOPATH=~/go`）并且将`$GOPATH/bin`添加到 `PATH` 环境变量之中（例如 `export PATH=$GOPATH/bin:$PATH`）；请勿将 `GOPATH` 设置为当前用户没有读写权限的目录

- kitex 安装：`go install github.com/cloudwego/kitex/tool/cmd/kitex@latest`
- thriftgo 安装：`go install github.com/cloudwego/thriftgo@latest`

安装成功后，执行 `kitex --version` 和 `thriftgo --version` 应该能够看到具体版本号的输出（版本号有差异，以 x.x.x 示例）：

```shell
$ kitex --version
vx.x.x

$ thriftgo --version
thriftgo x.x.x
```