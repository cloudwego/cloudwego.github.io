---
title: "hz usage(thrift)"
date: 2023-02-21
weight: 3
keywords: ["hz usage(thrift)", "thrift", "new", "update"]
description: "hz usage(thrift)."
---

## Create a project based on thrift IDL

### new: Create a new project

1. Create the thrift IDL file in the current directory

   ```thrift
   // idl/hello.thrift
   namespace go hello.example

   struct HelloReq {
       1: string Name (api.query="name"); // Add api annotations for easier parameter binding
   }

   struct HelloResp {
       1: string RespBody;
   }


   service HelloService {
       HelloResp HelloMethod(1: HelloReq request) (api.get="/hello");
   }
   ```

2. Create a new project

   {{< tabs "With Go module dependencies management" "Without go module dependencies management">}}

   {{% codetab %}}

   ```bash
   # For projects not under `$GOPATH`, specify a custom module name through the `-module` command provided by the tool:
   hz new -module example.com/m -idl idl/hello.thrift

   # Tidy & get dependencies
   go mod tidy

   # Check whether the github.com/apache/thrift version in go.mod is v0.13.0, if not, continue to execute the remaining code in section 2.2
   go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0

   # Tidy & get dependencies
   go mod tidy
   ```

   {{% /codetab %}}
   {{% codetab %}}

   ```bash
   # If the current project path is under `$GOPATH`, execute the following code block
   hz new -idl idl/hello.thrift

   go mod init

   go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0

   # Tidy & get dependencies
   go mod tidy
   ```

   {{% /codetab %}}
   {{< /tabs >}}

3. Modify the handler and add your own logic

   ```go
   // handler path: biz/handler/hello/example/hello_service.go
   // where "hello/example" is the namespace of thrift IDL
   // "hello_service.go" is the name of the service in the thrift IDL, all methods defined by the service will be generated in this file

   // HelloMethod .
   // @router /hello [GET]
   func HelloMethod(ctx context.Context, c *app.RequestContext) {
           var err error
           var req example.HelloReq
           err = c.BindAndValidate(&req)
           if err != nil {
                   c.String(400, err.Error())
                   return
           }

           resp := new(example.HelloResp)

           // You can modify the logic of the entire function, not just the current template
           resp.RespBody = "hello," + req.Name // added logic

           c.JSON(200, resp)
   }
   ```

4. Compile the project

   ```bash
   go build
   ```

5. Run the project and test it

   Run the project:

   ```bash
   ./{{your binary}}
   ```

   Test:

   ```bash
   curl --location --request GET 'http://127.0.0.1:8888/hello?name=hertz'
   ```

   If it returns `{"RespBody":"hello,hertz"}`, it works.

### update: Update an existing project

1. If your thrift IDL is updated, for example:

   ```thrift
   // idl/hello.thrift
   namespace go hello.example

   struct HelloReq {
       1: string Name (api.query="name");
   }

   struct HelloResp {
       1: string RespBody;
   }

   struct OtherReq {
       1: string Other (api.body="other");
   }

   struct OtherResp {
       1: string Resp;
   }


   service HelloService {
       HelloResp HelloMethod(1: HelloReq request) (api.get="/hello");
       OtherResp OtherMethod(1: OtherReq request) (api.post="/other");
   }

   service NewService {
       HelloResp NewMethod(1: HelloReq request) (api.get="/new");
   }
   ```

2. Switch to the directory where the new command was executed and update the modified thrift IDL

   ```bash
   hz update -idl idl/hello.thrift
   ```

**Note**:

1. When writing the update command, you only need to specify the IDL file that defines the `service`. hz will automatically generate all the dependencies for that file.

2. As you can see

   Add new method under `biz/handler/hello/example/hello_service.go`<br>
   The file `new_service.go` and the corresponding "NewMethod" method have been added under `biz/handler/hello/example`.

   Now let's develop the "OtherMethod" interface:

   ```go
   // OtherMethod .
   // @router /other [POST]
   func OtherMethod(ctx context.Context, c *app.RequestContext) {
        var err error
        // The model file corresponding to example.OtherReq will also be regenerated
        var req example.OtherReq
        err = c.BindAndValidate(&req)
        if err != nil {
            c.String(400, err.Error())
            return
        }

        resp := new(example.OtherResp)

        // added logic
        resp.Resp = "Other method: " + req.Other

        c.JSON(200, resp)
   }
   ```

3. Compile the project

   ```bash
   go build
   ```

4. Run the project and test it

   Run the project:

   ```bash
   ./{{your binary}}
   ```

   Test：

   ```bash
   curl --location --request POST 'http://127.0.0.1:8888/other' \
   --header 'Content-Type: application/json' \
   --data-raw '{
       "Other": "other method"
   }'
   ```

   If it returns `{"Resp":"Other method: other method"}`, it works.

For more example code, please refer to [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/thrift).
