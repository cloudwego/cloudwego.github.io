---
title: "代码生成工具"
date: 2023-03-10
weight: 1
description: >
---

> 本篇文档及示例所使用的 Kitex 代码生成工具版本为 v0.5.0

**kitex** 是 Kitex 框架提供的用于生成代码的一个命令行工具。目前，kitex 支持 thrift 和 protobuf 的 IDL，并支持生成一个服务端项目的骨架。

## 安装

> Windows 环境，需要 Kitex 命令行工具版本 >= v0.5.2

Kitex 代码生成依赖于 thriftgo 和 protoc，需要先安装相应的编译器：[thriftgo](https://github.com/cloudwego/thriftgo) 或 [protoc](https://github.com/protocolbuffers/protobuf/releases)。

安装完上述工具后，通过 go 命令安装命令行工具本身

```shell
go install github.com/cloudwego/kitex/tool/cmd/kitex@latest
```

你也可以自己下载 Kitex 源码后，进入 `tool/cmd/kitex` 目录执行 `go install` 进行安装

完成后，可以通过执行 `kitex -version` 查看工具版本，或者 `kitex -help` 查看使用帮助。

## 生成代码

生成代码分两部分，一部分是结构体的编解码序列化代码，由底层编译器 thriftgo 或 protoc 生成；另一部分由 kitex 工具在前者产物上叠加，生成用于创建和发起 RPC 调用的桩代码。用户只需要执行 Kitex 代码生成工具，底层会自动完成所有代码的生成。

kitex 工具生成代码的语法为 `kitex [options] xx.thrfit/xxx.proto` ，option 用法可参考文末。

以 thrift 场景为例，有如下两个 IDL 文件：

```thrift
// 文件1：example.thrift
namespace go test
include "base.thrift"

struct MyReq{
    1:required string input
    2:required base.BaseReq baseReq
}

service MyService{
    string Hello(1:required MyReq req)
}

// 文件2：base.thrift
struct BaseReq{
    1:required string name
}
```

如果当前目录在 Go Path 下，执行如下命令：

```shell
kitex example.thrift
```

若报错 `Outside of $GOPATH. Please specify a module name with the '-module' flag.` ，说明当前目录没在 Go Path 下，需要创建 go mod，并通过 `-module` 指定 go mod 并执行如下命令：

```shell
kitex -module xxx example.thrift
```

执行后，在当前目录下会生成一个名为 kitex_gen 目录，内容如下：

```
kitex_gen/
├── base					// base.thrift 的生成内容，没有 go namespace 时，以 idl 文件名小写作为包名
│   ├── base.go				// thriftgo 生成，包含 base.thrift 定义的内容的 go 代码
│   ├── k-base.go			// kitex 生成，包含 kitex 提供的额外序列化优化实现
│   └── k-consts.go			// 避免 import not used 的占位符文件
└── test					// example.thrift 的生成内容，用 go namespace 为包名
    ├── example.go			// thriftgo 生成，包含 example.thrift 定义的内容的 go 代码
    ├── k-consts.go			// 避免 import not used 的占位符文件
    ├── k-example.go		// kitex 生成，包含 kitex 提供的额外序列化优化实现
    └── myservice			// kitex 为 example.thrift 里定义的 myservice 生成的代码
        ├── client.go		// 提供了 NewClient API
        ├── invoker.go		// 提供了 Server SDK 化的 API
        ├── myservice.go	// 提供了 client.go 和 server.go 共用的一些定义
        └── server.go		// 提供了 NewServer API
```

### 生成带有脚手架的代码

上文的案例代码并不能直接运行，需要自己完成 NewClient 和 NewServer 的构建。kitex 命令行工具提供了 `-service` 参数能直接生成带有脚手架的代码，执行如下命令：

```shell
kitex -service mydemoservice demo.thrift
```

生成结果如下：

```
├── build.sh			// 快速构建服务的脚本
├── handler.go		    // 为 server 生成 handler 脚手架
├── kitex_info.yaml  	// 记录元信息，用于与 cwgo 工具的集成
├── main.go		 	 // 快速启动 server 的主函数
└── script			 // 构建服务相关脚本
│    └── bootstrap.sh
├── kitex_gen
     └── ....
    
```

在 `handler.go` 的接口中填充业务代码后，执行 `main.go` 的主函数即可快速启动 Kitex Server。

## 库依赖

kitex 生成的代码会依赖相应的 Go 语言代码库：

- 对于 thrift IDL，是 `github.com/apache/thrift v0.13.0`
- 对于 protobuf IDL，是 `google.golang.org/protobuf`，具体版本取决于 Kitex 不同版本，用户无需特别指定

需要注意的是，`github.com/apache/thrift/lib/go/thrift v0.14.0` 版本开始提供的 API 和之前的版本是**不兼容的**，如果在更新依赖的时候给 `go get` 命令增加了 `-u` 选项，会导致该库更新到不兼容的版本造成编译失败。通常会有这样的报错：

> not enough arguments in call to iprot.ReadStructBegin

因此 Kitex 命令行工具（version >= v0.4.5）在生成代码时，会默认在 `go.mod` 里通过 replace 指定 v0.13.0。

如果因为某些原因被删除了，可通过如下 `replace` 指令重新强制固定该版本：

```shell
go mod edit -replace github.com/apache/thrift=github.com/apache/thrift@v0.13.0
```

## 使用 protobuf IDL 的注意事项

kitex 仅支持 protocol buffers 的 [proto3](https://developers.google.com/protocol-buffers/docs/proto3) 版本的语法。

IDL 里的 `go_package` 是必需的，其值可以是一个用点（`.`）或斜线（`/`）分隔的包名序列，决定了生成的 import path 的后缀。例如

```
option go_package = "hello.world"; // or hello/world
```

生成的 import path 会是 `${当前目录的 import path}/kitex_gen/hello/world`。

如果你给 `go_package` 赋值一个完整的导入路径（import path），那么该路径必须匹配到当前模块的 kitex_gen 才会生成代码。即：

- `go_package="${当前模块的 import path}/kitex_gen/hello/world";`：OK，kitex 会为该 IDL 生成代码；
- `go_package="${当前模块的 import path}/hello/world";`：kitex 不会为该 IDL 生成代码；
- `go_package="any.other.domain/some/module/kitex_gen/hello/world";`：kitex 不会为该 IDL 生成代码；

你可以通过命令行参数 `--protobuf Msome.proto=your.package.name/kitex_gen/wherever/you/like` 来覆盖某个 proto 文件的 `go_package` 值。具体用法说明可以参考 Protocol Buffers 的[官方文档](https://developers.google.com/protocol-buffers/docs/reference/go-generated#package)。

## 选项

本文描述的选项可能会过时，可以用 `kitex -h` 或 `kitex --help` 来查看 kitex 的所有可用的选项。

#### `-service service_name`

使用该选项时，kitex 会生成构建一个服务的脚手架代码，参数 `service_name` 给出启动时服务自身的名字，通常其值取决于使用 Kitex 框架时搭配的服务注册和服务发现功能。

#### `-module module_name`

该参数用于指定生成代码所属的 Go 模块，会影响生成代码里的 import path。

1. 如果当前目录是在 `$GOPATH/src` 下的一个目录，那么可以不指定该参数；kitex 会使用 `$GOPATH/src` 开始的相对路径作为 import path 前缀。例如，在 `$GOPATH/src/example.com/hello/world` 下执行 kitex，那么 `kitex_gen/example_package/example_package.go` 在其他代码代码里的 import path 会是 `example.com/hello/world/kitex_gen/example_package`。
2. 如果当前目录不在 `$GOPATH/src` 下，那么必须指定该参数。
3. 如果指定了 `-module` 参数，那么 kitex 会从当前目录开始往上层搜索 go.mod 文件

   - 如果不存在 go.mod 文件，那么 kitex 会调用 `go mod init` 生成 go.mod；
   - 如果存在 go.mod 文件，那么 kitex 会检查 `-module` 的参数和 go.mod 里的模块名字是否一致，如果不一致则会报错退出；
   - 最后，go.mod 的位置及其模块名字会决定生成代码里的 import path。

#### `-I path`

添加一个 IDL 的搜索路径。支持添加多个，搜索 IDL（包括 IDL 里 include 的其他文件）时，会按照添加的路径顺序搜索。

path 输入也可以支持 git 拉取，当前缀为 git@，http://，https:// 时，会拉取远程 git 仓库到本地，并将其列入搜索路径。使用方式如下：

```shell
kitex -module xx -I xxx.git abc/xxx.thrift
```

或使用 `@xxx` 指定分支拉取：

```shell
kitex -module xx -I xxx.git@branch abc/xxx.thrift

```

执行时会先拉取 git 仓库，存放于 ~/.kitex/cache/xxx/xxx/xxx@branch 目录下，然后再在此目录下搜索 abc/xxx.thrift 并生成代码

#### `-v` 或 `-verbose`

输出更多日志。

#### `-use path`

在生成服务端代码（使用了 `-service`）时，可以用 `-use` 选项来让 kitex 不生成 kitex_gen 目录，而使用该选项给出的 import path。

#### `-combine-service`

对于 thrift IDL，kitex 在生成服务端代码脚手架时，只会针对最后一个 service 生成相关的定义。如果你的 IDL 里定义了多个 service 定义并且希望在一个服务里同时提供这些 service 定义的能力时，可以使用 `-combine-service` 选项，详见 [Combine Service](/zh/docs/kitex/tutorials/code-gen/combine_service/).

该选项会生成一个合并了目标 IDL 文件中所有 service 方法的 `CombineService`，并将其用作 main 包里使用的 service 定义。注意这个模式下，被合并的 service 之间不能有冲突的方法名。

#### `-protobuf value`

传递给 protoc 的参数。会拼接在 `-go_out` 的参数后面。可用的值参考 `protoc` 的帮助文档。

#### `-thrift value`

传递给 thriftgo 的参数。会拼接在 `-g go:` 的参数后面。可用的值参考 `thriftgo` 的帮助文档。kitex 默认传递了 `naming_style=golint,ignore_initialisms,gen_setter,gen_deep_equal`，可以被覆盖。

#### `-record`

有的场景下，可能需要多次运行 Kitex 命令，为多个 IDL 生成代码。 `-record` 参数用于自动记录每次执行的 Kitex 命令并生成脚本文件，以便更新时批量重新执行。

使用方式：

```shell
kitex -module xxx -service xxx -record xxx.thrift
```

带上 -record 参数执行后，在执行目录下生成 kitex-all.sh 文件，记录本次命令
若多次带有 -record 参数则多次进行记录
kitex-all.sh 内容如下:

```shell

#!/bin/bash

kitex -module xxx -service xxx xxx.thrift
kitex -module xxx xxxa.thrift
kitex -module xxx xxxb.thrift
kitex -module xxx xxxc.thrift
kitex -module xxx xxxd.thrift

....新执行的命令继续记录

```

命令记录并不是每次都只往后追加，规则如下：

- 只会记录一条带有 -service 的命令
- 记录的命令的 idl path 如果是新的，则在末尾追加记录
- 如果 idl path 是已存在的，则对原记录覆盖

想重新生成代码，执行 kitex-all.sh 即可。若想手动调整，打开脚本文件直接编辑命令即可

#### `-gen-path`

> 目前只在 thrift 场景生效，protobuf 侧待后续完善实现。

默认场景，kitex 会将代码生成在 kitex_gen 目录下，可以通过 -gen-path 进行调整

#### `-protobuf-plugin`

支持拓展 protoc 的插件，可接入丰富的 protoc 插件生态，为拓展生成代码提供方便

使用方法如下：

```shell
kitex -protobuf-plugin {plugin_name:options:out_dir} idl/myservice.proto
```

其中：

- plugin_name: 表示要执行的插件名；例如"protoc-gen-go"，那么他的插件名就为 "go"
- options: 表示传递给插件的选项；通常会传递一些类似 "go module" 等信息
- out_dir: 表示插件生成代码的路径；如无特殊需求，一般指定为 "." 即可

以上 3 个选项可映射为如下的 protoc 命令，可被 kitex 自动拼接&执行:

```shell
protoc
    --{$plugin_name}_out={$out_dir}
    --{$plugin_name}_opt={$options}
    idl/myservice.proto
```

例如希望使用 [protoc-gen-validator](https://github.com/cloudwego/protoc-gen-validator) 插件，可以执行如下命令：

```shell
kitex
    -protobuf-plugin=validator:module=toutiao/middleware/kitex,recurse=true:.
    idl/myservice.proto
```
