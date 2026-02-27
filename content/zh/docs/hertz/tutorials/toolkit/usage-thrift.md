---
title: "hz 使用 (thrift)"
date: 2023-02-21
weight: 3
keywords: ["hz 使用 (thrift)", "thrift", "new", "update"]
description: "hz 使用 (thrift)。"
---

## 基于 thrift IDL 创建项目

### new: 创建一个新项目

1. 在当前目录下创建 thrift idl 文件

   ```thrift
   // idl/hello.thrift
   namespace go hello.example

   struct HelloReq {
       1: string Name (api.query="name"); // 添加 api 注解为方便进行参数绑定
   }

   struct HelloResp {
       1: string RespBody;
   }


   service HelloService {
       HelloResp HelloMethod(1: HelloReq request) (api.get="/hello");
   }
   ```

2. 创建新项目

   {{< tabs "Go module 管理依赖" "非 go module 管理依赖">}}

   {{% codetab %}}

   ```bash
   # 不在 `$GOPATH` 下的项目通过工具提供的 `-module` 命令指定一个自定义 module 名称即可：
   hz new -module example.com/m -idl idl/hello.thrift

   # 整理 & 拉取依赖
   go mod tidy

   # 查看 go.mod 中 github.com/apache/thrift 版本是否为 v0.13.0，如果不是则继续执行 2.2 小节剩余代码
   go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0

   # 整理 & 拉取依赖
   go mod tidy
   ```

   {{% /codetab %}}
   {{% codetab %}}

   ```bash
   # 如果当前项目路径处于 `$GOPATH` 之下则执行以下代码块
   hz new -idl idl/hello.thrift

   go mod init

   go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0

   # 整理 & 拉取依赖
   go mod tidy
   ```

   {{% /codetab %}}
   {{< /tabs >}}

3. 修改 handler，添加自己的逻辑

   ```go
   // handler path: biz/handler/hello/example/hello_service.go
   // 其中 "hello/example" 是 thrift idl 的 namespace
   // "hello_service.go" 是 thrift idl 中 service 的名字，所有 service 定义的方法都会生成在这个文件中

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

1. 如果你的 thrift idl 有更新，例如：

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

2. 切换到执行 new 命令的目录，更新修改后的 thrift idl

   ```bash
   hz update -idl idl/hello.thrift
   ```

   **注意**:

   1. 与 protobuf 不同，在编写 update 命令时，只需要指定定义 `service` 的 IDL 文件，hz 会自动将该文件的所有依赖文件都进行生成。

3. 可以看到

   在 `biz/handler/hello/example/hello_service.go` 下新增了新的方法<br>
   在 `biz/handler/hello/example` 下新增了文件 `new_service.go` 以及对应的 "NewMethod" 方法。

   下面我们来开发 "OtherMethod" 接口：

   ```go
   // OtherMethod .
   // @router /other [POST]
   func OtherMethod(ctx context.Context, c *app.RequestContext) {
        var err error
        // example.OtherReq 对应的 model 文件也会重新生成
        var req example.OtherReq
        err = c.BindAndValidate(&req)
        if err != nil {
            c.String(400, err.Error())
            return
        }

        resp := new(example.OtherResp)

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

更多示例代码请参考 [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/thrift)。
