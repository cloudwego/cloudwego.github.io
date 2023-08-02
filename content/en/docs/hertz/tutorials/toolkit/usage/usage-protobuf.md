---
title: "hz usage(protobuf)"
date: 2023-02-21
weight: 4
description: >
---

## Create a project based on protobuf IDL

### new: Create a new project

1. Create the protobuf IDL file in the current directory

   > 1. In order to support api annotations in protobuf, please import the following file in the proto file where the annotation is used
   >
   > 2. If you want to extend the annotations, please do not use "5" as the beginning of the serial number to avoid conflicts. For example, "optional string xxx = 77777;"

   ```protobuf
   // idl/api.proto; Annotation extension
   syntax = "proto2";

   package api;

   import "google/protobuf/descriptor.proto";

   option go_package = "/api";

   extend google.protobuf.FieldOptions {
   optional string raw_body = 50101;
   optional string query = 50102;
   optional string header = 50103;
   optional string cookie = 50104;
   optional string body = 50105;
   optional string path = 50106;
   optional string vd = 50107;
   optional string form = 50108;
   optional string go_tag = 51001;
   optional string js_conv = 50109;
   }

   extend google.protobuf.MethodOptions {
   optional string get = 50201;
   optional string post = 50202;
   optional string put = 50203;
   optional string delete = 50204;
   optional string patch = 50205;
   optional string options = 50206;
   optional string head = 50207;
   optional string any = 50208;
   optional string gen_path = 50301;
   optional string api_version = 50302;
   optional string tag = 50303;
   optional string name = 50304;
   optional string api_level = 50305;
   optional string serializer = 50306;
   optional string param = 50307;
   optional string baseurl = 50308;
   }

   extend google.protobuf.EnumValueOptions {
   optional int32 http_code = 50401;
   }
   ```

   Main IDL definition

   ```protobuf
   // idl/hello/hello.proto
   syntax = "proto3";

   package hello;

   option go_package = "hertz/hello";

   import "api.proto";

   message HelloReq {
   string Name = 1[(api.query)="name"];
   }

   message HelloResp {
   string RespBody = 1;
   }

   service HelloService {
   rpc Method1(HelloReq) returns(HelloResp) {
       option (api.get) = "/hello";
   }
   }
   ```

2. Create a new project

   {{< tabs "Execute outside GOPATH" "Execute under GOPATH">}}

   {{% codetab %}}

   ```bash
   # Execute is not under GOPATH, add go mod name after "-module", if the dependencies of the main IDL and the main IDL are not in the same path, you need to add the "-I" option, its meaning is IDL search path, equivalent to the option "-I" for protoc

   hz new -module example/m -I idl -idl idl/hello/hello.proto

   # Tidy & get dependencies
   go mod tidy
   ```

   {{% /codetab %}}
   {{% codetab %}}

   ```bash
   # Execute under GOPATH, if the dependencies of the main IDL and the main IDL are not in the same path, you need to add the "-I" option, its meaning is IDL search path, equivalent to the option "-I" for protoc
   hz new -I idl -idl idl/hello/hello.proto

   go mod init

   # Tidy & get dependencies
   go mod tidy
   ```

   {{% /codetab %}}
   {{< /tabs >}}

3. Modify the handler and add your own logic

   ```go
   // handler path: biz/handler/hello/hello_service.go
   // where "/hello" is the last level of go_package in protobuf IDL
   // "hello_service.go" is the name of the service in protobuf IDL, all methods defined by the service will be generated in this file

   // Method1 .
   // @router /hello [GET]
   func Method1(ctx context.Context, c *app.RequestContext) {
   var err error
   var req hello.HelloReq
   err = c.BindAndValidate(&req)
   if err != nil {
       c.String(400, err.Error())
       return
   }

   resp := new(hello.HelloResp)

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

   Run the project：

   ```bash
   ./{{your binary}}
   ```

   Test：

   ```bash
   curl --location --request GET 'http://127.0.0.1:8888/hello?name=hertz'
   ```

   If it returns `{"RespBody":"hello,hertz"}`, it works.

### update: Update an existing Hertz project

1. If your protobuf IDL is updated, for example:

   ```protobuf
   // idl/hello/hello.proto
   syntax = "proto3";

   package hello;

   option go_package = "hertz/hello";

   import "api.proto";

   message HelloReq {
   string Name = 1[(api.query)="name"];
   }

   message HelloResp {
   string RespBody = 1;
   }

   message OtherReq {
   string Other = 1[(api.body)="other"];
   }

   message OtherResp {
   string Resp = 1;
   }

   service HelloService {
   rpc Method1(HelloReq) returns(HelloResp) {
       option (api.get) = "/hello";
   }
   rpc Method2(OtherReq) returns(OtherResp) {
       option (api.post) = "/other";
   }
   }

   service NewService {
   rpc Method3(OtherReq) returns(OtherResp) {
       option (api.get) = "/new";
   }
   }
   ```

2. Switch to the directory where the new command was executed and update the modified IDL

   ```bash
   hz update -I idl -idl idl/hello/hello.proto
   ```

3. As you can see

   Add new method under "biz/handler/hello/hello_service.go"<br>
   The file "new_service.go" and the corresponding "Method3" method have been added under "biz/handler/hello"

   Now let's develop the "Method2" interface

   ```go
   // Method1 .
   // @router /hello [GET]
   func Method1(ctx context.Context, c *app.RequestContext) {
   var err error
   var req hello.HelloReq
   err = c.BindAndValidate(&req)
   if err != nil {
       c.String(400, err.Error())
       return
   }

   resp := new(hello.HelloResp)

   // You can modify the logic of the entire function, not just the current template
   resp.RespBody = "hello," + req.Name // added logic

   c.JSON(200, resp)
   }

   // Method2 .
   // @router /other [POST]
   func Method2(ctx context.Context, c *app.RequestContext) {
   var err error
   var req hello.OtherReq
   err = c.BindAndValidate(&req)
   if err != nil {
       c.String(400, err.Error())
       return
   }

   resp := new(hello.OtherResp)

   // added logic
   resp.Resp = "Other method: " + req.Other

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

   Test：

   ```bash
   curl --location --request POST 'http://127.0.0.1:8888/other' \
   --header 'Content-Type: application/json' \
   --data-raw '{
       "Other": "other method"
   }'
   ```

   If it returns `{"Resp":"Other method: other method"}`, it works.
