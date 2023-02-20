---
title: 'hz 接入第三方生成代码插件'
date: 2023-01-21
weight: 3
description: >
---

目前，hz 的代码生成是基于 "thriftgo" 和 "protoc" 的插件模式生成的，这对于接入一些第三方的插件提供了很大的帮助，尤其是对于 "protoc" 来说，目前其支持的插件生态相当丰富。 

因此，hz 提供了拓展第三方插件的方法。

# ThriftGo 插件扩展

## 使用方法

```shell
hz new  --idl={YOUR-IDL.thrift} --thrift-plugins={PLUGIN-NAME}
```

如果插件需要传一些选项的话，如下

```shell
hertztool new --idl={YOUR-IDL.thrift} --thrift-plugins={PLUGIN-NAME}:{YOUR-OPTION1,YOUR-OPTION2}
```

## 示例

目前， thriftgo 提供一个生成结构体参数验证函数的插件 "thrift-gen-validator"，可在生成 model 的时候一并生成结构体参数验证函数。

- 安装: `go install github.com/cloudwego/thrift-gen-validator@latest`

- 使用: `hz new --idl=idl/hello.thrift --thrift-plugins=validator`

- 代码: [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/plugin/thrift)


# Protoc 插件拓展

## go_package 详解

Protoc 插件生成的 go 文件路径与 "option go_package" 的定义相关。因此先来仔细介绍下 "go_package" 的作用:
"option go_package"  在 proto 文件中指该文件生成的 go 文件的 import 位置，如下


如果 option go_package 这么定义:

```protobuf
option go_package = "github.com/a/b/c";
```

那么如果要引用生成它的内容，则可按照如下方法:

```go
import "github.com/a/b/c"

var req c.XXXStruct
```

此外，"option go_package" 还和生成代码的路径有关系，如下

如果 option go_package 这么定义:

```protobuf
// psm.proto
option go_package = "github.com/a/b/c";
```

那么生成的 go 文件的位置为: github.com/a/b/c/psm.pb.go

另外，"option go_package" 还可以和 go module 进行配合，如下

如果 option go_package 这么定义:

```protobuf
// psm.proto
option go_package = "github.com/a/b/c";
```

初始化 go module
```shell
go mod init github.com/a/b
```

生成代码并指定 module
```shell
protoc go_out=. --go_opt=module=github.com/a/b psm.proto
```

那么生成文件的位置为: c/psm.pb.go，不过，由于该项目的 module 为 "github.com/a/b"；所以如果引用该文件的生成内容的话，其 import 路径依然是 "github.com/a/b/c"


## 使用方法

目前 hz 为统一管理生成的 model， 对 "go_package" 进行了一些处理， 其规则如下:

假设当前项目是 github.com/a/b:
- go_package="github.com/a/b/c/d": 会在 "/biz/model/c/d" 下生成代码；(不变)
- go_package="github.com/a/b/biz/model/c/d": 会在 "/biz/model/c/d" 下生成 model ，其中 "biz/model" 是默认的 model 生成路径，可使用 "-model_dir" 选项修改。
- go_package="x/y/z": 会在 "biz/model/x/y/z" 下生成代码（相对路径补全）（不变）；
- go_package="google.com/whatever": 不会生成代码（外部 IDL）（不变）；
- go_package="github.com/a/b/c": 会在"biz/model/c" 下生成代码（不变）；


因此，用户只需定义如 "{$MODULE}/{$MODEL_DIR}/x/y/z" 这样的 "go_package" (其中 {$MODEL_DIR} 默认为"biz/model", 用户也可使用 "model_dir" 选项来定义)，就可以完成 hz 侧的第三方插件接入。

使用命令:

```shell
hertztool new --idl={YOUR-IDL.proto} --protoc-plugins={PLUGIN_NAME}:{OPTION1,OPTION2}:{OUT_DIR} --mod={YOUR_MODULE}
```

## 示例

这里以使用 Hz 时集成 `protoc-gen-openapi` 插件用来生成 openapi 3.0 文档为例。

- 安装:`go install github.com/google/gnostic/cmd/protoc-gen-openapi@latest`
  
- 定义 idl 的 go_package:"middleware/hertz/biz/model/psm"
  
- 使用: `hz new -I=idl --idl=idl/hello/hello.proto --protoc-plugins=openapi::./docs --mod=middleware/hertz`

- 代码: [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/plugin/proto)
