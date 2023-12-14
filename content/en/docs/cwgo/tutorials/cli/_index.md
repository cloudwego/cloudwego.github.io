---
title: "CLI"
linkTitle: "CLI"
weight: 1
description: >
---

cwgo is a command-line tool provided by CloudWeGo for generating code. Currently cwgo supports the IDL of thrift and protobuf, and supports the code generation of MVC Layout, Server, Client and DB.

## Dependency and Run Mode

The cwgo tool does not directly generate code, but calls the generation function of the corresponding tool after the template is constructed.

```console
cwgo
  |
  | HTTP server/client
  |-----------> hz
  | RPC server/client
  |-----------> kitex
  | DB
  ------------> gorm/gen

```

Therefore, the precautions of corresponding tools also need to be followed, such as [kitex precautions](/docs/kitex/tutorials/code-gen/code_generation/#notes-for-using-protobuf-idls) and generate HTTP code [Notes on hz](/docs/hertz/tutorials/toolkit/cautions/).

## Using

cwgo supports two generation methods of interactive command line and static command line. And **weakened the concept of new and update**, just input the previous command directly when updating.

## Interactive command line

The interactive command line supports one call to generate all codes, such as Server, Client, and DB, which meets the needs of most users. Users only need to enter information according to the prompts.

Syntax: `cwgo init`

After executing `cwgo init`, it will first ask for the type of project that needs to be generated, and multiple choices are supported. As shown in the figure below, server and client are selected

![generate_type](/img/docs/cwgo_generate_type.png)

After pressing Enter, the server and client information will be asked in turn. Proceed as follows

1. Select the service type, RPC or HTTP. single choice.

1. Enter a service name. required.

1. Enter the go module name. Required outside GOPATH, not required inside GOPATH.

1. Enter the idl path. required.

1. Whether to use the default configuration to generate the project

   1. Default configuration: no service discovery component, no other parameters
   1. Non-default configuration: select the service discovery component; enter the parameters passed to the generation tool

The questions asked by the client are roughly the same as those asked by the server. The difference is that the number of generated clients will be asked first, and then the information of each client will be input in a loop.

The information requested by db is:

1. Select the database type. radio
1. Enter the database DSN. required
1. Choose whether to use the default configuration to generate the project. If you choose No, you will be asked to enter the parameters to pass to the build tool

For parameters passed to the tool, refer to [documentation](/docs/hertz/tutorials/toolkit/command/) for hz and [documentation](/docs/kitex/tutorials/code-gen/code_generation/) for kitex.

## Static command line

### Command description

```shell
cwgo -h
NAME:
    cwgo - All in one tools for CloudWeGo

USAGE:
    cwgo [global options] command [command options] [arguments...]

COMMANDS:
    init interactive command line
    server generates RPC or HTTP Server
    client generates RPC or HTTP Client
    model generate DB Model
    fallback Fallback to kitex or hz tools

GLOBAL OPTIONS:
    --verbose turn on verbose logging mode
    --version, -v print tool version
```

### Server and Client commands

```console
--service specify service name
--type specify build type
--module specifies the generated module name
--idl specify IDL file path
--out_dir specify the output path
--template specifies the layout template path
--registry specifies the service registry component
--proto_search_path Add IDL search path, only valid for pb
--pass value parameter passed to hz and kitex
```

pass parameter description:

To pass the `handler_dir' parameter of `hz`, you should enter --pass "--handler_dir ./handler"

Parameters passed to the tool
hz refer to [Documentation](/docs/hertz/tutorials/toolkit/command/),
Kitex reference [documentation](/docs/kitex/tutorials/code-gen/code_generation/).

### Model commands

```console
--dsn specify database DSN
--db_type specifies the database type
--out_dir specifies the output folder, default biz/dao/query
--out_file specifies the output file name, default gen.go
--tables specify database table names
--unittest Whether to generate a unit test, the default is not generated
--only_model Whether to only generate model code, the default is off
--model_pkg specify model package name
--nullable When the field is null, specify whether to generate a pointer, the default is off
--signable Whether to detect integer field\'s unsigned type to adjust generated data type, the default is off
--type_tag Whether to generate gorm column type tag for the field, default is not generated
--index_tag Whether to generate gorm index tag for the field, default is not generated
```

### Common commands

Server

```shell
cwgo server --type {{RPC/HTTP}} --idl {{path/to/IDL_file.thrift}} --service {{svc_name}}
```

Client

```shell
cwgo client --type {{RPC/HTTP}} --idl {{path/to/IDL_file.thrift}} --service {{svc_name}}
```

model

```shell
cwgo model --db_type mysql --dsn "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local"
```
