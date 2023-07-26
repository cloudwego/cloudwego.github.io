---
title: "绑定与校验"
date: 2022-05-23
weight: 8
description: >

---

hertz 使用开源库 [go-tagexpr](https://github.com/bytedance/go-tagexpr) 进行参数的绑定及验证，下面分别介绍参数绑定和参数验证的用法。

## 使用方法

```go
func main() {
	r := server.New()

    r.GET("/hello", func(c context.Context, ctx *app.RequestContext) {
        // 参数绑定需要配合特定的 go tag 使用
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

        // Validate，需要使用 "vd" tag
        err = ctx.Validate(&req)

        ...
    })
...
}
```

## 支持的 tag 及参数绑定优先级

### 支持的 tag

| go tag  |  说明  |
| :----  | :---- |
| path | 绑定 url 上的路径参数，相当于 hertz 路由{:param}或{*param}中拿到的参数。例如：如果定义的路由为：/v:version/example，可以把 path 的参数指定为路由参数：`path:"version"`，此时，url: http://127.0.0.1:8888/v1/example，可以绑定path参数"1" |
| form | 绑定请求的 body 内容。content-type -> `multipart/form-data` 或 `application/x-www-form-urlencoded`，绑定 form 的 key-value |
| query | 绑定请求的 query 参数 |
| header | 绑定请求的 header 参数 |
| json | 绑定请求的 body 内容 content-type -> `application/json`，绑定 json 参数 |
| raw_body | 绑定请求的原始 body(bytes)，绑定的字段名不指定，也能绑定参数。（注：raw_body 绑定优先级最低，当指定多个 tag 时，一旦其他 tag 成功绑定参数，则不会绑定 body 内容。） |
| vd | 参数校验，[校验语法](https://github.com/bytedance/go-tagexpr/tree/master/validator) |

### 参数绑定优先级

```text
path > form > query > cookie > header > json > raw_body
```

> 注：如果请求的 content-type 为 `application/json`，那么会在参数绑定前做一次 json unmarshal 处理作为兜底。

### 必传参数

通过在 tag 中添加 `required`，可以将参数标记为必传。当绑定失败时 `Bind` 和 `BindAndValidate` 将会返回错误。当多个 tag 包含 `required` 时，将会按照优先级绑定。如果所有 tag 都没有绑定上，则会返回错误。

``` go  
type TagRequiredReq struct {
	// 当 JSON 中没有 hertz 字段时，会返回 required 错误：binding: expr_path=hertz, cause=missing required parameter
	Hertz string `json:"hertz,required"`
	// 当 query 和 JSON 中同时没有 kitex 字段时，会返回 required 错误：binding: expr_path=hertz, cause=missing required parameter"
	Kitex string `query:"kitex,required" json:"kitex,required" `
}
```

## 常见用法

### 自定义 bind 和 validate 的 Error

绑定参数发生错误和参数校验失败的时候，用户可以自定义的 Error（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_error) ），使用方法如下：

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

### 自定义类型解析

在参数绑定的时候，所有的 request 参数都是 `string` 或者 `[]string`；当有一些 field 的类型为非基础类型或者无法直接通过 `string` 转换，则可以自定义类型解析（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_type_resolve) ）。使用方法如下:

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

### 自定义验证函数

可以通过注册自定义验证函数，在'vd'注解中实现复杂的验证逻辑（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/custom_validate_func) ），使用方法如下：

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

### 配置 looseZero

在一些场景下，前端有时候传来的信息只有 key 没有 value，这会导致绑定数值类型的时候，会报错 `cause=parameter type does not match binding data`。
这时需要配置 looseZero 模式（[demo](https://github.com/cloudwego/hertz-examples/tree/main/binding/loose_zero) ），使用方法如下：

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

func init() {
    // 默认 false，全局生效
    binding.SetLooseZeroMode(true)
}
```

### 配置其他 json unmarshal 库

在绑定参数的时候，如果请求体为 json，会进行一次 json 的 unmarshal，如果用户需要使用特定的 json 库可以自己配置（hertz 默认使用开源 json 库 [sonic](https://github.com/bytedance/sonic) ）。使用方法如下：

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

func init() {
    // 使用标准库
    binding.UseStdJSONUnmarshaler()

    // 使用 gjson
    binding.UseGJSONUnmarshaler()

    // 使用第三方 json unmarshal 方法
    binding.UseThirdPartyJSONUnmarshaler()
}
```

### 设置默认值

参数支持 "default" tag 进行默认值的配置，使用方法如下：

```go
// 生成的代码
type UserInfoResponse struct {
   NickName string `default:"Hertz" json:"NickName" query:"nickname"`
}
```

### 绑定文件

参数绑定支持绑定文件，使用方法如下：

```go
// 需要请求的 content-type 为：multipart/form-data
type FileParas struct {
   F   *multipart.FileHeader `form:"F1"`
}

h.POST("/upload", func(ctx context.Context, c *app.RequestContext) {
   var req FileParas
   err := binding.BindAndValidate(c, &req)
})
```

## 常见问题分析

**1. string 转 int 报错：json: cannot unmarshal string into Go struct field xxx of type intxx**

原因：默认不支持 `string` 和 `int` 互转

解决方法：

- 建议使用标准包 json 的 `string` tag, 例如：

  ```go
  A int `json:"A, string"`
  ```

- 配置其他支持这种行为的 json 库
