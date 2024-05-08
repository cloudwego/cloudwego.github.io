---
title: "Binding and validate"
date: 2022-06-21
weight: 8
keywords:
  ["Binding and validate", "go-tagexpr", "tag", "Parameter binding precedence"]
description: "The parameter binding and validation related functions and usage supported by Hertz."
---

## Usage

```go
func main() {
	r := server.New()

    r.GET("/hello", func(c context.Context, ctx *app.RequestContext) {
        // Parameter binding needs to be used with a specific go tag
		type Test struct {
            A string `query:"a" vd:"$!='Hertz'"`
        }

        // BindAndValidate
        var req Test
        err := ctx.BindAndValidate(&req)

        ...

	    // Bind
        req = Test{}
        err = ctx.Bind(&req)

        ...

        // Validate, need to use "vd" tag
        err = ctx.Validate(&req)

        ...
    })
...
}
```

### APIs

> hertz version >= v0.7.0

| API                   | Description                                                                                                                                                                                            |
| :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ctx.BindAndValidate   | Use the following go-tag for parameter binding, and do a parameter validation after successful binding (if there is a validation tag)                                                                  |
| ctx.Bind              | Same as `BindAndValidate` but without parameter validation                                                                                                                                             |
| ctx.BindQuery         | Bind all Query parameters, which is equivalent to declaring a `query` tag for each field, for scenarios where no tag is written                                                                        |
| ctx.BindHeader        | Bind all Header parameters, which is equivalent to declaring a `header` tag for each field, for scenarios where no tag is written                                                                      |
| ctx.BindPath          | Bind all Path parameters, which is equivalent to declaring a `path` tag for each field, for scenarios where no tag is written                                                                          |
| ctx.BindForm          | Bind all Form parameters, equivalent to declaring a `form` tag for each field, requires Content-Type: `application/x-www-form-urlencoded`/`multipart/form-data`, for scenarios where no tag is written |
| ctx.BindJSON          | Bind JSON Body, call `json.Unmarshal()` for deserialization, need Body to be in `application/json` format                                                                                              |
| ctx.BindProtobuf      | Bind Protobuf Body, call `proto.Unmarshal()` for deserialization, requires Body to be in `application/x-protobuf` format                                                                               |
| ctx.BindByContentType | The binding method is automatically selected based on the Content-Type, where GET requests call `BindQuery`, and requests with Body are automatically selected based on the Content-Type.              |
| ctx.Validate          | Parameter checksums, which require a checksum tag to be used (vd tag checksums are used by default)                                                                                                    |

## Supported tags and Parameter binding precedence

### Supported tags

When generating code without IDL, if no tags are added to the field, it will traverse all tags and bind parameters according to priority. Adding tags will bind parameters according to the corresponding tag's priority.

If [api-annotations](/docs/hertz/tutorials/toolkit/annotation/#supported-api-annotations) are not added when generating code through IDL, the fields will default to adding `form`, `JSON`, and `query` tags. Adding [api-annotations](/docs/hertz/tutorials/toolkit/annotation/#supported-api-annotations) will add the corresponding required tags for the fields.

| go tag   | description                                                                                                                                                                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| path     | This tag is used to bind parameters on url like `:param` or `*param`. For example: if we defined route is: `/v:version/example`, you can specify the path parameter as the route parameter: `path:"version"`. In this case if url is http://127.0.0.1:8888/v1/ , you can bind the path parameter "1".                   |
| form     | This tag is used to bind the key-value of the form in request body which content-type is `multipart/form-data` or `application/x-www-form-urlencoded`                                                                                                                                                                   |
| query    | This tag is used to bind query parameter in request                                                                                                                                                                                                                                                                     |
| cookie   | This tag is used to bind cookie parameter in request                                                                                                                                                                                                                                                                    |
| header   | This tag is used to bind header parameters in request                                                                                                                                                                                                                                                                   |
| json     | This tag is used to bind json parameters in the request body which content-type is `application/json`                                                                                                                                                                                                                   |
| raw_body | This tag is used to bind the original body (bytes type) of the request, and parameters can be bound even if the bound field name is not specified. (Note: raw_body has the lowest binding priority. When multiple tags are specified, once other tags successfully bind parameters, the body content will not be bound) |
| vd       | `vd` short for validator, [The grammar of validation parameter](https://github.com/bytedance/go-tagexpr/tree/master/validator)                                                                                                                                                                                          |
| default  | Set default value                                                                                                                                                                                                                                                                                                       |

### Parameter Validation

Specific validation syntax can be referred to [The grammar of validation parameter](https://github.com/bytedance/go-tagexpr/tree/master/validator).

When generating code without IDL, directly tag the corresponding structure field, for example:

```go
type InfoRequest struct {
		Name         string   `vd:"$!='your string'"`
}
```

When generating code through IDL, corresponding annotations need to be added, please refer to [field-annotation](/docs/hertz/tutorials/toolkit/annotation/#field-annotation).

Here are common usage examples:

- length validation for string and list `len($)>0`
- regex pattern match for string `regexp('^\\w*$')"`
- value validation for numertic field `$>0`
- validation for pointer field `num==nil || num>0`
- validation for enum types `type=="hello" || type == "world"`
- custom error message `msg:'C must be false when S.A>0'"`

### Parameter binding precedence

```text
path > form > query > cookie > header > json > raw_body
```

> Note: If the request content-type is `application/json`, json unmarshal processing will be done by default before parameter binding

### Required parameter

You can specify a parameter as required with keyword `required` in tag. Both `Bind` and `BindAndValidate` returns error when a required parameter is missing.
When multiple tags contain the`required` keyword, parameter with be bound in order of precedence defined above. If none of the tags bind, an error will be returned.

```go
type TagRequiredReq struct {
	// when field hertz is missing in JSON, a required error will be return: binding: expr_path=hertz, cause=missing required parameter
	Hertz string `json:"hertz,required"`
	// when field hertz is missing in both query and JSON, a required error will be return: binding: expr_path=hertz, cause=missing required parameter
	Kitex string `query:"kitex,required" json:"kitex,required" `
}
```

## Common config

> hertz has refactored `parameter binding` and `checksum` in version v0.7.0, which changes the behaviour of the configurations, as described below<br> respectively.
> If you still want to use the previous binder, it is now implemented under [hertz-contrib/binding](https://github.com/hertz-contrib/binding) and can be introduced via a custom binder.

### Customise binder

> hertz version >= v0.7.0 support

You need to implement the Binder interface and inject it into the hertz engine in a configurable way.

```go
type Binder interface {
    Name() string // The name of the binder.
    // The following are the various binding methods
    Bind(*protocol.Request, interface{}, param.Params) error
    BindAndValidate(*protocol.Request, interface{}, param.Params) error
    BindQuery(*protocol.Request, interface{}) error
    BindHeader(*protocol.Request, interface{}) error
    BindPath(*protocol.Request, interface{}, param.Params) error
    BindForm(*protocol.Request, interface{}) error
    BindJSON(*protocol.Request, interface{}) error
    BindProtobuf(*protocol.Request, interface{}) error
}
```

Example

```go

func main() {
    // Inject a custom binder via configuration
    h := server.New(server.WithCustomBinder(&mockBinder{}))
    ...
    h.Spin()
}


type mockBinder struct{}

func (m *mockBinder) Name() string {
	return "test binder"
}

func (m *mockBinder) Bind(request *protocol.Request, i interface{}, params param.Params) error {
	return nil
}

func (m *mockBinder) BindAndValidate(request *protocol.Request, i interface{}, params param.Params) error {
	return fmt.Errorf("test binder")
}

func (m *mockBinder) BindQuery(request *protocol.Request, i interface{}) error {
	return nil
}

func (m *mockBinder) BindHeader(request *protocol.Request, i interface{}) error {
	return nil
}

func (m *mockBinder) BindPath(request *protocol.Request, i interface{}, params param.Params) error {
	return nil
}

func (m *mockBinder) BindForm(request *protocol.Request, i interface{}) error {
	return nil
}

func (m *mockBinder) BindJSON(request *protocol.Request, i interface{}) error {
	return nil
}

func (m *mockBinder) BindProtobuf(request *protocol.Request, i interface{}) error {
	return nil
}

```

Currently expanded binders:

- bytedance/go-tagexpr: https://github.com/hertz-contrib/binding/tree/main/go_tagexpr (binding library used before refactoring)

### Custom validator

> Supported by hertz version >= v0.7.0.

You need to implement the Validator interface and inject it into the hertz engine in a configurable way.

```go
type StructValidator interface {
    ValidateStruct(interface{}) error // Validation function.
    Engine() interface{} // Returns the underlying Validator.
    ValidateTag() string // Validation tag, declares the tag used by the validator.
}
```

Example

```go

func main() {
	// Inject the custom binder via configuration
    h := server.New(server.WithCustomValidator(&mockValidator{}))
    ...
    h.Spin()
}

type mockValidator struct{}

func (m *mockValidator) ValidateStruct(interface{}) error {
    return fmt.Errorf("test mock validator")
}

func (m *mockValidator) Engine() interface{} {
    return nil
}

func (m *mockValidator) ValidateTag() string {
    return "vt"
}

```

Currently expanded validators:

- go-playground/validator: https://github.com/hertz-contrib/binding/tree/main/go_playground

### Customize the error of binding and validation

When an error occurs in the binding parameter and the parameter validation fails, user can customize the Error（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_error)）For example：
The user can customise the content of the Error in case of binding parameter errors and parameter validation failures, using the following method:<br>
**hertz version >= v0.7.0**

> Custom bind errors are not supported at this time.

Custom validate error:

```go
package main

import (
	"github.com/cloudwego/hertz/pkg/app/server/binding"
	"github.com/cloudwego/hertz/pkg/app/server"
)

type ValidateError struct {
   ErrType, FailField, Msg string
}

// Error implements error interface.
func (e *ValidateError) Error() string {
   if e.Msg != "" {
      return e.ErrType + ": expr_path=" + e.FailField + ", cause=" + e.Msg
   }
   return e.ErrType + ": expr_path=" + e.FailField + ", cause=invalid"
}

func main() {
    validateConfig := &binding.ValidateConfig{}
    validateConfig.SetValidatorErrorFactory(func(failField, msg string) error {
        err := ValidateError{
            ErrType:   "validateErr",
            FailField: "[validateFailField]: " + failField,
            Msg:       "[validateErrMsg]: " + msg,
        }

        return &err
        })
    h := server.New(server.WithValidateConfig(validateConfig))
    ...
    h.Spin()
}
```

**hertz version < v0.7.0**<br>
[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_error)

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

type BindError struct {
    ErrType, FailField, Msg string
}

// Error implements error interface.
func (e *BindError) Error() string {
    if e.Msg != "" {
        return e.ErrType + ": expr_path=" + e.FailField + ", cause=" + e.Msg
    }
    return e.ErrType + ": expr_path=" + e.FailField + ", cause=invalid"
}

type ValidateError struct {
    ErrType, FailField, Msg string
}

// Error implements error interface.
func (e *ValidateError) Error() string {
    if e.Msg != "" {
        return e.ErrType + ": expr_path=" + e.FailField + ", cause=" + e.Msg
    }
    return e.ErrType + ": expr_path=" + e.FailField + ", cause=invalid"
}

func init() {
    CustomBindErrFunc := func(failField, msg string) error {
        err := BindError{
            ErrType:   "bindErr",
            FailField: "[bindFailField]: " + failField,
            Msg:       "[bindErrMsg]: " + msg,
        }

        return &err
    }

    CustomValidateErrFunc := func(failField, msg string) error {
        err := ValidateError{
            ErrType:   "validateErr",
            FailField: "[validateFailField]: " + failField,
            Msg:       "[validateErrMsg]: " + msg,
        }

        return &err
    }

    binding.SetErrorFactory(CustomBindErrFunc, CustomValidateErrFunc)
}
```

### Customize type resolution

In the parameter binding, for some special types, when the default behavior can not meet the demand, you can use the custom type resolution to solve the problem, the use of the following: <br>
**hertz version >= v0.7.0**<br>

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

type Nested struct {
   B string
   C string
}

type TestBind struct {
   A Nested `query:"a,required"`
}

func init() {
   binding.MustRegTypeUnmarshal(reflect.TypeOf(Nested{}), func(v string, emptyAsZero bool) (reflect.Value, error) {
      if v == "" && emptyAsZero {
         return reflect.ValueOf(Nested{}), nil
      }
      val := Nested{
         B: v[:5],
         C: v[5:],
      }
      return reflect.ValueOf(val), nil
   })
}
```

### Customize the validation function

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server/binding"
    "github.com/cloudwego/hertz/pkg/app/server"
)

type Nested struct {
   B string
   C string
}

type TestBind struct {
   A Nested `query:"a,required"`
}

func main() {
    bindConfig := &binding.BindConfig{}
    // After v0.7.0 refactoring, on the basis of the original increase in the request content and routing parameters,
    // which can be more flexible for the user to customise the type of parsing
    // Note: Only after a tag is successfully matched will the custom logic go through.
    bindConfig.MustRegTypeUnmarshal(reflect.TypeOf(Nested{}), func(req *protocol.Request, params param.Params, text string) (reflect.Value, error) {
        if text == "" {
            return reflect.ValueOf(Nested{}), nil
        }
        val := Nested{
            B: text[:5],
            C: text[5:],
        }
        // In addition, you can use req, params to get other parameters for parameter binding
        return reflect.ValueOf(val), nil
    })
    h := server.New(server.WithBindConfig(bindConfig))

    ...
    h.Spin()
}
```

**hertz version < v0.7.0**<br>

[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_type_resolve)

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

type Nested struct {
    B string
    C string
}

type TestBind struct {
    A Nested `query:"a,required"`
}

func init() {
    binding.MustRegTypeUnmarshal(reflect.TypeOf(Nested{}), func(v string, emptyAsZero bool) (reflect.Value, error) {
    if v == "" && emptyAsZero {
        return reflect.ValueOf(Nested{}), nil
    }
    val := Nested{
        B: v[:5],
        C: v[5:],
    }
    return reflect.ValueOf(val), nil
    })
}
```

### Custom validation function

Complex validation logic can be implemented in the `vd` annotation by registering a custom validation function:<br>
**hertz version >= v0.7.0**<br>

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server/binding"
    "github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
    type Req struct {
        A int `query:"a" vd:"test($)"`
    }
    validateConfig := &binding.ValidateConfig{}
    validateConfig.MustRegValidateFunc("test", func(args ...interface{}) error {
        if len(args) != 1 {
            return fmt.Errorf("the args must be one")
        }
        s, _ := args[0].(string)
        if s == "123" {
            return fmt.Errorf("the args can not be 123")
        }
    return nil
    })
    h := server.New(server.WithValidateConfig(validateConfig))
    ...
    h.Spin()
}
```

**hertz version < v0.7.0**<br>
[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_validate_func)

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

func init() {
    binding.MustRegValidateFunc("test", func(args ...interface{}) error {
       if len(args) != 1 {
          return fmt.Errorf("the args must be one")
       }
       s, _ := args[0].(string)
       if s == "123" {
          return fmt.Errorf("the args can not be 123")
       }
       return nil
    })
}
```

### Configure looseZero

In some scenarios, the front-end sometimes passes information that only has a key but not a value, which can lead to errors when binding numeric types; then you need to configure looseZero mode, which can be used as follows:
**hertz version >= v0.7.0**<br>

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server/binding"
    "github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
    bindConfig := binding.NewBindConfig()
    // Works for the current Hertz Engine, no conflicts between multiple engine instances bindConfig.
	// By default, looseZeroMode is false, and the global configuration is not affected
    bindConfig.LooseZeroMode = true
    h := server.New(server.WithBindConfig(bindConfig))
    ...
    h.Spin()
}
```

**hertz version < v0.7.0**<br>

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

func init() {
    // False by default, globally effective, if other components also use the same configuration, configuration conflicts may occur
    binding.SetLooseZeroMode(true)
}
```

### Configure other json unmarshal libraries

When binding parameters, if the request body is json, a json unmarshal will be performed. If users need to use other json libraries (hertz uses the open source json library [sonic](https://github.com/bytedance/sonic) by default), they can configure it themselves. For example:
**hertz version >= v0.7.0**<br>

```go
import (
    "github.com/cloudwego/hertz/pkg/app/server/binding"
    "github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
    bindConfig := binding.NewBindConfig()
    bindConfig.UseStdJSONUnmarshaler() // use the standard library as the JSON deserialiser, hertz uses sonic as the JSON deserialiser by default
    //bindConfig.UseThirdPartyJSONUnmarshaler(sonic.Unmarshal) // Use sonic as the JSON deserialiser.
    h := server.New(server.WithBindConfig(bindConfig))
    ...
    h.Spin()
}
```

**hertz version < v0.7.0**<br>

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

func init() {
    // Use the standard library as a JSON deserialisation tool
    binding.UseStdJSONUnmarshaler()

    // Use GJSON as the JSON deserialisation tool.
    binding.UseGJSONUnmarshaler()

    // Use third-party JSON libraries as JSON deserialisers.
    binding.UseThirdPartyJSONUnmarshaler()
}
```

### Set default values

The parameter supports the `default` tag to configure the default value. For example:

```go
// generate code
type UserInfoResponse struct {
   NickName string `default:"Hertz" json:"NickName" query:"nickname"`
}
```

### Bind files

Parameter binding supports binding files. For example:

```go
// content-type: multipart/form-data
type FileParas struct {
   F   *multipart.FileHeader `form:"F1"`
}

h.POST("/upload", func(ctx context.Context, c *app.RequestContext) {
   var req FileParas
   err := binding.BindAndValidate(c, &req)
})
```

## Analysis of common problems

**1. string to int error: `json: cannot unmarshal string into Go struct field xxx of type intxx`**

Reason: `string` and `int` conversion is not supported by default

Solution：

- We are recommended to use the `string` tag of the standard package json. For example：

  ```go
  A int `json:"A, string"`
  ```

- Configure other json libraries that support this operation.
