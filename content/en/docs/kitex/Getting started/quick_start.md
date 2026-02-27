---
title: "Basic Example"
linkTitle: "Basic Example"
weight: 3
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "Basic Example"]
description: "Basic example for Kitex"
---

Before starting this section, make sure you have the required **Pre-knowledge** and have completed the **Environment Preparation**.

## Getting the Example Code

- Click [here](https://github.com/cloudwego/kitex-examples/archive/refs/heads/main.zip) to download the example code repository directly.
- Alternatively, you can clone the code repository using `git`: `git clone https://github.com/cloudwego/kitex-examples.git`

## Running the Example

### Running Directly

1. Navigate to the `hello` directory inside the example repository:

   ```bash
   cd kitex-examples/hello
   ```

2. Run the server code:

   ```bash
   go run .

   // Output similar logs indicating successful execution
   2024/01/18 20:35:08.857352 server.go:83: [Info] KITEX: server listen at addr=[::]:8888
   ```

3. Open another terminal and run the client code:

   ```bash
   go run ./client

   // Output similar logs every second indicating successful execution
   2024/01/18 20:39:59 Response({Message:my request})
   2024/01/18 20:40:00 Response({Message:my request})
   2024/01/18 20:40:01 Response({Message:my request})
   ```

### Running with Docker

1. Navigate to the example code repository:

   ```bash
   cd kitex-examples
   ```

2. Build the Docker image:

   ```bash
   docker build -t kitex-examples .
   ```

3. Run the server code:

   ```bash
   docker run --network host kitex-examples ./hello-server

   // Output similar logs indicating successful execution
   2024/01/18 12:47:34.712415 server.go:83: [Info] KITEX: server listen at addr=[::]:8888
   ```

4. Run the client code:

   ```bash
   docker run --network host kitex-examples ./hello-client

   // Output similar logs every second indicating successful execution
   2024/01/18 12:48:20 Response({Message:my request})
   2024/01/18 12:48:21 Response({Message:my request})
   2024/01/18 12:48:22 Response({Message:my request})
   ```

Congratulations! You have successfully made an RPC call using Kitex.

## Adding a New Method

Now that you have successfully run the existing example code, let's add and run your own implemented method.

Open the `hello.thrift` file in the `hello` directory. You will see the following content:

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

Now, let's define a new request and response for the new method, `AddRequest` and `AddResponse`, respectively. Add the `add` method to the `Hello` service:

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

### Generating New Code

Run the following command to automatically update the code files based on the `hello.thrift` content using the `kitex` tool:

```bash
kitex -module "github.com/cloudwego/kitex-examples" -service a.b.c hello.thrift
```

After running the above command, the `kitex` tool will update the following files:

1. Update `./handler.go` and add a basic implementation of the `Add` method.
2. Update `./kitex_gen` with the necessary code files required by the framework.

### Implementing the Business Logic

After completing the above steps, the `./handler.go` file will be automatically updated with a basic implementation of the `Add` method, similar to the following code:

```go
// Add implements the HelloImpl interface.
func (s *HelloImpl) Add(ctx context.Context, req *api.AddRequest) (resp *api.AddResponse, err error) {
    // TODO: Your code here...
    return
}
```

This method corresponds to the `Add` method we added in `hello.thrift`. All you need to do is add your desired business logic code. For example, to return the sum of the request parameters:

```go
// Add implements the HelloImpl interface.
func (s *HelloImpl) Add(ctx context.Context, req *api.AddRequest) (resp *api.AddResponse, err error) {
    // TODO: Your code here...
    resp = &api.AddResponse{Sum: req.First + req.Second}
    return
}
```

### Adding Client Invocation

Now that the server has the `Add` method implemented, let's add a client invocation for the `Add` method.

In the `./client/main.go` file, you will see a `for` loop similar to the following:

```
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

Now let's add the invocation for the `Add` method inside the loop:

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

### Running Again

Follow the same steps as before to run the server and client code. If you see output similar to the following, it means the execution was successful:

```bash
// Server
2024/01/18 21:07:43.638115 server.go:83: [Info] KITEX: server listen at addr=[::]:8888


// Client
2024/01/18 21:07:52 Response({Message:my request})
2024/01/18 21:07:53 AddResponse({Sum:1024})
2024/01/18 21:07:54 Response({Message:my request})
2024/01/18 21:07:55 AddResponse({Sum:1024})
2024/01/18 21:07:56 Response({Message:my request})
2024/01/18 21:07:57 AddResponse({Sum:1024})
```

Congratulations! You have completed all the steps to get started with Kitex!
