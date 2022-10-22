---
title: "Swagger"
date: 2022-10-06
weight: 8
description: >

---

Hertz middleware to automatically generate RESTful API documentation with Swagger 2.0.

The implementation of the [swagger](https://github.com/hertz-contrib/swagger) extension refers to the implementation of [Gin](https://github.com/swaggo/gin-swagger).

## Uasge

1. Add comments to your API source code, [See Declarative Comments Format](https://github.com/swaggo/swag/blob/master/README.md#declarative-comments-format).

2. Download [Swag](https://github.com/swaggo/swag) for Go by using:

```sh
go get github.com/swaggo/swag/cmd/swag
```

Starting in Go 1.17, installing executables with `go get` is deprecated. `go install` may be used instead:

```sh
go install github.com/swaggo/swag/cmd/swag@latest
```

3. Run the [Swag](https://github.com/swaggo/swag) at your Go project root path(for instance `~/root/go-peoject-name`),
   [Swag](https://github.com/swaggo/swag) will parse comments and generate required files(`docs` folder and `docs/doc.go`)
   at `~/root/go-peoject-name/docs`.

```sh
swag init
```


4. Download [hertz-swagger](https://github.com/hertz-contrib/swagger) by using:

```sh
go get -u github.com/hertz-contrib/swagger
go get -u github.com/swaggo/files
```

Import following in your code:

```go
import "github.com/hertz-contrib/swagger" // hertz-swagger middleware
import "github.com/swaggo/files" // swagger embed files

```

## Example

Now assume you have implemented a simple api as following:

```go
func PingHandler(c context.Context, ctx *app.RequestContext) {
    ctx.JSON(200, map[string]string{
        "ping": "pong",
    })
}

```

So how to use hertz-swagger on api above? Just follow the following guide.

1. Add Comments for apis and main function with hertz-swagger rules like following:

```go
// PingHandler 测试handler
// @Summary 测试Summary
// @Description 测试Description
// @Accept application/json
// @Produce application/json
// @Router /ping [get]
func PingHandler(c context.Context, ctx *app.RequestContext) {
    ctx.JSON(200, map[string]string{
        "ping": "pong",
    })
}
```

2. Use `swag init` command to generate a docs, docs generated will be stored at `docs/`.
3. Import the docs like this:
   I assume your project named `github.com/go-project-name/docs`.

```go
import (
   docs "github.com/go-project-name/docs"
)
```

4. Build your application and after that, go to http://localhost:8888/swagger/index.html ,you to see your Swagger UI.

5. The full code and folder relatives here:

```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/hertz-contrib/swagger"
	_ "github.com/hertz-contrib/swagger/example/basic/docs"
	swaggerFiles "github.com/swaggo/files"
)

// PingHandler Testhandler
// @Summary TestSummary
// @Description TestDescription
// @Accept application/json
// @Produce application/json
// @Router /ping [get]
func PingHandler(c context.Context, ctx *app.RequestContext) {
	ctx.JSON(200, map[string]string{
		"ping": "pong",
	})
}

// @title HertzTest
// @version 1.0
// @description This is a demo using Hertz.

// @contact.name hertz-contrib
// @contact.url https://github.com/hertz-contrib

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8888
// @BasePath /
// @schemes http
func main() {
	h := server.Default()

	h.GET("/ping", PingHandler)

	url := swagger.URL("http://localhost:8888/swagger/doc.json") // The url pointing to API definition
	h.GET("/swagger/*any", swagger.WrapHandler(swaggerFiles.Handler, url))

	h.Spin()
}

```

Demo project tree, `swag init` is run at relative `.`

```
.
├── docs
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
├── go.mod
├── go.sum
└── main.go
```

## Multiple APIs

This feature was introduced in swag v1.7.9

## Configuration

You can configure Swagger using different configuration options

```go
func main() {
	h := server.Default()

	h.GET("/ping", PingHandler)

	url := swagger.URL("http://localhost:8888/swagger/doc.json") // The url pointing to API definition
		h.GET("/swagger/*any", swagger.WrapHandler(swaggerFiles.Handler, url, swagger.DefaultModelsExpandDepth(-1)))
	h.Spin()
}

```


| Option                   | Type   | Default    | Description                                                  |
| ------------------------ | ------ | ---------- | ------------------------------------------------------------ |
| URL                      | string | "doc.json" | URL pointing to API definition                               |
| DocExpansion             | string | "list"     | Controls the default expansion setting for the operations and tags. It can be 'list' (expands only the tags), 'full' (expands the tags and operations) or 'none' (expands nothing). |
| DeepLinking              | bool   | true       | If set to true, enables deep linking for tags and operations. See the Deep Linking documentation for more information. |
| DefaultModelsExpandDepth | int    | 1          | Default expansion depth for models (set to -1 completely hide the models). |
| InstanceName             | string | "swagger"  | The instance name of the swagger document. If multiple different swagger instances should be deployed on one hertz router, ensure that each instance has a unique name (use the _--instanceName_ parameter to generate swagger documents with _swag init_). |
| PersistAuthorization     | bool   | false      | If set to true, it persists authorization data and it would not be lost on browser close/refresh. |
| Oauth2DefaultClientID    | string | ""         | If set, it's used to prepopulate the *client_id* field of the OAuth2 Authorization dialog. |
---
