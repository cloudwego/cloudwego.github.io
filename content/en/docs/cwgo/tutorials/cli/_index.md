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

cwgo supports static command line. And **weakened the concept of new and update**, just input the previous command directly when updating.

## Static command line

### Command description

```shell
cwgo -h
NAME:
    cwgo - All in one tools for CloudWeGo

USAGE:
    cwgo [global options] command [command options] [arguments...]

COMMANDS:
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
