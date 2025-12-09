---
Description: ""
date: "2025-03-20"
lastmod: ""
tags: []
title: Tool - Commandline
weight: 0
---

## CommandLine Tool

CommandLine Tools implementation for [Eino](https://github.com/cloudwego/eino) that implements the `Tool` interface. This enables seamless integration with Eino's LLM capabilities for enhanced natural language processing and generation.
> **Note**: This implementation is inspired by and references the [OpenManus](https://github.com/mannaandpoem/OpenManus) project.

## Features

- Implements `github.com/cloudwego/eino/components/tool.InvokableTool`
- Easy integration with Eino's tool system
- Support executing command-line instructions in Docker containers

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/tool/commandline@latest
```

## Quick Start

Editor:

```go
package main

import (
    "context"
    "log"

    "github.com/cloudwego/eino-ext/components/tool/commandline"
    "github.com/cloudwego/eino-ext/components/tool/commandline/sandbox"
)

func main() {
    ctx := context.Background()

    op, err := sandbox.NewDockerSandbox(ctx, &sandbox.Config{})
    if err != nil { log.Fatal(err) }
    // ensure docker is running before creating a container
    if err = op.Create(ctx); err != nil { log.Fatal(err) }
    defer op.Cleanup(ctx)

    sre, err := commandline.NewStrReplaceEditor(ctx, &commandline.Config{ Operator: op })
    if err != nil { log.Fatal(err) }

    info, err := sre.Info(ctx)
    if err != nil { log.Fatal(err) }
    log.Printf("tool name: %s, tool desc: %s", info.Name, info.Desc)

    content := "hello world"
    log.Println("create file[test.txt]...")
    result, err := sre.Execute(ctx, &commandline.StrReplaceEditorParams{
        Command:  commandline.CreateCommand,
        Path:     "./test.txt",
        FileText: &content,
    })
    if err != nil { log.Fatal(err) }
    log.Println("create file result: ", result)

    log.Println("view file[test.txt]...")
    result, err = sre.Execute(ctx, &commandline.StrReplaceEditorParams{
        Command: commandline.ViewCommand,
        Path:    "./test.txt",
    })
    if err != nil { log.Fatal(err) }
    log.Println("view file result: ", result)
}
```

PyExecutor:

```go
package main

import (
    "context"
    "log"

    "github.com/cloudwego/eino-ext/components/tool/commandline"
    "github.com/cloudwego/eino-ext/components/tool/commandline/sandbox"
)

func main() {
    ctx := context.Background()
    op, err := sandbox.NewDockerSandbox(ctx, &sandbox.Config{})
    if err != nil { log.Fatal(err) }
    if err = op.Create(ctx); err != nil { log.Fatal(err) }
    defer op.Cleanup(ctx)

    exec, err := commandline.NewPyExecutor(ctx, &commandline.PyExecutorConfig{ Operator: op }) // use python3 by default
    if err != nil { log.Fatal(err) }

    info, err := exec.Info(ctx)
    if err != nil { log.Fatal(err) }
    log.Printf("tool name: %s,  tool desc: %s", info.Name, info.Desc)

    code := "print(\"hello world\")"
    log.Printf("execute code:\n%s", code)
    result, err := exec.Execute(ctx, &commandline.Input{ Code: code })
    if err != nil { log.Fatal(err) }
    log.Println("result:\n", result)
}
```

## For More Details

- [Eino Documentation](https://github.com/cloudwego/eino)
