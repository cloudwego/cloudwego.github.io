---
title: "hz 接入第三方生成代码插件"
date: 2023-01-21
weight: 3
keywords: ["插件", "ThriftGo", "Protoc", "go_package"]
description: "hz 接入第三方生成代码插件。"
---

目前，hz 的代码生成是基于 "thriftgo" 和 "protoc" 的插件模式生成的，这对于接入一些第三方的插件提供了很大的帮助，尤其是对于 "protoc" 来说，目前其支持的插件生态相当丰富。

因此，hz 提供了拓展第三方插件的方法。

## ThriftGo 插件扩展

### 使用方法

```shell
hz new  --idl={YOUR-IDL.thrift} --thrift-plugins={PLUGIN-NAME}
```

如果插件需要传一些选项的话，如下：

```shell
hz new --idl={YOUR-IDL.thrift} --thrift-plugins={PLUGIN-NAME}:{YOUR-OPTION1,YOUR-OPTION2} --mod={YOUR_MODULE}
```

### 示例

目前，thriftgo 提供一个生成结构体参数验证函数的插件 "thrift-gen-validator"，可在生成 model 的时候一并生成结构体参数验证函数。

- 安装：`go install github.com/cloudwego/thrift-gen-validator@latest`

- 使用：`hz new --idl=idl/hello.thrift --thrift-plugins=validator`

- 代码：[code](https://github.com/cloudwego/hertz-examples/tree/main/hz/plugin/thrift)

## Protoc 插件拓展

Protoc 插件相关的代码生成位置与 proto 文件的 go_package 有关，详情可 [参考](/zh/docs/hertz/tutorials/toolkit/cautions/#使用-protobuf-idl-时的-biz-层代码生成位置)。

### 使用方法

```shell
hz new  --idl={YOUR-IDL.proto} --protoc-plugins={PLUGIN-NAME}
```

如果插件需要传一些选项的话，如下：

```shell
hz new --idl={YOUR-IDL.proto} --protoc-plugins={PLUGIN_NAME}:{OPTION1,OPTION2}:{OUT_DIR} --mod={YOUR_MODULE}
```

### 示例

这里以使用 hz 时集成 `protoc-gen-openapi` 插件用来生成 openapi 3.0 文档为例。

- 安装:`go install github.com/google/gnostic/cmd/protoc-gen-openapi@latest`
- 定义 idl 的 go_package:"middleware/hertz/biz/model/psm"
- 使用：`hz new -I=idl --idl=idl/hello/hello.proto --protoc-plugins=openapi::./docs --mod=middleware/hertz`

- 代码：[code](https://github.com/cloudwego/hertz-examples/tree/main/hz/plugin/proto)
