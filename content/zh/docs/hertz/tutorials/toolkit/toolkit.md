---
title: "hz 命令行工具使用"
date: 2022-06-18
weight: 1
description: >
---

hz 是 Hertz 框架提供的一个用于生成代码的命令行工具。目前，hz 可以基于 thrift 和 protobuf 的 IDL 生成 hertz 项目的脚手架。

# 安装

```
go install github.com/cloudwego/hertz/cmd/hz@latest
```

**注意**，由于 hz 会为自身的二进制文件创建软链接，因此请确保 hz 的安装路径具有可写权限。

# 运行模式

要使用 thrift 或 protobuf 的 IDL 生成代码，需要安装相应的编译器：[thriftgo](https://github.com/cloudwego/thriftgo) 或 [protoc](https://github.com/protocolbuffers/protobuf/releases) 。

hz 生成的代码里，一部分是底层的编译器生成的（通常是关于 IDL 里定义的结构体），另一部分是IDL 中用户定义的路由、method 等信息。用户可直接运行该代码。

从执行流上来说，当 hz 使用 thrift IDL 生成代码时，hz 会调用 thriftgo 来生成 go 结构体代码，并将自身作为 thriftgo 的一个插件（名为 thrift-gen-hertz）来执行来生成其他代码。当用于 protobuf IDL 时亦是如此。

```
$> hz  ... --idl=IDL
    |
    | thrift-IDL
    |---------> thriftgo --gen go:... -plugin=hertz:... IDL
    |
    | protobuf-IDL
     ---------> protoc --hertz_out=... --hertz_opt=... IDL
```

如何安装thriftgo/protoc:

thriftgo:

```
$ GO111MODULE=on go install github.com/cloudwego/thriftgo
```

protoc:

```
// brew 安装
$ brew install protobuf

// 官方镜像安装，以 macos 为例
$ wget https://github.com/protocolbuffers/protobuf/releases/download/v3.19.4/protoc-3.19.4-osx-x86_64.zip
$ unzip protoc-3.17.3-osx-x86_64.zip
$ cp bin/protoc /usr/local/bin/protoc
// 确保 include/google 放入 /usr/local/include下
$ cp -r include/google /usr/local/include/google
```

# 使用

## 基本使用

### new: 创建一个 hertz 新项目

1.  创建新项目

```
// GOPATH 下执行，go mod 名字默认为当前路径相对GOPATH的路径，也可自己指定
hz new

// 非GOPATH 下执行，需要指定 go mod 名
hz new -mod hertz/demo

// 整理 & 拉取依赖
go mod tidy
```

执行后会在当前目录下生成 hertz 项目的脚手架。

2.  编译项目

```
go build
```

3.  运行项目并测试

运行项目：

```
./{{your binary}}
```

测试：

```
curl 127.0.0.1:8888/ping
```

如果返回`{"message":"pong"}`，说明接口调通。

## 基于 thrift IDL 创建项目

### new: 创建一个新项目

1.  在当前目录下创建 thrift idl 文件

```
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

2.  创建新项目

```
// GOPATH 下执行
hz new -idl idl/hello.thrift

// 整理 & 拉取依赖
go mod tidy
```

3.  修改handler，添加自己的逻辑

```
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

4.  编译项目

```
go build
```

5.  运行项目并测试

运行项目：

```
./{{your binary}}
```

测试：

```
curl --location --request GET 'http://127.0.0.1:8888/hello?name=hertz'
```

如果返回`{"RespBody":"hello,hertz"}`，说明接口调通。

### update: 更新一个已有的项目

1.  如果你的 thrift idl 有更新，例如：

```
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

2.  切换到执行 new 命令的目录，更新修改后的 thrift idl

```
hz update -idl idl/hello.thrift
```

3. 可以看到

    在 "biz/handler/hello/example/hello_service.go" 下新增了新的方法<br>
    在 "biz/handler/hello/example"下新增了文件"new_service.go" 以及对应的 "NewMethod" 方法。

下面我们来开发"OtherMethod"接口

```
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

// OtherMethod .
// @router /other [POST]
func OtherMethod(ctx context.Context, c *app.RequestContext) {
   var err error
   // example.OtherReq 对应的model文件也会重新生成
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

4.  编译项目

```
go build
```

5.  运行项目并测试

运行项目：

```
./{{your binary}}
```

测试：

```
curl --location --request POST 'http://127.0.0.1:8888/other' \
--header 'Content-Type: application/json' \
--data-raw '{
    "Other": "other method"
}'
```

如果返回`{"Resp":"Other method: other method"}`，说明接口调通。

## 基于 protobuf IDL 创建项目

### new: 创建一个新项目

1.  在当前目录下创建 protobuf idl 文件

***注***：为在 protobuf 中支持 api 注解，请在使用了注解的 proto 文件中，import 下面的文件

```
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

主 idl 定义：

```
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

2.  创建新项目

```
// GOPATH 下执行, 如果主IDL的依赖和主IDL不在同一路径下，需要加入-I 选项，其含义为IDL搜索路径，等同于 protoc 的 -I 命令
hz new -I idl -idl idl/hello/hello.proto

// 整理 & 拉取依赖
go mod tidy
```

3.  修改handler，添加自己的逻辑

```
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

4.  编译项目

```
go build
```

5.  运行项目并测试

运行项目：

```
./{{your binary}}
```

测试：

```
curl --location --request GET 'http://127.0.0.1:8888/hello?name=hertz'
```

如果返回`{"RespBody":"hello,hertz"}`，说明接口调通。

### update: 更新一个已有的项目

1.  如果你的 protobuf idl 有更新，例如：

```
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

2.  切换到执行 new 命名的目录，更新修改后的 protobuf idl

```
hz update -I idl -idl idl/hello/hello.proto
```

3.  可以看到 "biz/handler/hello/hello_service.go" 下新增了新的方法，在"biz/handler/hello"下新增了文件"new_service.go"以及对应的"Method3"方法。

下面我们来开发"Method2"接口

```
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

4.  编译项目

```
go build
```

5.  运行项目并测试

运行项目：

```
./{{your binary}}
```

测试：

```
curl --location --request POST 'http://127.0.0.1:8888/other' \
--header 'Content-Type: application/json' \
--data-raw '{
    "Other": "other method"
}'
```

如果返回`{"Resp":"Other method: other method"}`，说明接口调通。

## 生成代码的结构

hz 生成的代码结构都类似，下面以"基于 thrift IDL 创建项目"小节生成的代码结构为例，说明hz生成的代码的含义。

```
.
├── biz                                // business 层，存放业务逻辑相关流程
│   ├── handler                        // 存放 handler 文件
│   │   ├── hello                      // hello/example 对应 thrift idl 中定义的 namespace；而对于 protobuf idl，则是对应 go_package 的最后一级
│   │   │   └── example
│   │   │       ├── hello_service.go   // handler 文件，用户在该文件里实现 IDL service 定义的方法，update 时会查找 当前文件已有的 handler 在尾部追加新的 handler
│   │   │       └── new_service.go     // 同上，idl 中定义的每一个 service 对应一个文件
│   │   └── ping.go                    // 默认携带的 ping handler，用于生成代码快速调试，无其他特殊含义
│   ├── model                          // IDL 内容相关的生成代码
│   │   └── hello                      // hello/example 对应 thrift idl 中定义的 namespace；而对于 protobuf idl，则是对应 go_package
│   │     └── example
│   │         └── hello.go             // thriftgo 的产物，包含 hello.thrift 定义的内容的 go 代码，update 时会重新生成
│   └── router                         // idl 中定义的路由相关生成代码
│       ├── hello                      // hello/example 对应 thrift idl 中定义的namespace；而对于 protobuf idl，则是对应 go_package 的最后一级
│       │   └── example
│       │       ├── hello.go           // hz 为 hello.thrift 中定义的路由生成的路由注册代码；每次 update 相关 idl 会重新生成该文件
│       │       └── middleware.go      // 默认中间件函数，hz 为每一个生成的路由组都默认加了一个中间件；update 时会查找当前文件已有的 middleware 在尾部追加新的 middleware
│       └── register.go                // 调用注册每一个 idl 文件中的路由定义；当有新的 idl 加入，在更新的时候会自动插入其路由注册的调用；勿动
├── go.mod                             // go.mod 文件，如不在命令行指定，则默认使用相对于GOPATH的相对路径作为module名
├── idl                                // 用户定义的idl，位置可任意
│   └── hello.thrift
├── main.go                            // 程序入口
├── router.go                          // 用户自定义除 idl 外的路由方法
└── router_gen.go                      // hz 生成的路由注册代码，用于调用用户自定义的路由以及 hz 生成的路由
```

## 支持的 api 注解

> Field 注解可用于参数绑定及校验：https://www.cloudwego.io/zh/docs/hertz/tutorials/basic-feature/binding-and-validate/
>
> Method 注解可用于生成路由注册相关代码

### 支持的 api 注解：

| *Field 注解*                          |                          |
| ------------------------------------ | ------------------------ |
| 注解                                  | 说明                       |
| api.raw_body                         | 生成 "raw_body" tag        |
| api.query                            | 生成 "query" tag           |
| api.header                           | 生成 "header" tag          |
| api.cookie                           | 生成 "cookie" tag          |
| api.body                             | 生成 "json" tag            |
| api.path                             | 生成 "path" tag            |
| api.form                             | 生成 "form" tag            |
| api.go_tag (protobuf)go.tag (thrift) | 透传go_tag，会生成go_tag里定义的内容 |
| api.vd                               | 生成 "vd" tag              |

| *Method 注解*   |                  |
| ----------- | ---------------- |
| 注解          | 说明               |
|             |                  |
| api.get     | 定义 GET 方法及路由     |
| api.post    | 定义 POST 方法及路由    |
| api.put     | 定义 PUT 方法及路由     |
| api.delete  | 定义 DELETE 方法及路由  |
| api.patch   | 定义 PATCH 方法及路由   |
| api.options | 定义 OPTIONS 方法及路由 |
| api.head    | 定义 HEAD 方法及路由    |
| api.any     | 定义 ANY 方法及路由     |

### 使用方法：

#### Field 注解：

Thrift：

```
struct Demo {
    1: string Demo (api.query="demo", api.path="demo");
    2: string GoTag (go.tag="goTag:"tag"")
    3: string Vd (api.vd="$!='your string'")
}
```

Protobuf:

```
message Demo {
  string Demo = 1[(api.query)="demo",(api.path)="demo"];
  string GoTag = 2[(api.go_tag)="goTag:"tag""];
  string Vd = 3[(api.vd)="$!='your string'"];
}
```

#### Method 注解：

Thrift：

```
service Demo {
    Resp Method(1: Req request) (api.get="/route");
}
```

Protobuf:

```
service Demo {
  rpc Method(Req) returns(Resp) {
    option (api.get) = "/route";
  }
}
```

## 命令行参数说明

### Global:

```
$ hz --help
NAME:
   hz - A idl parser and code generator for Hertz projects

USAGE:
   hz [global options] command [command options] [arguments...]

VERSION:
   0.0.1

COMMANDS:
   new      Generate a new Hertz project
   update   Update an existing Hertz project
   help, h  Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --help, -h     show help (default: false)
   --verbose      turn on verbose mode (default: false)
   --version, -v  print the version (default: false)
```

-   New: 创建一个新的 hertz 项目

<!---->

-   update: 更新一个已存在的 hertz 项目

### New:

```
$ hz help new
NAME:
   hz new - Generate a new Hertz project

USAGE:
   hz new [command options] [arguments...]

OPTIONS:
   --client_dir value                Specify the client path. If not specified, no client code is generated.
   --customize_layout value          Specify the layout template. ({{Template Profile}}:{{Rendering Data}})
   --customize_package value         Specify the package template. ({{Template Profile}}:)
   --exclude_file value, -E value    Specify the files that do not need to be updated.  (accepts multiple inputs)
   --handler_dir value               Specify the handler path.
   --idl value                       Specify the IDL file path. (.thrift or .proto)  (accepts multiple inputs)
   --json_enumstr                    Use string instead of num for json enums when idl is thrift. (default: false)
   --model_dir value                 Specify the model path.
   --module value, --mod value       Specify the Go module name to generate go.mod.
   --no_recurse                      Generate master model only. (default: false)
   --option_package value, -P value  Specify the package path. ({include_path}={import_path})  (accepts multiple inputs)
   --out_dir value                   Specify the project path.
   --proto_path value, -I value      Add an IDL search path for includes. (Valid only if idl is protobuf)  (accepts multiple inputs)
   --protoc value, -p value          Specify arguments for the protoc. ({flag}={value})                    (accepts multiple inputs)
   --service value                   Specify the service name.
   --snake_tag                       Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --thriftgo value, -t value        Specify arguments for the thriftgo. ({flag}={value})  (accepts mul
```

-   client_dir: 指定 client 侧代码的生成路径，如果不指定则不生成；当前为每个 service 生成一个全局的client，后续会提供更丰富的 client 代码能力。

<!---->

-   customize_layout: 自定义项目 layout 模板，具体详见：[自定义模板使用](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/template/)

<!---->

-   customize_package: 自定义项目 package 相关模板，主要可针对 handler 模板进行定制化，具体详见：[自定义模板使用](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/template/)

<!---->

-   exclude_file: 不需要更新的文件(相对项目路径，支持多个)

<!---->

-   handler_dir: 指定 handler 的生成路径，默认为"biz/handler"

<!---->

-   idl: IDL文件路径(.thrift 或者.proto)

<!---->

-   json_enumstr: 当 idl 为 thrift 时，json enums 使用 string 代替 num(透传给 thriftgo 的选项)

<!---->

-   model_dir: 指定 model 的生成路径，默认为"biz/model"

<!---->

-   module/mod: 指定 go mod 的名字，非 GOPATH 下必须指定，GOPATH 下默认以相对于GOPATH 的路径作为名字

<!---->

-   no_recurse: 只生成主 idl 的 model 代码

<!---->

-   option_package/P: 指定包的路径，({include_path}={import_path})

<!---->

-   out_dir: 指定项目生成路径

<!---->

-   proto_path/I: 当 idl 为 protobuf 时，指定 idl 的搜索路径，同 protoc 的 -I 指令

<!---->

-   protoc/p: 透传给 protoc 的选项({flag}={value})

<!---->

-   service: 服务名，为之后做服务发现等功能预留

<!---->

-   snake_tag: tag 使用 snake_case 风格命名(仅对 form、query、json 生效)

<!---->

-   thriftgo/t: 透传给thriftgo的选项({flag}={value})

<!---->

-   unset_omitempty: 当 idl 为 protobuf 时，生成 model field，去掉 omitempty tag；当 idl 为 thrift 时，是否添加 omitempty 根据 field 是 "optional"还是"required"决定

### Update:

```
$ hz help update
NAME:
   hz update - Update an existing Hertz project

USAGE:
   hz update [command options] [arguments...]

OPTIONS:
   --client_dir value                Specify the client path. If not specified, no client code is generated.
   --customize_package value         Specify the package template. ({{Template Profile}}:)
   --exclude_file value, -E value    Specify the files that do not need to be updated.  (accepts multiple inputs)
   --handler_dir value               Specify the handler path.
   --idl value                       Specify the IDL file path. (.thrift or .proto)  (accepts multiple inputs)
   --json_enumstr                    Use string instead of num for json enums when idl is thrift. (default: false)
   --model_dir value                 Specify the model path.
   --no_recurse                      Generate master model only. (default: false)
   --option_package value, -P value  Specify the package path. ({include_path}={import_path})  (accepts multiple inputs)
   --out_dir value                   Specify the project path.
   --proto_path value, -I value      Add an IDL search path for includes. (Valid only if idl is protobuf)  (accepts multiple inputs)
   --protoc value, -p value          Specify arguments for the protoc. ({flag}={value})                    (accepts multiple inputs)
   --snake_tag                       Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --thriftgo value, -t value        Specify arguments for the thriftgo. ({flag}={value})  (accepts multiple inputs)
   --unset_omitempty                 Remove 'omitempty' tag for generated struct. (default: false)
```

-   client_dir: 指定 client 侧代码的生成路径，如果不指定则不生成；当前为每个 service 生成一个全局的client，后续会提供更丰富的 client 代码能力。注意：如果对同一套 idl 进行update，需要 client_dir 的值与使用 new 的时候相同，否则会生成冗余的代码，需要用户自行删除。

<!---->

-   customize_package: 自定义项目 package 相关模板，主要可针对 handler 模板进行定制化，具体详见：[自定义模板使用](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/template/) 。注意：对于已经存在的 handler 文件会按照默认模板新增 handler 函数，对于还未存在的 handler 文件，则会安装自定义模板来生成 handler。

<!---->

-   exclude_file: 不需要更新的文件(相对项目路径，支持多个)

<!---->

-   handler_dir: 指定 handler 的生成路径，默认为"biz/handler"；注意：如果对同一套 idl 进行update，需要 handler_dir 的值与使用 new 的时候相同，否则会生成冗余的代码，需要用户自行删除。

<!---->

-   idl: IDL文件路径(.thrift 或者.proto)

<!---->

-   json_enumstr: 当 idl 为 thrift 时，json enums 使用 string 代替 num(透传给 thriftgo 的选项)

<!---->

-   model_dir: 指定 model 的生成路径，默认为"biz/model"；注意：如果对同一套 idl 进行update，需要 model_dir 的值与使用 new 的时候相同，否则会生成重复的 model 代码且导致 handler 引用不一致。

<!---->

-   no_recurse: 只生成主 idl 的 model 代码

<!---->

-   option_package/P: 指定包的路径，({include_path}={import_path})

<!---->

-   out_dir: 指定项目生成路径；

<!---->

-   proto_path/I: 当 idl 为 protobuf 时，指定 idl 的搜索路径，同 protoc 的 -I 指令

<!---->

-   protoc/p: 透传给 protoc 的选项({flag}={value})

<!---->

-   snake_tag: snake_tag：tag 使用 snake_case 风格命名(仅对 form、query、json 生效)

<!---->

-   thriftgo/t: 透传给thriftgo的选项({flag}={value})

<!---->

-   unset_omitempty: 当 idl 为 protobuf 时，生成 model field，去掉 mitempty tag；当 idl 为 thrift 时，是否添加 omitempty 根据 field 是 "optional"还是"required"决定

## 注意事项

### 使用 protobuf IDL 的注意事项

hz 目前支持 [proto2](https://developers.google.com/protocol-buffers/docs/proto) / [proto3](https://developers.google.com/protocol-buffers/docs/proto3) 的语法

**我们希望用户在定义 protobuf idl 的时候指定 go_package**，这样一来符合 protobuf 的语义，二来生成的 model 位置可以通过 go_package来决定。如果用户不指定 go_package，hz 会默认将 proto文件的 package 做为 go_package，可能会有一些预期外的命名冲突。

例如，可以这样定义 go_package

```
option go_package = "hello.world"; // or hello/world
```

model 生成的路径会是：

`${项目路径}/${model_dir}/hello/world`

handler 文件会取 go_package 最后一级作为生成路径，其生成路径会是：

`${项目路径}/${handler_dir}/world`

router 注册文件同样会取 go_package 最后一级作为生成路径，其生成路径会是：

`${项目路径}/biz/router/world`

### 使用 thrift IDL 的注意事项

**hz 对于 thrift idl 的定义无特殊要求**，符合语法规范即可。代码的生成路径会和 thrift 的 namespace 相关。

例如，可以这样定义 namespace

```
 namespace go hello.world
```

model 生成的路径会是：

`${项目路径}/${model_dir}/hello/world`

handler 文件会取 namespace 作为生成路径，其生成路径会是：

`${项目路径}/${handler_dir}/hello/world`

router 注册文件同样会取 namespace 最后一级作为生成路径，其生成路径会是：

`${项目路径}/biz/router/hello/world`

### 使用 update 命令时的行为说明

1.  使用自定义路径的注意事项

hz 为了用户使用方便，提供了自定义 handler 路径、model 路径、模板等功能。但是 hz 在创建一个新项目的时候并没有保存当前项目的信息，所以在使用 update 命令时可以认为是一种无状态的更新。因此对于同一套 idl 在 new 和 update 的时候，使用了不同的自定义信息，可能会产生重复的代码，举个例子，如下：

创建新项目：

```
hz new -idl demo.thrift

此时，hz 会把 model 生成在 "biz/mdoel"下
```

更新项目：

```
hz update -idl demo.thrift --model_dir=my_model

此时，hz 不会更新"biz/model"下的 model 代码，而是会在"my_model"下；这时"biz/model"和"my_model"下的代码就会重复，且新生成的handler会依赖"my_model"，之前的handler会依赖"biz/model"，这时就需要用户手动删除&改动一些代码了。
```

因此，**我们希望用户使用 update 命令的时候，自定义的路径 "client_dir"、"model_dir"、"handler_dir"，最好 new 和相同。**

2.  update handler的行为

hz 在 new 项目的时候会根据默认模板/自定义模板来生成 handler，其中每个 service 生成一个文件，该文件包含了该 service 定义的所有 handler 代码；如果 idl 定义了多个 service，则每个 service 都会生成一个文件，这些文件都在同一路径下；举个例子：

```
// demo.thrift
namespace go hello.example

service Service1 {
    HelloResp Method1(1: HelloReq request) (api.get="/hello");
}

service Service2 {
    HelloResp Method2(1: HelloReq request) (api.get="/new");
}

// 那么该 idl 生成的 handler 文件如下：
${handler_dir}/${namespace}/service1.go -> method1
${handler_dir}/${namespace}/service2.go -> method2
```

**当该 idl 增加了新的 method 后，就会在对应 service 的文件的末尾追加 handler 模板；注意这里追加的 handler 会使用默认的模板，新生成 service 文件会根据情况使用自定义模板。**

3.  update router 的行为

hz 在 new 的时候生成的 router 代码主要有如下三个：

-   biz/router/${namespace}/${idlName}.go: 每个主 idl 都会生成对应的路由注册代码文件，该文件以路由组的方式注册 idl 中定义的所有路由，并设置默认的中间件。

<!---->

-   biz/router/${namespace}/middleware.go: 每个主 idl 对应的默认中间件函数，用户可修改中间件函数，以此为特定的路由增加特定的中间件逻辑。

<!---->

-   biz/router/register.go：该文件负责调用不同 idl 生成的路由注册；比如我在两个 idl "demo1.thrift"、"demo2.thrift"中都定义了 service ，那么这两个文件都会生成对应的路由注册代码。register.go 负责调用这两部分的路由注册函数。

基于上述描述，给出 router 在 update 时的行为描述：

-   biz/${namespace}/${idlName}.go: 每次都基于 idl 重新生成，用户不要改该文件代码，否则会丢失代码。

<!---->

-   biz/${namespace}/middleware.go: 每次都会在尾部追加目前没有的 middleware。

<!---->

-   biz/router/register.go: 如果有新增的 idl 会插入新的 idl 的路由注册方式。
