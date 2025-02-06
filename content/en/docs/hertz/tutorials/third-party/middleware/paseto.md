---
title: "Paseto"
date: 2023-05-08
weight: 16
keywords: ["Paseto", "JOSE", "JWT", "JWE", "JWS"]
description: "This is the PASETO middleware for Hertz framework."
---

Paseto is everything you love about JOSE (JWT, JWE, JWS) without any of the [many design deficits that plague the JOSE standards](https://paragonie.com/blog/2017/03/jwt-json-web-tokens-is-bad-standard-that-everyone-should-avoid).

This is the PASETO middleware for [Hertz](https://github.com/cloudwego/hertz) framework.

## Install

```shell
go get github.com/hertz-contrib/paseto
```

## Example

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
      c.String(http.StatusOK, token)
   })

   h.POST("/paseto", paseto.New(), func(ctx context.Context, c *app.RequestContext) {
      c.String(http.StatusOK, "token is valid")
   })

   go performRequest()

   h.Spin()
}
```

## Options

| Option         | Default                                                                                                  | Description                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Next           | [nil](https://github.com/hertz-contrib/paseto/blob/main/option.go#L88)                                   | Used to define a function to skip this middleware when returned true                                                                 |
| ErrorHandler   | [output log and response 401](https://github.com/hertz-contrib/paseto/blob/main/option.go#L89)           | Used to define a function which is executed when an error occurs                                                                     |
| SuccessHandler | [save the claims to app.RequestContext](https://github.com/hertz-contrib/paseto/blob/main/option.go#L94) | Used to define a function which is executed when the token is valid                                                                  |
| KeyLookup      | [header:Authorization](https://github.com/hertz-contrib/paseto/blob/main/option.go#L97)                  | Used to define a string in the form of "<source>:<key>" that is used to create an Extractor that extracts the token from the request |
| TokenPrefix    | ""                                                                                                       | Used to define a string that holds the prefix for the token lookup                                                                   |
| ParseFunc      | [parse V4 Public Token](https://github.com/hertz-contrib/paseto/blob/main/option.go#L98)                 | Used to parse and verify token                                                                                                       |

### Next

`WithNext` sets a function to judge whether to skip this middleware.

Function Signature：

```go
func WithNext(f NextHandler) Option
```

Sample code：

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
		c.String(consts.StatusOK, token)
	})

	h.POST("/paseto", paseto.New(paseto.WithNext(next)), func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "token is valid")
	})

	go performRequest()

	h.Spin()
}
```

### ErrorFunc

`WithErrorFunc` sets ErrorHandler.

`ErrorHandler` defines a function which is executed when an error occurs.

Function Signature：

```go
func WithErrorFunc(f app.HandlerFunc) Option
```

Sample code：

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
      c.String(consts.StatusOK, token)
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
      c.String(consts.StatusOK, token)
   })

   h.POST("/paseto", paseto.New(paseto.WithErrorFunc(handler)), func(ctx context.Context, c *app.RequestContext) {
      c.String(consts.StatusOK, "token is valid")
   })

   go performRequest()

   h.Spin()
}
```

### SuccessHandler

`WithSuccessHandler` sets the logic to handle the Parsed token.

Function Signature：

```go
func WithSuccessHandler(f SuccessHandler) Option
```

Sample code：

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
		c.String(consts.StatusOK, token)
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
		c.String(consts.StatusOK, token)
	})

	h.POST("/paseto", paseto.New(paseto.WithSuccessHandler(handler)), func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "token is valid")
	})

	go performRequest()

	h.Spin()
}
```

### KeyLookup

`WithKeyLookUp` sets a string in the form of "<source>:<key>" that is used to create an `Extractor` that extracts the token from the request.

Function Signature：

```go
func WithKeyLookUp(lookup string) Option
```

Sample code：

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
		c.String(consts.StatusOK, token)
	})

	h.POST("/paseto", paseto.New(paseto.WithKeyLookUp("form:Authorization")), func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "token is valid")
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
        c.String(consts.StatusOK, token)
    })

    h.POST("/paseto", paseto.New(paseto.WithTokenPrefix("Bearer ")), func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "token is valid")
    })

    go performRequest()

    h.Spin()
}
```

### ParseFunc

`WithParseFunc` sets the ParseFunc.

`ParseFunc` parse and verify token.

Function Signature：

```go
func WithParseFunc(f ParseFunc) Option
```

Sample code：

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
        c.String(consts.StatusOK, token)
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
        c.String(consts.StatusOK, token)
    })

    parseFunc, _ := paseto.NewV4PublicParseFunc(paseto.DefaultPublicKey, []byte(paseto.DefaultImplicit), paseto.WithIssuer("CloudWeGo-issuer"))
    h.POST("/paseto", paseto.New(paseto.WithParseFunc(parseFunc)), func(ctx context.Context, c *app.RequestContext) {
        c.String(consts.StatusOK, "token is valid")
    })
    go performRequest()
    h.Spin()
}
```

## Version comparison

| Version | Local                                                                 | Public                         |
| ------- | --------------------------------------------------------------------- | ------------------------------ |
| v1      | Encrypted with `AES-256-CBC` and signed with HMAC-SHA-256             | Signed with `RSA-SHA-256`      |
| v2      | Encrypted with `XSalsa20Poly1305` and signed with `HMAC-SHA-384`      | Signed with `EdDSA`(`Ed25519`) |
| v3      | Encrypted with `XChaCha20Poly1305` and signed with`HMAC-SHA-384`      | Signed with `EdDSA`(`Ed25519`) |
| v4      | Encrypted with `XChaCha20Poly1305` and signed with `HMAC-SHA-512-256` | Signed with `EdDSA`(`Ed448`)   |

## Full Example

Refer to the [paseto/example](https://github.com/hertz-contrib/paseto/tree/main/example) for full usage examples.
