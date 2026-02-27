---
title: "hz basic usage"
date: 2023-02-21
weight: 2
keywords: ["hz basic usage", "new"]
description: "hz basic usage."
---

## Basic Usage

### new: Create a new Hertz project

1. Create a new project

   {{< tabs "Execute outside GOPATH" "Execute under GOPATH">}}
    <!-- Execute outside GOPATH -->

   {{% codetab %}}

   ```bash
   # Execute outside GOPATH, you need to specify the go mod name
   hz new -module hertz/demo

   # Tidy & get dependencies
   go mod tidy
   ```

   {{% /codetab %}}
   <!-- Execute under GOPATH -->

   {{% codetab %}}

   ```shell
   # Execute under GOPATH, go mod name defaults to the current path relative to GOPATH, or you can specify your own
   hz new

   # Tidy & get dependencies
   go mod init # `go.mod` will not be generated after the previous step executed under GOPATH.
   go mod tidy
   ```

   {{% /codetab %}}

   {{< /tabs >}}

   After executed, it generates a scaffold for the Hertz project in the current directory.

2. Compiling Projects

   ```bash
   go build
   ```

3. Run the project and test it

   Run the project:

   ```bash
   ./{{your binary}}
   ```

   Test:

   ```bash
   curl 127.0.0.1:8888/ping
   ```

   If it returns `{"message":"pong"}`, it works.

### Note

`hz new` is only used to initialize the project, use `hz update` to update the project.
See [using protobuf](../usage-protobuf) and [use thrift](../usage-thrift).
