---
title: "Thriftgo IDL 裁切工具"
date: 2023-11-08
weight: 8
keywords: ["trimmer", "IDL裁切", "IDL裁剪"]
description: "使用IDL裁切工具裁切不必要的IDL定义"
---

## 简介

[Thriftgo](https://github.com/cloudwego/thriftgo) 是 Go 语言实现的 Thrift IDL 解析和代码生成器，支持完善的 Thrift IDL 语法和语义检查。相较 Apache Thrift 官方的 Golang 生成代码，Thriftgo 做了一些问题修复且支持插件机制，用户可根据需求自定义生成代码。Kitex 的代码生成工具就是 Thriftgo 的插件实现之一。

一些 IDL 仓库可能会因为没有及时维护清理废弃的内容，随着版本迭代，无关内容越来越多，造成了生成的 Golang 代码仓库变得很大，IDL 的可读性也下降。也可能由于引用或者间接引用了过多的IDL，导致很多无关的结构被纳入生成代码中，导致生成代码体积过大或生成过程产生异常。这些问题在复杂项目实践中出现较为频繁，可能阻塞业务的开发流程。

Thriftgo 在 v0.3.1+ 版本提供了 Thrift IDL 裁切功能，用于针对不会被 service 引用到的结构进行裁剪，以删除对 RPC 无影响和依赖的结构，从而减少没有用的生成代码。

该功能可以直接通过 Thriftgo 项目下提供的 Trimmer 工具单独使用，生成裁切过后的 IDL，也可以配合 Thriftgo/Kitex 命令行使用，在代码生成时直接过滤掉无用的内容。

## 裁切原理

- 遍历给定 IDL 文件中包含的所有 service，找到 service 和 method 里所有直接或者间接引用的 struct 结构体，将他们标记为“有用”
- 扫描该项目直接或间接引用的所有 IDL，对于所有的 struct 结构体，如果没有被标记为“有用”，就裁切掉
- 由于业务开发往往通过 IDL 来引入枚举和常数，所以工具不对 IDL 中的typedef、枚举和常数进行裁切
- 将裁切后的结果重新输出为 .thrift 结尾的 IDL 文件，或者生成 Golang 代码

下面是一个示意图，裁切前，这组 IDL 文件以及内容如下：  
![img](/img/docs/idl_trimmer_process1.jpg)

使用裁切工具后，会根据 IDL A 里的 service A 遍历所有结构体，将用不到的 struct 结构体删除，最终输出如下：  
![img](/img/docs/idl_trimmer_process2.jpg)

## 使用 Trimmer 工具

Trimmer 工具支持处理 thrift IDL 文件，并将裁切后的结果重新以 thrift IDL 文件的形式输出  
安装 Trimmer 工具：

```bash
go install github.com/cloudwego/thriftgo/tool/trimmer@latest
```

查看版本/验证工具安装：

```bash
trimmer -version
```

使用格式：

```bash
trimmer [options] file

Options:
--version                           打印版本信息
-h, --help                          打印帮助信息
-o, --out [file/dir name]           指定输出IDL的文件名/输出目录
-r, --recurse [dir]                 指定一个根目录，复制其目录结构到输出目录并递归地输出指定IDL及其引用IDL到相应位置。如指定-o，必须为一个目录
-m, --method [service.method]       指定只保留某个或多个 Method 进行裁切
```

### 单文件处理

当想对单个 IDL 文件进行裁切时，可执行如下命令：

```bash
trimmer sample.thrift
```

执行成功后，会输出裁切后的 IDL 文件位置，你会看到如下提示：
`success, dump to example_trimmed.thrift`

默认的命名为原名 + trimmed 后缀，如果想把裁切的 IDL 输出到指定目录或者重命名，可带上 -o 参数：

```bash
trimmer -o abc/my_sample.thrift sample.thrift
```

### 递归裁切

如果想对某个 IDL 进行裁切的同时裁剪和输出其引用到的相关 IDL，可以使用 -r 参数：

```bash
trimmer -r test_cases/ test_cases/my_idl/a.thrift
```

注意，当使用 -r 时，需要在 -r 参数后面指定 IDL 文件目录，工具会在这个文件夹内寻找依赖的 IDL 并裁切后维持目录结构输出（裁切依据是指定 IDL 的依赖性），默认的输出位置是 `trimmed_idl` 文件夹下。可以通过 -o 来设置输出的文件夹名称。  
输出后的目录结构如下：

```
.
├── test_cases    // 原 IDL 文件目录
│        ├── my_idl
│        │       └── a.thrift
│        ├── b.thrift
│        ├── c.thrift
└── trimmed_idl    // 输出后的 IDL 文件目录
         ├── my_idl
         │       └── a.thrift
         └── c.thrift
```

注意，由于 IDL 定义本身不记录缩进、换行、顺序等，输出的新 IDL 文件的字段顺序可能与原版本不同。

### 指定 Method 裁切

在「裁切原理」部分提到，默认情况下，Trimmer 工具是查找所有 Service 的所有 Method 来裁切结构体。如果想将裁切逻辑精确到某个或多个 Method，可以使用 -m 参数，以 `[service_name.method_name]` 的方式指定

```bash
trimmer -m MyService.MethodA -m MyService.MethodB example.thrift`
```

当目标 IDL 只有一个 Service 时，可以忽略 Service 名：

```bash
trimmer -m MethodA -m MethodB example.thrift
```

执行后，其他的 Service 以及 Method 将会被裁切掉，只有当前指定的 Method 以及其依赖的结构体会被保留。

在 Thriftgo v0.3.3 版本（暂未发布，拉取最新 commit 即可）中，指定 method 裁切功能支持了正则表达式的 method 匹配方式。用户可以构造正则表达式来匹配`[serviceName].[methodName]`的方法名，精确指定一个或多个方法。例如：

```bash
trimmer -m 'Employee.*\..*' test_cases/sample1.thrift
```

可以匹配 "Employee" 开头的 service 下的全部方法。（注："." 在正则表达式有意义，最好使用 "\." 来匹配）  
也可以使用一些 perl 风格的表达式进行一些高级裁切操作，例如：

```bash
trimmer -m '^(?!EmployeeService.getEmployee).*$' test_cases/sample1.thrift
```

可以匹配除了 `EmployeeService.getEmployee` 外的所有方法。执行这条命令，可以单独从 IDL 中删除该方法及其依赖（且其他方法无依赖）的结构。

### 保护结构不被裁切

基于特定开发需要，可能希望裁切工具保留一些结构不被裁切，从而利用对应的生成代码。可以在想要保护的 struct、union、exception 的上方使用注释 `@preserve` 进行标注，裁剪时将无条件将其保留。可以和其他注释共存，但需要确保 `@preserve` 注释位于单独的一行内。
例如：

```thrift
// @preserve
struct Useless{
}
```

即使该结构没有被引用，其仍然会在裁剪后被保留。

本功能默认开启，可以通过设置 -p 或 -preserve 参数为 false 将其禁用。例如：

```bash
trimmer -p false sample.thrift
```

此时 Trimmer 工具将无视 @preserve 注释进行裁剪。

## 在 Kitex Tool 中集成

Trimmer 功能也可以直接集成在 Thriftgo/Kitex 生成代码中，但首先确保 Thriftgo 版本不低于 v0.3.1  
以 Kitex 为例，使用时添加 `-thrift trim_idl` 参数，例如：

```bash
kitex -module xx -thrift trim_idl xxx.thrift`
```

使用该参数时，命令行会额外输出额外提示：  
`[WARN] You Are Using IDL Trimmer`  
代码生成时，将会对所用到 IDL 进行裁切，最终生成的 Golang 代码就不会有无用的 Struct 结构体了。

## 使用 yaml 进行配置

为了方便通过 Kitex/Thriftgo 集成方法进行裁切时使用 trimmer tool 的参数配置，Thriftgo v0.3.3 版本（暂未发布，拉取最新 commit 即可）为 trimmer 工具提供了 yaml 配置文件支持。在集成 Kitex/Thriftgo 或直接使用 trimmer 工具时，trimmer 都会自动扫描并应用当前执行的目录（os.Getwd()）下的 trim_config.yaml 配置文件。

在启用 yaml 配置文件时，你会收到类似提示：  
`using trim config: /xxx/trim_config.yaml`

除了为集成 Kitex/Thriftgo 提供一种配置参数的方法，通过书写 yaml 配置文件，IDL 作者可以向用户或代码维护者提前圈定裁切的保留内容等，IDL 使用者也可以以此作为模板方便批量裁切或传递给其他人。

### Yaml 配置示例：

```yaml
methods:
  - "TestService.func1"
  - "TestService.func3"
preserve: true
preserved_structs:
  - "usefulStruct"
```

### 配置格式

目前可通过 yaml 配置的选项如下：

- methods：字符串数组，和 -m 参数等效，表示使用指定 method 裁切功能。格式和功能请参考“指定 Method 裁切”部分。如果命令行参数指定了 -m 参数，会覆盖此处 yaml 配置。
- preserve：bool 型，和 -p 参数等效，置为 false 表示禁用 @preserve 注释等保护结构不被裁剪的功能，默认为 true。如果命令行参数指定了 -p 参数，会覆盖此处 yaml 配置。
- preserved_structs：字符串数组，表示需要保护的结构名。如果 preserve 或 命令行的 -p 参数设置为 true，trimmer 将无条件对指定名字的结构进行保留。可以用于 struct、union、exception 结构。
