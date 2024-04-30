---
title: "Template Extension"
linkTitle: "Template Extension"
weight: 1
description: >
---

The cwgo tool also supports passing its own template, and the template syntax is the syntax of go template. cwgo also welcomes users to contribute their own templates. Due to the different concepts of RPC and HTTP, the corresponding template variables also have some differences, please refer to the following for details.

To pass a custom template, add the `-template` parameter to the command, such as:

```sh
cwgo server -type RPC -service {service name} -idl {idl path} -template {tpl path}
```

## Template Reading

cwgo supports reading templates from local or git. git supports https or ssh formats, with `-template` specifying the template path and `-branch` specifying the template branch(default to the main branch).

RPC Server、Client, HTTP Server、Client all support template extension, specific usage can be found in the following text.

### Local

```sh
cwgo server -type RPC -service {service name} -idl {idl path}  -template {local tpl path}
```

### git https

```sh
cwgo server -type RPC -service {service name} -idl {idl path}  -template https://github.com/***/cwgo_template.git -branch {branch path}
```

### git ssh

```sh
cwgo server -type RPC -service {service name} -idl {idl path}  -template git@github.com:***/cwgo_template.git -branch {branch path}
```

## RPC

1. The template file is delivered through the yaml folder, specified by the `--template-dir` command line parameter of kitex, all yaml files in this folder will be rendered, and if the template parsing fails, it will exit directly. Watch out for unknown hidden files.

   The yaml file is defined as follows:

   ```yaml
   # The path and file name of the generated file, which will create a folder in the root directory of the project, and generate a main.go file in the folder, which supports template rendering syntax
   path: /handler/{{ .Name }}.go
   update_behavior:
   type: skip / cover / append # Specify update behavior, if loop_method is true, append is not supported. The default is skip
   key: Test{{.Name}} # The searched function name, if the rendered function name exists, it is considered that the method does not need to be appended
   append_tpl: # updated content template
   import_tpl: # The newly added import content is a list, which can be rendered by template
   loop_method: true # Whether to enable loop rendering
   body: template content # template content
   ```

2. `extensions.yaml` in the folder is a specific file, the content of which is [Extended Service Code](/docs/kitex/tutorials/code-gen/template_extension/) configuration file. Please be aware of file naming conflicts.

3. The data used by the template is PackageInfo. It is considered that this part contains all metadata, such as methodInfo, etc. The user only needs to pass the template file, and the data in the template is PackageInfo data. Commonly used content in PackageInfo can be found in the [Appendix](#appendix).

4. cwgo supports circularly rendering files according to methodInfo. There is only one element in the methodInfo list during cyclic rendering, which is the method currently being rendered.

5. When updating, currently supports overwriting, skipping and adding files according to methods, and supports appending in one file. If the loop render file is enabled, only skip and cover are supported.

Best practice rpc example tpl can refer to [here](https://github.com/cloudwego/cwgo/tree/main/tpl/kitex/server/standard).

## HTTP

1. The template file is delivered through the yaml folder, but unlike the RPC layout, the HTTP layout is implemented based on hertz's custom template. Here we need to specify the yaml file name to be fixed as `layout.yaml` and `package .yaml`, for the use of custom templates, please refer to [Hz custom template usage documentation](/docs/hertz/tutorials/toolkit/more-feature/template/).

Best practice http example tpl can refer to [here](https://github.com/cloudwego/cwgo/tree/main/tpl/hertz/standard).

## Appendix

### Kitex PackageInfo structure meaning

```go
type PackageInfo struct {
    Namespace string // idl namespace, it is recommended not to use under pb
    Dependencies map[string]string // package name => import path, used for searching imports
    *ServiceInfo // the target service

    Codec string
    NoFastAPI bool
    Version string
    RealServiceName string
    Imports map[string]map[string]bool
    ExternalKitexGen string
    Features []feature
    FrugalPretouch bool
    Module string // go module name
}

type ServiceInfo struct {
    PkgInfo
    ServiceName string
    RawServiceName string
    ServiceTypeName func() string
    Base *ServiceInfo
    Methods []*MethodInfo
    CombineServices []*ServiceInfo
    Has Streaming bool
}

type PkgInfo struct {
    PkgName string // last paragraph of namespace
    PkgRefName string
    ImportPath string // import path of req and resp of this method
}

type MethodInfo struct {
    PkgInfo
    ServiceName string // the name of this service
    Name string // the name of this method
    RawName string // Same as above
    Oneway bool
    void bool
    Args []*Parameter // Input parameter information, including input parameter name, import path, type
    Resp *Parameter // output parameter, including input parameter name, import path, type
    Exceptions []*Parameter
    ArgStructName string
    ResStructName string
    IsResponseNeedRedirect bool // int -> int*
    GenArgResultStruct bool
    ClientStreaming bool
    Server Streaming bool
}
```
