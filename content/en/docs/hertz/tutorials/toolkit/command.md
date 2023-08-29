---
title: 'hz commands'
date: 2023-02-21
weight: 7
keywords: ["hz commands", "New", "Update"]
description: "hz commands."
---
## Command line parameter description

#### Global

```console
$ hz --help
NAME:
   hz - A idl parser and code generator for Hertz projects

USAGE:
   hz [global options] command [command options] [arguments...]

VERSION:
   0.x.x

COMMANDS:
   new      Generate a new Hertz project
   update   Update an existing Hertz project
   help, h  Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --help, -h     show help (default: false)
   --verbose      turn on verbose mode (default: false)
   --version, -v  print the version (default: false)
```

- new: Create a new Hertz project

<!---->

- update: Updating an existing Hertz project

### New

```console
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
   --thriftgo value, -t value        Specify arguments for the thriftgo. ({flag}={value})  (accepts mul)
```

- client_dir: Specify the path to generate client-side code, if not specified, it will not be generated; currently generates a global client for each service, and will provide rich client code capabilities later

<!---->

- customize_layout: Customize the layout template of the project. For details, see: [hz custom template use](https://www.cloudwego.io/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- customize_package: Customize the project package related templates, mainly for the handler template. For details, see: [hz custom template use](https://www.cloudwego.io/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- exclude_file: Files that do not need to be updated(relative to the project path, multiple supported)

<!---->

- handler_dir: Specify the handler generation path, the default is "biz/handler"

<!---->

- idl: IDL file path (.thrift or .proto)

<!---->

- json_enumstr: When IDL is thrift, json enums uses string instead of num (option passed through to thriftgo)

<!---->

- model_dir: Specify the model generation path, the default is "biz/model"

<!---->

- module/mod: Specify the name of go mod, which must be specified under non-GOPATH, and default to a path relative to GOPATH under GOPATH.

<!---->

- no_recurse: Generate only the model code for main IDL

<!---->

- option_package/P: Specify the path to the package, ({include_path}={import_path})

<!---->

- out_dir: Specify the project build path

<!---->

- proto_path/I: When IDL is protobuf, specify the search path for IDL, equivalent to the option "-I" for protoc

<!---->

- protoc/p: Option passed through to protoc ({flag}={value})

<!---->

- service: Service name, reserved for later service discovery and other functions

<!---->

- snake_tag: The tag is named in snake_case style(only works for form、query、json )

<!---->

- thriftgo/t: Option passwd through to thrift ({flag}={value})

<!---->

- unset_omitempty: When IDL is protobuf, the model field is generated and the omitempty tag is removed; when IDL is thrift, whether to add omitempty is determined by whether the field is "optional" or "required"

### Update

```console
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

- client_dir: Specify the path to generate client-side code, if not specified, it will not be generated; currently generates a global client for each service, and will provide rich client code capabilities later. Note: If you update the same set of IDL, the value of client_dir needs to be the same as when using new, otherwise it will generate redundant code that needs to be removed by the user.

<!---->

- customize_package: Customize the project package related templates, mainly for the handler template. For details, see:[hz custom template use](https://www.cloudwego.io/docs/hertz/tutorials/toolkit/more-feature/template/). Note: For an existing handler file, a handler function will be added according to the default template, and for handler files that do not exist yet, a handler will be generated according to a custom template.

<!---->

- exclude_file: Files that do not need to be updated(relative to the project path, multiple supported)

<!---->

- handler_dir: Specify the handler generation path, the default is "biz/handler"; Note: If you update the same set of IDL, the value of handler_dir needs to be the same as when using new, otherwise it will generate redundant code that needs to be removed by the user.

<!---->

- idl: IDL file path (.thrift or .proto)

<!---->

- json_enumstr: When IDL is thrift, json enums uses string instead of num (option passed through to thriftgo)

<!---->

- model_dir: Specify the model generation path, the default is "biz/model"; Note: If you update the same set of IDL, the value of model_dir needs to be the same as when using new, otherwise it will generate redundant code that needs to be removed by the user.

<!---->

- no_recurse: Generate only the model code for main IDL

<!---->

- option_package/P: Specify the path to the package, ({include_path}={import_path})

<!---->

- out_dir: Specify the project build path

<!---->

- proto_path/I: When IDL is protobuf, specify the search path for IDL, same as protoc's -I command

<!---->

- protoc/p: Option passed through to protoc ({flag}={value})

<!---->

- snake_tag: The tag is named in snake_case style(only works for form、query、json )

<!---->

- thriftgo/t: Option passwd through to thrift ({flag}={value})

<!---->

- unset_omitempty: When IDL is protobuf, the model field is generated and the omitempty tag is removed; when IDL is thrift, whether to add omitempty is determined by whether the field is "optional" or "required"
