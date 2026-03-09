---
title: "Binding and validate"
date: 2025-12-08
weight: 8
keywords:
  ["Binding and validate", "tag", "Parameter binding precedence"]
description: "The parameter binding and validation related functions and usage supported by Hertz."
---

## Usage

```go
func main() {
	r := server.New()

    r.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        // Parameter binding needs to be used with a specific go tag
		type Test struct {
            A string `query:"a"`
        }

        // BindAndValidate
        var req Test
        err := c.BindAndValidate(&req)

        ...

	    // Bind
        req = Test{}
        err = c.Bind(&req)

        ...
    })
...
}
```

### APIs

> hertz version >= v0.7.0

| API                   | Description                                                                                                                                                                                            |
|:----------------------| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ctx.BindAndValidate   | Use the following go-tag for parameter binding, and do a parameter validation after successful binding (if there is a validation tag)                                                                  |
| ctx.Bind              | Same as `BindAndValidate` but without parameter validation                                                                                                                                             |
| ctx.BindQuery         | Bind all Query parameters, which is equivalent to declaring a `query` tag for each field, for scenarios where no tag is written                                                                        |
| ctx.BindHeader        | Bind all Header parameters, which is equivalent to declaring a `header` tag for each field, for scenarios where no tag is written                                                                      |
| ctx.BindPath          | Bind all Path parameters, which is equivalent to declaring a `path` tag for each field, for scenarios where no tag is written                                                                          |
| ctx.BindForm          | Bind all Form parameters, equivalent to declaring a `form` tag for each field, requires Content-Type: `application/x-www-form-urlencoded`/`multipart/form-data`, for scenarios where no tag is written |
| ctx.BindJSON          | Bind JSON Body, call `json.Unmarshal()` for deserialization, need Body to be in `application/json` format                                                                                              |
| ctx.BindProtobuf      | Bind Protobuf Body, call `proto.Unmarshal()` for deserialization, requires Body to be in `application/x-protobuf` format                                                                               |
| ctx.BindByContentType | The binding method is automatically selected based on the Content-Type, where GET requests call `BindQuery`, and requests with Body are automatically selected based on the Content-Type.              |
| ctx.Validate          | Perform parameter validation, requires a validation tag (e.g. `validate` tag from go-playground/validator)                                                                                             |

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
| default  | Set default value                                                                                                                                                                                                                                                                                                       |

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

### Customise binder

You need to implement the Binder interface and inject it into the hertz engine in a configurable way.

```go
type Binder interface {
    Name() string // The name of the binder.
    // The following are the various binding methods
    Bind(*protocol.Request, interface{}, param.Params) error
    BindQuery(*protocol.Request, interface{}) error
    BindHeader(*protocol.Request, interface{}) error
    BindPath(*protocol.Request, interface{}, param.Params) error
    BindForm(*protocol.Request, interface{}) error
    BindJSON(*protocol.Request, interface{}) error
    BindProtobuf(*protocol.Request, interface{}) error
    Validate(*protocol.Request, interface{}) error
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

func (m *mockBinder) Validate(request *protocol.Request, i interface{}) error {
	return nil
}

```

### Custom validator

> Supported by hertz version >= v0.10.3.

```go
import (
	"github.com/go-playground/validator/v10"
)

func main() {
	vd := validator.New(validator.WithRequiredStructEnabled())
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"),
		server.WithCustomValidatorFunc(func(_ *protocol.Request, req any) error {
			return vd.Struct(req)
		}),
	)
    h.Spin()
}
```

### Customize the error of binding and validation

When an error occurs in the binding parameter and the parameter validation fails, user can customize the Error（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_error)）.

> Custom bind errors are not supported at this time.

Custom validate error:

```go
package main

import (
	"context"
	"fmt"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/go-playground/validator/v10"
)

type User struct {
	Name  string `form:"name" validate:"required"`
	Age   uint8  `form:"age"  validate:"gte=0,lte=130"`
	Email string `form:"email" validate:"required,email"`
}

type ValidateError struct {
   ErrType, FailField, Msg string
}

func (e *ValidateError) Error() string {
    if e.Msg != "" {
		return e.ErrType + ": expr_path=" + e.FailField + ", cause=" + e.Msg
	}
	return e.ErrType + ": expr_path=" + e.FailField + ", cause=invalid"
}

func main() {
	v := validator.New(validator.WithRequiredStructEnabled())

	h := server.Default(
		server.WithHostPorts("127.0.0.1:8080"),
		server.WithCustomValidatorFunc(func(_ *protocol.Request, req any) error {
			err := v.Struct(req)
			if err == nil {
				return nil
			}

			if ve, ok := err.(validator.ValidationErrors); ok {
				fe := ve[0]

				return &ValidateError{
					ErrType:   "validateErr",
					FailField: fe.Field(),
					Msg:       fe.Tag(),
				}
			}

			return err
		}),
	)

	h.GET("/bind", func(ctx context.Context, c *app.RequestContext) {
		var user User
		err := c.BindAndValidate(&user)
		if err != nil {
			fmt.Println("CUSTOM:", err.Error())
			return
		}
		fmt.Println("OK:", user)
	})

	h.Spin()
}
```

### Customize type resolution

In the parameter binding, for some special types, when the default behavior can not meet the demand, you can use the custom type resolution to solve the problem, the use of the following:

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
    bindConfig := binding.NewBindConfig()
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

### Custom validation function

Complex validation logic can be implemented by registering a custom validation function with go-playground/validator:

```go
package main

import (
	"context"
	"fmt"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/go-playground/validator/v10"
)

type Req struct {
	A string `query:"a" validate:"test"`
}

func main() {
	vd := validator.New(validator.WithRequiredStructEnabled())

	vd.RegisterValidation("test", func(fl validator.FieldLevel) bool {
		return fl.Field().String() != "123"
	})

	h := server.Default(
		server.WithHostPorts("127.0.0.1:8080"),
		server.WithCustomValidatorFunc(func(_ *protocol.Request, req any) error {
			return vd.Struct(req)
		}),
	)

	h.GET("/test", func(ctx context.Context, c *app.RequestContext) {
		var r Req
		if err := c.BindAndValidate(&r); err != nil {
			fmt.Println("VALIDATION ERROR:", err.Error())
			return
		}
		fmt.Println("OK:", r)
	})

	h.Spin()
}
```

### Configure looseZero

In some scenarios, the front-end sometimes passes information that only has a key but not a value, which can lead to errors when binding numeric types; then you need to configure looseZero mode, which can be used as follows:

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server/binding"
    "github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
    bindConfig := binding.NewBindConfig()
    bindConfig.LooseZeroMode = true
    h := server.New(server.WithBindConfig(bindConfig))
    ...
    h.Spin()
}
```

### Configure other json unmarshal libraries

When binding parameters, if the request body is json, a json unmarshal will be performed. If users need to use other json libraries (hertz uses the open source json library [sonic](https://github.com/bytedance/sonic) by default), they can configure it themselves. For example:

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
