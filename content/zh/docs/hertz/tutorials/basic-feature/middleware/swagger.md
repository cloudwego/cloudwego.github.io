---
title: "Swagger"
date: 2022-10-06
weight: 8
keywords: ["Swagger", "RESTful API"]
description: "用 Swagger 2.0 来自动生成 RESTful API 文档的 Hertz 中间件。"
---

这是一个用 Swagger 2.0 来自动生成 RESTful API 文档的 Hertz 中间件。

参考了 gin 的 [实现](https://github.com/swaggo/gin-swagger)，对 Hertz 进行了适配。

## 使用用法

1. 在你的 API 源代码中添加注释，参考 [Declarative Comments Format](https://github.com/swaggo/swag/blob/master/README.md#declarative-comments-format)。

2. 可以通过运行以下命令下载 Go 对应的 [Swag][Swag] 可执行文件:

但是需要**注意**的是，`go get` 安装可执行文件需要配合 `GOPATH` 模式工作。

```sh
go get github.com/swaggo/swag/cmd/swag
```

因为从 Go 1.17 开始，在 `go mod` 模式下通过 `go get` 下载对应库文件将无法自动编译并安装到 `$GOPATH/bin` 的路径，
所以不再推荐用 `go get` 来安装可执行文件的方式。可以使用 `go install`来代替。

```sh
go install github.com/swaggo/swag/cmd/swag@latest
```

3. 在你的 Go 项目的根目录下运行 [Swag][Swag] (例如 `~/root/go-project-name`)，[Swag][Swag] 会解析注释并在 `~/root/go-project-name/docs` 目录下生成必要的文件 (`docs` 文件夹和 `docs/doc.go`)。

```sh
swag init
```

使用参数运行 [Swag][Swag] (全部参数可以通过运行 `swag init -h` 查看)。

```bash
swag init --parseDependency --parseInternal --parseDepth 5 --instanceName "swagger"
```

| 选项            | 默认值    | 描述                                                                                                           |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| parseInternal   | false     | 解析内部依赖包。                                                                                               |
| parseDependency | false     | 解析外部依赖包。                                                                                               |
| parseDepth      | 100       | 解析依赖包深度，如果你知道解析结构的深度，推荐使用这个参数，swag 命令的执行时间会显著减少。                    |
| instanceName    | "swagger" | swagger 文档的实例名称。如果要在一个 Hertz 路由上部署多个不同的 swagger 实例，请确保每个实例有一个唯一的名字。 |

4. 通过运行以下命令在工程中下载 [hertz-swagger](https://github.com/hertz-contrib/swagger) :

```sh
go get github.com/hertz-contrib/swagger
go get github.com/swaggo/files
```

并在你的代码中引用如下代码:

```go
import "github.com/hertz-contrib/swagger" // hertz-swagger middleware
import "github.com/swaggo/files" // swagger embed files
```

## 示例代码

现在假设你已经实现了一个简单的 api，如下所示：

```go
func PingHandler(ctx context.Context, c *app.RequestContext) {
    c.JSON(200, map[string]string{
        "ping": "pong",
    })
}

```

那么如何在 api 上面使用 hertz-swagger？只要按照下面的步骤即可。

1. 使用 hertz-swagger 规则为 api 和主函数添加注释，如下所示：

```go
// PingHandler 测试 handler
// @Summary 测试 Summary
// @Description 测试 Description
// @Accept application/json
// @Produce application/json
// @Router /ping [get]
func PingHandler(ctx context.Context, c *app.RequestContext) {
    c.JSON(200, map[string]string{
        "ping": "pong",
    })
}
```

2. 使用 `swag init` 命令来生成文档，生成的文档将被存储在 `docs/` 目录下。

3. 将生成的 docs 包导入当前项目中:

   假设你的项目名为 `github.com/go-project-name/docs`。

```go
import (
   docs "github.com/go-project-name/docs"
)
```

4. 编译运行你的应用程序，之后在 http://localhost:8888/swagger/index.html，可以看到 Swagger UI 界面。

5. 完整的代码和文件依赖关系，如下所示:

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

// PingHandler 测试 handler
// @Summary 测试 Summary
// @Description 测试 Description
// @Accept application/json
// @Produce application/json
// @Router /ping [get]
func PingHandler(ctx context.Context, c *app.RequestContext) {
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

样例的项目目录结构树如下，`swag init` 运行在相对的目录 `.` 下。

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

## 支持多个 API

这个功能是在 swag v1.7.9 中引入的。

## 配置

你可以使用不同的配置选项来配置 Swagger。

```go
func main() {
	h := server.Default()

	h.GET("/ping", PingHandler)

	url := swagger.URL("http://localhost:8888/swagger/doc.json") // The url pointing to API definition
	h.GET("/swagger/*any", swagger.WrapHandler(swaggerFiles.Handler, url, swagger.DefaultModelsExpandDepth(-1)))
	h.Spin()
}

```

| 选项                     | 类型   | 默认值     | 描述                                                                                                       |
| ------------------------ | ------ | ---------- | ---------------------------------------------------------------------------------------------------------- |
| URL                      | string | "doc.json" | 指向 API 定义的 URL                                                                                        |
| DocExpansion             | string | "list"     | 控制操作和标签的默认扩展设置。它可以是 `list`（只展开标签）、`full`（展开标签和操作）或 `none`（不展开）。 |
| DeepLinking              | bool   | true       | 如果设置为 `true`，可以启用标签和操作的深度链接。更多信息请参见深度链接文档。                              |
| DefaultModelsExpandDepth | int    | 1          | 模型的默认扩展深度（设置为 -1 完全隐藏模型）。                                                             |
| PersistAuthorization     | bool   | false      | 如果设置为 `true`，则会持久化保存授权数据，在浏览器关闭/刷新时不会丢失。                                   |
| Oauth2DefaultClientID    | string | ""         | 如果设置了这个字段，它将用于预填 OAuth2 授权对话框的 _client_id_ 字段。                                    |

[Swag]: https://github.com/swaggo/swag
