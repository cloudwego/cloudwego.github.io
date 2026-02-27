---
title: "hz 使用 (protobuf)"
date: 2023-02-21
weight: 4
keywords: ["hz 使用 (protobuf)", "protobuf", "new", "update"]
description: >
  "hz 使用 (protobuf)。"
---

## 基于 protobuf IDL 创建项目

### new: 创建一个新项目

1. 在当前目录下创建 protobuf idl 文件

   1. 创建 api.proto

      api.proto 是 hz 提供的注解文件，内容如下，请在使用了注解的 proto 文件中，import 该文件。

      如果想自行拓展注解的使用，请不要以 "5" 作为序号的开头，避免出现冲突。例如 "optional string xxx = 77777;"。

      ```protobuf
      // idl/api.proto; 注解拓展
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
          optional string js_conv = 50109;
          optional string file_name = 50110;
          optional string none = 50111;

          // 50131~50160 used to extend field option by hz
          optional string form_compatible = 50131;
          optional string js_conv_compatible = 50132;
          optional string file_name_compatible = 50133;
          optional string none_compatible = 50134;
          // 50135 is reserved to vt_compatible
          // optional FieldRules vt_compatible = 50135;

          optional string go_tag = 51001;
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
          optional string gen_path = 50301; // The path specified by the user when the client code is generated, with a higher priority than api_version
          optional string api_version = 50302; // Specify the value of the :version variable in path when the client code is generated
          optional string tag = 50303; // rpc tag, can be multiple, separated by commas
          optional string name = 50304; // Name of rpc
          optional string api_level = 50305; // Interface Level
          optional string serializer = 50306; // Serialization method
          optional string param = 50307; // Whether client requests take public parameters
          optional string baseurl = 50308; // Baseurl used in ttnet routing
          optional string handler_path = 50309; // handler_path specifies the path to generate the method

          // 50331~50360 used to extend method option by hz
          optional string handler_path_compatible = 50331; // handler_path specifies the path to generate the method
      }

      extend google.protobuf.EnumValueOptions {
          optional int32 http_code = 50401;

      // 50431~50460 used to extend enum option by hz
      }

      extend google.protobuf.ServiceOptions {
          optional string base_domain = 50402;

          // 50731~50760 used to extend service option by hz
          optional string base_domain_compatible = 50731;
      }

      extend google.protobuf.MessageOptions {
          // optional FieldRules msg_vt = 50111;

          optional string reserve = 50830;
          // 550831 is reserved to msg_vt_compatible
          // optional FieldRules msg_vt_compatible = 50831;
      }
      ```

   2. 创建主 IDL

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

2. 创建新项目

   {{< tabs "在 GOPATH 外执行" "在 GOPATH 下执行" >}}

   {{% codetab %}}

   ```bash
   # 在 GOPATH 外执行，需要指定 go mod 名，如果主 IDL 的依赖和主 IDL 不在同一路径下，需要加入 "-I" 选项，其含义为 IDL 搜索路径，等同于 protoc 的 "-I" 命令

   hz new -module example.com/m -I idl -idl idl/hello/hello.proto

   # 整理 & 拉取依赖
   go mod tidy

   ```

   {{% /codetab %}}

   {{% codetab %}}

   ```bash
   # GOPATH 下执行，如果主 IDL 的依赖和主 IDL 不在同一路径下，需要加入 "-I" 选项，其含义为 IDL 搜索路径，等同于 protoc 的 "-I" 命令
   hz new -I idl -idl idl/hello/hello.proto

   go mod init

   # 整理 & 拉取依赖
   go mod tidy
   ```

   {{% /codetab %}}
   {{< /tabs >}}

3. 修改 handler，添加自己的逻辑

   ```go
   // handler path: biz/handler/hello/hello_service.go
   // 其中 "/hello" 是 protobuf idl 中 go_package 的最后一级
   // "hello_service.go" 是 protobuf idl 中 service 的名字，所有 service 定义的方法都会生成在这个文件中

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

      // 你可以修改整个函数的逻辑，而不仅仅局限于当前模板
      resp.RespBody = "hello," + req.Name // 添加的逻辑

      c.JSON(200, resp)
   }
   ```

4. 编译项目

   ```bash
   go build
   ```

5. 运行项目并测试

   运行项目：

   ```bash
   ./{{your binary}}
   ```

   测试：

   ```bash
   curl --location --request GET 'http://127.0.0.1:8888/hello?name=hertz'
   ```

   如果返回 `{"RespBody":"hello,hertz"}`，说明接口调通。

### update: 更新一个已有的项目

1. 如果你的 protobuf idl 有更新，例如：

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

2. 切换到执行 new 命令的目录，更新修改后的 protobuf idl

```bash
hz update -I idl -idl idl/hello/hello.proto
```

**注意**:

- 如果主 IDL 的依赖和主 IDL 不在同一路径下，需要加入 `-I` 选项，其含义为 IDL 搜索路径，等同于 protoc 的 `-I` 命令。
- 在编写 update 命令时，不仅需要指定定义 `service` 的 IDL 文件，还需要指定所有的依赖文件，因为 protobuf 的依赖文件不会自动更新。

3. 可以看到
   在 `biz/handler/hello/hello_service.go` 下新增了新的方法；
   在 `biz/handler/hello` 下新增了文件 `new_service.go` 以及对应的 "Method3" 方法。

   下面我们来开发 "Method2" 接口：

   ```go
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

      // 增加的逻辑
      resp.Resp = "Other method: " + req.Other

      c.JSON(200, resp)
   }
   ```

4. 编译项目

   ```bash
   go build
   ```

5. 运行项目并测试

   运行项目：

   ```bash
   ./{{your binary}}
   ```

   测试：

   ```bash
   curl --location --request POST 'http://127.0.0.1:8888/other' \
   --header 'Content-Type: application/json' \
   --data-raw '{
       "Other": "other method"
   }'
   ```

   如果返回`{"Resp":"Other method: other method"}`，说明接口调通。

更多示例代码请参考 [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/protobuf)。
