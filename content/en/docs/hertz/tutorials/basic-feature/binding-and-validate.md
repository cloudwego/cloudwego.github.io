---
title: "Binding and validate"
date: 2022-06-21
weight: 8
description: >

---

Hertz uses the open source library [go-tagexpr](https://github.com/bytedance/go-tagexpr) for parameter binding and validation. The following describes the usage of parameter binding and parameter validation.

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

## Supported tags and parameter binding priorities

### Supported tags

| go tag   | description                                                  |
| -------- | ------------------------------------------------------------ |
| path     | This tag is used to bind parameters on url like `{:param}` or `{*param}`. For example: if we defined route is: `/v:version/example`, you can specify the path parameter as the route parameter: `path:"version"`. In this case if url is http://127.0.0.1:8888/v1/ , you can bind the path parameter "1". |
| form     | This tag is used to bind the key-value of the form in request body which content-type is `multipart/form-data` or `application/x-www-form-urlencoded` |
| query    | This tag is used to bind query parameter in request          |
| header   | This tag is used to bind header parameters in request        |
| json     | This tag is used to bind json parameters in the request body which content-type is `application/json` |
| raw_body | This tag is used to bind the original body (bytes type) of the request, and parameters can be bound even if the bound field name is not specified. (Note: raw_body has the lowest binding priority. When multiple tags are specified, once other tags successfully bind parameters, the body content will not be bound) |
| vd       | `vd` short for validator, [The grammar of validation parameter](https://github.com/bytedance/go-tagexpr/tree/master/validator) |

### Parameter binding precedence

```text
path > form > query > cookie > header > json > raw_body
```

> Note: If the request content-type is `application/json`, json unmarshal processing will be done by default before parameter binding

### Required parameter

You can specify a parameter as required with keyword `required` in tag. Both `Bind` and `BindAndValidate` returns error when a required parameter is missing.
When multiple tags contain the`required` keyword, parameter with be bound in order of precedence defined above. If none of the tags bind, an error will be returned.

``` go  
type TagRequiredReq struct {
	// when field hertz is missing in JSON, a required error will be return: binding: expr_path=hertz, cause=missing required parameter
	Hertz string `json:"hertz,required"`
	// when field hertz is missing in both query and JSON, a required error will be return: binding: expr_path=hertz, cause=missing required parameter
	Kitex string `query:"kitex,required" json:"kitex,required" `
}
```

## Common uses

### Customize the error of binding and validation

When an error occurs in the binding parameter and the parameter validation fails, user can customize the Error（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_error)）For example：

```go

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

In parameter binding, all request parameters to `string` or `[]string` by default. When some field types are non-basic types or cannot be converted directly through `string`, you can customize type resolution（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_type_resolve)). For example：

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

You can implement complex validation logic in the `vd` tag by registering a custom validation function（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_validate_func))，For example：

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

### Configure "looseZero"

In some cases, the information sent from the front end is **only the key but value empty**, which causes `cause=parameter type does not match binding data` when binding a numeric type. At this time, you need to configure looseZero mode ([demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/loose_zero)). For example：

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

func init() {
    // Default false, take effect globally
    binding.SetLooseZeroMode(true)
}
```

### Configure other json unmarshal libraries

When binding parameters, if the request body is json, a json unmarshal will be performed. If users need to use other json libraries (hertz uses the open source json library [sonic](https://github.com/bytedance/sonic) by default), they can configure it themselves. For example:

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

func init() {
    // use the standard library
    binding.UseStdJSONUnmarshaler()

    // use gjson
    binding.UseGJSONUnmarshaler()

    // use other json unmarshal methods
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
