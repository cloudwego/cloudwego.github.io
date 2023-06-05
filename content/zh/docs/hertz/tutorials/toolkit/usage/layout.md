---
title: 'hz 生成代码的结构'
date: 2023-02-21
weight: 5
description: >
---
### 生成代码的结构

hz 生成的代码结构都类似，下面以"基于 thrift IDL 创建项目"小节生成的代码结构为例，说明 hz 生成的代码的含义。

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
│       ├── hello                      // hello/example 对应 thrift idl 中定义的 namespace；而对于 protobuf idl，则是对应 go_package 的最后一级
│       │   └── example
│       │       ├── hello.go           // hz 为 hello.thrift 中定义的路由生成的路由注册代码；每次 update 相关 idl 会重新生成该文件
│       │       └── middleware.go      // 默认中间件函数，hz 为每一个生成的路由组都默认加了一个中间件；update 时会查找当前文件已有的 middleware 在尾部追加新的 middleware
│       └── register.go                // 调用注册每一个 idl 文件中的路由定义；当有新的 idl 加入，在更新的时候会自动插入其路由注册的调用；勿动
├── go.mod                             // go.mod 文件，如不在命令行指定，则默认使用相对于 GOPATH 的相对路径作为 module 名
├── idl                                // 用户定义的 idl，位置可任意
│   └── hello.thrift
├── main.go                            // 程序入口
├── router.go                          // 用户自定义除 idl 外的路由方法
└── router_gen.go                      // hz 生成的路由注册代码，用于调用用户自定义的路由以及 hz 生成的路由
```
