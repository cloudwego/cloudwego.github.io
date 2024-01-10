---
date: 2024-1-10
title: "Mastering Golang Microservices - A Practical Guide: Embrace High-Performance with Kitex and Hertz"
projects: ["CloudWeGo"]
linkTitle: "Mastering Golang Microservices - A Practical Guide: Embrace High-Performance with Kitex and Hertz"
keywords: ["CloudWeGo", "middleware", "Kitex", "microservice framework", "ByteDance Open Source", "ByteDance","open source", "cloud native", "open source", "kubernetes", "gRPC", "microservices", "rpc" "GO", "Golang", "thrift"]
description: "Learn how to set up, manage, and optimize Golang microservices efficiently with this guide. It offers practical insights into the usage of Kitex and Hertz, two beginner-friendly, high-performance componenets of the CloudWeGo project."
author:  <a href="https://github.com/yy2so" target="_blank">Yacine Si Tayeb</a>, <a href="https://github.com/GuangmingLuo" target="_blank">Guangming Luo</a>
---

![Image](/img/blog/Mastering_Golang_Microservices_A_Practical_Guide_Embrace_High_Performance_with_Kitex_and_Hertz/1.png)

#I. Introduction

The world of software development is fast-paced, and having reliable and efficient tools makes a significant difference.
This is where [CloudWeGo](https://github.com/cloudwego) with two of its major sub-projects - [Kitex](https://github.com/cloudwego/kitex) and [Hertz](https://github.com/cloudwego/hertz), comes into play. A solution with the potential to transform the way developers navigate the cloud environment, thanks to its robust, open-source technology.

Two of its standout components, Kitex and Hertz, are at the center of our focus in this guide. Kitex is an efficient and powerful RPC framework used for communication between microservices, while Hertz aids in the quick and efficient setup of web services and BFF services. Both are designed to simplify and enhance your development efforts.

Our mission in this guide is simple: to facilitate your understanding of CloudWeGo, its powerful features, and how to harness them in your projects with a clear step-by-step handbook.
Whether you are a seasoned developer familiar with open-source technology or a newcomer exploring cloud development, this guide is designed to cater to your needs.

Once done reading, you will be comfortable setting up CloudWeGo, initiating and developing a project, implementing testing, debugging, deploying your applications, and more.
We'll also share some of the best practices when using CloudWeGo to ensure that you are maximizing the potential of the CloudWeGo open-source ecosystem. Let's dive in!

#II. Getting Started With CloudWeGo

As key components of CloudWeGo, Kitex & Hertz, are crucial to getting started. Ensuring you have a suitably configured environment with Golang is a pre-requisite. If you are working on a Windows platform, make sure the version of Kitex is v0.5.2 or higher. Hertz, on the other hand, is compatible across Linux, macOS, and Windows systems.

Installing the CLI tool requires confirmation that the `GOPATH` environment variable is correctly defined and accessible. This is followed by installing Kitex, Thriftgo, and Hertz. The correct setup can be verified by running their respective versions. If you encounter any problems, your troubleshooting should involve a check on the setup of the Golang development environment.

##Kitex & Hertz
###Prerequisites
Before diving into CloudWeGo development with Kitex & Hertz, make sure you have set up the Golang development environment. Please follow the Install Go guide if you haven't already. 

We highly recommend using the latest version of Golang, ensuring compatibility with three most recent minor release versions (currently >= v1.16). 

Additionally, make sure that `GO111MODULE` is set to `ON`. 

##Install the CLI tool

Let's start by installing the CLI tools we will be working with.
Ensure the `GOPATH` environment variable is properly defined (e.g., `export GOPATH=~/go`), then add `$GOPATH/bin` to the `PATH` environment variable (e.g., `export PATH=$GOPATH/bin:$PATH`). Make sure that `GOPATH` is accessible.

Next, install Kitex (`go install github.com/cloudwego/kitex/tool/cmd/kitex@latest`), Thriftgo (for Thrift protocol - `go install github.com/cloudwego/thriftgo@latest`), and Hertz (`go install github.com/cloudwego/hertz/cmd/hz@latest`).

Now, if you run `kitex --version`, `thriftgo --version`, and `hz --version`, you should see output indicating the versions of each CLI tool:

```
$ kitex --version
vx.x.x
$ thriftgo --version
thriftgo x.x.x
$ hz --version
vx.x.x
```
**Note:** If you encounter any issues during the installation, it's likely due to gaps in the setup of the Golang development environment. Usually, you can quickly find a solution by searching for the error message online.

#III. Creating A Sample Project
##Kitex
###Get the example

1. You can simply click [here](https://github.com/cloudwego/kitex-examples/archive/refs/heads/main.zip) to download the example.
2. Or you can clone the sample repository `git clone https://github.com/cloudwego/kitex-examples.git`.

###Run the example
####Run with go
1. Change to the `hello` directory. Hello is a simple example of Kitex using the Thrift protocol.
`cd kitex-examples/hello`
2. Run server
`go run .`
3. Run client
open another terminal and `go run ./client.`

####Run with Docker
1. Go to the examples directory
`cd kitex-examples`
2. Build the example project
`docker build -t kitex-examples`.
3. Run the server
`docker run --network host kitex-examples ./hello-server`
4. Run the client
Open another terminal and run `docker run --network host kitex-examples ./hello-client`

Congratulations! You now have successfully used Kitex to complete an RPC.

##Hertz
####Quick Start
To create a sample project with Hertz, start by creating the `hertz_demo` folder in the current directory and navigate to that directory. Then, create the `main.go` file and add the following code:
package main

```
import (
    "context"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
    h := server.Default()

    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
        ctx.JSON(consts.StatusOK, app.H{"message": "pong"})
    })

    h.Spin()
}
```

Next, generate the `go.mod` file (`go mod init hertz_demo`), then tidy & get dependencies (`go mod tidy`).

To run the sample code, simply type `go run hertz_demo`. If the server is launched successfully, you will see the following message:

```2022/05/17 21:47:09.626332 engine.go:567: [Debug] HERTZ: Method=GET    absolutePath=/ping   -- handlerName=main.main.func1 (num=2 handlers)2022/05/17 21:47:09.629874 transport.go:84: [Info] HERTZ: HTTP server listening on address=[::]:8888```


You can test the interface by typing `curl http://127.0.0.1:8888/ping`. If everything is working correctly, you should see the following output:

```{"message":"pong"}```


####Using CLI tool hz

You can also use the Hertz CLI tool to generate a sample project outside of the `GOPATH`. Procedures include creating an IDL file named `hello.thrift`, generating the sample code, obtaining the dependencies, and subsequently running the sample code.
Assuming you are working on a folder outside of `GOPATH`, create an IDL file called `hello.thrift`:

```
namespace go hello.world

service HelloService {
    string Hello(1: string name); 
}
```

Generate or complete the Sample Code using `hz new -idl hello.thrift -module hertz_demo`.

**Note:** since you're currently not in `GOPATH`, you'll need to add `-module` or `-mod` flag to specify a custom module name. After execution, a scaffolding of the Hertz project is created in the current directory, with a ping interface for testing.

Get dependencies (`go mod tidy`), then run the sample code (`go build -o hertz_demo && ./hertz_demo`).

If the server is launched successfully, you will see the same message as before, and you can test the interface using the same curl command. Congratulations, you've successfully launched the Hertz Server!

#IV. Testing and Debugging Your Project

Testing and debugging your project are essential components whether you are working with Kitex or Hertz.
While dealing with Kitex errors, the `IsKitexError` method in the kerrors package can be used.

The Kitex framework automatically recovers all panics except those occurring within the goroutine created by the business code using the `go` keyword.

##Kitex
###Exception Instruction

Check for Kitex errors using `kerrors.IsKitexError(kerrors.ErrInternalException)`. You can check for a specified error type using `errors.Is(err, kerrors.ErrNoResolver)`. Also, note that you can use `IsTimeoutError` in kerrors to check whether it's a timeout error.

To get detailed error messages, all detailed errors are defined by `DetailedError` in kerrors. You can use `errors.As` to fetch specified `DetailedError`.

For example:

```import "errors"
import "github.com/cloudwego/kitex/client"
import "github.com/cloudwego/kitex/pkg/kerrors"
_, err := echo.NewClient("echo", client.WithResolver(nil))
var de *kerrors.DetailedError
ok := errors.As(err, &de)
```

`DetailedError` provides the following methods to fetch a detailed message:

- `ErrorType() error`: to get the basic error type
- `Stack() string`: to get the stack (currently only works for `ErrPanic`)

##Handling panic

Panic that occurs in the goroutine created by the business code using the go keyword must be recovered by the business code. To ensure the stability of the service, the Kitex framework will automatically recover all other panics.

While checking for recovered panic in your middlewares, you can use `ri.Stats().Panicked()`:

```
// After calling next(...) in your middleware:
ri := rpcinfo.GetRPCInfo(ctx)
if stats := ri.Stats(); stats != nil {
    if panicked, err := stats.Panicked(); panicked {
      // err is the object kitex get by calling recover()
    }
}
```

###FAQ & Answers
**Q1: `Not enough arguments` problem when installing the code generation tool**

Please try:
`go mod：GO111MODULE=on go get github.com/cloudwego/kitex/tool/cmd/kitex@latest`

**Q2: Why does `set` in IDL become `slice` in generated codes?**

Due to JSON serialization, the official Apache Thrift changed the generation type of `set` from `map` to `slice` starting from v0.11.0. To ensure compatibility, Kitex follows this rule.

**Q3: Why is there an underscore after some field names?**

The official implementation of Thrift forbids identifiers ending in "Result" and "Args" to avoid naming conflicts. When the type name, service name, and method name in the Thrift file start with "New" or end with "Result" or "Args", an underscore is automatically added at the end of the name.

**Q4: Does the code generated by a new interface overwrite `handler.go`?**

Generated code under `kitex_gen/` will be overwritten. However, `handler.go` of the server will not be overwritten; new methods will be added correspondingly.

**Q5: "Not enough arguments in call to `iprot.ReadStructBegin` when compiling Thrift interface**

Kitex is based on Apache Thrift v0.13 and cannot be directly upgraded since there is a breaking change in Apache Thrift v0.14. Such issues usually arise if a new version of Thrift is pulled during upgrades.

We recommend against using `-u` parameters during upgrades. You can run the following command to fix the version: `go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0`

##Hertz
###Error Type & Error Chain

To handle errors more effectively, Hertz has predefined several error types:

- **ErrorTypeBind:** Error in binding process
- **ErrorTypeRender:** Error in rendering process
- **ErrorTypePrivate:** Hertz private errors that business doesn't need to be aware of
- **ErrorTypePublic:** Hertz public errors that require external perception as opposed to Private
- **ErrorTypeAny:** Other Error

Users should define corresponding errors according to these error types.
In addition to error definition conventions, Hertz also provides `ErrorChain` capability to make it easier for businesses to bind all errors encountered during request processing to an error chain.

The corresponding API for this is `RequestContext.Error(err)`. Calling this API will tie the err to its corresponding request context. To get all the errors bound by the request context, use `RequestContext.Errors`.

###FAQ & Answers

**Q1: High Memory Usage**

Connections not Closing due to Client Non-standard Usage: If the client initiates a large number of connections without closing them, there can be a significant waste of resources over time, causing high memory usage problems.
To resolve this, configure `idleTimeout` reasonably. Hertz Server will close the connection to ensure the server's stability after the timeout. The default configuration is three minutes.

**Q2: Vast Request/Response**

If the request and response are vast, the data will enter memory, causing significant pressure, especially when stream and chunk are not used. To resolve this, for very vast requests cases, use a combination of streaming and go net.

**Q3: Common Error Code Checking**

The following error codes are commonly reported by the framework:

- 404 (Access to the wrong port or No routes matched)
- 417 (The server returns false after executing the custom `ContinueHandler`)
- 500 (Throwing the panic in middleware or in `handlerFunc`)

For more details and solutions on these and other error codes, please refer to the [Kitex User Guide](https://www.cloudwego.io/docs/kitex/getting-started/).

##Context Guide

Hertz also provides a standard `context.Content` and a request context as input arguments in the function in the `HandleFunc` Design. The handler/middleware function signature is:

```
type HandlerFunc func(c context.Context, ctx *app.RequestContext)
```

###Metadata Storage

Both contexts (c and ctx) have the ability to store values. The choice of which one to use depends on the life cycle of the stored value and the selected context should match. The `ctx` is primarily used to store request-level variables, which are recycled after the request ends. 

It is characterized by high query efficiency (the bottom is map), unsafe coroutines and doesn't implement the `context.Context` Interface. The `c` is passed as the context between middleware/handler. It has all the semantics of context.Content, is safe for coroutines, and all that requires the `context.Content` interface as input arguments can just pass `c` directly.

#V. Observability

Monitoring your application is critical. Both Kitex and Hertz provide a Tracer interface that can be implemented for efficient application monitoring. You can make the most of the numerous instrumentation controls and logging capabilities on offer.

**Note:** As a framework, it runs with business services. Once the code of services is built, it can be deployed at virtual machines, bare metal machines, or Docker containers as it should be.

##Kitex
###Configuration and options
For more details, please check [server option](https://www.cloudwego.io/zh/docs/kitex/tutorials/options/server_options/), [client option](https://www.cloudwego.io/zh/docs/kitex/tutorials/options/client_options/), and [call option](https://www.cloudwego.io/zh/docs/kitex/tutorials/options/call_options/).

####Observability
#####Instrumentation Control
Kitex supports flexible enabling of basic and fine-grained Instrumentation. This includes a stats level, client tracing stats level control, server tracing stats level control, and more. For more details, please refer to the [Kitex User Guide](https://www.cloudwego.io/docs/kitex/tutorials/observability/).

####Logging
Kitex supports default logger implementation, injection of custom loggers, and redirection of default logger output. For more details, instructions, and examples, please refer to the [Kitex User Guide](https://www.cloudwego.io/docs/kitex/tutorials/observability/).

####Tracing
Kitex’s OpenTelemetry extension provides support for tracing. For more details, instructions, and examples, please refer to the [Kitex User Guide](https://www.cloudwego.io/docs/kitex/tutorials/observability/).

####Monitoring
The framework doesn’t provide any monitoring, but it provides a Tracer interface. This interface can be implemented by yourself and be injected via WithTracer Option. For more details, instructions, and examples, please refer to the [Kitex User Guide](https://www.cloudwego.io/docs/kitex/tutorials/observability/).

##Hertz
###Configuration and options
For more details, please check the [configuration instructions](https://www.cloudwego.io/docs/hertz/reference/config/).

####Observability
#####Instrumentation
Hertz supports flexible enabling of basic and fine-grained Instrumentation. This includes a stats level, stats level control, and more. For more details, please refer to the [Hertz User Guide](https://www.cloudwego.io/docs/hertz/tutorials/observability/).

####Log
Hertz provides a default way to print logs in the standard output. It also provides several global functions, such as `hlog.Info`, `hlog.Errorf`, `hlog.CtxTracef`, and more, which are implemented in `pkg/common/hlog`, to call the corresponding methods of the default logger. For more details, instructions, and examples, please refer to the [Hertz User Guide](https://www.cloudwego.io/docs/hertz/tutorials/observability/).

####Tracing
In microservices, link tracing is a very important capability, which plays an important role in quickly locating problems, analyzing business bottlenecks, and restoring the link status of a request.
Hertz provides the capability of link tracking and also supports user-defined link tracking. For more details, instructions, and examples, please refer to the [Hertz User Guide](https://www.cloudwego.io/docs/hertz/tutorials/observability/).

####Monitoring
The framework doesn’t provide any monitoring, but it provides a Tracer interface. This interface can be implemented by yourself and be injected via WithTracer Option. For more details, instructions, and examples, please refer to the [Hertz User Guide](https://www.cloudwego.io/docs/hertz/tutorials/observability/).

#VI. Best Practices for Developing with CloudWeGo
For a real-world application of Kitex and Hertz, you can explore projects like [Bookinfo](https://github.com/cloudwego/biz-demo/tree/main/bookinfo), [Easy Note](https://github.com/cloudwego/biz-demo/tree/main/easy_note), and [Book Shop](https://github.com/cloudwego/biz-demo/tree/main/book-shop). Each of these scenarios demonstrate different business scenarios and use-cases for various CloudWeGo subprojects. 

Whether you're dealing with merchant or consumer management, notes maintenance, or integrating different middleware, these projects provide valuable insights into the powerful capabilities of Kitex and Hertz in different contexts.

This guide provides a comprehensive exploration of CloudWeGo's powerful capabilities, particularly its subprojects, Kitex and Hertz. You now have a solid understanding of how to harness these tools effectively in your development projects.

As you continue delving into CloudWeGo, remember to mix the tool's powerful features with your creativity for impressive results in your software development journey.

Stay curious, keep exploring, and stay tuned for our upcoming Rust-focused [Volo](https://github.com/cloudwego/volo) guide, which will introduce you to yet another exciting aspect of CloudWeGo. Happy coding!