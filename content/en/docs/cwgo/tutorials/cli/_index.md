---
title: "CLI"
linkTitle: "CLI"
weight: 1
description: >
---

cwgo is a command-line tool provided by CloudWeGo for generating code. Currently cwgo supports the IDL of thrift and protobuf, and supports the code generation of MVC Layout, Server, Client, DB(gorm/gen) and DOC(mongodb), supports for automatic completion on the command line.

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
  |------------> gorm/gen
  | DOC
  |------------> thriftgo/protoc
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
    server     generates RPC or HTTP Server
    client     generates RPC or HTTP Client
    model      generate CURD code for relational database
    doc        generate CURD code for document database
    completion generate command line auto completion script
    api-list   analyzing the relationship between Hertz project routing and routing registration code
    fallback   fallback to kitex or hz tools

GLOBAL OPTIONS:
    --verbose turn on verbose logging mode
    --version, -v print tool version
    --help,    -h help command
```
