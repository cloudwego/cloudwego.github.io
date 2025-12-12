---
title: "Swagger"
date: 2025-12-04
weight: 8
keywords: ["Swagger", "RESTful API"]
description: "用 Swagger 2.0 来自动生成 RESTful API 文档的 Hertz 中间件。"
---

> **⚠️ 已废弃**
>
> `hertz-contrib/swagger` 中间件已被废弃。
> Hertz 推荐所有用户迁移到官方 `swaggo/swag` 工具链，使用 [Hertz HTTP Adaptor](../../basic-feature/http-adaptor/)。
>
> 迁移指南如下。

## 迁移指南

1. 移除已废弃的依赖项

```sh
github.com/hertz-contrib/swagger
github.com/swaggo/files
```

2. 安装官方 Swag 生成器

```sh
go install github.com/swaggo/swag/cmd/swag@latest
```

3. 替换 Swagger handler

如果项目已经设置好，替换下面的代码。

```go
// 旧版本（使用 hertz-contrib/swagger）
import "github.com/hertz-contrib/swagger"
import swaggerFiles "github.com/swaggo/files"

url := swagger.URL("http://localhost:8888/swagger/doc.json")
h.GET("/swagger/*any", swagger.WrapHandler(swaggerFiles.Handler, url))

// 新版本（使用 http adaptor）
import "github.com/cloudwego/hertz/pkg/common/adaptor"
import httpSwagger "github.com/swaggo/http-swagger"

h.GET("/swagger/*any", adaptor.HertzHandler(httpSwagger.WrapHandler))
```

如果是新项目，请参考以下示例代码：

```go
package main

import (
    "context"

    // 生成的 docs 路径
    _ "project/docs"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/adaptor"
    httpSwagger "github.com/swaggo/http-swagger"
)

// PingHandler
// @Summary Summary
// @Description Description
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
// @description This is a demo using Hertz

// @contact.name hertz
// @contact.url https://github.com/cloudwego/hertz

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8888
// @BasePath /
// @schemes http
func main() {
    h := server.Default()

    h.GET("/ping", PingHandler)

    // Swagger endpoint
    h.GET("/swagger/*any",
        adaptor.HertzHandler(
            httpSwagger.WrapHandler,
        ),
    )

    h.Spin()
}
```

4. 更新 Swagger 注释

```sh
swag init
```

5. 运行程序

启动 Hertz 服务器。

```sh
go run main.go
```

在浏览器中访问 http://localhost:8888/swagger/index.html 或配置的地址，即可查看 Swagger UI。

6. 使用自定义 Swagger UI

对于想要创建自己的自定义 UI 的用户，他们需要下载 Swagger UI 分发文件，并将 UI 文件作为静态资源提供。
从 [swagger-ui/dist](https://github.com/swagger-api/swagger-ui/tree/master/dist) 中复制以下文件到 `swagger-ui/`

- https://github.com/swagger-api/swagger-ui/blob/master/dist/favicon-16x16.png
- https://github.com/swagger-api/swagger-ui/blob/master/dist/favicon-32x32.png
- https://github.com/swagger-api/swagger-ui/blob/master/dist/swagger-ui.css
- https://github.com/swagger-api/swagger-ui/blob/master/dist/swagger-ui-bundle.js
- https://github.com/swagger-api/swagger-ui/blob/master/dist/swagger-ui-standalone-preset.js

在同一目录下创建一个 `index.html` 文件，示例模板如下。旧版 hertz-contrib/swagger 中的配置项都可以直接在 HTML 文件里设置。

**注意：以下 HTML 文件仅为示例，应根据用户需求进行修改。**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Custom Swagger UI</title> <!-- Title -->
  <link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700|Source+Code+Pro:300,600|Titillium+Web:400,600,700" rel="stylesheet">
  <link rel="stylesheet" type="text/css" href="swagger-ui.css">
  <link rel="icon" type="image/png" href="favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/png" href="favicon-16x16.png" sizes="16x16" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }

    body { 
      margin: 0; 
      background: #fff4d6; 
    }

    .custom-banner {
      padding: 20px;
      background: #4f46e5;
      color: white;
      text-align: center;
      font-size: 26px;
      font-weight: bold;
      border-bottom: 4px solid #312e81;
    }
  </style>
</head>

<body>

<div class="custom-banner">
  My Custom Swagger UI
</div>

<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="position:absolute;width:0;height:0">
  <defs>
    <symbol viewBox="0 0 20 20" id="unlocked">
          <path d="M15.8 8H14V5.6C14 2.703 12.665 1 10 1 7.334 1 6 2.703 6 5.6V6h2v-.801C8 3.754 8.797 3 10 3c1.203 0 2 .754 2 2.199V8H4c-.553 0-1 .646-1 1.199V17c0 .549.428 1.139.951 1.307l1.197.387C5.672 18.861 6.55 19 7.1 19h5.8c.549 0 1.428-.139 1.951-.307l1.196-.387c.524-.167.953-.757.953-1.306V9.199C17 8.646 16.352 8 15.8 8z"></path>
    </symbol>

    <symbol viewBox="0 0 20 20" id="locked">
      <path d="M15.8 8H14V5.6C14 2.703 12.665 1 10 1 7.334 1 6 2.703 6 5.6V8H4c-.553 0-1 .646-1 1.199V17c0 .549.428 1.139.951 1.307l1.197.387C5.672 18.861 6.55 19 7.1 19h5.8c.549 0 1.428-.139 1.951-.307l1.196-.387c.524-.167.953-.757.953-1.306V9.199C17 8.646 16.352 8 15.8 8zM12 8H8V5.199C8 3.754 8.797 3 10 3c1.203 0 2 .754 2 2.199V8z"/>
    </symbol>

    <symbol viewBox="0 0 20 20" id="close">
      <path d="M14.348 14.849c-.469.469-1.229.469-1.697 0L10 11.819l-2.651 3.029c-.469.469-1.229.469-1.697 0-.469-.469-.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-.469-.469-.469-1.228 0-1.697.469-.469 1.228-.469 1.697 0L10 8.183l2.651-3.031c.469-.469 1.228-.469 1.697 0 .469.469.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c.469.469.469 1.229 0 1.698z"/>
    </symbol>

    <symbol viewBox="0 0 20 20" id="large-arrow">
      <path d="M13.25 10L6.109 2.58c-.268-.27-.268-.707 0-.979.268-.27.701-.27.969 0l7.83 7.908c.268.271.268.709 0 .979l-7.83 7.908c-.268.271-.701.27-.969 0-.268-.269-.268-.707 0-.979L13.25 10z"/>
    </symbol>

    <symbol viewBox="0 0 20 20" id="large-arrow-down">
      <path d="M17.418 6.109c.272-.268.709-.268.979 0s.271.701 0 .969l-7.908 7.83c-.27.268-.707.268-.979 0l-7.908-7.83c-.27-.268-.27-.701 0-.969.271-.268.709-.268.979 0L10 13.25l7.418-7.141z"/>
    </symbol>

    <symbol viewBox="0 0 24 24" id="jump-to">
      <path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z"/>
    </symbol>

    <symbol viewBox="0 0 24 24" id="expand">
      <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
    </symbol>

  </defs>
</svg>

<div id="swagger-ui"></div>

<script src="swagger-ui-bundle.js"></script>
<script src="swagger-ui-standalone-preset.js"></script>
<script>
window.onload = function() {
  const ui = SwaggerUIBundle({
    url: "swagger/doc.json",                // URL
    syntaxHighlight: true,              // SyntaxHighlight
    dom_id: '#swagger-ui',
    validatorUrl: null,
    oauth2RedirectUrl: "",              // Oauth2RedirectURL
    persistAuthorization: false,        // PersistAuthorization
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout",
    docExpansion: "none",               // DocExpansion
    deepLinking: true,                  // DeepLinking
    defaultModelsExpandDepth: 1         // DefaultModelsExpandDepth
  });

  const defaultClientId = "";           // Oauth2DefaultClientID
  if (defaultClientId) ui.initOAuth({ clientId: defaultClientId });

  window.ui = ui;                      
}
</script>

</body>
</html>
```

最终项目结构应如下：

```sh
project/
├── main.go
├── docs/                 # generated by swag init
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
├── swagger-ui/           # custom UI (copied from Swagger UI dist)
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── index.html 
│   ├── swagger-ui-bundle.js
│   ├── swagger-ui-standalone-preset.js
│   ├── swagger-ui.css
│   └── ...other swagger ui dist files as needed...
├── go.mod
└── go.sum
```

7. 提供静态资源服务

在 `main.go` 中加入

```go
h.GET("/swagger/*any", adaptor.HertzHandler(httpSwagger.WrapHandler))

// 加这一行
h.Static("/", "./swagger-ui")

h.Spin()

// 其他代码
```

8. 运行程序

```sh
go run main.go
```

浏览器访问：http://localhost:8888/index.html 即可查看自定义的 Swagger UI。

## 旧版文档（已废弃）

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
	c.JSON(200, map[string]string{
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
