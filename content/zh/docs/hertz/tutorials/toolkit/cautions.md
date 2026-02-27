---
title: "注意事项"
date: 2023-02-21
weight: 8
keywords: ["注意事项", "protobuf", "thrift"]
description: "使用 hz 时的注意事项。"
---

## 使用 protobuf IDL 时的 biz 层代码生成位置

hz 目前支持 [proto2](https://developers.google.com/protocol-buffers/docs/proto) / [proto3](https://developers.google.com/protocol-buffers/docs/proto3) 的语法。

### model 文件的位置

**我们希望用户在定义 protobuf idl 的时候指定 go_package**，这样一来符合 protobuf 的语义，二来生成的 model 位置可以通过 go_package 来决定。如果用户不指定 go_package，hz 会默认将 proto 文件的 package 作为 go_package，可能会有一些预期外的命名冲突。

目前 hz 为统一管理生成的 model，对 "go_package" 进行了一些处理，其规则如下:

假设当前项目是 github.com/a/b (module=github.com/a/b):

- go_package="github.com/a/b/c/d": 会在 "/biz/model/c/d" 下生成代码；
- go_package="github.com/a/b/biz/model/c/d": 会在 "/biz/model/c/d" 下生成 model，其中 "biz/model" 是默认的 model 生成路径，可使用 "--model_dir" 选项修改；
- go_package="x/y/z": 会在 "biz/model/x/y/z" 下生成代码（相对路径补全）；
- go_package="biz/model/c/d": 会在"biz/model/biz/model/c/d" 下生成代码。

**推荐用户定义如“{$MODULE}/{$MODEL_DIR}/x/y/z” (其中 {$MODEL_DIR} 默认为"biz/model", 用户也可使用“model_dir”选项来定义) 这样的“go_package”。**

### handler 文件的位置

handler 文件会取 go_package 最后一级作为生成路径。

例如，若 go_package = "hello.world"，其生成路径会是：

`${项目路径}/${handler_dir}/world`

### router 文件的位置

router 注册文件同样会取 go_package 最后一级作为生成路径。

例如，若 go_package = "hello.world"，其生成路径会是：

`${项目路径}/${router_dir}/world`

## 使用 thrift IDL 时的 biz 层代码生成位置

**hz 对于 thrift idl 的定义无特殊要求**，符合语法规范即可。代码的生成路径会和 thrift 的 namespace 相关。

例如，可以这样定义 namespace：

```thrift
 namespace go hello.world
```

model 生成的路径会是：

`${项目路径}/${model_dir}/hello/world`

handler 文件会取 namespace 作为生成路径，其生成路径会是：

`${项目路径}/${handler_dir}/hello/world`

router 注册文件同样会取 namespace 作为生成路径，其生成路径会是：

`${项目路径}/${router_dir}/hello/world`

## 使用 update 命令时的行为说明

1. 使用自定义路径的注意事项

   hz 为了用户使用方便，提供了自定义 handler 路径、model 路径、模板等功能。但是 hz 在创建一个新项目的时候并没有保存当前项目的信息，所以在使用 update 命令时可以认为是一种无状态的更新。因此对于同一套 idl 在 new 和 update 的时候，使用了不同的自定义信息，可能会产生重复的代码，举个例子，如下：

   创建新项目：

   ```bash
   hz new -idl demo.thrift

   // 此时，hz 会把 model 生成在 "biz/model"下
   ```

   更新项目：

   ```bash
   hz update -idl demo.thrift --model_dir=my_model

   // 此时，hz 不会更新"biz/model"下的 model 代码，而是会在"my_model"下；这时"biz/model"和"my_model"下的代码就会重复，且新生成的 handler 会依赖"my_model"，之前的 handler 会依赖"biz/model"，这时就需要用户手动删除&改动一些代码了。
   ```

   因此，**我们希望用户使用 update 命令的时候，自定义的路径 "client_dir"、"model_dir"、"handler_dir"，最好和 new 相同。**

2. update handler 的行为

   hz 在 new 项目的时候会根据默认模板/自定义模板来生成 handler，其中每个 service 生成一个文件，该文件包含了该 service 定义的所有 handler 代码；如果 idl 定义了多个 service，则每个 service 都会生成一个文件，这些文件都在同一路径下；举个例子：

   ```thrift
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

3. update router 的行为

   hz 在 new 的时候生成的 router 代码主要有如下三个：

- biz/router/${namespace}/${idlName}.go: 每个主 idl 都会生成对应的路由注册代码文件，该文件以路由组的方式注册 idl 中定义的所有路由，并设置默认的中间件。

<!---->

- biz/router/${namespace}/middleware.go: 每个主 idl 对应的默认中间件函数，用户可修改中间件函数，以此为特定的路由增加特定的中间件逻辑。

<!---->

- biz/router/register.go：该文件负责调用不同 idl 生成的路由注册；比如我在两个 idl "demo1.thrift"、"demo2.thrift" 中都定义了 service，那么这两个文件都会生成对应的路由注册代码。register.go 负责调用这两部分的路由注册函数。

  基于上述描述，给出 router 在 update 时的行为描述：

- biz/${namespace}/${idlName}.go: 每次都基于 idl 重新生成，用户不要改该文件代码，否则会丢失代码。

<!---->

- biz/${namespace}/middleware.go: 每次都会在尾部追加目前没有的 middleware。

<!---->

- biz/router/register.go: 如果有新增的 idl 会插入新的 idl 的路由注册方式。

## 使用 Windows 操作系统时的注意事项

使用 `hz` 命令创建项目时将用到 `symlink`，在 Windows 操作系统下你可能需要 [开启开发者模式](https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development) 来启用用户权限的 symlink。

在基于 protobuf IDL 创建项目时，你需要手动安装 [protoc 命令行工具](https://github.com/protocolbuffers/protobuf/releases) 至 PATH 环境变量，另外如果你使用 `google/protobuf` 包下的文件，你需要将 protoc-win64.zip 中 include 目录下的所有文件放在 protoc 同一目录。
