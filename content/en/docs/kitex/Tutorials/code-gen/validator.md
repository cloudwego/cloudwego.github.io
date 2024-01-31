---
title: "Thrift Validator"
date: 2022-06-01
weight: 3
description: >
---



## Overview

Validator is a thrift plugin that supports struct validation.

Constraints are described by annotations in IDL, and the plugin will generate the `IsValid() error` method according to the structure given by the annotation, which is generated in the xxx-validator.go file.

Annotation is described in the form `vt.{ContType} = "Value"`.

Scope: Every field in struct/union.

Validation form: User initiative (provided, consistent for all parameters/results).

IDL example:

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

## Installation

Before using the Validator plugin, you should install it first. 

Otherwise, an error message will be displayed stating that the `thrift-gen-validator` executable file cannot be found (`exec: "thrift-gen-validator": executable file not found in $PATH`). 

If you have already installed Golang and Kitex command-line tools, please run the following command to install the `thrift-gen-validator` plugin:

```shell
$ go install github.com/cloudwego/thrift-gen-validator@latest
```

After executing `go install`, the compiled `thrift-gen-validator` binary file will be installed under `$GOPATH/bin`. 

You can run the following command to verify that the installation was successful.

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

`cd ~/` command is used to verify that `thrift-gen-validator` can be called from any directory.

If an error message similar to the one above appears when executing this command, please check whether `$GOPATH` has been correctly set to `$PATH`.

For more information on installing and using `thrift-gen-validator`, please refer to [thirft-gen-validator](https://github.com/cloudwego/thrift-gen-validator).

## Usage

Take the project "Kitex Hello" in [Getting Started](/docs/kitex/getting-started/) as an example, add annotations in`hello.thrift`. For example, the code bellow requires the length and prefix for `Request.message`:

```
struct Request {
	1: string message (vt.max_size = "8", vt.prefix = "kitex-")
}
```

When generating kitex code, add  `--thrift-plugin validator` to generate the validator code.

```
kitex --thrift-plugin validator -service a.b.c hello.thrift
```

The code will be generated in the directory bellow:

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

For struct `Request`, `IsValid()` is like this：

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

So just simply call `IsValid()` to verify the struct：

```

		req := &api.Request{
			//....
		}
		err := req.IsValid()
		if err != nil {
			//invalid ....
		}

		//valid ...

```

## Supported Validators

The verification order is subject to the definition order,'in' and 'not_in' can be defined multiple times, whichever occurs first.

### number

Including i8, i16, i32, i64, double.

1. const, must be the specified value.
2. lt, le, gt, ge, represents less than, less than or equal to, greater than, greater than or equal to.
3. in, not_in, represents values that can be used and values that cannot be used, and can be specified multiple times, one value at a time.
4. not_nil, the field cannot be empty (only valid if the field is optional).

```Thrift
struct NumericDemo {
    1: double Value (vt.gt = "1000.1", vt.lt = "10000.1")
    2: i8 Type (vt.in = "1", vt.in = "2", vt.in = "4")
    3: i64 MagicNumber (vt.const = "0x5f3759df")
}
```

### string/binary

1. const, must be the specified value.
2. min_size, max_size.
3. pattern, is used for regular matching.
4. prefix, suffix, contains, not_contains.
5. in, not_in, respectively indicate that the numerical value used and the numerical value cannot be specified at the same time. It can be specified for one use, and one can be specified.
6. not_nil, the field cannot be empty (only valid if the field is optional).

```Thrift
struct StringDemo {
    1: string Uninitialized (vt.const = "test")
    2: string Name (vt.min_size = "6", vt.max_size = "12")
    3: string SomeStuffs (vt.pattern = "[0-9A-Za-z]+")
    4: string DebugInfo (vt.prefix = "[Debug]")
    5: string PanicInfo (vt.contains = "panic")
    6: string Editor (vt.in = "vscode", vt.in = "vim", vt.in = "goland")
}
```

### bool

1. const, must be the specified value.
2. not_nil, the field cannot be empty (only valid if the field is optional).

```Thrift
struct BoolDemo {
    1: bool AMD (vt.const = "true")
    2: optional bool Nvidia (vt.not_nil = "false")
}
```

### enum

1. const, must be the specified value.
2. defined_only, must be in the value defined in the enum.
3. not_nil, the field cannot be empty (only valid if the field is optional).

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

1. min_size, max_size.
2. elem, element constraints.

```Thrift
struct SetListDemo {
    1: list<string> Persons (vt.min_size = "5", vt.max_size = "10")
    2: set<double> HealthPoints (vt.elem.gt = "0")
}
```

### map

1. min_size, max_size.
2. no_sparse, means it can't be nil when value is a pointer.
3. key, value.

```Thrift
struct MapDemo {
    1: map<i32, string> IdName (vt.min_size = "5", vt.max_size = "10")
    2: map<i32, DemoTestRequest> Requests (vt.no_sparse = "true")
    3: map<i32, double> Some, (vt.key.gt = "0", vt.value.lt = "1000")
}
```

### struct/union/exception

1. skip, means skipping recursive checks for struct/union/exception. (Defaults to false when used as a separate field, true by default when used as an element).
2. not_nil, the field cannot be empty (only valid if the field is optional).

```Thrift
struct OuterRequest {
    1: SomeStruct Struct (vt.skip = "true")
    2: SomeUnion Union (vt.skip = "true")
    3: SomeStruct NotNilStruct (vt.not_nil = "true")
}
```

### variable reference

The prefix '$' represents a reference to a variable, which can be used for **cross-field verification**:

1. $x represents a variable named x, the variable name is \[a-zA-Z0-9_]\, and its scope rule is **current structure**.
2. $ represents the current field where the validator is located.

```Thrift
struct Example {
    1: string A (vt.max_size = "$C")
    2: string B (vt.not_in = "$A")
    3: i32 C
}
```

### utility function

The prefix ‘@’ indicates the built-in tool function to calculate the check value. Currently supported tool functions:

1. sprintf(fmt, $1, $2...), used to output specific characters.
2. len($x), output variable size (string length, number of list elements).

```Thrift
struct Example {
    1: string A
    2: list<string> B (vt.max_size = "@len($D)")
    3: map<string,int) C
    4: string D (vt.const = "@sprintf(\"%s_%s\", $A, \"mysuffix\")")
}
```
