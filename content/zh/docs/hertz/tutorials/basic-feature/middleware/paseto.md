---
title: "Paseto"
date: 2023-05-08
weight: 16
keywords: ["Paseto", "JOSE", "JWT", "JWE", "JWS"]
description: "这是为 Hertz 实现的 PASETO 中间件。"
---

Paseto 拥有你喜欢 JOSE 的一切（JWT、JWE、JWS），没有困扰 JOSE 标准的 [许多设计缺陷](https://paragonie.com/blog/2017/03/jwt-json-web-tokens-is-bad-standard-that-everyone-should-avoid)。

这是为 [Hertz](https://github.com/cloudwego/hertz) 实现的 PASETO 中间件。

## 安装

```shell
go get github.com/hertz-contrib/paseto
```

## 示例代码

```go
package main

import (
   "context"
   "fmt"
   "net/http"
   "time"

   "github.com/cloudwego/hertz/pkg/app"
   "github.com/cloudwego/hertz/pkg/app/client"
   "github.com/cloudwego/hertz/pkg/app/server"
   "github.com/cloudwego/hertz/pkg/common/hlog"
   "github.com/cloudwego/hertz/pkg/protocol"
   "github.com/hertz-contrib/paseto"
)

func performRequest() {
   time.Sleep(time.Second)
   c, _ := client.NewClient()
   req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()
   req.SetRequestURI("http://127.0.0.1:8080/paseto")

   req.SetMethod("GET")
   _ = c.Do(context.Background(), req, resp)
   fmt.Printf("get token: %s\n", resp.Body())

   req.SetMethod("POST")
   req.SetHeader("Authorization", string(resp.Body()))
   _ = c.Do(context.Background(), req, resp)
   fmt.Printf("Authorization response :%s", resp.Body())
}

func main() {
   h := server.New(server.WithHostPorts(":8080"))
   h.GET("/paseto", func(ctx context.Context, c *app.RequestContext) {
      now := time.Now()
      genTokenFunc := paseto.DefaultGenTokenFunc()
      token, err := genTokenFunc(&paseto.StandardClaims{
         Issuer:    "cwg-issuer",
         ExpiredAt: now.Add(time.Hour),
         NotBefore: now,
         IssuedAt:  now,
      }, nil, nil)
      if err != nil {
         hlog.Error("generate token failed")
      }
      ctx.String(http.StatusOK, token)
   })

   h.POST("/paseto", paseto.New(), func(ctx context.Context, c *app.RequestContext) {
      ctx.String(http.StatusOK, "token is valid")
   })

   go performRequest()

   h.Spin()
}
```

## 配置项

| 配置           | 默认值                                                                                             | 介绍                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Next           | [nil](https://github.com/hertz-contrib/paseto/blob/main/option.go#L88)                             | 用于设置一个函数，当返回 true 时跳过这个中间件                                 |
| ErrorFunc      | [输出日志并返回 401](https://github.com/hertz-contrib/paseto/blob/main/option.go#L89)              | 用于设置一个在发生错误时执行的函数                                             |
| SuccessHandler | [将声明保存到 app.RequestContext](https://github.com/hertz-contrib/paseto/blob/main/option.go#L94) | 用于设置一个函数，该函数在令牌有效时执行                                       |
| KeyLookup      | [header:Authorization](https://github.com/hertz-contrib/paseto/blob/main/option.go#L97)            | 用于设置一个“＜source＞:＜key＞”形式的字符串，用于创建从请求中提取令牌的提取器 |
| TokenPrefix    | ""                                                                                                 | 用于设置一个字符串，用于保存令牌查找的前缀                                     |
| ParseFunc      | [解析 V4 公共令牌](https://github.com/hertz-contrib/paseto/blob/main/option.go#L98)                | 用于设置一个解析并验证令牌的函数                                               |

### Next

`WithNext` 设置一个函数来判断是否跳过这个中间件。

函数签名：

```go
func WithNext(f NextHandler) Option
```

示例代码：

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/paseto"
)

func performRequest() {
	time.Sleep(time.Second)
	c, _ := client.NewClient()
	req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()
	req.SetRequestURI("http://127.0.0.1:8080/paseto")

	req.SetMethod("GET")
	_ = c.Do(context.Background(), req, resp)

	req.SetMethod("POST")
	req.SetHeader("Authorization", string(resp.Body()))
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("Authorization response :%s,because I have the token\n", resp.Body())

	req.SetMethod("POST")
	req.SetHeader("skip", "yes")
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("Authorization response :%s,because I trigger the nextFunc\n", resp.Body())

	req.SetMethod("POST")
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("Authorization response :%s,because I don't have token nor trigger the nextFunc\n", resp.Body())
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))

	next := func(ctx context.Context, c *app.RequestContext) bool {
		return string(c.GetHeader("skip")) == "yes"
	}
	h.GET("/paseto", func(ctx context.Context, c *app.RequestContext) {
		now := time.Now()
		genTokenFunc := paseto.DefaultGenTokenFunc()
		token, err := genTokenFunc(&paseto.StandardClaims{
			Issuer:    "cwg-issuer",
			ExpiredAt: now.Add(time.Hour),
			NotBefore: now,
			IssuedAt:  now,
		}, nil, nil)
		if err != nil {
			hlog.Error("generate token failed")
		}
		ctx.String(consts.StatusOK, token)
	})

	h.POST("/paseto", paseto.New(paseto.WithNext(next)), func(ctx context.Context, c *app.RequestContext) {
		ctx.String(consts.StatusOK, "token is valid")
	})

	go performRequest()

	h.Spin()
}
```

### ErrorFunc

`WithErrorFunc` 设置 ErrorHandler。

`ErrorHandler` 定义一个在发生错误时执行的函数。

函数签名：

```go
func WithErrorFunc(f app.HandlerFunc) Option
```

示例代码：

```go
package main

import (
   "context"
   "fmt"
   "net/http"
   "time"

   "github.com/cloudwego/hertz/pkg/app"
   "github.com/cloudwego/hertz/pkg/app/client"
   "github.com/cloudwego/hertz/pkg/app/server"
   "github.com/cloudwego/hertz/pkg/common/hlog"
   "github.com/cloudwego/hertz/pkg/common/utils"
   "github.com/cloudwego/hertz/pkg/protocol"
   "github.com/cloudwego/hertz/pkg/protocol/consts"
   "github.com/hertz-contrib/paseto"
)

func performRequest() {
   time.Sleep(time.Second)
   c, _ := client.NewClient()
   req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()

   req.SetMethod("GET")
   req.SetRequestURI("http://127.0.0.1:8080/paseto/withsecret")
   _ = c.Do(context.Background(), req, resp)

   req.SetMethod("POST")
   req.SetRequestURI("http://127.0.0.1:8080/paseto")
   req.SetHeader("Authorization", string(resp.Body()))
   _ = c.Do(context.Background(), req, resp)
   fmt.Printf("Authorization response:%s\n", resp.Body())

   req.SetMethod("GET")
   req.SetRequestURI("http://127.0.0.1:8080/paseto/withnosecret")
   _ = c.Do(context.Background(), req, resp)

   req.SetMethod("POST")
   req.SetRequestURI("http://127.0.0.1:8080/paseto")
   req.SetHeader("Authorization", string(resp.Body()))
   _ = c.Do(context.Background(), req, resp)
   fmt.Printf("Authorization response:%s", resp.Body())
}

func main() {
   h := server.New(server.WithHostPorts(":8080"))

   handler := func(ctx context.Context, c *app.RequestContext) {
      c.JSON(http.StatusUnauthorized, "invalid token")
      c.Abort()
   }

   h.GET("/paseto/withsecret", func(ctx context.Context, c *app.RequestContext) {
      now := time.Now()
      genTokenFunc := paseto.DefaultGenTokenFunc()
      token, err := genTokenFunc(&paseto.StandardClaims{
         Issuer:    "cwg-issuer",
         ExpiredAt: now.Add(time.Hour),
         NotBefore: now,
         IssuedAt:  now,
      }, utils.H{
         "secret1": "answer1",
      }, nil)
      if err != nil {
         hlog.Error("generate token failed")
      }
      ctx.String(consts.StatusOK, token)
   })

   h.GET("/paseto/witherrorfunc", func(ctx context.Context, c *app.RequestContext) {
      now := time.Now()
      genTokenFunc := paseto.DefaultGenTokenFunc()
      token, err := genTokenFunc(&paseto.StandardClaims{
         Issuer:    "cwg-issuer",
         ExpiredAt: now.Add(time.Hour),
         NotBefore: now,
         IssuedAt:  now,
      }, nil, nil)
      if err != nil {
         hlog.Error("generate token failed")
      }
      ctx.String(consts.StatusOK, token)
   })

   h.POST("/paseto", paseto.New(paseto.WithErrorFunc(handler)), func(ctx context.Context, c *app.RequestContext) {
      ctx.String(consts.StatusOK, "token is valid")
   })

   go performRequest()

   h.Spin()
}
```

### SuccessHandler

`WithSuccessHandler` 设置处理已解析令牌的逻辑。

函数签名：

```go
func WithSuccessHandler(f SuccessHandler) Option
```

示例代码：

```go
package main

import (
	"context"
	"fmt"
	"time"

	gpaseto "aidanwoods.dev/go-paseto"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/paseto"
)

func performRequest() {
	time.Sleep(time.Second)
	c, _ := client.NewClient()
	req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()

	req.SetMethod("GET")
	req.SetRequestURI("http://127.0.0.1:8080/paseto/withsecret")
	_ = c.Do(context.Background(), req, resp)

	req.SetMethod("POST")
	req.SetRequestURI("http://127.0.0.1:8080/paseto")
	req.SetHeader("Authorization", string(resp.Body()))
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("Authorization response:%s\n", resp.Body())

	req.SetMethod("GET")
	req.SetRequestURI("http://127.0.0.1:8080/paseto/withnosecret")
	_ = c.Do(context.Background(), req, resp)

	req.SetMethod("POST")
	req.SetRequestURI("http://127.0.0.1:8080/paseto")
	req.SetHeader("Authorization", string(resp.Body()))
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("Authorization response:%s", resp.Body())
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))

	handler := func(ctx context.Context, c *app.RequestContext, token *gpaseto.Token) {
		var answer string
		if err := token.Get("secret1", &answer); err != nil {
			c.String(consts.StatusBadRequest, "you don't not the answer of secret1")
			c.Abort()
		}
	}
	h.GET("/paseto/withsecret", func(ctx context.Context, c *app.RequestContext) {
		now := time.Now()
		genTokenFunc := paseto.DefaultGenTokenFunc()
		token, err := genTokenFunc(&paseto.StandardClaims{
			Issuer:    "cwg-issuer",
			ExpiredAt: now.Add(time.Hour),
			NotBefore: now,
			IssuedAt:  now,
		}, utils.H{
			"secret1": "answer1",
		}, nil)
		if err != nil {
			hlog.Error("generate token failed")
		}
		ctx.String(consts.StatusOK, token)
	})

	h.GET("/paseto/withnosecret", func(ctx context.Context, c *app.RequestContext) {
		now := time.Now()
		genTokenFunc := paseto.DefaultGenTokenFunc()
		token, err := genTokenFunc(&paseto.StandardClaims{
			Issuer:    "cwg-issuer",
			ExpiredAt: now.Add(time.Hour),
			NotBefore: now,
			IssuedAt:  now,
		}, nil, nil)
		if err != nil {
			hlog.Error("generate token failed")
		}
		ctx.String(consts.StatusOK, token)
	})

	h.POST("/paseto", paseto.New(paseto.WithSuccessHandler(handler)), func(ctx context.Context, c *app.RequestContext) {
		ctx.String(consts.StatusOK, "token is valid")
	})

	go performRequest()

	h.Spin()
}
```

### KeyLookup

`WithKeyLookUp` 以“＜source＞:＜key＞”的形式设置一个字符串，用于创建从请求中提取令牌的“提取器”。

函数签名：

```go
func WithKeyLookUp(lookup string) Option
```

示例代码：

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/paseto"
)

func performRequest() {
	time.Sleep(time.Second)
	c, _ := client.NewClient()
	req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()
	req.SetRequestURI("http://127.0.0.1:8080/paseto")

	req.SetMethod("GET")
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("get token: %s\n", resp.Body())

	req.SetMethod("POST")
	req.SetBody([]byte("Authorization=" + string(resp.Body())))
	req.SetHeader("Content-Type", "application/x-www-form-urlencoded")
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("Authorization response :%s", resp.Body())
}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/paseto", func(ctx context.Context, c *app.RequestContext) {
		now := time.Now()
		genTokenFunc := paseto.DefaultGenTokenFunc()
		token, err := genTokenFunc(&paseto.StandardClaims{
			Issuer:    "cwg-issuer",
			ExpiredAt: now.Add(time.Hour),
			NotBefore: now,
			IssuedAt:  now,
		}, nil, nil)
		if err != nil {
			hlog.Error("generate token failed")
		}
		ctx.String(consts.StatusOK, token)
	})

	h.POST("/paseto", paseto.New(paseto.WithKeyLookUp("form:Authorization")), func(ctx context.Context, c *app.RequestContext) {
		ctx.String(consts.StatusOK, "token is valid")
	})

	go performRequest()

	h.Spin()
}
```

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/cloudwego/hertz/pkg/protocol"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/paseto"
)

func performRequest() {
    time.Sleep(time.Second)
    c, _ := client.NewClient()
    req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()
    req.SetRequestURI("http://127.0.0.1:8080/paseto")

    req.SetMethod("GET")
    _ = c.Do(context.Background(), req, resp)
    fmt.Printf("get token: %s\n", resp.Body())

    req.SetMethod("POST")
    req.SetHeader("Authorization", "Bearer "+string(resp.Body()))
    _ = c.Do(context.Background(), req, resp)
    fmt.Printf("Authorization response :%s", resp.Body())
}

func main() {
    h := server.New(server.WithHostPorts(":8080"))
    h.GET("/paseto", func(ctx context.Context, c *app.RequestContext) {
        now := time.Now()
        genTokenFunc := paseto.DefaultGenTokenFunc()
        token, err := genTokenFunc(&paseto.StandardClaims{
            Issuer:    "cwg-issuer",
            ExpiredAt: now.Add(time.Hour),
            NotBefore: now,
            IssuedAt:  now,
        }, nil, nil)
        if err != nil {
            hlog.Error("generate token failed")
        }
        ctx.String(consts.StatusOK, token)
    })

    h.POST("/paseto", paseto.New(paseto.WithTokenPrefix("Bearer ")), func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "token is valid")
    })

    go performRequest()

    h.Spin()
}
```

### ParseFunc

`WithParseFunc` 设置 ParseFunc。

`ParseFunc` 解析并验证令牌。

函数签名：

```go
func WithParseFunc(f ParseFunc) Option
```

示例代码：

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/hlog"
    "github.com/cloudwego/hertz/pkg/protocol"
    "github.com/cloudwego/hertz/pkg/protocol/consts"
    "github.com/hertz-contrib/paseto"
)

func performRequest() {
    time.Sleep(time.Second)
    c, _ := client.NewClient()
    req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()

    req.SetMethod("GET")
    req.SetRequestURI("http://127.0.0.1:8080/paseto/correct-issuer")
    _ = c.Do(context.Background(), req, resp)

    req.SetMethod("POST")
    req.SetRequestURI("http://127.0.0.1:8080/paseto")
    req.SetHeader("Authorization", string(resp.Body()))
    _ = c.Do(context.Background(), req, resp)
    fmt.Printf("Authorization response:%s\n", resp.Body())

    req.SetMethod("GET")
    req.SetRequestURI("http://127.0.0.1:8080/paseto/wrong-issuer")
    _ = c.Do(context.Background(), req, resp)

    req.SetMethod("POST")
    req.SetRequestURI("http://127.0.0.1:8080/paseto")
    req.SetHeader("Authorization", string(resp.Body()))
    _ = c.Do(context.Background(), req, resp)
    fmt.Printf("Authorization response:%s,because issuer is wrong", resp.Body())
}

func main() {
    h := server.New(server.WithHostPorts(":8080"))

    h.GET("/paseto/correct-issuer", func(ctx context.Context, c *app.RequestContext) {
        now := time.Now()
        token, err := paseto.DefaultGenTokenFunc()(&paseto.StandardClaims{
            Issuer:    "CloudWeGo-issuer",
            ExpiredAt: now.Add(time.Hour),
            NotBefore: now,
            IssuedAt:  now,
        }, nil, nil)
        if err != nil {
            hlog.Error("generate token failed")
        }
        ctx.String(consts.StatusOK, token)
    })
    h.GET("/paseto/wrong-issuer", func(ctx context.Context, c *app.RequestContext) {
        now := time.Now()
        token, err := paseto.DefaultGenTokenFunc()(&paseto.StandardClaims{
            Issuer:    "CloudWeRun-issuer",
            ExpiredAt: now.Add(time.Hour),
            NotBefore: now,
            IssuedAt:  now,
        }, nil, nil)
        if err != nil {
            hlog.Error("generate token failed")
        }
        ctx.String(consts.StatusOK, token)
    })

    parseFunc, _ := paseto.NewV4PublicParseFunc(paseto.DefaultPublicKey, []byte(paseto.DefaultImplicit), paseto.WithIssuer("CloudWeGo-issuer"))
    h.POST("/paseto", paseto.New(paseto.WithParseFunc(parseFunc)), func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "token is valid")
    })
    go performRequest()
    h.Spin()
}
```

## 版本比较

| 版本 | 本地                                                       | 公共                          |
| ---- | ---------------------------------------------------------- | ----------------------------- | --- |
| v1   | 使用“AES-256-CBC”加密并使用 HMAC-SHA-256 签名              | 使用 `RSA-SHA-256` 签名       |
| v2   | 使用“XSalsa20Poly-1305”加密并使用“HMAC-SHA-384”签名`| 使用`EdDSA`（`Ed25519`）签名 |     |
| v3   | 使用“XChaCha20Poly1305”加密并使用“HMAC-SHA-384”签名`       | 使用 `EdDSA`（`Ed25519`）签名 |     |
| v4   | 使用“XChaCha20Poly1305”加密，并使用“HMAC-SHA-512-256”签名` | 使用 `EdDSA`（`Ed448`）签名   |     |

## 完整示例

完成用法示例详见 [paseto/example](https://github.com/hertz-contrib/paseto/tree/main/example)
