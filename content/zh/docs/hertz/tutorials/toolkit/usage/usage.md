---
title: 'hz 的基本使用'
date: 2023-02-21
weight: 2
description: >
---
## 基本使用

### new: 创建一个 Hertz 新项目

1. 创建新项目

    若当前项目目录位于 `GOPATH` 内：

    ```bash
    # GOPATH 下执行，go mod 名字默认为当前路径相对 GOPATH 的路径，也可自己指定
    hz new

    # 整理 & 拉取依赖
    go mod init # 上一步在 GOPATH 下执行不会生成 go.mod
    go mod tidy
    ```

    若当前项目目录位于 `GOPATH` 外：

    ```bash
    # 非 GOPATH 下执行，需要指定 go mod 名
    hz new -mod hertz/demo

    # 整理 & 拉取依赖
    go mod tidy
    ```

    执行后会在当前目录下生成 Hertz 项目的脚手架。

2. 编译项目

    ```bash
    go build
    ```

3. 运行项目并测试

    运行项目：

    ```bash
    ./{{your binary}}
    ```

    测试：

    ```bash
    curl 127.0.0.1:8888/ping
    ```

    如果返回`{"message":"pong"}`，说明接口调通。
