---
title: "hz 安装"
date: 2023-02-21
weight: 1
keywords: ["hz 安装"]
description: "hz 安装。"
---

hz 是 Hertz 框架提供的一个用于生成代码的命令行工具。目前，hz 可以基于 thrift 和 protobuf 的 IDL 生成 Hertz 项目的脚手架。

## 安装

1. 确保 `GOPATH` 环境变量已经被正确的定义（例如 `export GOPATH=~/go`）并且将 `$GOPATH/bin` 添加到 `PATH` 环境变量之中（例如 `export PATH=$GOPATH/bin:$PATH`）；请勿将 `GOPATH` 设置为当前用户没有读写权限的目录
2. 安装 hz：

   ```bash
   go install github.com/cloudwego/hertz/cmd/hz@latest
   ```

3. 验证是否安装成功 `hz -v`, 如果显示如下版本的信息，则说明安装成功

   ```console
   hz version v0.x.x
   ```

**注意**，由于 hz 会为自身的二进制文件创建软链接，因此请确保 hz 的安装路径具有可写权限。

## 运行模式

要使用 thrift 或 protobuf 的 IDL 生成代码，需要安装相应的编译器：[thriftgo](https://github.com/cloudwego/thriftgo) 或 [protoc](https://github.com/protocolbuffers/protobuf/releases) 。

hz 生成的代码里，一部分是底层的编译器生成的（通常是关于 IDL 里定义的结构体），另一部分是 IDL 中用户定义的路由、method 等信息。用户可直接运行该代码。

从执行流上来说，当 hz 使用 thrift IDL 生成代码时，hz 会调用 thriftgo 来生成 go 结构体代码，并将自身作为 thriftgo 的一个插件（名为 thrift-gen-hertz）来执行并生成其他代码。当用于 protobuf IDL 时亦是如此。

```console
$> hz  ... --idl=IDL
    |
    | thrift-IDL
    |---------> thriftgo --gen go:... -plugin=hertz:... IDL
    |
    | protobuf-IDL
     ---------> protoc --hertz_out=... --hertz_opt=... IDL
```

如何安装 thriftgo/protoc:

thriftgo:

```console
GO111MODULE=on go install github.com/cloudwego/thriftgo@latest
```

protoc:

```console
// brew 安装
$ brew install protobuf

// 官方镜像安装，以 macos 为例
$ wget https://github.com/protocolbuffers/protobuf/releases/download/v3.19.4/protoc-3.19.4-osx-x86_64.zip
$ unzip protoc-3.19.4-osx-x86_64.zip
$ cp bin/protoc /usr/local/bin/protoc
// 确保 include/google 放入 /usr/local/include下
$ cp -r include/google /usr/local/include/google
```
