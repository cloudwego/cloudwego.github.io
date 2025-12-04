---
title: "Swagger"
date: 2025-12-04
weight: 8
keywords: ["Swagger", "RESTful API"]
description: "Hertz middleware to automatically generate RESTful API documentation with Swagger 2.0."
---

> **⚠️ Deprecated**
>
> The `hertz-contrib/swagger` middleware is now deprecated.  
> Hertz recommends all users to migrate to the official `swaggo/swag` toolchain using the [Hertz HTTP Adaptor](../../basic-feature/http-adaptor/).
>
> See the migration guide below.

## Migration Guide 

1. Remove deprecated dependencies

```sh
github.com/hertz-contrib/swagger
github.com/swaggo/files
```

2. Install official swag generator

```sh
go install github.com/swaggo/swag/cmd/swag@latest
```

3. Replace swagger handler

If the project has already been set up, replace the code below.

```go
// Before (using hertz-contrib/swagger)
import "github.com/hertz-contrib/swagger"
import swaggerFiles "github.com/swaggo/files"

url := swagger.URL("http://localhost:8888/swagger/doc.json")
h.GET("/swagger/*any", swagger.WrapHandler(swaggerFiles.Handler, url))

// After (using http adaptor)
import "github.com/cloudwego/hertz/pkg/common/adaptor"
import httpSwagger "github.com/swaggo/http-swagger"

h.GET("/swagger/*any", adaptor.HertzHandler(httpSwagger.WrapHandler))
```

If starting a new project, follow the sample code below as an example.

```go
package main

import (
    "context"

    // Path to generated docs
    _ "project/docs"

    "github.com/cloudwego/hertz/pkg/app"
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/common/adaptor"
    httpSwagger "github.com/swaggo/http-swagger"
)

// PingHandler handler
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
// @description This is a demo using Hertz.

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

4. Generate Swagger docs

```sh
swag init
```

5. Run program

Start the Hertz server.

```sh
go run main.go
```

On a web browser, go to http://localhost:8888/swagger/index.html or whichever address that is configured to see the Swagger UI.

6. Provide custom Swagger UI

For users who want to create their own custom UI, they will need to download the Swagger UI dist files, and serve the UI files as static assets.
Copy the following files from [swagger-ui/dist](https://github.com/swagger-api/swagger-ui/tree/master/dist) and place them in `swagger-ui/`.
- https://github.com/swagger-api/swagger-ui/blob/master/dist/favicon-16x16.png
- https://github.com/swagger-api/swagger-ui/blob/master/dist/favicon-32x32.png
- https://github.com/swagger-api/swagger-ui/blob/master/dist/swagger-ui.css
- https://github.com/swagger-api/swagger-ui/blob/master/dist/swagger-ui-bundle.js
- https://github.com/swagger-api/swagger-ui/blob/master/dist/swagger-ui-standalone-preset.js

Create an `index.html` file in the same directory with the following template. The original configuration options present in the old `hertz-contrib/swagger` middleware can be directly configured in the HTML file.

**Note: The HTML file below is just a sample and should be modified accordingly to the user's needs.**

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

The final project directory should have the following structure:

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

7. Serve static files

Add this line into `main.go`

```go
h.GET("/swagger/*any", adaptor.HertzHandler(httpSwagger.WrapHandler))

// Add this line
h.Static("/", "./swagger-ui")

h.Spin()

// Rest of code
```

8. Run program

```sh
go run main.go
```

On a web browser, go to http://localhost:8888/index.html to see the customised Swagger UI.

## Legacy Documentation (Deprecated)

Hertz middleware to automatically generate RESTful API documentation with Swagger 2.0.

The implementation of the [swagger](https://github.com/hertz-contrib/swagger) extension refers to the implementation of [Gin](https://github.com/swaggo/gin-swagger).

## Usage

1. Add comments to your API source code, See [Declarative Comments Format](https://github.com/swaggo/swag/blob/master/README.md#declarative-comments-format).

2. Download [Swag][Swag] for Go by using:

`go get` install executables needs to work with `GOPATH` mode.

```sh
go get github.com/swaggo/swag/cmd/swag
```

Starting in Go 1.17,installing executables with `go get` is deprecated. `go install` may be used instead:

```sh
go install github.com/swaggo/swag/cmd/swag@latest
```

3. Run the [Swag][Swag] at your Go project root path(for instance `~/root/go-project-name`),
   [Swag][Swag] will parse comments and generate required files(`docs` folder and `docs/doc.go`)
   at `~/root/go-project-name/docs`.

```sh
swag init
```

swag init with options(All options can be viewed via `swag init -h`).

```bash
swag init --parseDependency --parseInternal --parseDepth 5 --instanceName "swagger"
```

| Options         | Default   | Description                                                                                                                                                                      |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| parseInternal   | false     | Parse go files in internal packages.                                                                                                                                             |
| parseDependency | false     | Parse go files inside dependency folder.                                                                                                                                         |
| parseDepth      | 100       | Dependency parse depth.If you know the depth of the data structure to be parsed, it is recommended to use `parseDepth`, the swag command execution time will be greatly reduced. |
| instanceName    | "swagger" | The instance name of the swagger document. If multiple different swagger instances should be deployed on one hertz router, ensure that each instance has a unique name.          |

4. Download [hertz-swagger](https://github.com/hertz-contrib/swagger) by using:

```sh
go get github.com/hertz-contrib/swagger
go get github.com/swaggo/files
```

Import following in your code:

```go
import "github.com/hertz-contrib/swagger" // hertz-swagger middleware
import "github.com/swaggo/files" // swagger embed files
```

## Example

Now assume you have implemented a simple api as following:

```go
func PingHandler(ctx context.Context, c *app.RequestContext) {
    c.JSON(200, map[string]string{
        "ping": "pong",
    })
}

```

So how to use hertz-swagger on api above? Just follow the following guide.

1. Add Comments for apis and main function with hertz-swagger rules like following:

```go
// PingHandler TestHandler
// @Summary TestSummary
// @Description TestDescription
// @Accept application/json
// @Produce application/json
// @Router /ping [get]
func PingHandler(ctx context.Context, c *app.RequestContext) {
    c.JSON(200, map[string]string{
        "ping": "pong",
    })
}
```

2. Use `swag init` command to generate a docs, docs generated will be stored at `docs/`.
3. Import the generated docs package into the current project:
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

Demo project tree, `swag init` is run at relative `.`.

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

This feature was introduced in swag v1.7.9.

## Configuration

You can configure Swagger using different configuration options.

```go
func main() {
	h := server.Default()

	h.GET("/ping", PingHandler)

	url := swagger.URL("http://localhost:8888/swagger/doc.json") // The url pointing to API definition
	h.GET("/swagger/*any", swagger.WrapHandler(swaggerFiles.Handler, url, swagger.DefaultModelsExpandDepth(-1)))
	h.Spin()
}

```

| Option                   | Type   | Default    | Description                                                                                                                                                                         |
| ------------------------ | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL                      | string | "doc.json" | URL pointing to API definition                                                                                                                                                      |
| DocExpansion             | string | "list"     | Controls the default expansion setting for the operations and tags. It can be 'list' (expands only the tags), 'full' (expands the tags and operations) or 'none' (expands nothing). |
| DeepLinking              | bool   | true       | If set to true, enables deep linking for tags and operations. See the Deep Linking documentation for more information.                                                              |
| DefaultModelsExpandDepth | int    | 1          | Default expansion depth for models (set to -1 completely hide the models).                                                                                                          |
| PersistAuthorization     | bool   | false      | If set to true, it persists authorization data and it would not be lost on browser close/refresh.                                                                                   |
| Oauth2DefaultClientID    | string | ""         | If set, it's used to prepopulate the _client_id_ field of the OAuth2 Authorization dialog.                                                                                          |

---

[Swag]: https://github.com/swaggo/swag
