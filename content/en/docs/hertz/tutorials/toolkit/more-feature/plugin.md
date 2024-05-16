---
title: "hz access plugin"
date: 2023-01-21
weight: 3
keywords: ["plugin", "ThriftGo", "Protoc", "go_package"]
description: "hz access third-party generated code plugins."
---

Currently, hz code generation is based on the plugin model of "thriftgo" and "protoc", which is a great help in accessing some third party plugins, especially for "protoc" which currently supports a rich plugin ecosystem.

So hz provides the means to extend third-party plug-ins.

## ThriftGo Plugin

### Usage

```shell
hz new  --idl={YOUR-IDL.thrift} --thrift-plugins={PLUGIN-NAME}
```

If the plugin needs to pass some options, they are as follows:

```shell
hz new --idl={YOUR-IDL.thrift} --thrift-plugins={PLUGIN-NAME}:{YOUR-OPTION1,YOUR-OPTION2}
```

### Example

Currently, `thriftgo` provides a plugin "thrift-gen-validator" for generating structural parameter validation functions that can be generated along with the model.

- Install : `go install github.com/cloudwego/thrift-gen-validator@latest`

- Use : `hz new --idl=idl/hello.thrift --thrift-plugins=validator`

- Code : [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/plugin/thrift)

## Protoc plugin extension

The code generation location related to the Protoc plugin is related to the go_package of the proto file. For details, please refer to [reference](/docs/hertz/tutorials/toolkit/cautions/#location-of-biz-layer-code-generation-when-using-protobuf-idl).

### Usage

```shell
hz new  --idl={YOUR-IDL.proto} --protoc-plugins={PLUGIN-NAME}
```

If the plugin needs to pass some options, as follows:

```shell
hz new --idl={YOUR-IDL.proto} --protoc-plugins={PLUGIN_NAME}:{OPTION1,OPTION2}:{OUT_DIR} --mod={YOUR_MODULE}
```

### Example

Here is an example of using the hz integration `protoc-gen-openapi` plugin to generate openapi 3.0 documentation.

- Install :`go install github.com/google/gnostic/cmd/protoc-gen-openapi@latest`

- Define go_package for idl: "middleware/hertz/biz/model/psm"

- Usage : `hz new -I=idl --idl=idl/hello/hello.proto --protoc-plugins=openapi::./docs --mod=middleware/hertz`

- Code : [code](https://github.com/cloudwego/hertz-examples/tree/main/hz/plugin/proto)
