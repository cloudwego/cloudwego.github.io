title: "paseto"
date: 2023-05-08
weight: 15
description: >

---

Paseto拥有你喜欢JOSE的一切（JWT、JWE、JWS），没有任何[困扰JOSE标准的许多设计缺陷](https://paragonie.com/blog/2017/03/jwt-json-web-tokens-is-bad-standard-that-everyone-should-avoid)

这是[Hertz](https://github.com/cloudwego/hertz)的PASETO中间件框架

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
   h.GET("/paseto", func(c context.Context, ctx *app.RequestContext) {
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

   h.POST("/paseto", paseto.New(), func(c context.Context, ctx *app.RequestContext) {
      ctx.String(http.StatusOK, "token is valid")
   })

   go performRequest()

   h.Spin()
}
```

## 配置项

| Option         | Default                                 | Description                                                  |
| -------------- | --------------------------------------- | ------------------------------------------------------------ |
| Next           | `nil`                                   | 接下来定义一个函数，当返回true时跳过这个中间件。             |
| ErrorFunc      | `output log and response 401`           | ErrorFunc定义了一个在发生错误时执行的函数。                  |
| SuccessHandler | `save the claims to app.RequestContext` | SuccessHandler定义了一个函数，该函数在令牌有效时执行。       |
| KeyLookup      | `"header:Authorization"`                | KeyLookup是一个“＜source＞：＜key＞”形式的字符串，用于创建从请求中提取令牌的提取器。 |
| TokenPrefix    | `""`                                    | TokenPrefix是一个字符串，用于保存令牌查找的前缀。            |
| ParseFunc      | `parse V4 Public Token`                 | ParseFunc解析并验证令牌。                                    |

### Next

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
	h.GET("/paseto", func(c context.Context, ctx *app.RequestContext) {
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

	h.POST("/paseto", paseto.New(paseto.WithNext(next)), func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "token is valid")
	})

	go performRequest()

	h.Spin()
}
```

### ErrorFunc

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
   
   h.GET("/paseto/withsecret", func(c context.Context, ctx *app.RequestContext) {
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

   h.GET("/paseto/witherrorfunc", func(c context.Context, ctx *app.RequestContext) {
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

   h.POST("/paseto", paseto.New(paseto.WithErrorFunc(handler)), func(c context.Context, ctx *app.RequestContext) {
      ctx.String(consts.StatusOK, "token is valid")
   })

   go performRequest()

   h.Spin()
}
```

### SuccessHandler

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
	h.GET("/paseto/withsecret", func(c context.Context, ctx *app.RequestContext) {
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

	h.GET("/paseto/withnosecret", func(c context.Context, ctx *app.RequestContext) {
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

	h.POST("/paseto", paseto.New(paseto.WithSuccessHandler(handler)), func(c context.Context, ctx *app.RequestContext) {
		ctx.String(consts.StatusOK, "token is valid")
	})

	go performRequest()

	h.Spin()
}
```

### KeyLookup

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
	h.GET("/paseto", func(c context.Context, ctx *app.RequestContext) {
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

	h.POST("/paseto", paseto.New(paseto.WithKeyLookUp("form:Authorization")), func(c context.Context, ctx *app.RequestContext) {
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
    h.GET("/paseto", func(c context.Context, ctx *app.RequestContext) {
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

    h.POST("/paseto", paseto.New(paseto.WithTokenPrefix("Bearer ")), func(c context.Context, ctx *app.RequestContext) {
        ctx.String(consts.StatusOK, "token is valid")
    })

    go performRequest()

    h.Spin()
}
```

### ParseFunc

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

    h.GET("/paseto/correct-issuer", func(c context.Context, ctx *app.RequestContext) {
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
    h.GET("/paseto/wrong-issuer", func(c context.Context, ctx *app.RequestContext) {
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
    h.POST("/paseto", paseto.New(paseto.WithParseFunc(parseFunc)), func(c context.Context, ctx *app.RequestContext) {
        ctx.String(consts.StatusOK, "token is valid")
    })
    go performRequest()
    h.Spin()
}
```

## 版本比较

| Version | Local                                                        | Public                |
| ------- | ------------------------------------------------------------ | --------------------- |
| v1      | 使用“AES-256-CBC”加密并使用HMAC-SHA-256签名                  | 使用`RSA-SHA-256`签名 |
| v2      | 使用“XSalsa20Poly-1305”加密并使用“HMAC-SHA-384”签名`       | 使用`EdDSA`（`Ed25519`）签名 |                       |
| v3      | 使用“XChaCha20Poly1305”加密并使用“HMAC-SHA-384”签名`       | 使用`EdDSA`（`Ed25519`）签名 |                       |
| v4      | 使用“XChaCha20Poly1305”加密，并使用“HMAC-SHA-512-256”签名` | 使用`EdDSA`（`Ed448`）签名 |                       |

