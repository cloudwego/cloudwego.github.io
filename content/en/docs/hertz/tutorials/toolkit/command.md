---
title: "hz commands"
date: 2023-02-21
weight: 7
keywords: ["hz commands", "New", "Update", "Model", "Client"]
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

- new: Create a new Hertz project

<!---->

- update: Updating an existing Hertz project

<!---->

- model: Generate only model code

<!---->

- client: Generate client side code based on IDL

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

- idl: Specify the idl file path (.thrift or .proto)

<!---->

- service: Specify a service name to reserve for future service discovery and other functions

<!---->

- module/mod: Specify the name of the go mod, which must be specified in non GOPATH scenarios. In GOPATH, the default name is the path relative to GOPATH

<!---->

- out_dir: Specify the project generation path, which defaults to the current path

<!---->

- handler_dir: Specify the generation path for the handler, which defaults to "biz/handler" (relative path, based on out_dir)

<!---->

- model_dir: Specify the generation path for the model, which defaults to "biz/model" (relative path, based on out_dir)

<!---->

- router_dir: Specify the generation path for the router, which defaults to "biz/router" (relative path, based on out_dir)

<!---->

- client_dir: Specify the path for generating client-side code. If not specified, it will not be generated; Currently, a global client is generated for each service. To generate more comprehensive client-side code, please use the [hz client](/docs/hertz/tutorials/toolkit/more-feature/client/) command

<!---->

- use: Specify the location of the import model package in the handler. This parameter is applicable to scenarios where model code has already been generated before generating the handler code. Use this command to directly import existing model code without generating it again

<!---->

- proto_path/I: When idl is protobuf, specify the search path for idl, the same as the - I instruction for protoc

<!---->

- thriftgo/t: Options for transparent transmission to thriftgo ({flag}={value})

<!---->

- protoc/p: Options for transparent transmission to protoc ({flag}={value})

<!---->

- option_package/P: Specify the path of the package ({include_path}={import_path})

<!---->

- no_recurse: Generate only model code for the master idl, default to false

<!---->

- force/f: Force the creation of a new hertz project, which will overwrite the generated files

<!---->

- enable_extends: Parsing extensions in thrift idl

<!---->

- json_enumstr: When idl is thrift, json enums uses string instead of num (the option passed through to thriftgo)

<!---->

- unset_omitempty: When idl is protobuf, generate a model field and remove the omitempty tag; When idl is thrift, whether to add omitempty depends on whether the field is "optional" or "required"

<!---->

- pb_camel_json_tag: Change the naming style of json tag to camel hump naming when generating model fields (only applicable to protobuf)

<!---->

- snake_tag: tag using snake_case style naming (only valid for form, query, and json)

<!---->

- rm_tag value: Remove the specified tag

<!---->

- exclude_file/E: Files that do not require updates (relative to project path, supports multiple)

<!---->

- customize_layout: Customize the project layout template, please refer to [hz custom template use](/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- customize_layout_data_path value: Custom project layout template rendering parameters, please refer to [hz custom template use](/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- customize_package: Customized project package related templates can mainly be customized for handler templates. Please refer to [hz custom template use](/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- handler_by_method: Generate a separate handler file for each method

<!---->

- protoc-plugins: Connect to third-party generated code plugins related to protoc, please refer to [hz access plugin](/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- thrift-plugins: Connect to third-party generated code plugins related to thrift, please refer to [hz access plugin](/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- help/h: Help Command

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

- idl: Specify the idl file path (.thrift or .proto)

<!---->

- module/mod: Specify the name of the go mod, which must be specified in non GOPATH scenarios. In GOPATH, the default name is the path relative to GOPATH

<!---->

- out_dir: Specify the project generation path, which defaults to the current path

<!---->

- handler_dir: Specify the generation path for the handler, which defaults to "biz/handler" (relative path, based on out_dir); Note: If updating the same set of idls, the value of handler_dir needs to be the same as when using new, otherwise redundant code will be generated and the user needs to delete it themselves.

<!---->

- model_dir: Specify the generation path for the model, which defaults to "biz/model" (relative path, based on out_dir); Note: If updating the same set of idls, the value of model_dir needs to be the same as when using new, otherwise duplicate model code will be generated and inconsistent handler references will be caused.

<!---->

- client_dir: Specify the path for generating client-side code. If not specified, it will not be generated; Currently, a global client is generated for each service. To generate more comprehensive client-side code, please use [hz client](/docs/hertz/tutorials/toolkit/more-feature/client/) command. Note: If updating the same set of idls, the value of client_dir needs to be the same as when using new, otherwise redundant code will be generated and the user needs to delete it themselves.

<!---->

- use: Specify the location of the import model package in the handler. This parameter is applicable to scenarios where model code has already been generated before generating the handler code. Use this command to directly import existing model code without generating it again

<!---->

- proto_path/I: When idl is protobuf, specify the search path for idl, the same as the - I instruction for protoc

<!---->

- thriftgo/t: Options for transparent transmission to thriftgo ({flag}={value})

<!---->

- protoc/p: Options for transparent transmission to protoc ({flag}={value})

<!---->

- option_package/P: Specify the path of the package ({include_path}={import_path})

<!---->

- no_recurse: Generate only model code for the master idl, default to false

<!---->

- enable_extends: Parsing extensions in thrift idl

<!---->

- json_enumstr: When idl is thrift, json enums uses string instead of num (the option passed through to thriftgo)

<!---->

- unset_omitempty: When idl is protobuf, generate a model field and remove the omitempty tag; When idl is thrift, whether to add omitempty depends on whether the field is "optional" or "required"

<!---->

- pb_camel_json_tag: Change the naming style of json tag to camel hump naming when generating model fields (only applicable to protobuf)

<!---->

- snake_tag: tag using snake_case style naming (only valid for form, query, and json)

<!---->

- rm_tag value: Remove the specified tag

<!---->

- exclude_file/E: Files that do not require updates (relative to project path, supports multiple)

<!---->

- customize_package: Customized project package related templates can mainly be customized for handler templates. Please refer to [hz custom template use](/docs/hertz/tutorials/toolkit/more-feature/template/). Note: For existing handler files, a new handler function will be added according to the default template. For non existing handler files, a custom template will be used to generate the handler.

<!---->

- handler_by_method: Generate a separate handler file for each method

<!---->

- protoc-plugins: Connect to third-party generated code plugins related to protoc, please refer to [hz access plugin](/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- thrift-plugins: Connect to third-party generated code plugins related to thrift, please refer to [hz access plugin](/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- help/h: Help Command

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

- idl: Specify the idl file path (.thrift or .proto)

<!---->

- module/mod: Specify the name of the go mod, which must be specified in non GOPATH scenarios. In GOPATH, the default name is the path relative to GOPATH

<!---->

- out_dir: Specify the project generation path, which defaults to the current path

<!---->

- model_dir: Specify the generation path for the model, which defaults to "biz/model" (relative path, based on out_dir)

<!---->

- proto_path/I: When idl is protobuf, specify the search path for idl, the same as the - I instruction for protoc

<!---->

- thriftgo/t: Options for transparent transmission to thriftgo ({flag}={value})

<!---->

- protoc/p: Options for transparent transmission to protoc ({flag}={value})

<!---->

- no_recurse: Generate only model code for the master idl, default to false

<!---->

- json_enumstr: When idl is thrift, json enums uses string instead of num (the option passed through to thriftgo)

<!---->

- unset_omitempty: When idl is protobuf, generate a model field and remove the omitempty tag; When idl is thrift, whether to add omitempty depends on whether the field is "optional" or "required"

<!---->

- pb_camel_json_tag: Change the naming style of json tag to camel hump naming when generating model fields (only applicable to protobuf)

<!---->

- snake_tag: tag using snake_case style naming (only valid for form, query, and json)

<!---->

- rm_tag value: Remove the specified tag

<!---->

- exclude_file/E: Files that do not require updates (relative to project path, supports multiple)

<!---->

- help/h: Help Command

### Client

For examples and advanced settings of the client command, please refer to [hz client code generation](/docs/hertz/tutorials/toolkit/more-feature/client/).

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

- idl: Specify the idl file path (.thrift or .proto)

<!---->

- module/mod: Specify the name of the go mod, which must be specified in non GOPATH scenarios. In GOPATH, the default name is the path relative to GOPATH

<!---->

- base_domain: Specify the domain to access, which can be domain name, IP: PORT, service name (in conjunction with service discovery), or declared in IDL through [annotations](/docs/hertz/tutorials/toolkit/annotation/#hz-client)

<!---->

- model_dir: Specify the generation path for the model, which defaults to "biz/model" (relative path, based on out_dir)

<!---->

- client_dir: Specify the generation path for the hertz client side code, which is generated by default at "{$MODULE}/{$MODEL_DIR}/{$namespace}/". This parameter can be used to modify the default generation path for the code

<!---->

- use: Specify the location of the import model package in the hertz client side code. This parameter is applicable to scenarios where the model code has already been generated before generating the hertz client side code. Use this command to directly import existing model code without the need to generate it again

<!---->

- force_client_dir: Specify the generation path for client-side code without using service_name as a sub path. If the code defaults to generating relative paths such as "hello_service/hello_service.go" and "hello_service/hertz_client.go", using this parameter will become "hello_service.go" and "hertz_client.go"

<!---->

- proto_path/I: When idl is protobuf, specify the search path for idl, the same as the - I instruction for protoc

<!---->

- thriftgo/t: Options for transparent transmission to thriftgo ({flag}={value})

<!---->

- protoc/p: Options for transparent transmission to protoc ({flag}={value})

<!---->

- no_recurse: Generate only model code for the master idl, default to false

<!---->

- enable_extends: Parsing extensions in thrift idl

<!---->

- json_enumstr: When idl is thrift, json enums uses string instead of num (the option passed through to thriftgo)

<!---->

- unset_omitempty: When idl is protobuf, generate a model field and remove the omitempty tag; When idl is thrift, whether to add omitempty depends on whether the field is "optional" or "required"

<!---->

- pb_camel_json_tag: Change the naming style of json tag to camel hump naming when generating model fields (only applicable to protobuf)

<!---->

- snake_tag: tag using snake_case style naming (only valid for form, query, and json)

<!---->

- rm_tag value: Remove the specified tag

<!---->

- exclude_file/E: Files that do not require updates (relative to project path, supports multiple)

<!---->

- customize_package: Customized project package related templates can mainly be customized for handler templates. Please refer to [hz custom template use](/docs/hertz/tutorials/toolkit/more-feature/template/)

<!---->

- protoc-plugins: Connect to third-party generated code plugins related to protoc, please refer to [hz access plugin](/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- thrift-plugins: Connect to third-party generated code plugins related to thrift, please refer to [hz access plugin](/docs/hertz/tutorials/toolkit/more-feature/plugin/)

<!---->

- help/h: Help Command
