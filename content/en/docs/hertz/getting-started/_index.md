---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
description: >
---

## Set Up Golang Development Environment
1. If you haven't set up your Golang Enviornmrnt, you can refer to [Golang Install](https://golang.org/doc/install).
2. We recommend you to use the Golang latest version, or make sure it's >= v1.15. You can choose to use the earlier versions, but the compatibility and stability are not assured.
3. Make sure the go mod support is on (for Golang versions >= v1.15, it is on by default).

> Note: Hertz does not support Windows environments currently.

## Quick Start
After you have prepared the Golang environment, the chapter will help you to quickly get familiar with Hertz.

### Determine Where to Store Your Code
1. If your codes are placed under `$GOPATH/src`, you need to create additional dictionary under `$GOPATH/src` and retrieve your code under the dictionary.
```console
  $ mkdir -p $(go env GOPATH)/src/github.com/cloudwego
  $ cd $(go env GOPATH)/src/github.com/cloudwego
```
2. If your codes are not placed under GOPATH, you can retrieve them directly.

### Complete the Sample Code
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
            ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
    })

    h.Spin()
}
```

4. Generate the `go.mod` file
```console
  $ go mod init hertz_demo
```
5. Generate the `go.sum` file
```console
  $ go mod tidy
```

### Run the Sample Code
After you have completed the previous steps, you are able to launch the server
```console
$ go run main.go
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
$ {"ping":"pong"}
```
Now, you have already launched Hertz Server successfully and completed an API call. More API examples can be found at [API Examples](https://pkg.go.dev/github.com/cloudwego/hertz).

As for the project dictionary layout, here is a project layout sample that you can refer to. You can also organize the layout based on your business scenario.

## Directory Structure
As for the project directory structure, you may check [Project Layout](https://github.com/golang-standards/project-layout) for reference,
it can be organized according to the actual situation of the business logic.

## More examples
Please refer：[hertz-examples](https://github.com/cloudwego/hertz-examples)
