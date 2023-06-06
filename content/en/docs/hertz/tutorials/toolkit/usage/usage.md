---
title: 'hz basic usage'
date: 2023-02-21
weight: 2
description: >
---
## Basic Usage

### new: Create a new Hertz project

1. Create a new project

    If your codes are placed under `GOPATH`:

    ```bash
    # Execute under GOPATH, go mod name defaults to the current path relative to GOPATH, or you can specify your own
    hz new

    # Tidy & get dependencies
    go mod init # `go.mod` will not be generated after the previous step executed under GOPATH.
    go mod tidy
    ```

    If your codes are not placed under `GOPATH`:

    ```bash
    # Execute under non-GOPATH, you need to specify the go mod name
    hz new -mod hertz/demo

    # Tidy & get dependencies
    go mod tidy
    ```

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
