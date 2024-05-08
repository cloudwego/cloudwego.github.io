---
title: "自定义脚手架模板"
date: 2023-03-09
weight: 7
description: >
---

Kitex 支持了自定义模板功能，如果默认的模板不能够满足大家的需求，大家可以使用 Kitex 的自定义模板功能。目前支持了单文件渲染和根据 methodInfo 循环渲染。

## 如何使用

1.  模板使用的数据为 `PackageInfo`，认为这部分内包含所有的元数据，如 `methodInfo` 等，用户只需要传递模板文件即可，模板内的数据为 `PackageInfo` 数据。
1.  模板渲染只能渲染单个文件内容，如果涉及到按照 `methods` 分文件渲染的话，需要在代码中控制。
1.  模板文件通过 yaml 文件夹传递，通过 `--template-dir` 命令行参数指定。因为所有模板写到一个文件中会导致该文件巨大，所以改为指定文件夹。
1.  文件夹内的 `extensions.yaml` 为特定文件，该文件的内容为[扩展 Service 代码](/zh/docs/kitex/tutorials/code-gen/template_extension/)的配置文件。如果该文件存在的话，则不用再传递 `template-extension` 参数。
1.  更新时，目前支持覆盖、跳过、根据 methods 增加文件(`loop_method` 为 true)、在文件末尾追加四种方式(`loop_method` 为 false)，通过 `loop_method` 和 `update_behavior` 中的 key 字段共同确定。update_behavior 中的 key 字段值有三种：`skip` / `cover` / `append`。其中`append` 在开启了`loop_method`后为新增加文件；在不开启`loop_method`时为追加到文件末尾，通过指定更新时的`key`判断是否需要追加。
1.  Kitex 代码生成分成两部分，kitex_gen 和 mainPkg(剩下的 main.go、handler.go )等等，kitex_gen 无论采用何种生成都不会改变；mainPkg 和 custom layout 只能二选一，如果制定了 custom layout 就不会再生成 mainPkg。

## 使用场景

当默认的脚手架模板不能够满足用户的需求，比如想要生成 MVC Layout、统一进行错误处理等。

## 使用方式

```console
kitex -module ${module_name} -template-dir ${template dir_path} idl/hello.thrift
```

## Yaml 文件配置

```yaml
path: /a/main.go # 生成文件的路径及文件名，这会在项目根目录下创建 a 文件夹，并在文件夹内生成 main.go 文件
update_behavior:
    type: skip / cover / append # 指定更新行为，如果 loop_method 为true，则不支持 append。默认是 skip
    key: Test{{.Name}} # 函数名。
    append_tpl: # 更新的内容模板
    import_tpl: # 新增的 import 内容，是一个 list，可以通过模版渲染。每一条 list 内支持循环渲染多个 import，靠空格分割，如 "\"a/b/c\" \"d/e/f\""
body: template content # 模板内容
--------------------------------
path: /handler/{{ .Name }}.go # path 会先经过模版渲染。如指定了 loop_service、loop_method 则为循环渲染，渲染使用的数据内容为当前渲染的单个 service(method)
update_is_skip: true # 更新时是否跳过该文件
loop_method: true # 循环渲染 method 支持
loop_service: true # 多 service 支持：生成命令中设置了 combine-service 并且在模版中指定了 loop_service: true，则在生成时，对应的模版文件会按照 service 循环渲染。形式同 loop_method，会使用当前的模板循环渲染每一个 service。可和 loop_method 同时使用
body: ... # 模板内容
```

示例 tpl：

https://github.com/cloudwego/cwgo/tree/main/tpl/kitex

## 附录

### PackageInfo 结构体常用内容

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

// Parameter .
type Parameter struct {
   Deps    []PkgInfo
   Name    string
   RawName string // StructB
   Type    string // *PkgA.StructB
}
```
