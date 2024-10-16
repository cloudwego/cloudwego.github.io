---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
keywords:
  ["Hertz", "Development Environment", "Quick Start", "Code Generation Tool"]
description: "Preparation of Hertz development environment, quick start, and basic use of code generation tool hz."
---

## Set Up Golang Development Environment

1. If you haven't set up your Golang environment yet, you can refer to [Golang Install](https://go.dev/doc/install).
2. We recommend that you use the latest version of Golang, or make sure it's >= v1.16. You can choose to use the earlier versions, but the compatibility and stability are not guaranteed.
3. Make sure the go mod support is enabled (for Golang versions >= v1.15, it is enabled by default).

> Currently, Hertz supports Linux, macOS, and Windows systems.

## Quick Start

After completing the environment preparation, you can quickly start the Hertz Server as follows:

1. Create the hertz_demo folder in the current directory and go to that directory.
2. Create the `main.go` file.
3. Add the following code to the `main.go` file.

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

       h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
               c.JSON(consts.StatusOK, utils.H{"message": "pong"})
       })

       h.Spin()
   }
   ```

4. Generate the `go.mod` file.

   ```bash
   go mod init hertz_demo
   ```

5. Tidy & get dependencies.

   ```bash
   go mod tidy
   ```

6. Run the Sample Code

   ```bash
   go run hertz_demo
   ```

   If the server is launched successfully, you will see following message:

   ```bash
   2022/05/17 21:47:09.626332 engine.go:567: [Debug] HERTZ: Method=GET    absolutePath=/ping   --> handlerName=main.main.func1 (num=2 handlers)
   2022/05/17 21:47:09.629874 transport.go:84: [Info] HERTZ: HTTP server listening on address=[::]:8888
   ```

   Then, we can test the interface:

   ```bash
   curl http://127.0.0.1:8888/ping
   ```

   If nothing goes wrong, we can see the following output:

   ```bash
   {"message":"pong"}
   ```

## Code Generation Tool hz

Hz is a command-line tool provided by the Hertz framework for generating code, which can be used to generate scaffolding for Hertz projects.

### Install the command tool of hz

First, you need to install the command tool hz which is used in this chapter:

1. Confirm the `GOPATH` environment has been defined correctly (For example `export GOPATH=~/go`)
   and the `$GOPATH/bin` has been added to `PATH` environment (For example `export PATH=$GOPATH/bin:$PATH`);
   Attention, do not set `GOPATH` to a directory that the current user does not have read/write access to.
2. Install hz: `go install github.com/cloudwego/hertz/cmd/hz@latest`.

For more information on how to use hz, please refer to: [hz](/zh/docs/hertz/tutorials/toolkit/usage/).

### Determine Where to Store Your Code

1. If your codes are located in `$GOPATH/src`, you will need to create an additional dictionary in `$GOPATH/src` and retrieve your code from that dictionary.

   ```bash
   mkdir -p $(go env GOPATH)/src/github.com/cloudwego
   cd $(go env GOPATH)/src/github.com/cloudwego
   ```

2. If your codes are not placed under `GOPATH`, you can retrieve them directly.

### Generate/Complete the Sample Code

1. Create the hertz_demo folder in the current directory and go to that directory.
2. Generating code

- Use `hz new` directly, if not currently in `GOPATH`, you need to add `-module` or `-mod` flag to specify a custom module name. See [here](/docs/hertz/tutorials/toolkit/usage/) for details.

  - Code generation by specifying an already defined idl file, e.g. `hz new -idl hello.thrift`.

    ```thrift
    namespace go hello.world

    service HelloService {
        string Hello(1: string name) (api.get="/hello");
    }
    ```

    After execution, a scaffolding of the Hertz project is created in the current directory, with a `ping` interface for testing.

3. Tidy & get dependencies.

   ```bash
   go mod init # If your codes are not placed under `GOPATH`, you can skip `go mod init`.
   go mod tidy
   ```

### Run the Sample Code

After you have completed the previous steps, you are able to compile & launch the server.

```bash
go build -o hertz_demo && ./hertz_demo
```

If the server is launched successfully, you will see following message:

```bash
2022/05/17 21:47:09.626332 engine.go:567: [Debug] HERTZ: Method=GET    absolutePath=/ping   --> handlerName=main.main.func1 (num=2 handlers)
2022/05/17 21:47:09.629874 transport.go:84: [Info] HERTZ: HTTP server listening on address=[::]:8888
```

Then, we can test the interface:

```bash
curl http://127.0.0.1:8888/ping
```

If nothing goes wrong, we can see the following output:

```bash
{"message":"pong"}
```

You have now successfully launched Hertz Server successfully and completed an API call.

### Updating project code

If you need to make further updates to the project, you should use the `hz update` command, here is an example of adding a `Bye` method.

```thrift
namespace go hello.world

service HelloService {
    string Hello(1: string name) (api.get="/hello");
    string Bye(1: string name) (api.get="/bye");
}
```

At this point, run `hz update` from the project root directory to update the project.

```bash
hz update -idl hello.thrift
```

## More examples

Please refer：[Example code](/docs/hertz/tutorials/example/)
