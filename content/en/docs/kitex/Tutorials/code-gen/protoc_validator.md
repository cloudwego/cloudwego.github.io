---
title: "Protoc Validator"
linkTitle: "Protoc Validator"
weight: 9
date: 2024-06-18
keywords: ["kitex", "code generation", "validator", "protoc"]
description: A protoc plugin for generating Go struct validation functions.

---

## Overview

`protoc-gen-validator` is a protoc plugin that generates validation functions for Go structs, consistent in usage and functionality with the Thrift version of Validator. Developers can reference the annotation file extended by `protoc-gen-validator` and use these annotations to declare constraints on `protobuf` `message` and `field`. Finally, `protoc-gen-validator` will generate a `Validate() error` method for the corresponding `message`.

Example:

```
message Example {
  int64 Int64Const = 1 [(api.vt).const="123"]; // The value of 'Int64Const' must be equal to '123'
  optional double DoubleLe = 2 [(api.vt).le="123.45"]; // The value of 'DoubleLe' must be less than '123.45'
  optional bool BoolConst = 3 [(api.vt).const="true"]; // The value of 'BoolConst' must be 'true'
  optional string StringMaxSize = 4 [(api.vt).max_size="12"]; // The maximum length of 'StringMaxSize' is '12'
  optional bytes bytesPrefix = 5 [(api.vt).prefix="validator"]; // The prefix of 'bytesPrefix' must be 'validator'
  repeated string ListElem = 6 [(api.vt).elem.const="validator"]; // Each element of 'ListElem' must be 'validator'
  // All values of 'MapKeyValue' keys must be '123'
  // All values of 'MapKeyValue' keys must be greater than '100'
  // All values of 'MapKeyValue' values must be 'validator'
  // All prefixes of 'MapKeyValue' values must be 'validator'
  map<int32, string> MapKeyValue = 7 [(api.vt).key.const="123", (api.vt).key.gt="100", (api.vt).value.const="validator", (api.vt).value.prefix="validator"];
  optional int64 Func1 = 8 [(api.vt).gt = "@add($Int64Const, 1000)"]; // Use the built-in function 'add' to get the constraint value
}
```

Generated method:

```
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

## Usage

### Dependencies

- [protoc](https://developers.google.com/protocol-buffers/docs/downloads) should be in `$PATH`
- [protoc-gen-go](https://github.com/protocolbuffers/protobuf-go) should be in `$PATH`/`$GOPATH`
- `protoc-gen-validator` should be in `$PATH`/`$GOPATH`
- Supports `proto2`/`proto3` syntax, with a recommendation to use `proto3` syntax

### Installation

Execute the following command:

```
go install github.com/cloudwego/protoc-gen-validator@latest
```

### Parameters

- `version`: Print the version of `protoc-gen-validator`
- `recurse`: Recursively generate validation functions for dependent proto files
- `func`: Specify the location of custom validation functions

### Example

The generated validation function (example_validate.pb.go) is in the same location as [protoc-gen-go](https://github.com/protocolbuffers/protobuf-go).

```
cd example

protoc \
  -I . \
  --go_out=. \
  --validator_out=. \
  example.proto
```

By default, the generated path for `example_validate.pb.go` is consistent with `option go_package`. You can use the `paths=source_relative:.` parameter to generate it in the location you want.

```
cd example

protoc \
  -I . \
  --go_out=. \
  --go_opt=source_relative \
  --validator_out=. \
  --validator_opt=source_relative \
  example.proto
```

If you want to specify the `go module`, it needs to be consistent with the prefix of `option go_package`, for example:

```
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

## Constraints

> Currently, protoc-gen-validator only supports basic protobuf data types, and some [WKTs](https://developers.google.com/protocol-buffers/docs/reference/google.protobuf) types, such as Any, Oneofs, etc., will be supported gradually in the future.

The annotation "vt" is an abbreviation for "validate".

### Numeric

> All numeric types (`float`, `double`, `int32`, `int64`, `uint32`, `uint64`, `sint32`, `sint64`, `fixed32`, `fixed64`, `sfixed32`, `sfixed64`) share the same constraint rules.

- const: The value of the field must be a specific value

```
int32 Int32Const = 1 [(api.vt).const="123"];
```

- lt/le/gt/ge: Represent <, <=, >, >= respectively

```
optional double DoubleLe = 2 [(api.vt).le="123.54"];
```

- in/not_in: The value of the field must be/not be one of some specific values

```
// Since the 'in' constraint is a list, the syntax here is slightly different
optional fixed32 Fix32In = 3 [(api.vt)={in: ["123","456","789"]}];
```

- not_nil: If the field is a pointer, then the pointer must not be nil

```
optional int64 I64NotNil = 4 [(api.vt).not_nil="true"];
```

### Bool

- const: The value of the field must be a specific value (true/false)

```
optional bool BoolConst = 1 [(api.vt).const="true"];
```

- not_nil: If the field is a pointer, then the pointer must not be nil

```
optional bool BoolNotNil = 2 [(api.vt).not_nil="true"];
```

### String/Bytes

- const: The value of the field must be a specific value

```
optional string StringConst = 1 [(api.vt).const="validator"];
optional bytes bytesConst = 2 [(api.vt).const="validator"];
```

- pattern: Regular match

```
optional string StringPattern = 3 [(api.vt).pattern="[0-9A-Za-z]+"];
optional bytes bytesPattern = 4 [(api.vt).pattern="[0-9A-Za-z]+"];
```

- min_size/max_size: Minimum/maximum length

```
optional string StringMinSize = 5 [(api.vt).min_size="12"];
optional bytes bytesMaxSize = 6 [(api.vt).max_size="12"];
```

- prefix/suffix/contains/not_contains: Prefix, suffix, contains, does not contain

```
optional string StringPrefix = 7 [(api.vt).prefix="validator"];
optional string StringSuffix = 8 [(api.vt).suffix="validator"];
optional bytes bytesContain = 9 [(api.vt).contains="validator"];
optional bytes bytesNotContain = 10 [(api.vt).not_contains="validator"];
```

- in/not_in: The value of the field must be/not be one of some specific values

```
// Since the 'in' constraint is a list, the syntax here is slightly different
optional string StringIn = 11 [(api.vt)={in:["123","456","789"]}];
optional bytes bytesNotIn = 12 [(api.vt)={not_in:["123","456","789"]}];
```

- not_nil: If the field is a pointer, then the pointer must not be nil

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

- const: The value of the field must be a specific value

```
optional EnumType Enum1 = 1 [(api.vt).const="EnumType.TWEET"];
```

- defined_only: The value of the field must be a value defined by the enum

```
optional EnumType Enum2 = 2 [(api.vt).defined_only="true"];
```

- not_nil: If the field is a pointer, then the pointer must not be nil

```
optional EnumType Enum3 = 3 [(api.vt).not_nil="true"];
```

### Repeated

- min_size/max_size: Minimum/maximum number of elements

```
repeated string ListMinSize = 1 [(api.vt).min_size="12"];
```

- elem: Constraints for elements within the list

```
repeated string ListBaseElem = 2 [(api.vt).elem.const="validator"];
```

### Map

- min_size/max_size: Minimum/maximum number of elements

```
map<int32, string> MapISMinSize = 1 [(api.vt).min_size="10", (api.vt).max_size="30"];
```

- key: Constraints for keys in the map

```
map<int32, string> MapKey = 2 [(api.vt).key.const="123", (api.vt).key.gt="12"];
```

- value: Constraints for values in the map

```
map<int32, string> MapValue = 3 [(api.vt).value.const="validator", (api.vt).value.prefix="validator"]
```

- no_sparse: If the value of the map is a pointer, then the pointer must not be nil

```
map<int32, MsgType> MapNoSparse = 4 [(api.vt).no_sparse="true"];
```

### Message Field

- skip: Skip the validation of the structure

```
optional MapValidate MsgField = 1 [(api.vt).skip="true"];
```

### Message Level Rule

- msg_vt.assert: The result of the expression specified by assert should be "true", and parameter validation is performed from the perspective of the message

```
message StructValidate {
  option (api.msg_vt).assert = "@equal($MsgValidate,1)";
  optional int64 MsgValidate = 1;
}
```

### Cross-domain Reference

- Cross-domain reference: You can use the value of another domain as a validation constraint value, and the scope is the current structure

```
optional double DoubleLe = 1;
optional double Reference = 2 [(api.vt).le="$DoubleLe"];
```

### Built-in Functions

`protoc-gen-validator` provides a set of built-in functions for writing validation rules.

| function name | arguments                                      | results                                                | remarks                                 |
| ------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| len           | 1: container filed                             | 1: length of container (integer)                       | just like `len` of go                   |
| sprintf       | 1: format string 2+: arguments matching format | 1: formatted string (string)                           | just like `fmt.Sprintf` of go           |
| now_unix_nano | none                                           | 1: nano seconds (int64)                                | just like `time.Now().UnixNano()` of go |
| equal         | 1, 2: comparable values                        | 1: whether two arguments is equal (bool)               | just like `==` of go                    |
| mod           | 1, 2: integer                                  | 1: remainder of 1/1/2 (integer)                        | just like `%` of go                     |
| add           | 1, 2: both are numeric or string               | 1: sum of two arguments (integer or float64 or string) | just like `+` of go                     |

### Custom Validation Functions

`protoc-gen-validator` provides a method to extend validation functions. Now you can use the `func` parameter to customize your validation functions. For example:

```
cd example

protoc \
  -I . \
  --go_out=. \
  --validator_out=. \
  --validator_opt=func=my_func=path_to_template.txt \
  example.proto
```

`my_func` is the name of the function, and `path_to_template.txt` is the template file for the function, which should be a standard Go template. Available template variables are as follows:

| Variable Name | Meaning                               | Type                                                         |
| ------------- | ------------------------------------- | ------------------------------------------------------------ |
| Source        | variable name that rule will refer to | string                                                       |
| Function      | data of current function              | *"github.com/cloudwego/protoc-gen-validator/parser".ToolFunction |
