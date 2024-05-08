---
title: "Environment Preparation"
linkTitle: "Environment Preparation"
weight: 2
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "Environment Preparation"]
description: "Environment preparation for Kitex development"
---

Kitex, as a Golang microservice RPC framework, requires the following environment preparation: a **language environment** and **code generation tools**.

> **Note: Be sure to complete this section**

## Golang

**Go** (also known as **Golang**) is a statically typed, compiled, concurrent programming language developed by Google.

- Refer to [Golang Installation](https://go.dev/doc/install) for the environment setup of the Go language.
- It is recommended to use the latest version of Golang. We ensure compatibility with the latest three official versions (currently >= **v1.17**).
- Make sure to enable go mod support (enabled by default in Golang >= 1.15).
- For Windows environment, kitex version >= v0.5.2 is required.

After completing the installation, open your terminal and enter `go version`. If the output displays the Go version and system architecture information correctly, it means the installation was successful. For example:

```bash
$ go version

// output
go version go1.19.12 darwin/arm64
```

## Code Generation Tools

Before installing the code generation tools, ensure that the `GOPATH` environment variable is correctly defined (e.g., `export GOPATH=~/go`) and that `$GOPATH/bin` is added to the `PATH` environment variable (e.g., `export PATH=$GOPATH/bin:$PATH`). Do not set `GOPATH` to a directory where the current user does not have read/write permissions.

The code generation tools used in Kitex include the IDL compiler and the kitex tool. To learn more about code generation tools, refer to [Code Generation](/docs/kitex/tutorials/code-gen/).

### IDL Compiler

The IDL compiler can parse IDL and generate corresponding serialization and deserialization code. Kitex supports two types of IDL, Thrift and protobuf, which rely on thriftgo and protoc, respectively, for parsing.

In the Quick Start section, we use Thrift IDL, so we need to install thriftgo by executing the following command:

```bash
go install github.com/cloudwego/thriftgo@latest
```

For protobuf compiler installation, please refer to [protoc](https://github.com/protocolbuffers/protobuf/releases).

After successful installation, execute `thriftgo --version` to see the specific version output (the version numbers may vary, shown as x.x.x):

```bash
$ thriftgo --version
thriftgo x.x.x
```

### kitex tool

**kitex** is a command-line tool provided by the Kitex framework for code generation. Currently, kitex supports both Thrift and protobuf IDLs and can generate a skeleton for a server project. The use of kitex requires the installation of the IDL compiler to ensure that you have completed the installation of the IDL compiler.

Execute the following command:

```bash
go install github.com/cloudwego/kitex/tool/cmd/kitex@latest
```

After successful installation, execute `kitex --version` to see the specific version output (the version numbers may vary, shown as x.x.x):

```bash
$ kitex --version
vx.x.x
```
