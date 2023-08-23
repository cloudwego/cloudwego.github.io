---
title: "模板拓展"
linkTitle: "模板拓展"
weight: 1
description: >
---

cwgo 工具也支持传递自己的模板，模版语法为 go template 的语法。cwgo 也欢迎用户贡献自己的模板。由于 RPC 和 HTTP 概念不同，其对应的模版变量也有一些差异，详细请参考下文

如需传递自定义模板，请给命令添加 `-template` 参数，如

```sh
cwgo server -type RPC -service {service name} -idl {idl path}  -template {tpl path}
```

## RPC

1. 模板文件通过 yaml 文件夹传递，通过 kitex 的 `--template-dir` 命令行参数指定，该文件夹下的所有 yaml 文件都会被渲染，模版解析失败会直接退出。请注意是否存在未知的隐藏文件。
1. 文件夹内的 `extensions.yaml` 为特定文件，该文件的内容为[扩展 Service 代码](https://www.cloudwego.io/zh/docs/kitex/tutorials/code-gen/template_extension/)的配置文件。如果该文件存在的话，则不需要再传递 `template-extension` 参数

   Yaml 文件定义如下：

   ```yaml
   # 生成文件的路径及文件名，这会在项目根目录下创建 a 文件夹，并在文件夹内生成 main.go 文件，支持模版渲染语法
   path: /handler/{{ .Name }}.go
   update_behavior:
     type: skip / cover / append # 指定更新行为，如果 loop_method 为true，则不支持 append。默认是 skip
     key: Test{{.Name}} # 查找的函数名，如果渲染后的函数名存在，则认为该方法不用追加
     append_tpl: # 更新的内容模板
     import_tpl: # 新增的 import 内容，是一个 list，可以通过模版渲染
   loop_method: true # 是否开启循环渲染
   body: template content # 模板内容
   ```

1. 模板使用的数据为 PackageInfo，认为这部分内包含所有的元数据，如 methodInfo 等，用户只需要传递模板文件即可，模板内的数据为 PackageInfo 数据。PackageInfo 内常用的内容见附录。
1. cwgo 支持根据 methodinfo 循环渲染文件。循环渲染时的 methodInfo list 内只有一个元素，为当前正在渲染的 method。
1. 更新时，目前支持覆盖、跳过和根据 methods 增加文件三种，支持在一个文件当中 append。如果开启了循环渲染文件，则只支持 skip 和 cover。

最佳实践的 rpc 示例 tpl 可参考[这里](https://github.com/cloudwego/cwgo/tree/main/tpl/kitex/server/standard)

## HTTP

1. 模版文件通过 yaml 文件夹传递，但是与 RPC 的 layout 不同的是 HTTP 的 layout 是基于 hertz 的自定义模版实现的，这里我们需要指定的 yaml 文件名需要固定为 `layout.yaml` 与 `package.yaml` ，对于自定义模版的使用可以参考 [Hz 自定义模版使用文档](https://www.cloudwego.io/zh/docs/hertz/tutorials/toolkit/more-feature/template/)。

最佳实践的 http 示例 tpl 可参考[这里](https://github.com/cloudwego/cwgo/tree/main/tpl/hertz/standard)

## 附录

### Kitex PackageInfo 结构体含义

```go
type PackageInfo struct {
   Namespace    string            // idl namespace，pb 下建议不要使用
   Dependencies map[string]string // package name => import path, used for searching imports
   *ServiceInfo                   // the target service

   Codec            string
   NoFastAPI        bool
   Version          string
   RealServiceName  string
   Imports          map[string]map[string]bool
   ExternalKitexGen string
   Features         []feature
   FrugalPretouch   bool
   Module           string // go module 名称
}

type ServiceInfo struct {
   PkgInfo
   ServiceName     string
   RawServiceName  string
   ServiceTypeName func() string
   Base            *ServiceInfo
   Methods         []*MethodInfo
   CombineServices []*ServiceInfo
   HasStreaming    bool
}

type PkgInfo struct {
   PkgName    string // namespace 最后一段
   PkgRefName string
   ImportPath string // 这个方法的 req 和 resp 的 import path
}

type MethodInfo struct {
   PkgInfo
   ServiceName            string // 这个 service 的 name
   Name                   string // 这个 method 的 name
   RawName                string // 同上
   Oneway                 bool
   Void                   bool
   Args                   []*Parameter // 入参信息，包括入参名称、import 路径、类型
   Resp                   *Parameter // 出参，包括入参名称、import 路径、类型
   Exceptions             []*Parameter
   ArgStructName          string
   ResStructName          string
   IsResponseNeedRedirect bool // int -> int*
   GenArgResultStruct     bool
   ClientStreaming        bool
   ServerStreaming        bool
}
```
