---
title: "Thrift Validator"
date: 2022-06-01
weight: 3
description: >
---

## 概述

Validator 是用于支持结构体校验能力的 thriftgo 插件。

在 IDL 中通过注解来描述约束，插件会根据注解给对应的 struct 生成 `IsValid() error ` 方法，生成在 xxx-validator.go 文件。

注解采用 `vt.{ConstraintType} = "Value"` 这种形式描述。

适用范围：struct/union 中的每个 field 。

校验形式：用户主动校验。（可提供中间件，统一对所有参数/结果校验）

IDL 示例：

```
enum MapKey {
    A, B, C, D, E, F
}

struct Request {
    1: required string Message (vt.max_size = "30", vt.prefix = "Debug")
    2: i32 ID (vt.gt = "1000", vt.lt = "10000")
    3: list<double> Values (vt.elem.gt = "0.25")
    4: map<MapKey, binary> KeyValues (vt.key.defined_only = "true", vt.min_size = "1")
}

struct Response {
    1: required string Message (vt.in = "Debug", vt.in = "Info", vt.in = "Warn", vt.in = "Error")
}
```

## 安装

使用 Validator 插件前需要先进行安装，才可以使用，否则会报找不到 `thrift-gen-validator` 可执行文件错误（ `exec: "thrift-gen-validator": executable file not found in $PATH`）。

如果你已经安装好 Golang 和 Kitex 命令行工具，请执行如下命令安装 `thrift-gen-validator` 插件：

```shell
$ go install github.com/cloudwego/thrift-gen-validator@latest
```

执行完 `go install` 之后，会将编译后的 `thrift-gen-validator` 二进制文件安装到 `$GOPATH/bin` 下。

可以执行下面的命令，验证是否安装成功。

```shell
$ cd $(go env GOPATH)/bin
$ ls
go1.20.1             goimports            hz                   thrift-gen-validator
godotenv             golangci-lint        kitex                thriftgo
$ cd ~/ && thrift-gen-validator --help
Usage of thrift-gen-validator:
  -version
        Show the version of thrift-gen-validator
(0x1232358,0x1370f70)
```

`cd ~/` 是为了验证在任意目录下都可以愉快地调用 `thrift-gen-validator`。如果在执行该命令时出现类似上述找不到 `thrift-gen-validator` 可执行文件错误，请检查 `$GOPATH` 是否被正确设置到 `$PATH` 中。

关于 `thrift-gen-validator` 的安装及其他更多信息，可参阅 [thrift-gen-validator](https://github.com/cloudwego/thrift-gen-validator)

## 使用

以[快速开始](/zh/docs/kitex/getting-started/)里的 Kitex Hello 项目为例，进入示例仓库的 `hello` 目录，在 `hello.thrift` 中添加注解，例如我们对 `Request` 结构体的 `message` 字段进行约束，约束长度不超过8且要以 "kitex-" 前缀开头：

```
struct Request {
	1: string message (vt.max_size = "8", vt.prefix = "kitex-")
}
```

在生成 Kitex 代码时，加上 `--thrift-plugin validator` 参数，即可生成 validator 文件。

```
kitex --thrift-plugin validator -service a.b.c hello.thrift
```

执行后，可以看见新生成的 Validator：

```
├── kitex_gen
    └── api
        ├── hello
        │   ├── client.go
        │   ├── hello.go
        │   ├── invoker.go
        │   └── server.go
        ├── hello.go
  -->   ├── hello_validator.go
        ├── k-consts.go
        └── k-hello.go
```

其中对于 `Request` 结构体，新生成了 `IsValid()` 方法：

```
func (p *Request) IsValid() error {
	if len(p.Message) > int(8) {
		return fmt.Errorf("field Message max_len rule failed, current value: %d", len(p.Message))
	}
	_src := "kitex-"
	if !strings.HasPrefix(p.Message, _src) {
		return fmt.Errorf("field Message prefix rule failed, current value: %v", p.Message)
	}
	return nil
}
```

在后续的使用中，调用 `IsValid()` 方法对结构体进行校验即可：

```

		req := &api.Request {
			//....
		}
		err := req.IsValid()
		if err != nil {
			//invalid ....
		}

		//valid ...

```

## 支持的校验能力

校验顺序以定义顺序为准， 'in' 和 'not_in' 这类可以定义多次的，以第一次出现的顺序为准。

### 数字类型

包括 i8，i16，i32，i64，double。

1. const，必须为指定值。
2. lt，le，gt，ge，分别表示小于，小于等于，大于，大于等于。
3. in，not_in，分别表示可以使用的值和不可以使用的值，可多次指定，一次指定一个值。
4. not_nil，该字段不能为空。（仅当字段为 optional 时合法）

```Thrift
struct NumericDemo {
    1: double Value (vt.gt = "1000.1", vt.lt = "10000.1")
    2: i8 Type (vt.in = "1", vt.in = "2", vt.in = "4")
    3: i64 MagicNumber (vt.const = "0x5f3759df")
}
```

### string/binary

1. const，必须为指定值。
2. min_size，max_size，最大长度，最小长度。
3. pattern，正则匹配。
4. prefix，suffix，contains，not_contains，限制前缀，限制后缀，必须包含，不能包含。
5. in，not_in，分别表示可以使用的值和不可以使用的值，二者不能同时使用，可多次指定，一次指定一个值。
6. not_nil，该字段不能为空。（仅当字段为 optional 时合法）

```Thrift
struct StringDemo {
    1: string Uninitialized (vt.const = "烫烫烫")
    2: string Name (vt.min_size = "6", vt.max_size = "12")
    3: string SomeStuffs (vt.pattern = "[0-9A-Za-z]+")
    4: string DebugInfo (vt.prefix = "[Debug]")
    5: string PanicInfo (vt.contains = "panic")
    6: string Editor (vt.in = "vscode", vt.in = "vim", vt.in = "goland")
}
```

### bool

1. const，必须为指定值。
2. not_nil，该字段不能为空。（仅当字段为 optional 时合法）

```Thrift
struct BoolDemo {
    1: bool AMD (vt.const = "true")
    2: optional bool Nvidia (vt.not_nil = "false")
}
```

### enum

1. const，必须为指定值。
2. defined_only，必须在 enum 中定义的值中。
3. not_nil，该字段不能为空。（仅当字段为 optional 时合法）

```Thrift
enum Type {
    Number, String, List, Map
}

struct EnumDemo {
    1: Type AddressType (vt.const = "String")
    2: Type ValueType (vt.defined_only = "true")
    3: optional Type OptType (vt.not_nil = "true")
}
```

### set/list

1. min_size，max_size，最小长度，最大长度。
2. elem，元素约束。

```Thrift
struct SetListDemo {
    1: list<string> Persons (vt.min_size = "5", vt.max_size = "10")
    2: set<double> HealthPoints (vt.elem.gt = "0")
}
```

### map

1. min_size，max_size，最小键值对数，最大键值对数。
2. no_sparse，value 为指针时，不能为 nil 。
3. key，value，键约束，值约束。

```Thrift
struct MapDemo {
    1: map<i32, string> IdName (vt.min_size = "5", vt.max_size = "10")
    2: map<i32, DemoTestRequest> Requests (vt.no_sparse = "true")
    3: map<i32, double> Some, (vt.key.gt = "0", vt.value.lt = "1000")
}
```

### struct/union/exception

1. skip，跳过该 struct/union/exception 的递归校验。（作为单独字段时默认为 false，作为元素时默认为 true ）
2. not_nil，该字段不能为空。

```Thrift
struct OuterRequest {
    1: SomeStruct Struct (vt.skip = "true")
    2: SomeUnion Union (vt.skip = "true")
    3: SomeStruct NotNilStruct (vt.not_nil = "true")
}
```

### 变量引用

前置符 `$` 表示某个变量的引用，可用于**跨字段校验**：

1. `$x` 代表名为 `x` 的变量，变量名为 `\[a-zA-Z0-9_]\`，其作用域规则为**当前结构体**。
2. `$` 表示 validator 所处的当前字段。

```Thrift
struct Example {
    1: string A (vt.max_size = "$C")
    2: string B (vt.not_in = "$A")
    3: i32 C
}
```

### 工具函数

前置符 `@` 表示内置的工具函数来计算校验值，目前支持的工具函数：

1. `sprintf(fmt, $1, $2...)` 用于输出特定字符。
2. `len($x)` 输出变量大小。（字符串长度、list 元素个数）

```Thrift
struct Example {
    1: string A
    2: list<string> B (vt.max_size = "@len($D)")
    3: map<string,int) C
    4: string D (vt.const = "@sprintf(\"%s_%s\", $A, \"mysuffix\")")
}
```
