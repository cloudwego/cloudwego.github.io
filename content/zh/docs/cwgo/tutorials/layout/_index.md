---
title: "Layout"
linkTitle: "Layout"
weight: 2
description: >
---

cwgo 工具支持目前支持生成 MVC Layout，未来还会拓展更多的模板供用户使用。

## 代码结构

使用 cwgo 工具生成 server 代码时会自动生成 MVC layout。完成[快速上手](https://www.cloudwego.io/zh/docs/cwgo/getting-started/)里面的步骤指引，会在本地生成一个 demo，其 HTTP 项目目录如下:

```console
├── biz // 业务逻辑目录
│   ├── dal // 数据访问层
│   │   ├── init.go
│   │   ├── mysql
│   │   │   └── init.go
│   │   └── redis
│   │       └── init.go
│   ├── handler // view 层
│   │   └── hello
│   │       └── example
│   │           ├── hello_service.go // handler 文件，用户在该文件里实现 IDL service 定义的方法，update 时会查找当前文件已有的 handler 后，在尾部追加新的 handler
│   │           └── hello_service_test.go // 单测文件
│   ├── router // idl 中定义的路由相关生成代码
│   │   ├── hello
│   │   │   └── example // hello/example 对应 thrift idl 中定义的namespace；而对于 protobuf idl，则是对应 go_package 的最后一级
│   │   │       ├── hello.go  // cwgo 为 hello.thrift 中定义的路由生成的路由注册代码；每次 update 相关 idl 会重新生成该文件
│   │   │       └── middleware.go // 默认中间件函数，hz 为每一个生成的路由组都默认加了一个中间件；update 时会查找当前文件已有的 middleware 在尾部追加新的 middleware
│   │   └── register.go // 调用注册每一个 idl 文件中的路由定义；当有新的 idl 加入，在更新的时候会自动插入其路由注册的调用；勿动
│   ├── service // service 层，业务逻辑存放的地方。更新时，新的方法会追加文件。
│   │   ├── hello_method.go // 具体的业务逻辑
│   │   └── hello_method_test.go
│   └── utils // 工具目录
│       └── resp.go
├── build.sh // 编译脚本
├── conf // 存放不同环境下的配置文件
│     └── ...
├── docker-compose.yaml
├── go.mod // go.mod 文件，如不在命令行指定，则默认使用相对于GOPATH的相对路径作为 module 名
├── hertz_gen // IDL 内容相关的生成代码
│   └── ...
├── idl
│   └── hello.thrift
├── main.go // 程序入口
├── readme.md
└── script // 启动脚本
    └── bootstrap.sh
```

RPC 项目目录如下

```console
├── biz // 业务逻辑目录
│   ├── dal // 数据访问层
│   │   ├── init.go
│   │   ├── mysql
│   │   │   └── init.go
│   │   └── redis
│   │       └── init.go
│   └── service // service 层，业务逻辑存放的地方。更新时，新的方法会追加文件。
│       ├── HelloMethod.go
│       └── HelloMethod_test.go
├── build.sh
├── conf // 存放不同环境下的配置文件
│     └── ...
├── docker-compose.yaml
├── go.mod // go.mod 文件，如不在命令行指定，则默认使用相对于GOPATH的相对路径作为 module 名
├── handler.go // 业务逻辑入口，更新时会全量覆盖
├── idl
│   └── hello.thrift
├── kitex.yaml
├── kitex_gen // IDL 内容相关的生成代码，勿动
│     └── ...
├── main.go // 程序入口
├── readme.md
└── script // 启动脚本
    └── bootstrap.sh
```
