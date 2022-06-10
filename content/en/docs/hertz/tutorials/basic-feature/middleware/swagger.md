---
title: "Swagger"
date: 2022-06-09
weight: 4
description: >

---
Swagger is a standard and complete framework for generating, describing, calling, and visualizing RESTful style Web services.
Hertz also provides an [implementation](https://github.com/hertz-contrib/swagger) of swagger, it uses gin [implementation](https://github.com/swaggo/gin-swagger) for reference.

As for usage, you may refer to hertz [example](https://github.com/hertz-contrib/swagger/blob/main/example/basic/main.go)
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

// PingHandler handlerForTest
// @Summary SummaryForTest
// @Description DescriptionForTest
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

