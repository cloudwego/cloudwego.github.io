---
title: "Protoc Validator"
linkTitle: "Protoc Validator"
weight: 9
date: 2024-06-18
keywords: ["kitex", "代码生成", "validator", "protoc"]
description: 生成 Go 结构体校验函数的 protoc 插件。

---

## 概述

`protoc-gen-validator` 是一个可以生成 Go 结构体校验函数的 protoc 插件，与 Thrift 版本 Validator 用法与功能一致。 
开发者可以引用 `protoc-gen-validator` 拓展的注解文件，并使用这些注解对 `protobuf` 的 `message` 和 `field` 的约束进行声明。 最后，`protoc-gen-validator` 会为对应的 `message` 生成 `Validate() error` 方法。
例:

```protobuf
message Example {
  int64 Int64Const = 1 [(api.vt).const="123"]; // 'Int64Const' 的值必须等于 '123'
  optional double DoubleLe = 2 [(api.vt).le="123.45"]; // 'DoubleLe' 的值必须小于 '123.45'
  optional bool BoolConst = 3 [(api.vt).const="true"]; // 'BoolConst' 的值必须为 'true'
  optional string StringMaxSize = 4 [(api.vt).max_size="12"]; // 'StringMaxSize' 的最大长度为 '12'
  optional bytes bytesPrefix = 5 [(api.vt).prefix="validator"]; // 'bytesPrefix' 的前缀必须为 'validator'
  repeated string ListElem = 6 [(api.vt).elem.const="validator"]; // 'ListElem' 的每一个元素必须为 'validator'
  // 'MapKeyValue' 所有 key 的值必须为 '123'
  // 'MapKeyValue' 所有 key 的值必须大于 '100'
  // 'MapKeyValue' 所有 value 的值必须为 'validator'
  // 'MapKeyValue' 所有 value 的前缀必须为 'validator'
  map<int32, string> MapKeyValue = 7 [(api.vt).key.const="123", (api.vt).key.gt="100", (api.vt).value.const="validator", (api.vt).value.prefix="validator"];
  optional int64 Func1 = 8 [(api.vt).gt = "@add($Int64Const, 1000)"]; // 使用内置函数 'add' 来获取约束值
}
```

生成的方法:

```go
func (m *Example) Validate() error {
	if m.GetInt64Const() != int64(123) {
		return fmt.Errorf("field Int64Const not match const value, current value: %v", m.GetInt64Const())
	}
	if m.GetDoubleLe() > float64(123.45) {
		return fmt.Errorf("field DoubleLe le rule failed, current value: %v", m.GetDoubleLe())
	}
	if m.GetBoolConst() != true {
		return fmt.Errorf("field BoolConst const rule failed, current value: %v", m.GetBoolConst())
	}
	if len(m.GetStringMaxSize()) > int(12) {
		return fmt.Errorf("field StringMaxSize max_len rule failed, current value: %d", len(m.GetStringMaxSize()))
	}
	_src := []byte("validator")
	if !bytes.HasPrefix(m.GetBytesPrefix(), _src) {
		return fmt.Errorf("field bytesPrefix prefix rule failed, current value: %v", m.GetBytesPrefix())
	}
	for i := 0; i < len(m.GetListElem()); i++ {
		_elem := m.GetListElem()[i]
		_src1 := "validator"
		if _elem != _src1 {
			return fmt.Errorf("field _elem not match const value, current value: %v", _elem)
		}
	}
	for k := range m.GetMapKeyValue() {
		if k != int32(123) {
			return fmt.Errorf("field k not match const value, current value: %v", k)
		}
		if k <= int32(100) {
			return fmt.Errorf("field k gt rule failed, current value: %v", k)
		}
	}
	for _, v := range m.GetMapKeyValue() {
		_src2 := "validator"
		if v != _src2 {
			return fmt.Errorf("field v not match const value, current value: %v", v)
		}
		_src3 := "validator"
		if !strings.HasPrefix(v, _src3) {
			return fmt.Errorf("field v prefix rule failed, current value: %v", v)
		}
	}
	_src4 := m.GetInt64Const() + int64(1000)
	if m.GetFunc1() <= int64(_src4) {
		return fmt.Errorf("field Func1 gt rule failed, current value: %v", m.GetFunc1())
	}
	return nil
}
```

## 使用方法

### 依赖

- [protoc](https://developers.google.com/protocol-buffers/docs/downloads) 位于 `$PATH` 下
- [protoc-gen-go](https://github.com/protocolbuffers/protobuf-go) 位于 `$PATH`/`$GOPATH` 下
- `protoc-gen-validator` 位于 `$PATH`/`$GOPATH` 下
- 支持 `proto2`/`proto3` 语法，更推荐使用 `proto3` 语法

### 安装

执行以下命令：

```go
go install github.com/cloudwego/protoc-gen-validator@latest
```

### 参数

- `version`: 打印 `protoc-gen-validator` 版本
- `recurse`: 递归生成依赖的 proto 文件的校验函数
- `func`: 指定自定义验证函数的位置

### 示例

校验函数(example_validate.pb.go)的生成位置与 [protoc-gen-go](https://github.com/protocolbuffers/protobuf-go) 的一致。

```bash
cd example

protoc \
  -I . \
  --go_out=. \
  --validator_out=. \
  example.proto
```

默认情况下，`example_validate.pb.go` 的生成路径与 `option go_package` 保持一致。你可以通过 `paths=source_relative:.` 参数，将其生成到你想要的位置

```bash
cd example

protoc \
  -I . \
  --go_out=. \
  --go_opt=source_relative \
  --validator_out=. \
  --validator_opt=source_relative \
  example.proto
```

如果你想要指定 `go module`，需要 `go module` 与 `option go_package` 的前缀保持一致，例如：

```bash
// option go_package="example.com/validator/example";
cd example

protoc \
  -I . \
  --go_out=. \
  --go_opt=module=example.com/validator \
  --validator_out=. \
  --validator_opt=module=example.com/validator \
  example.proto
```

## 约束规则

> 目前， protoc-gen-validator 只支持 protobuf 的基本数据类型，一些 [WKTs](https://developers.google.com/protocol-buffers/docs/reference/google.protobuf) 类型，例如，Any、Oneofs 等会在之后陆续支持

注解 "vt" 是 "validate" 的缩写

### Numeric

> 所有的数值类型 (`float`, `double`, `int32`, `int64`, `uint32`, `uint64`, `sint32`, `sint64`, `fixed32`, `fixed64`, `sfixed32`, `sfixed64`) 共享同样的约束规则。

- const: 该域的值必须是特定的值

```
int32 Int32Const = 1 [(api.vt).const="123"];
```

- lt/le/gt/ge: 分别表示 <, <=, >, >=

```
optional double DoubleLe = 2 [(api.vt).le="123.54"];
```

- in/not_in: 该域的值必须是/不是某些特定的值之一

```
// 由于 'in' 约束是一个列表，所以这里的写法稍有不同
optional fixed32 Fix32In = 3 [(api.vt)={in: ["123","456","789"]}];
```

- not_nil: 如果该域是一个指针，那么指针不能为空

```
optional int64 I64NotNil = 4 [(api.vt).not_nil="true"];
```

### Bool

*const: 该域的值必须是特定的值(true/false)

```
optional bool BoolConst = 1 [(api.vt).const="true"];
```

- not_nil: 如果该域是一个指针，那么指针不能为空

```
optional bool BoolNotNil = 2 [(api.vt).not_nil="true"];
```

### String/Bytes

*const: 该域的值必须是特定的值

```
optional string StringConst = 1 [(api.vt).const="validator"];
optional bytes bytesConst = 2 [(api.vt).const="validator"];
```

*pattern: 正则匹配

```
optional string StringPattern = 3 [(api.vt).pattern="[0-9A-Za-z]+"];
optional bytes bytesPattern = 4 [(api.vt).pattern="[0-9A-Za-z]+"];
```

*min_size/max_size: 最小/最大长度

```
optional string StringMinSize = 5 [(api.vt).min_size="12"];
optional bytes bytesMaxSize = 6 [(api.vt).max_size="12"];
```

*prefix/suffix/contains/not_contains: 前缀、尾缀、包含、不包含

```
optional string StringPrefix = 7 [(api.vt).prefix="validator"];
optional string StringSuffix = 8 [(api.vt).suffix="validator"];
optional bytes bytesContain = 9 [(api.vt).contains="validator"];
optional bytes bytesNotContain = 10 [(api.vt).not_contains="validator"];
```

- in/not_in: 该域的值必须是/不是某些特定的值之一

```
// 由于 'in' 约束是一个列表，所以这里的写法稍有不同
optional string StringIn = 11 [(api.vt)={in:["123","456","789"]}];
optional bytes bytesNotIn = 12 [(api.vt)={not_in:["123","456","789"]}];
```

- not_nil: 如果该域是一个指针，那么指针不能为空

```
optional string StringNotNil = 13 [(api.vt).not_nil="true"];
```

### Enum

```
enum EnumType {
  TWEET = 0;
  RETWEET = 1;
}
```

*const: 该域的值必须是特定的值

```
optional EnumType Enum1 = 1 [(api.vt).const="EnumType.TWEET"];
```

*defined_only: 该域的值必须是枚举定义的值

```
optional EnumType Enum2 = 2 [(api.vt).defined_only="true"];
```

- not_nil: 如果该域是一个指针，那么指针不能为空

```
optional EnumType Enum3 = 3 [(api.vt).not_nil="true"];
```

### Repeated

- min_size/max_size: 最小/最大元素个数

```
repeated string ListMinSize = 1 [(api.vt).min_size="12"];
```

- elem: 对于列表内元素的约束

```
repeated string ListBaseElem = 2 [(api.vt).elem.const="validator"];
```

### Map

- min_size/max_size: 最小/最大元素个数

```
map<int32, string> MapISMinSize = 1 [(api.vt).min_size="10", (api.vt).max_size="30"];
```

- key: 对于 map 中 key 的约束

```
map<int32, string> MapKey = 2 [(api.vt).key.const="123", (api.vt).key.gt="12"];
```

- value: 对于 map 中 value 的约束

```
map<int32, string> MapValue = 3 [(api.vt).value.const="validator", (api.vt).value.prefix="validator"]
```

- no_sparse: 如果 map 的 value 是指针，那么指针不能为空

```
map<int32, MsgType> MapNoSparse = 4 [(api.vt).no_sparse="true"];
```

### Message Field

- skip: 跳过该结构体的校验

```
optional MapValidate MsgField = 1 [(api.vt).skip="true"];
```

### Message Level Rule

- msg_vt.assert: assert 指定的表达式的结果应该为 "true"，在 message 的视角来进行参数校验

```
message StructValidate {
  option (api.msg_vt).assert = "@equal($MsgValidate,1)";
  optional int64 MsgValidate = 1;
}
```

### 跨域引用

- 跨域引用: 可以使用另外一个域的值作为校验约束值，作用域为当前结构体

```
optional double DoubleLe = 1;
optional double Reference = 2 [(api.vt).le="$DoubleLe"];
```

### 内置函数

`protoc-gen-validator` 提供一组内置函数以便编写校验规则

| function name | arguments                                      | results                                                | remarks                                 |
| ------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| len           | 1: container filed                             | 1: length of container (integer)                       | just like `len` of go                   |
| sprintf       | 1: format string 2+: arguments matching format | 1: formatted string (string)                           | just like `fmt.Sprintf` of go           |
| now_unix_nano | none                                           | 1: nano seconds (int64)                                | just like `time.Now().UnixNano()` of go |
| equal         | 1, 2: comparable values                        | 1: whether two arguments is equal (bool)               | just like `==` of go                    |
| mod           | 1, 2: integer                                  | 1: remainder of $1 / $2 (integer)                      | just like `%` of go                     |
| add           | 1, 2: both are numeric or string               | 1: sum of two arguments (integer or float64 or string) | just like `+` of go                     |

### 自定义验证函数

`protoc-gen-validator` 提供拓展验证函数的方法 现在你可以使用参数 `func` 去自定义你的验证函数。如下:

```
cd example

protoc \
  -I . \
  --go_out=. \
  --validator_out=. \
  --validator_opt=func=my_func=path_to_template.txt \
  example.proto
```

`my_func` 是函数的名字, `path_to_template.txt` 是函数的模板文件，该模板应该是一个标准的 go 模板。 可用的模板变量如下:

| 变量名   | 含义                                  | 类型                                                         |
| -------- | ------------------------------------- | ------------------------------------------------------------ |
| Source   | variable name that rule will refer to | string                                                       |
| Function | data of current function              | *"github.com/cloudwego/protoc-gen-validator/parser".ToolFunction |

