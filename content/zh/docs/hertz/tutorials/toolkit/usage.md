---
title: "hz 的基本使用"
date: 2023-02-21
weight: 2
keywords: ["hz 的基本使用", "new"]
description: "hz 的基本使用。"
---

## 基本使用

### new: 创建一个 Hertz 新项目

1. 创建新项目

   {{< tabs "在 GOPATH 外执行" "在 GOPATH 下执行" >}}
   {{% codetab %}}

   ```bash
   # 在 GOPATH 外执行，需要指定 go mod 名
   hz new -module hertz/demo

   # 整理 & 拉取依赖
   go mod tidy
   ```

   {{% /codetab %}}
   {{% codetab %}}

   ```bash
   # GOPATH 下执行，go mod 名字默认为当前路径相对 GOPATH 的路径，也可自己指定
   hz new

   # 整理 & 拉取依赖
   go mod init # 上一步在 GOPATH 下执行不会生成 go.mod
   go mod tidy
   ```

   {{% /codetab %}}
   {{< /tabs >}}

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

   如果返回 `{"message":"pong"}`，说明接口调通。

### 注意事项

1. `hz new` 只用于初始化项目，更新项目则使用 `hz update`,
   具体使用方法可参考 [使用 protobuf](../usage-protobuf) 和 [使用 thrift](../usage-thrift)。

2. hz 判断一个项目是否存在是看生成的 `.hz` 文件的。若 .hz 文件存在使用 `hz new` 会报错，不存在使用 `hz update` 会报错
