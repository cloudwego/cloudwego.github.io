---
title: '渲染'
date: 2023-06-01
weight: 18
description: >
---

Hertz 支持对 JSON，HTML，Protobuf 等的渲染。

## JSON

### JSON

Hertz 支持渲染 `JSON`。

示例代码:

```go
func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

	// utils.H is a shortcut for map[string]interface{}
	h.GET("/someJSON", func(ctx context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"message": "hey", "status": consts.StatusOK})
	})

	h.Spin()
}
```

你也可以使用一个结构体。

示例代码：

```go
func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

	h.GET("/moreJSON", func(ctx context.Context, c *app.RequestContext) {
		var msg struct {
			Company  string `json:"company"`
			Location string
			Number   int
		}
		msg.Company = "company"
		msg.Location = "location"
		msg.Number = 123
		// Note that msg.Company becomes "company" in the JSON
		// Will output  :   {"company": "company", "Location": "location", "Number": 123}
		c.JSON(consts.StatusOK, msg)
	})

    h.Spin()
}
```

### PureJSON

`JSON` 使用 Unicode 替换特殊的 HTML 字符，如果你想要按照字面意义编码这些字符，你可以使用 `PureJSON`。

示例代码：

```go
func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

	h.GET("/pureJson", func(ctx context.Context, c *app.RequestContext) {
		c.PureJSON(consts.StatusOK, utils.H{
			"html": "<p> Hello World </p>",
	})

    h.Spin()
}
```

### IndentedJSON

`IndentedJSON` 将给定的结构序列化为优雅的 JSON (通过缩进 + 换行)。

示例代码：

```go
func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

	h.GET("/indentedJSON", func(ctx context.Context, c *app.RequestContext) {
        var msg struct {
			Company  string
			Location string
			Number   int
		}
		msg.Company = "company"
		msg.Location = "location"
		msg.Number = 123
        
        c.IndentedJSON(consts.StatusOK, msg)
        /* 
        will output  :    {
                              "Company": "company",
   						      "Location": "location",
    					      "Number": 123
					      }                         
    	*/
        
    h.Spin()
}
```

## Data

`Data` 需要你自行设置 `Content-Type`，而且 `Data` 只接收 **[]byte**。

示例代码：

```go
func main() {
	h := server.Default(server.WithHostPorts("127.0.0.1:8080"))

	h.GET("/someData", func(ctx context.Context, c *app.RequestContext) {
		c.Data(consts.StatusOK, "text/plain; charset=utf-8", []byte("hello"))
	})

    h.Spin()
}
```

## HTML

### 加载模板文件

Hertz 提供 `LoadHTMLGlob` 和 `LoadHTMLFiles` 来加载模板文件。

示例代码:

```go
func main(){
    h := server.Default(server.WithHostPorts(":8080"))

    h.LoadHTMLGlob("render/html/*")
    //h.LoadHTMLFiles("render/html/index.tmpl")

    h.GET("/index", func(c context.Context, ctx *app.RequestContext) {
		ctx.HTML(http.StatusOK, "index.tmpl", utils.H{
			"title": "Main website",
		})
	})
}
```

### 自定义分隔符

Hertz 支持自定义分隔符。

示例代码：

```go
	h := server.Default(server.WithHostPorts(":8080"))

	h.Delims("{[{", "}]}")
	//Left delimiter, defaults to {{.
	//Right delimiter, defaults to }}.
```

### 自定义模板功能

Hertz 支持自定义模板功能，示例代码如下。

main.go:

```go
package main

import (
	"context"
	"fmt"
	"html/template"
	"net/http"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
)

func formatAsDate(t time.Time) string {
	year, month, day := t.Date()
	return fmt.Sprintf("%d/%02d/%02d", year, month, day)
}

func main() {
	h := server.Default(server.WithHostPorts(":8080"))

	h.Delims("{[{", "}]}")

	h.SetFuncMap(template.FuncMap{
		"formatAsDate": formatAsDate,
	})

	h.LoadHTMLGlob("render/html/*")

	h.GET("/raw", func(c context.Context, ctx *app.RequestContext) {
		ctx.HTML(http.StatusOK, "template1.html", map[string]interface{}{
			"now": time.Date(2017, 0o7, 0o1, 0, 0, 0, 0, time.UTC),
		})
	})

	h.Spin()
}
```

template1.html:

```html
<h1>Date: {[{.now | formatAsDate}]}</h1>
```

查看详细 [示例代码]([hertz-examples/render/html at main · cloudwego/hertz-examples · GitHub](https://github.com/cloudwego/hertz-examples/tree/main/render/html))。

## Protobuf

Hertz 支持渲染 `Protobuf`。

示例代码：

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz-examples/render/protobuf/body"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
	h := server.Default(server.WithHostPorts(":8080"))

	h.GET("/somePb", func(ctx context.Context, c *app.RequestContext) {
        //The specific definition of protobuf is written in the "protobuf/body" file.
		body := body.BodyStruct{
			Body: []byte("Hello World"),
		}
		c.ProtoBuf(200, &body)
	})

	h.Spin()
}
```

示例代码中的 `body.bodyStruct` 具体定义如下。

```go
type BodyStruct struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Body []byte `protobuf:"bytes,1,opt,name=body" json:"body,omitempty"`
}
```

## Text

Hertz 支持渲染 `string`，它需要你自行设置 `format`。

示例代码：

```go
func main() {
	h := server.Default(server.WithHostPorts(":8080"))

	h.GET("someText", func(ctx context.Context, c *app.RequestContext) {
		c.String(consts.StatusOK, "message", "hello,world")
	})
    
	h.Spin()
}
```

## XML

Hertz 支持渲染 `XML`。

示例代码：

```go
func main() {
	h := server.Default(server.WithHostPorts(":8080"))

	h.GET("/someXML", func(ctx context.Context, c *app.RequestContext) {
        c.XML(consts.StatusOK, "hello world")
	})

	h.Spin()
}
```

## 自定义渲染

Hertz 在 app 包内提供了 `Render` 方法。

函数签名：

```go
func (ctx *RequestContext) Render(code int, r render.Render)
```

如果你想要进行自定义渲染，首先要自行实现 render 包内的 `Render` 接口。

```go
type Render interface {
	// Render writes data with custom ContentType.
	// Do not panic inside, RequestContext will handle it.
	Render(resp *protocol.Response) error
	// WriteContentType writes custom ContentType.
	WriteContentType(resp *protocol.Response)
}
```

以实现 `YAML` 渲染为例。

示例代码：

```go
package main

import (
	"context"
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"gopkg.in/yaml.v3"
)

func main() {
	h := server.Default(server.WithHostPorts(":8080"))

	h.GET("/someXML", func(ctx context.Context, c *app.RequestContext) {
		c.Render(consts.StatusOK, YAML{Data: "hello,world"})
	})

	h.Spin()
}

type YAML struct {
	Data interface{}
}

var yamlContentType = "application/yaml; charset=utf-8"

func (r YAML) Render(resp *protocol.Response) error {
	writeContentType(resp, yamlContentType)
	yamlBytes, err := yaml.Marshal(r.Data)
	if err != nil {
		return err
	}

	resp.AppendBody(yamlBytes)

	return nil
}

func (r YAML) WriteContentType(w *protocol.Response) {
	writeContentType(w, yamlContentType)
}

func writeContentType(resp *protocol.Response, value string) {
	resp.Header.SetContentType(value)
}
```

## 完整示例

完整用法示例详见 [example](https://github.com/cloudwego/hertz-examples/tree/main/render)。
