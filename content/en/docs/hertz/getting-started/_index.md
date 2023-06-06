---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
description: >
---

## Set Up Golang Development Environment
1. If you haven't set up your Golang environment yet, you can refer to [Golang Install](https://golang.org/doc/install).
2. We recommend that you use the latest version of Golang, or make sure it's >= v1.15. You can choose to use the earlier versions, but the compatibility and stability are not guaranteed.
3. Make sure the go mod support is enabled (for Golang versions >= v1.15, it is enabled by default).

>Currently, Hertz supports Linux, macOS, and Windows systems.

## Quick Start
After you have prepared the Golang environment, this chapter will help you to get familiar with Hertz in a very short time.

### Install the commend tool of hz
First, you need to install the commend tool hz which is used in this chapter
1. Confirm the `GOPATH` environment has been defined correctly (For example `export GOPATH=~/go`)
and the `$GOPATH/bin` has been added to `PATH` environment (For example `export PATH=$GOPATH/bin:$PATH`);
Attention, do not set `GOPATH` to a directory that the current user does not have read/write access to.
2. Install hz: `go install github.com/cloudwego/hertz/cmd/hz@latest`

For more information on how to use hz, please refer to: [hz](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/usage/)

### Determine Where to Store Your Code
1. If your codes are located in `$GOPATH/src`, you will need to create an additional dictionary in `$GOPATH/src` and retrieve your code from that dictionary.
```console
  $ mkdir -p $(go env GOPATH)/src/github.com/cloudwego
  $ cd $(go env GOPATH)/src/github.com/cloudwego
```
2. If your codes are not placed under `GOPATH`, you can retrieve them directly.

### Generate/Complete the Sample Code
1. Create the hertz_demo folder in the current directory and go to that directory
2. Generate code `hz new`. If your codes are not placed under `GOPATH`, you need to refer [here](https://www.cloudwego.io/docs/hertz/tutorials/toolkit/usage/usage/) and add `-module` (or `-mod`) flag to name your custom module.
3. Tidy & get dependencies
```console
$ go mod init // If your codes are not placed under `GOPATH`, you can skip `go mod init`.
$ go mod tidy
```
If you are currently using a Windows system, you can write the following sample code.

1. Create the hertz_demo folder in the current directory and go to that directory
2. Create the `main.go` file
3. Add the following code to the `main.go` file
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

4. Generate the `go.mod` file
```console
  $ go mod init hertz_demo
```
5. Tidy & get dependencies
```console
  $ go mod tidy
```

### Run the Sample Code
After you have completed the previous steps, you are able to compile & launch the server
```console
$ go build -o hertz_demo && ./hertz_demo
```
If the server is launched successfully, you will see following message
```console
2022/05/17 21:47:09.626332 engine.go:567: [Debug] HERTZ: Method=GET    absolutePath=/ping   --> handlerName=main.main.func1 (num=2 handlers)
2022/05/17 21:47:09.629874 transport.go:84: [Info] HERTZ: HTTP server listening on address=[::]:8888
```
Then, we can test the interface
```console
$ curl http://127.0.0.1:8888/ping
```
If nothing goes wrong, we can see the following output
```console
$ {"message":"pong"}
```
You have now successfully launched Hertz Server successfully and completed an API call. More API examples can be found at [API Examples](https://pkg.go.dev/github.com/cloudwego/hertz).

As for the layout of the Project Dictionary, here is a sample project layout that you can refer to. You can also organise the layout according to your business scenario.

## Directory Structure
As for the project directory structure, you may check [Project Layout](https://github.com/golang-standards/project-layout) for reference,
it can be organized according to the actual situation of the business logic.

## More examples
Please refer：[hertz-examples](https://github.com/cloudwego/hertz-examples)
