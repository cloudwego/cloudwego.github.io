`Hertz` supports rendering of JSON,HTML,Protobuf,etc.

## JSON

Hertz supports rendering `JSON`.

Example Code:

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

You can also use a struct.

Example Code:

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

`JSON` replaces special html characters with their unicode entities,if you want to encode these characters literally,you can use `PureJSON`.

Example Code:

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

Different from `JSON`,`Data` requires you to set the Content-Type yourself.In addition,`Data` only accpets **[]byte** .

Example Code:

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

### Load Template Files

Hertz provides `LoadHTMLGlob` and `LoadHTMLFiles` to load template files.

Example Code:

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

### Customizing Delimiters

Hertz supports customizing  delimiters.

Example Code:

```go
	h := server.Default(server.WithHostPorts(":8080"))
	
	h.Delims("{[{", "}]}")
	//Left delimiter, defaults to {{.
	//Right delimiter, defaults to }}.
```

### Customizing Template Funcs

Hertz supports customizing template funcs,the example code is as follows.

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

See the detail [example code](https://github.com/cloudwego/hertz-examples/tree/main/render/html).

## Protobuf

Hertz supports rendering `Protobuf`.

Example Code:

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

The specific definition of `body.bodyStruct` in the example code is as follows.

```go
type BodyStruct struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Body []byte `protobuf:"bytes,1,opt,name=body" json:"body,omitempty"`
}
```



## Complete Example Code

Full usage examples are available at [example](https://github.com/cloudwego/hertz-examples/tree/main/render).