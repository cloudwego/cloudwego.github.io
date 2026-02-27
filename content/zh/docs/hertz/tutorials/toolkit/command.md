---
title: "hz 命令梳理"
date: 2023-02-21
weight: 7
keywords: ["hz 命令梳理", "New", "Update", "Model", "Client"]
description: "hz 命令梳理。"
---

## 命令行参数说明

#### Global

```console
$ hz --help
NAME:
   hz - A idl parser and code generator for Hertz projects

USAGE:
   hz [global options] command [command options] [arguments...]

VERSION:
   v0.x.x

COMMANDS:
   new      Generate a new Hertz project
   update   Update an existing Hertz project
   model    Generate model code only
   client   Generate hertz client based on IDL
   help, h  Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --verbose      turn on verbose mode (default: false)
   --help, -h     show help (default: false)
   --version, -v  print the version (default: false)
```

- new: 创建一个新的 Hertz 项目

<!---->

- update: 更新一个已存在的 Hertz 项目

<!---->

- model: 只生成 model 代码

<!---->

- client: 基于 IDL 生成 client 侧代码

### New

```console
$ hz help new
NAME:
   hz new - Generate a new Hertz project

USAGE:
   hz new [command options] [arguments...]

OPTIONS:
   --idl value [ --idl value ]                                            Specify the IDL file path. (.thrift or .proto)
   --service value                                                        Specify the service name.
   --module value, --mod value                                            Specify the Go module name.
   --out_dir value                                                        Specify the project path.
   --handler_dir value                                                    Specify the handler relative path (based on "out_dir").
   --model_dir value                                                      Specify the model relative path (based on "out_dir").
   --router_dir value                                                     Specify the router relative path (based on "out_dir").
   --client_dir value                                                     Specify the client path. If not specified, IDL generated path is used for 'client' command; no client code is generated for 'new' command
   --use value                                                            Specify the model package to import for handler.
   --proto_path value, -I value [ --proto_path value, -I value ]          Add an IDL search path for includes. (Valid only if idl is protobuf)
   --thriftgo value, -t value [ --thriftgo value, -t value ]              Specify arguments for the thriftgo. ({flag}={value})
   --protoc value, -p value [ --protoc value, -p value ]                  Specify arguments for the protoc. ({flag}={value})
   --option_package value, -P value [ --option_package value, -P value ]  Specify the package path. ({include_path}={import_path})
   --no_recurse                                                           Generate master model only. (default: false)
   --force, -f                                                            Force new a project, which will overwrite the generated files (default: false)
   --enable_extends                                                       Parse 'extends' for thrift IDL (default: false)
   --json_enumstr                                                         Use string instead of num for json enums when idl is thrift. (default: false)
   --unset_omitempty                                                      Remove 'omitempty' tag for generated struct. (default: false)
   --pb_camel_json_tag                                                    Convert Name style for json tag to camel(Only works protobuf). (default: false)
   --snake_tag                                                            Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --rm_tag value [ --rm_tag value ]                                      Remove the specified tag
   --exclude_file value, -E value [ --exclude_file value, -E value ]      Specify the files that do not need to be updated.
   --customize_layout value                                               Specify the path for layout template.
   --customize_layout_data_path value                                     Specify the path for layout template render data.
   --customize_package value                                              Specify the path for package template.
   --handler_by_method                                                    Generate a separate handler file for each method. (default: false)
   --protoc-plugins value [ --protoc-plugins value ]                      Specify plugins for the protoc. ({plugin_name}:{options}:{out_dir})
   --thrift-plugins value [ --thrift-plugins value ]                      Specify plugins for the thriftgo. ({plugin_name}:{options})
   --help, -h                                                             show help (default: false)
```

- idl: 指定 idl 文件路径 (.thrift 或者 .proto)

<!---->

- service: 指定服务名，为之后做服务发现等功能预留

<!---->

- module/mod: 指定 go mod 的名字，非 GOPATH 下必须指定，GOPATH 下默认以相对于 GOPATH 的路径作为名字

<!---->

- out_dir: 指定项目生成路径，默认为当前路径

<!---->

- handler_dir: 指定 handler 的生成路径，默认为 "biz/handler" (相对路径，基于 out_dir)

<!---->

- model_dir: 指定 model 的生成路径，默认为 "biz/model" (相对路径，基于 out_dir)

<!---->

- router_dir: 指定 router 的生成路径，默认为 "biz/router" (相对路径，基于 out_dir)

<!---->

- client_dir: 指定 client 侧代码的生成路径，如果不指定则不生成；当前为每个 service 生成一个全局的 client，若要生成更完善的 client 侧代码请使用 [hz client](/zh/docs/hertz/tutorials/toolkit/more-feature/client/) 命令

<!---->

- use: 指定 handler 中 import model 包的位置，该参数适用于在生成 handler 代码之前已经生成过 model 代码的场景，使用该命令可直接 import 已有的 model 代码，无需再次生成

<!---->

- proto_path/I: 当 idl 为 protobuf 时，指定 idl 的搜索路径，同 protoc 的 -I 指令

<!---->

- thriftgo/t: 透传给 thriftgo 的选项 ({flag}={value})

<!---->

- protoc/p: 透传给 protoc 的选项 ({flag}={value})

<!---->

- option_package/P: 指定包的路径 ({include_path}={import_path})

<!---->

- no_recurse: 只生成主 idl 的 model 代码，默认为 false

<!---->

- force/f: 强制创建一个新的 hertz 项目，这将会覆盖已生成的文件

<!---->

- enable_extends: 解析 thrift idl 中的 extends

<!---->

- json_enumstr: 当 idl 为 thrift 时，json enums 使用 string 代替 num (透传给 thriftgo 的选项)

<!---->

- unset_omitempty: 当 idl 为 protobuf 时，生成 model field，去掉 omitempty tag；当 idl 为 thrift 时，是否添加 omitempty 根据 field 是 "optional" 还是 "required" 决定

<!---->

- pb_camel_json_tag: 生成 model field 时将 json tag 的命名风格改为驼峰命名（仅作用于 protobuf）

<!---->

- snake_tag: tag 使用 snake_case 风格命名 (仅对 form、query、json 生效)

<!---->

- rm_tag value: 移除指定的 tag

<!---->

- exclude_file/E: 不需要更新的文件 (相对项目路径，支持多个)

<!---->

- customize_layout: 自定义项目 layout 模板，具体详见：[自定义模板使用](/zh/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- customize_layout_data_path value: 自定义项目 layout 模板渲染参数，具体详见：[自定义模板使用](/zh/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- customize_package: 自定义项目 package 相关模板，主要可针对 handler 模板进行定制化，具体详见：[自定义模板使用](/zh/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- handler_by_method: 为每一个方法生成一个单独的 handler 文件

<!---->

- protoc-plugins: 接入 protoc 相关的第三方生成代码插件，具体详见：[hz 接入第三方生成代码插件](/zh/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- thrift-plugins: 接入 thrift 相关的第三方生成代码插件，具体详见：[hz 接入第三方生成代码插件](/zh/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- help/h: 帮助命令

### Update

```console
$ hz help update
NAME:
   hz update - Update an existing Hertz project

USAGE:
   hz update [command options] [arguments...]

OPTIONS:
   --idl value [ --idl value ]                                            Specify the IDL file path. (.thrift or .proto)
   --module value, --mod value                                            Specify the Go module name.
   --out_dir value                                                        Specify the project path.
   --handler_dir value                                                    Specify the handler relative path (based on "out_dir").
   --model_dir value                                                      Specify the model relative path (based on "out_dir").
   --client_dir value                                                     Specify the client path. If not specified, IDL generated path is used for 'client' command; no client code is generated for 'new' command
   --use value                                                            Specify the model package to import for handler.
   --proto_path value, -I value [ --proto_path value, -I value ]          Add an IDL search path for includes. (Valid only if idl is protobuf)
   --thriftgo value, -t value [ --thriftgo value, -t value ]              Specify arguments for the thriftgo. ({flag}={value})
   --protoc value, -p value [ --protoc value, -p value ]                  Specify arguments for the protoc. ({flag}={value})
   --option_package value, -P value [ --option_package value, -P value ]  Specify the package path. ({include_path}={import_path})
   --no_recurse                                                           Generate master model only. (default: false)
   --enable_extends                                                       Parse 'extends' for thrift IDL (default: false)
   --json_enumstr                                                         Use string instead of num for json enums when idl is thrift. (default: false)
   --unset_omitempty                                                      Remove 'omitempty' tag for generated struct. (default: false)
   --pb_camel_json_tag                                                    Convert Name style for json tag to camel(Only works protobuf). (default: false)
   --snake_tag                                                            Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --rm_tag value [ --rm_tag value ]                                      Remove the specified tag
   --exclude_file value, -E value [ --exclude_file value, -E value ]      Specify the files that do not need to be updated.
   --customize_package value                                              Specify the path for package template.
   --handler_by_method                                                    Generate a separate handler file for each method. (default: false)
   --protoc-plugins value [ --protoc-plugins value ]                      Specify plugins for the protoc. ({plugin_name}:{options}:{out_dir})
   --thrift-plugins value [ --thrift-plugins value ]                      Specify plugins for the thriftgo. ({plugin_name}:{options})
   --help, -h                                                             show help (default: false)
```

- idl: idl 文件路径 (.thrift 或者 .proto)

<!---->

- module/mod: 指定 go mod 的名字，非 GOPATH 下必须指定，GOPATH 下默认以相对于 GOPATH 的路径作为名字

<!---->

- out_dir: 指定项目生成路径，默认为当前路径

<!---->

- handler_dir: 指定 handler 的生成路径，默认为 "biz/handler" (相对路径，基于 out_dir)；注意：如果对同一套 idl 进行 update，需要 handler_dir 的值与使用 new 的时候相同，否则会生成冗余的代码，需要用户自行删除。

<!---->

- model_dir: 指定 model 的生成路径，默认为 "biz/model" (相对路径，基于 out_dir)；注意：如果对同一套 idl 进行 update，需要 model_dir 的值与使用 new 的时候相同，否则会生成重复的 model 代码且导致 handler 引用不一致。

<!---->

- client_dir: 指定 client 侧代码的生成路径，如果不指定则不生成；当前为每个 service 生成一个全局的 client，若要生成更完善的 client 侧代码请使用 [hz client](/zh/docs/hertz/tutorials/toolkit/more-feature/client/) 命令。注意：如果对同一套 idl 进行 update，需要 client_dir 的值与使用 new 的时候相同，否则会生成冗余的代码，需要用户自行删除。

<!---->

- use: 指定 handler 中 import model 包的位置，该参数适用于在生成 handler 代码之前已经生成过 model 代码的场景，使用该命令可直接 import 已有的 model 代码，无需再次生成

<!---->

- proto_path/I: 当 idl 为 protobuf 时，指定 idl 的搜索路径，同 protoc 的 -I 指令

<!---->

- thriftgo/t: 透传给 thriftgo 的选项 ({flag}={value})

<!---->

- protoc/p: 透传给 protoc 的选项 ({flag}={value})

<!---->

- option_package/P: 指定包的路径，({include_path}={import_path})

<!---->

- no_recurse: 只生成主 idl 的 model 代码，默认为 false

<!---->

- enable_extends: 解析 thrift idl 中的 extends

<!---->

- json_enumstr: 当 idl 为 thrift 时，json enums 使用 string 代替 num (透传给 thriftgo 的选项)

<!---->

- unset_omitempty: 当 idl 为 protobuf 时，生成 model field，去掉 mitempty tag；当 idl 为 thrift 时，是否添加 omitempty 根据 field 是 "optional" 还是 "required" 决定

<!---->

- pb_camel_json_tag: 生成 model field 时将 json tag 的命名风格改为驼峰命名（仅作用于 protobuf）

<!---->

- snake_tag: tag 使用 snake_case 风格命名 (仅对 form、query、json 生效)

<!---->

- rm_tag value: 移除指定的 tag

<!---->

- exclude_file/E: 不需要更新的文件 (相对项目路径，支持多个)

<!---->

- customize_package: 自定义项目 package 相关模板，主要可针对 handler 模板进行定制化，具体详见：[自定义模板使用](/zh/docs/hertz/tutorials/toolkit/more-feature/template/) 。注意：对于已经存在的 handler 文件会按照默认模板新增 handler 函数，对于还未存在的 handler 文件，则会按照自定义模板来生成 handler。

<!---->

- handler_by_method: 为每一个方法生成一个单独的 handler 文件

<!---->

- protoc-plugins: 接入 protoc 相关的第三方生成代码插件，具体详见：[hz 接入第三方生成代码插件](/zh/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- thrift-plugins: 接入 thrift 相关的第三方生成代码插件，具体详见：[hz 接入第三方生成代码插件](/zh/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- help/h: 帮助命令

### Model

```console
$ hz help model
NAME:
   hz model - Generate model code only

USAGE:
   hz model [command options] [arguments...]

OPTIONS:
   --idl value [ --idl value ]                                        Specify the IDL file path. (.thrift or .proto)
   --module value, --mod value                                        Specify the Go module name.
   --out_dir value                                                    Specify the project path.
   --model_dir value                                                  Specify the model relative path (based on "out_dir").
   --proto_path value, -I value [ --proto_path value, -I value ]      Add an IDL search path for includes. (Valid only if idl is protobuf)
   --thriftgo value, -t value [ --thriftgo value, -t value ]          Specify arguments for the thriftgo. ({flag}={value})
   --protoc value, -p value [ --protoc value, -p value ]              Specify arguments for the protoc. ({flag}={value})
   --no_recurse                                                       Generate master model only. (default: false)
   --json_enumstr                                                     Use string instead of num for json enums when idl is thrift. (default: false)
   --unset_omitempty                                                  Remove 'omitempty' tag for generated struct. (default: false)
   --pb_camel_json_tag                                                Convert Name style for json tag to camel(Only works protobuf). (default: false)
   --snake_tag                                                        Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --rm_tag value [ --rm_tag value ]                                  Remove the specified tag
   --exclude_file value, -E value [ --exclude_file value, -E value ]  Specify the files that do not need to be updated.
   --help, -h                                                         show help (default: false)
```

- idl: idl 文件路径 (.thrift 或者 .proto)

<!---->

- module/mod: 指定 go mod 的名字，非 GOPATH 下必须指定，GOPATH 下默认以相对于 GOPATH 的路径作为名字

<!---->

- out_dir: 指定项目生成路径，默认为当前路径

<!---->

- model_dir: 指定 model 的生成路径，默认为 "biz/model" (相对路径，基于 out_dir)

<!---->

- proto_path/I: 当 idl 为 protobuf 时，指定 idl 的搜索路径，同 protoc 的 -I 指令

<!---->

- thriftgo/t: 透传给 thriftgo 的选项 ({flag}={value})

<!---->

- protoc/p: 透传给 protoc 的选项 ({flag}={value})

<!---->

- no_recurse: 只生成主 idl 的 model 代码，默认为 false

<!---->

- json_enumstr: 当 idl 为 thrift 时，json enums 使用 string 代替 num (透传给 thriftgo 的选项)

<!---->

- unset_omitempty: 当 idl 为 protobuf 时，生成 model field，去掉 mitempty tag；当 idl 为 thrift 时，是否添加 omitempty 根据 field 是 "optional" 还是 "required" 决定

<!---->

- pb_camel_json_tag: 生成 model field 时将 json tag 的命名风格改为驼峰命名（仅作用于 protobuf）

<!---->

- snake_tag: tag 使用 snake_case 风格命名 (仅对 form、query、json 生效)

<!---->

- rm_tag value: 移除指定的 tag

<!---->

- exclude_file/E: 不需要更新的文件 (相对项目路径，支持多个)

<!---->

- help/h: 帮助命令

### Client

client 命令的示例及高级设置可参考 [hz client 代码生成](/zh/docs/hertz/tutorials/toolkit/more-feature/client/)。

```console
$ hz help client
NAME:
   hz client - Generate hertz client based on IDL

USAGE:
   hz client [command options] [arguments...]

OPTIONS:
   --idl value [ --idl value ]                                        Specify the IDL file path. (.thrift or .proto)
   --module value, --mod value                                        Specify the Go module name.
   --base_domain value                                                Specify the request domain.
   --model_dir value                                                  Specify the model relative path (based on "out_dir").
   --client_dir value                                                 Specify the client path. If not specified, IDL generated path is used for 'client' command; no client code is generated for 'new' command
   --use value                                                        Specify the model package to import for handler.
   --force_client_dir value                                           Specify the client path, and won't use namespaces as subpaths
   --proto_path value, -I value [ --proto_path value, -I value ]      Add an IDL search path for includes. (Valid only if idl is protobuf)
   --thriftgo value, -t value [ --thriftgo value, -t value ]          Specify arguments for the thriftgo. ({flag}={value})
   --protoc value, -p value [ --protoc value, -p value ]              Specify arguments for the protoc. ({flag}={value})
   --no_recurse                                                       Generate master model only. (default: false)
   --enable_extends                                                   Parse 'extends' for thrift IDL (default: false)
   --json_enumstr                                                     Use string instead of num for json enums when idl is thrift. (default: false)
   --unset_omitempty                                                  Remove 'omitempty' tag for generated struct. (default: false)
   --pb_camel_json_tag                                                Convert Name style for json tag to camel(Only works protobuf). (default: false)
   --snake_tag                                                        Use snake_case style naming for tags. (Only works for 'form', 'query', 'json') (default: false)
   --rm_tag value [ --rm_tag value ]                                  Remove the specified tag
   --exclude_file value, -E value [ --exclude_file value, -E value ]  Specify the files that do not need to be updated.
   --customize_package value                                          Specify the path for package template.
   --protoc-plugins value [ --protoc-plugins value ]                  Specify plugins for the protoc. ({plugin_name}:{options}:{out_dir})
   --thrift-plugins value [ --thrift-plugins value ]                  Specify plugins for the thriftgo. ({plugin_name}:{options})
   --help, -h                                                         show help (default: false)
```

- idl: idl 文件路径 (.thrift 或者 .proto)

<!---->

- module/mod: 指定 go mod 的名字，非 GOPATH 下必须指定，GOPATH 下默认以相对于 GOPATH 的路径作为名字

<!---->

- base_domain: 指定要访问的 domain，可以是域名、IP:PORT、service name(配合服务发现)，也可以在 IDL 中通过 [注解](/zh/docs/hertz/tutorials/toolkit/annotation/#hz-client) 声明

<!---->

- model_dir: 指定 model 的生成路径，默认为 "biz/model" (相对路径，基于 out_dir)

<!---->

- client_dir: 指定 hertz client 侧代码的生成路径，代码默认生成于 "{$MODULE}/{$MODEL_DIR}/{$namespace}/"，可使用该参数修改代码默认生成路径

<!---->

- use: 指定 hertz client 侧代码中 import model 包的位置，该参数适用于在生成 hertz client 侧代码之前已经生成过 model 代码的场景，使用该命令可直接 import 已有的 model 代码，无需再次生成

<!---->

- force_client_dir: 指定 client 侧代码的生成路径，且不使用 service_name 作为子路径，如代码默认生成的相对路径为 "hello_service/hello_service.go"、"hello_service/hertz_client.go"，使用该参数后变为 "hello_service.go"、"hertz_client.go"

<!---->

- proto_path/I: 当 idl 为 protobuf 时，指定 idl 的搜索路径，同 protoc 的 -I 指令

<!---->

- thriftgo/t: 透传给 thriftgo 的选项 ({flag}={value})

<!---->

- protoc/p: 透传给 protoc 的选项 ({flag}={value})

<!---->

- no_recurse: 只生成主 idl 的 model 代码，默认为 false

<!---->

- enable_extends: 解析 thrift idl 中的 extends

<!---->

- json_enumstr: 当 idl 为 thrift 时，json enums 使用 string 代替 num (透传给 thriftgo 的选项)

<!---->

- unset_omitempty: 当 idl 为 protobuf 时，生成 model field，去掉 omitempty tag；当 idl 为 thrift 时，是否添加 omitempty 根据 field 是 "optional" 还是 "required" 决定

<!---->

- pb_camel_json_tag: 生成 model field 时将 json tag 的命名风格改为驼峰命名（仅作用于 protobuf）

<!---->

- snake_tag: tag 使用 snake_case 风格命名 (仅对 form、query、json 生效)

<!---->

- rm_tag value: 移除指定的 tag

<!---->

- exclude_file/E: 不需要更新的文件 (相对项目路径，支持多个)

<!---->

- customize_package: 自定义项目 package 相关模板，主要可针对 handler 模板进行定制化，具体详见：[自定义模板使用](/zh/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- protoc-plugins: 接入 protoc 相关的第三方生成代码插件，具体详见：[hz 接入第三方生成代码插件](/zh/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- thrift-plugins: 接入 thrift 相关的第三方生成代码插件，具体详见：[hz 接入第三方生成代码插件](/zh/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- help/h: 帮助命令
