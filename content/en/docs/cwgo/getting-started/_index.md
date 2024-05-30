---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
description: >
---

cwgo is a CloudWeGo All in one code generation tool that integrates the advantages of each component to improve the developer experience.

## Prepare Golang development environment

1. If you have not set up a Golang development environment before, you can refer to [Golang Installation](https://go.dev/doc/install).
2. It is recommended to use the latest version of Golang(support version >= **v1.18**).
3. Make sure to enable go mod support (when Golang >= 1.15, it is enabled by default).

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

After the installation is successful, execute `cwgo --version`, `thriftgo --version`, `protoc --version` and you should be able to see the output of the specific version number (the version number is different, take x.x.x as an example):

```bash
cwgo --version
vx.x.x

thriftgo --version
vx.x.x

protoc --version
libprotoc x.x.x
```

## Precautions

The bottom layer of cwgo uses [kitex](/docs/kitex/tutorials/code-gen/code_generation/), [hz](/docs/hertz/tutorials/toolkit/), [gen](https://gorm.io/gen/index.html) tools, so the corresponding tool specifications also need to be followed, such as [kitex precautions](/docs/kitex/tutorials/code-gen/code_generation/#notes-for-using-protobuf-idls) and [Notes for hz](/docs/hertz/tutorials/toolkit/cautions/).

## Using

For specific usage of cwgo, please refer to [Command Line Tool](/docs/cwgo/tutorials/cli).

Let's take thrift as an example:

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
       HelloResp HelloMethod(1: HelloReq request) (api.get="/hello");
   }
   ```

4. Generate project layout

   ```shell
   cwgo server --server_name a.b.c --type HTTP  --idl idl/hello.thrift -module {{your_module_name}}
   ```

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

Congratulations! So far you have successfully written a cwgo HTTP server and completed a call!
