---
title: "概览"
linkTitle: "概览"
weight: 1
description: >
---

cwgo 工具支持在 MAC 、Linux 和 Windows 环境下开发，可以方便生成工程化模版，其主要功能特点如下：

## 工具特点

- 支持生成工程化模板

  cwgo 工具支持生成 MVC 项目 Layout，用户只需要根据不同目录的功能，在相应的位置完成自己的业务代码即可，聚焦业务逻辑。

- 支持生成 Server、Client 代码

  cwgo 工具支持生成 Kitex、Hertz 的 Server 和 Client 代码，提供了对 Client 的封装。用户可以开箱即用的调用下游，免去封装 Client 的繁琐步骤。

- 支持生成关系型数据库代码

  cwgo 工具支持生成关系型数据库 CURD 代码。用户无需再自行封装繁琐的 CURD 代码，提高用户的工作效率。

- 支持生成文档类数据库代码

  cwgo 工具支持基于 IDL (thrift/protobuf) 生成文档类数据库 CURD 代码，目前支持 Mongodb。用户无需再自行封装繁琐的 CURD 代码，提高用户的工作效率。

- 支持生成命令行自动补全脚本

  cwgo 工具支持生成命令行自动补全脚本，提高用户命令行编写的效率。

- 支持分析 Hertz 项目路由和(路由注册)代码的关系

  cwgo 支持通过分析 Hertz 项目代码获取路由和(路由注册)代码的关系。

- 支持回退为 Kitex、Hz 工具

  如果之前是 Kitex、Hz 的用户，仍然可以使用 cwgo 工具。cwgo 工具支持回退功能，可以当作 Kitex、Hz 使用，真正实现一个工具生成所有。

**cwgo 是 CloudWeGo All in one 代码生成工具，整合了各个组件的优势，以提高开发者的体验。**

## 安装 cwgo 工具

{{< tabs "Go 1.16 及以后版本" "Go 1.15 及之前版本" >}}

{{% codetab %}}

```shell
# Go 1.16 及以后版本
GOPROXY=https://goproxy.cn/ go install github.com/cloudwego/cwgo@latest
```

{{% /codetab %}}

{{% codetab %}}

```shell
# Go 1.15 及之前版本
GO111MODULE=on GOPROXY=https://goproxy.cn/ go get github.com/cloudwego/cwgo@latest
```

{{% /codetab %}}

{{< /tabs >}}
