---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
keywords: ["Kitex", "Golang", "Go", "Getting Started", "Guidelines"]
description: "This document covers the preparation of the development environment, quick start and basic tutorials of Kitex."
---

## Prerequisites

1. If you don't have the golang development environment set up, please follow [Install Go](https://golang.org/doc/install) to install go.
2. We strongly recommend that you use the latest version of golang. And compatibility is guaranteed within three latest minor release versions (currently >= **v1.16**).
3. Make sure that `GO111MODULE` is set to `on`.
4. If you want to use Kitex in Windows, please make sure the version of kitex >= v0.5.2

## Quick Start

This chapter will get you started with Kitex using a simple executable example.

### Install the compiler

First of all, let's install the compilers we will be working with.

1. Make sure the `GOPATH` environment variable is properly defined (e.g. `export GOPATH=~/go`), then add `$GOPATH/bin` to the `PATH` environment variable (e.g. `export PATH=$GOPATH/bin:$PATH`). Make sure that `GOPATH` is accessible.
2. Install Kitex: `go install github.com/cloudwego/kitex/tool/cmd/kitex@latest`.
3. Install thriftgo: `go install github.com/cloudwego/thriftgo@latest`.

Now you can run `kitex --version` and `thriftgo --version` and you should see some output like below if you have successfully set up the compilers.

 ```shell
$ kitex --version
vx.x.x

$ thriftgo --version
thriftgo x.x.x
```
Tips: If you encounter any problems during the installation, it's probably because you haven't set up the golang development environment properly. In most cases you can search the error message to find a solution.

### Get the example

1. You can simply click [HERE](https://github.com/cloudwego/kitex-examples/archive/refs/heads/main.zip) to download the example.
2. Or you can clone the sample repository `git clone https://github.com/cloudwego/kitex-examples.git`.

### Run the example

#### Run with go

1. change to the `hello` directory

   `cd kitex-examples/hello`

2. run server

   `go run .`

3. run client

   open another terminal and `go run ./client`.

#### Run with Docker

1. go to the examples directory

   `cd kitex-examples`

2. build the example project

   `docker build -t kitex-examples .`
3. run the server

   `docker run --network host kitex-examples ./hello-server`

4. run the client

   Open another terminal and run `docker run --network host kitex-examples ./hello-client`

Congratulations! You have successfully used Kitex to complete an RPC.

### Add a new method

Open `hello.thrift`, you will see the following code:

```thrift
namespace go api

struct Request {
        1: string message
}

struct Response {
        1: string message
}

service Hello {
    Response echo(1: Request req)
}
```

Now let's define a new request and response `AddRequest` 和 `AddResponse`, then add the `add` method to `service Hello`:

```thrift
namespace go api

struct Request {
        1: string message
}

struct Response {
        1: string message
}

struct AddRequest {
	1: i64 first
	2: i64 second
}

struct AddResponse {
	1: i64 sum
}

service Hello {
    Response echo(1: Request req)
    AddResponse add(1: AddRequest req)
}
```

When you are finished, `hello.thrift` should look like the above.

### Regenerate code

Run the command below, then the `kitex` compiler will recompile `hello.thrift` and update the generated code.

```bash
kitex -service a.b.c hello.thrift

# If the current directory is not under $GOPATH/src, you need to add the -module parameter which usually is same as the module name in go.mod
kitex -module "your_module_name" -service a.b.c hello.thrift
```

After running the above command, the `kitex` compiler will update these files:

1. update `./handler.go`, adding a simple implementation of the `add` method.
2. update `./kitex_gen`, updating the client and server implementations.

### Update handler

When you finish the **Regenerate Code** chapter, `kitex` will add a basic implementation of `Add` to `./handler.go`, just like:

```go
// Add implements the HelloImpl interface.
func (s *HelloImpl) Add(ctx context.Context, req *api.AddRequest) (resp *api.AddResponse, err error) {
        // TODO: Your code here...
        return
}
```

Let's complete the process logic, such as:

```go
// Add implements the HelloImpl interface.
func (s *HelloImpl) Add(ctx context.Context, req *api.AddRequest) (resp *api.AddResponse, err error) {
        // TODO: Your code here...
        resp = &api.AddResponse{Sum: req.First + req.Second}
        return
}
```

### Call the `add` method

Let's add the `add` RPC to the client example.

You can see something like below in `./client/main.go`:

```go
for {
        req := &api.Request{Message: "my request"}
        resp, err := client.Echo(context.Background(), req)
        if err != nil {
                log.Fatal(err)
        }
        log.Println(resp)
        time.Sleep(time.Second)
}
```

Let's add the `add` RPC:


```go
for {
        req := &api.Request{Message: "my request"}
        resp, err := client.Echo(context.Background(), req)
        if err != nil {
                log.Fatal(err)
        }
        log.Println(resp)
        time.Sleep(time.Second)
        addReq := &api.AddRequest{First: 512, Second: 512}
        addResp, err := client.Add(context.Background(), addReq)
        if err != nil {
                log.Fatal(err)
        }
        log.Println(addResp)
        time.Sleep(time.Second)
}
```

### Run the application again

Shut down the server and the client we ran. Then:

1. run server

    `go run .`

2. run the client

    Open another terminal and `go run ./client`.

    Now you can see the output of the `add` RPC.
    
## Tutorial

### About Kitex

Kitex is a RPC framework which supports multiple serialization protocols and transport protocols.

Kitex compiler supports both `thrift` and `proto3` IDL, and fairly Kitex supports `thrift` and `protobuf` serialization protocol. Kitex extends `thrift` as transport protocol, and also supports `gRPC` protocol.

### WHY IDL

We use IDL to define interface.

Thrift IDL grammar: [Thrift interface description language](http://thrift.apache.org/docs/idl).

proto3 grammar: [Language Guide(proto3)](https://developers.google.com/protocol-buffers/docs/proto3).

### Create project directory

Let's create a directory to setup project.

`$ mkdir example-server`

enter directory

`$ cd example-server`

### Kitex compiler

`kitex` is a compiler which has the same name as `Kitex` framework, it can generate a project including client and server conveniently.

#### Install

You can use following command to install and upgrade `kitex`:

`$ go install -v github.com/cloudwego/kitex/tool/cmd/kitex@latest`

After that, you can just run it to check whether it's installed successfully.

`$ kitex`

If you see some outputs like below, congratulation!

`$ kitex`

`No IDL file found.`


If you see something like `command not found`, you should add `$GOPATH/bin` to `$PATH`. For detail, see chapter **Prerequisites** .

#### Usage

You can visit [Compiler](../tutorials/code-gen/code_generation) for detailed usage.

### Write IDL

For example, a thrift IDL.

create a `echo.thrift` file, and define a service like below:

```thrift
namespace go api

struct Request {
	1: string message
}

struct Response {
	1: string message
}

service Echo {
    Response echo(1: Request req)
}
```

### Generate echo service code

We can use `kitex` compiler to compile the IDL file to generate whole project.

`$ kitex -module example -service example-server echo.thrift`

Note:
* `-module` indicates go module name of project; full package name suggested, e.g. `github.com/YourName/exampleserver`
* `-service` indicates expected to generate a executable service named `example`
* the last parameter is path to IDL file.

Generated project layout:
```
.
|-- build.sh
|-- echo.thrift
|-- handler.go
|-- kitex_gen
|   `-- api
|       |-- echo
|       |   |-- client.go
|       |   |-- echo.go
|       |   |-- invoker.go
|       |   `-- server.go
|       |-- echo.go
|       `-- k-echo.go
|-- main.go
`-- script
    `-- bootstrap.sh
```

### Get latest Kitex

Kitex expect project to use go module as dependency manager. It cloud be easy to upgrade Kitex:
```
$ go get -v github.com/cloudwego/kitex@latest
$ go mod tidy
```

If you encounter something like below :

`github.com/apache/thrift/lib/go/thrift: ambiguous import: found package github.com/apache/thrift/lib/go/thrift in multiple modules`

Or:

`github.com/cloudwego/kitex@v0.X.X/pkg/utils/thrift.go: not enough arguments in call to t.tProt.WriteMessageBegin`

Run following command, and try again:

```
go mod edit -droprequire=github.com/apache/thrift/lib/go/thrift
go mod edit -replace=github.com/apache/thrift=github.com/apache/thrift@v0.13.0
```

This is because the Thrift official release 0.14 introduced a breaking change to the Thrift interface, resulting in generated code that is incompatible.

### Write echo service process

All method process entry should be in `handler.go`, you should see something like below in this file:

```go
package main

import (
	"context"
	"example/kitex_gen/api" // replace `example` with the value of `-module`
)

// EchoImpl implements the last service interface defined in the IDL.
type EchoImpl struct{}

// Echo implements the EchoImpl interface.
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	// TODO: Your code here...
	return
}

```

`Echo` method represents the `echo` we defined in thrift IDL.

Now let's make `Echo` a real echo.

modify `Echo` method:

```go
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	return &api.Response{Message: req.Message}, nil
}
```

### Compile and Run

kitex compiler has generated scripts to compile and run the project:

Compile:

`$ sh build.sh`

There should be a `output` directory After you execute above command, which includes compilation productions   .

Run:

`$ sh output/bootstrap.sh`

Now, `Echo` service is running!

### Write Client

Let's write a client to call `Echo` server.

Create a directory as client package:

`$ mkdir client`

Enter directory:

`$ cd client`

Generate code for clients with kitex (if this directory is under the `example-server` in previous section, you can skip this step since code for clients are already generated for kitex server):

`$ kitex -module example echo.thrift`

Note:
1. To generate code for clients, don't specify the param `-service`; the code will be under directory `kitex_gen`;
2. Full package name is suggested for the param `-module`, e.g. `github.com/YourName/exampleclient`

Then create a `main.go` file with the following code.

#### Create Client

Let's new a `client` to do RPC：

```go
import "example/kitex_gen/api/echo" // replace `example` with the value of `-module`
import "github.com/cloudwego/kitex/client"
...
c, err := echo.NewClient("example-server", client.WithHostPorts("0.0.0.0:8888"))
if err != nil {
	log.Fatal(err)
}
```
`echo.NewClient` is used to new a `client`, the first parameter is *service name*, the second parameter is *options* which is used to pass options. `client.WithHostPorts` is used to specify server address, see chapter **Basic Feature** for details.

#### Do RPC

Let's write call code:

```go
import "example/kitex_gen/api" // replace `example` with the value of `-module`
...
req := &api.Request{Message: "my request"}
resp, err := c.Echo(context.Background(), req, callopt.WithRPCTimeout(3*time.Second))
if err != nil {
	log.Fatal(err)
}
log.Println(resp)
```
We new a request `req`, then we use `c.Echo` to do a RPC call.

The first parameter `context.Context`, is used to transfer information or to control some call behaviors. You will see detailed usage in behind chapters.\

The seconde parameter is request.

The third parameter is call `options`, which is called `callopt`, these options only works for this RPC call.
`callopt.WithRPCTimeout` is used to specify timeout for this RPC call. See chapter **Basic Feature** for detail.

### Run Client

You can run following command to run a client:

`$ go run main.go`

You should see some outputs like below:

`2021/05/20 16:51:35 Response({Message:my request})`

Congratulation! You have written a Kitex server and client, and have done a RPC call.
