---
title: "绑定与校验"
date: 2022-05-23
weight: 8
keywords: ["绑定与校验", "go-tagexpr", "tag", "参数绑定优先级"]
description: "Hertz 支持的参数绑定与校验相关功能及用法。"
---

## 使用方法

```go
func main() {
	r := server.New()

    r.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        // 参数绑定需要配合特定的 go tag 使用
		type Test struct {
            A string `query:"a" vd:"$!='Hertz'"`
        }

        // BindAndValidate
        var req Test
        err := ctx.BindAndValidate(&req)

        ...

	    // Bind 只做参数绑定
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

### 全部 API

> hertz version >= v0.7.0

| API                   | 说明                                                                                                                                                                 |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ctx.BindAndValidate   | 利用下述的 go-tag 进行参数绑定，并在绑定成功后做一次参数校验 (如果有校验 tag 的话)                                                                                   |
| ctx.Bind              | 同 `BindAndValidate` 但是不做参数校验                                                                                                                                |
| ctx.BindQuery         | 绑定所有 Query 参数，相当于给每一个 field 声明一个 `query` tag，适用于没写 tag 的场景                                                                                |
| ctx.BindHeader        | 绑定所有 Header 参数，相当于给每一个 field 声明一个 `header` tag，适用于没写 tag 的场景                                                                              |
| ctx.BindPath          | 绑定所有 Path 参数，相当于给每一个 field 声明一个 `path` tag，适用于没写 tag 的场景                                                                                  |
| ctx.BindForm          | 绑定所有 Form 参数，相当于给每一个 field 声明一个 `form` tag，需要 Content-Type 为：`application/x-www-form-urlencoded`/`multipart/form-data`, 适用于没写 tag 的场景 |
| ctx.BindJSON          | 绑定 JSON Body，调用 `json.Unmarshal()` 进行反序列化，需要 Body 为 `application/json` 格式                                                                           |
| ctx.BindProtobuf      | 绑定 Protobuf Body，调用 `proto.Unmarshal()` 进行反序列化，需要 Body 为 `application/x-protobuf` 格式                                                                |
| ctx.BindByContentType | 根据 Content-Type 来自动选择绑定的方法，其中 GET 请求会调用 `BindQuery`, 带有 Body 的请求会根据 Content-Type 自动选择                                                |
| ctx.Validate          | 进行参数校验，需要校验 tag 配合使用 (默认使用 vd tag 校验)                                                                                                           |

## 支持的 tag 及参数绑定优先级

### 支持的 tag

不通过 IDL 生成代码时若字段不添加任何 tag 则会遍历所有 tag 并按照优先级绑定参数，添加 tag 则会根据对应的 tag 按照优先级去绑定参数。

通过 IDL 生成代码时若不添加 [api 注解](/zh/docs/hertz/tutorials/toolkit/annotation/#支持的-api-注解) 则字段默认添加 `form`、`json`、`query` tag，添加 [api 注解](/zh/docs/hertz/tutorials/toolkit/annotation/#支持的-api-注解) 会为字段添加相应需求的 tag。

| go tag   | 说明                                                                                                                                                                                                                                         |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| path     | 绑定 url 上的路径参数，相当于 hertz 路由 `:param` 或 `*param` 中拿到的参数。例如：如果定义的路由为：/v:version/example，可以把 path 的参数指定为路由参数：`path:"version"`，此时，url: http://127.0.0.1:8888/v1/example，可以绑定path参数"1" |
| form     | 绑定请求的 body 内容。content-type -> `multipart/form-data` 或 `application/x-www-form-urlencoded`，绑定 form 的 key-value                                                                                                                   |
| query    | 绑定请求的 query 参数                                                                                                                                                                                                                        |
| cookie   | 绑定请求的 cookie 参数                                                                                                                                                                                                                       |
| header   | 绑定请求的 header 参数                                                                                                                                                                                                                       |
| json     | 绑定请求的 body 内容 content-type -> `application/json`，绑定 json 参数                                                                                                                                                                      |
| raw_body | 绑定请求的原始 body(bytes)，绑定的字段名不指定，也能绑定参数。（注：raw_body 绑定优先级最低，当指定多个 tag 时，一旦其他 tag 成功绑定参数，则不会绑定 body 内容。）                                                                          |
| vd       | 参数校验，[校验语法](https://github.com/bytedance/go-tagexpr/tree/master/validator)                                                                                                                                                          |
| default  | 设置默认值                                                                                                                                                                                                                                   |

### 参数校验

具体校验语法可参考 [校验语法](https://github.com/bytedance/go-tagexpr/tree/master/validator)。

不通过 IDL 生成代码时直接在对应结构体字段打 tag，示例：

```go
type InfoRequest struct {
		Name         string   `vd:"$!='your string'"`
}
```

通过 IDL 生成代码时需添加相应的注解，可参考 [Field 注解](/zh/docs/hertz/tutorials/toolkit/annotation/#field-注解)。

下面给出常见用法：

- string 和 list 的长度验证 `len($)>0`
- 字符串正则匹配 `regexp('^\\w*$')"`
- 验证数字字段的的值 `$>0`
- 验证指针字段 `num==nil || num>0`
- 验证枚举类型 `type=="hello" || type == "world"`
- 自定义错误信息 `msg:'C must be false when S.A>0'"`

### 参数绑定优先级

```text
path > form > query > cookie > header > json > raw_body
```

> 注：如果请求的 content-type 为 `application/json`，使用 `BindAndValidate`, `Bind` 方法会在参数绑定前做一次 json unmarshal 处理。

### 必传参数

通过在 tag 中添加 `required`，可以将参数标记为必传。当绑定失败时 `Bind` 和 `BindAndValidate` 将会返回错误。当多个 tag 包含 `required`
时，将会按照优先级绑定。如果**所有** tag 都没有绑定上，则会返回错误。

```go
type TagRequiredReq struct {
	// 当 JSON 中没有 hertz 字段时，会返回 required 错误
	Hertz string `json:"hertz,required"`
	// 当 query 和 JSON 中同时没有 kitex 字段时，会返回 required 错误
	Kitex string `query:"kitex,required" json:"kitex,required" `
}
```

## 常用配置

> hertz 在 v0.7.0 版本对 `参数绑定`和`校验` 进行了重构，重构后配置的行为发生变更，下面将分别介绍<br>
> 如果还想使用之前的绑定器，目前已把其实现放到了 [hertz-contrib/binding](https://github.com/hertz-contrib/binding) 下，可通过自定义 binder 引入

### 自定义 binder

> hertz version >= v0.7.0 支持

需要实现 Binder 接口，并通过配置方式注入到 hertz engine

```go
type Binder interface {
	Name() string // 绑定器的名字
	// 下面为各种绑定方法
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

注入示例

```go

func main() {
    // 通过配置的方式注入自定义 binder
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

目前已拓展的绑定器：

- bytedance/go-tagexpr: https://github.com/hertz-contrib/binding/tree/main/go_tagexpr (重构前使用的绑定库)

### 自定义 validator

> hertz version >= v0.7.0 支持

需要实现 Validator 接口，并通过配置方式注入到 hertz engine

```go
type StructValidator interface {
    ValidateStruct(interface{}) error // 校验函数
    Engine() interface{} // 返回底层的 Validator
    ValidateTag() string // 校验的 tag, 声明校验器使用的 tag
}
```

注入示例

```go

func main() {
	// 通过配置的方式注入自定义 binder
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

目前已拓展的校验器：

- go-playground/validator: https://github.com/hertz-contrib/binding/tree/main/go_playground

### 自定义 bind 和 validate 的 Error

在绑定参数发生错误和参数校验失败的时候，用户可以自定义 Error 的内容，使用方法如下：<br>
**hertz version >= v0.7.0**

> 暂不支持自定义 bind error

自定义 validate error:

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

### 自定义类型解析

在参数绑定的时候，针对某些特殊类型，当默认行为无法满足需求时，可使用自定义类型解析来解决，使用方法如下:<br>
**hertz version >= v0.7.0**<br>

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
	// v0.7.0 重构后，在原基础上增加了请求 Request 内容以及路由参数，可方便用户更加灵活的自定义类型解析
	// 注意：只有 tag 成功匹配后，才会走到自定义的逻辑
    bindConfig.MustRegTypeUnmarshal(reflect.TypeOf(Nested{}), func(req *protocol.Request, params param.Params, text string) (reflect.Value, error) {
        if text == "" {
            return reflect.ValueOf(Nested{}), nil
        }
        val := Nested{
            B: text[:5],
            C: text[5:],
        }
        // 此外，也可以利用 req, params 来获取其他参数进行参数绑定
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

### 自定义验证函数

可以通过注册自定义验证函数，在 `vd` 注解中实现复杂的验证逻辑:<br>
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

### 配置 looseZero

在一些场景下，前端有时候传来的信息只有 key 没有 value，这会导致绑定数值类型的时候报错；这时需要配置 looseZero 模式，使用方法如下：
**hertz version >= v0.7.0**<br>

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server/binding"
    "github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
    bindConfig := binding.NewBindConfig()
    // 默认 false，当前 Hertz Engine 下生效，多份 engine 实例之间不会冲突
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
    // 默认 false，全局生效，如果其他组件也使用相关配置，可能会发生配置冲突
    binding.SetLooseZeroMode(true)
}
```

### 配置其他 json unmarshal 库

在绑定参数的时候，如果请求体为 json，会进行一次 json 的 unmarshal，如果用户需要使用特定的 json 库可以自行配置（hertz 默认使用开源 json 库 [sonic](https://github.com/bytedance/sonic) ）。使用方法如下：<br>
**hertz version >= v0.7.0**<br>

```go
import (
    "github.com/cloudwego/hertz/pkg/app/server/binding"
    "github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
    bindConfig := binding.NewBindConfig()
    bindConfig.UseStdJSONUnmarshaler() // 使用标准库作为 JSON 反序列化工具，hertz 默认使用 sonic 作为 JSON 反序列化器
    //bindConfig.UseThirdPartyJSONUnmarshaler(sonic.Unmarshal) // 使用 sonic 作为 JSON 反序列化器
    h := server.New(server.WithBindConfig(bindConfig))
    ...
    h.Spin()
}
```

**hertz version < v0.7.0**<br>

```go
import "github.com/cloudwego/hertz/pkg/app/server/binding"

func init() {
    // 使用标准库作为 JSON 反序列化工具
    binding.UseStdJSONUnmarshaler()

    // 使用 GJSON 作为 JSON 反序列化工具
    binding.UseGJSONUnmarshaler()

    // 使用第三方 JSON 库作为 JSON 反序列化工具
    binding.UseThirdPartyJSONUnmarshaler()
}
```

### 设置默认值

> 重构前后使用方式都一样

参数支持 `default` tag 进行默认值的配置，使用方法如下：

```go
// 生成的代码
type UserInfoResponse struct {
   NickName string `default:"Hertz" json:"NickName" query:"nickname"`
}
```

### 绑定文件

> 重构前后使用方式一样，IDL 场景不支持文件绑定
> 文件类型需为：`multipart.FileHeader`

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
