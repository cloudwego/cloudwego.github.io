---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
description: >
---

cwgo is a CloudWeGo All in one code generation tool that integrates the advantages of each component to improve the developer experience.

## Prepare Golang development environment

1. If you have not set up a Golang development environment before, you can refer to [Golang Installation](https://golang.org/doc/install)
1. It is recommended to use the latest version of Golang, we guarantee the compatibility of the latest two official versions (now >= **v1.18**).
1. Make sure to enable go mod support (when Golang >= 1.15, it is enabled by default)
1. cwgo does not support Windows for the time being. If the local development environment is Windows, it is recommended to use [WSL2](https://docs.microsoft.com/zh-cn/windows/wsl/install)

After completing the environment preparation, the next step will help you get started with cwgo quickly.

## Install

```shell
go install github.com/cloudwego/cwgo@latest
```

It's easiest to install with the go command, or you can choose to build and install from source yourself. To see where cwgo is installed, use:

```shell
go list -f {{.Target}} github.com/cloudwego/cwgo
```

To use thrift or protobuf's IDL to generate code, you need to install the corresponding compiler: [thriftgo](https://github.com/cloudwego/thriftgo) or [protoc](https://github.com/protocolbuffers/protobuf/releases).

thriftgo install:

```shell
GO111MODULE=on go install github.com/cloudwego/thriftgo@latest
```

protoc install

```shell
# brew install
brew install protobuf
```

```shell
# Official image installation, take macos as an example
wget https://github.com/protocolbuffers/protobuf/releases/download/v3.19.4/protoc-3.19.4-osx-x86_64.zip
unzip protoc-3.19.4-osx-x86_64.zip
cp bin/protoc /usr/local/bin/protoc
# Make sure include/google is placed under /usr/local/include
cp -r include/google /usr/local/include/google
```

First, we need to install the command-line code generation tools needed to use this example:

1. Make sure the `GOPATH` environment variable has been defined correctly (e.g. `export GOPATH=~/go`) and add `$GOPATH/bin` to the `PATH` environment variable (e.g. `export PATH=$GOPATH/ bin:$PATH`); do not set `GOPATH` to a directory that the current user does not have read and write permissions
1. Install cwgo: `go install github.com/cloudwego/cwgo@latest`
1. Install thriftgo: `go install github.com/cloudwego/thriftgo@latest`

After the installation is successful, execute `cwgo --version` and `thriftgo --version` and you should be able to see the output of the specific version number (the version number is different, take x.x.x as an example):

```bash
cwgo --version
vx.x.x

thriftgo --version
vx.x.x

protoc --version
libprotoc x.x.x
```

### Determine where to place the code

1. If the code is placed under `$GOPATH/src`, you need to create an additional directory under `$GOPATH/src`, and then get the code after entering this directory:

   ```shell
   mkdir -p $(go env GOPATH)/src/github.com/cloudwego
   cd $(go env GOPATH)/src/github.com/cloudwego
   ```

2. If you put the code outside `GOPATH`, you can get it directly

## Precautions

The bottom layer of cwgo uses [kitex](/docs/kitex/tutorials/code-gen/code_generation/), [hz](/docs/hertz/tutorials/toolkit/), [gen](https://gorm.io/gen/index.html) tools, so the corresponding tool specifications also need to be followed, such as [kitex precautions](/docs/kitex/tutorials/code-gen/code_generation/#notes-for-using-protobuf-idls) and [Notes for hz](/docs/hertz/tutorials/toolkit/cautions/).

## Using

For specific usage of cwgo, please refer to [Command Line Tool](/docs/cwgo/tutorials/cli)

Let's take thrift as an example

1. First create a directory

   ```shell
   mkdir -p $GOPATH/src/local/cwgo_test
   cd $GOPATH/src/local/cwgo_test
   ```

2. Create an idl directory

   ```shell
   mkdir idl
   ```

3. Write the idl/hello.thrift file

   ```thrift
   # idl/hello.thrift
   namespace go hello.example

   struct HelloReq {
       1: string Name (api.query="name"); // Add api annotations to facilitate parameter binding
   }

   struct HelloResp {
       1: string RespBody;
   }

   service HelloService {
       HelloResp HelloMethod(1: HelloReq request) (api. get="/hello");
   }
   ```

4. Generate project layout

   static command line

   ```shell
   cwgo server -service=a.b.c -type HTTP -idl=idl/hello.thrift
   ```

   dynamic command line

   ![Dynamic command line](/img/docs/cwgo_dynamic.gif)

5. Compile and run

   ```shell
   go mod tidy && go mod verify
   sh build.sh && sh output/bootstrap.sh
   ```

6. Initiate the call

   ```shell
   curl http://127.0.0.1:8080/ping
   pong
   ```

Congratulations! So far you have successfully written a Cwgo server and completed a call!
