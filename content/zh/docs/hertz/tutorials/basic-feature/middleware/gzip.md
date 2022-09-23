---

title: "Gzip 压缩"
date: 2022-09-01
weight: 4
description: >

---

在 HTTP 中，GNUzip(Gzip) 压缩编码是一种用来优化 Web 应用程序性能的方式，并且 Hertz 也提供了 Gzip 的[实现](https://github.com/hertz-contrib/gzip) 。


## 安装

```sh
go get github.com/hertz-contrib/gzip
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
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/hertz-contrib/gzip"

)

func main() {
	h := server.Default(server.WithHostPorts(":8080"))
	h.Use(gzip.Gzip(gzip.DefaultCompression))
	h.GET("/ping", func(ctx context.Context, c *app.RequestContext) {
		c.String(http.StatusOK, "pong "+fmt.Sprint(time.Now().Unix()))
	})
	h.Spin()
}

```
## 配置

### Gzip

`Gzip`提供了四种压缩选项:`BestCompression`,`BestSpeed`,`DefaultCompression`,`NoCompression` 用于用户自定义压缩模式

| 选项               | 描述                 |
| ------------------ | -------------------- |
| BestCompression    | 提供最佳的文件压缩率 |
| BestSpeed          | 提供了最佳的压缩速度 |
| DefaultCompression | 默认压缩率           |
| NoCompression      | 不进行压缩           |

函数签名如下:

```go
func Gzip(level int, options ...Option) app.HandlerFunc
```
示例代码
```go
package main

 // ...

func main() {
	h := server.Default(server.WithHostPorts(":8080"))
    //BestCompression option 
	h.Use(gzip.Gzip(gzip.BestCompression))
    //BestSpeed option
    h.Use(gzip.Gzip(gzip.BestSpeed))
    //DefaultCompression option
    h.Use(gzip.Gzip(gzip.DefaultCompression))
    //NoCompression option
    h.Use(gzip.Gzip(gzip.NoCompression))
	// ...
}
```

### WithExcludedExtensions

`gzip` 提供 `WithExcludeExtensions ` 用于帮助用户设置不需要 `gzip` 压缩的文件后缀，默认值为`.png`, `.gif`, `.jpeg`, `.jpg`

函数签名如下：

```
func WithExcludedExtensions(args []string) Option
```

示例代码：

```go
func WithExcludedPaths(args []string) Option
```

```go
package main

// ...

func main() {
	h := server.Default(server.WithHostPorts(":8080"))
	h.Use(
		gzip.Gzip(
			gzip.DefaultCompression,
			gzip.WithExcludedExtensions([]string{".pdf", ".mp4"}),
		),
	)
// ...
}
```

### WithExcludedPaths

`gzip` 提供了 `WithExcludedPaths`用于帮助用户设置其不需要进行 `gzip` 压缩的文件路径

函数签名如下：

```go
func WithExcludedPaths(args []string) Option
```

示例代码如下：

```go
package main

// ...

func main() {
	h := server.Default(server.WithHostPorts(":8080"))
    h.Use(
		gzip.Gzip(
			gzip.DefaultCompression,
            gzip.WithExcludedPaths([]string{"/api/"}),
		),
	)
// ...
}
```
### WithExcludedPathRegexes

`gzip` 提供了`WithExcludedPathRegexes`用于帮助用户设置自定义的正则表达式来过滤掉不需要 `gzip` 压缩的文件

函数签名如下：

```go
func WithExcludedPathRegexes(args []string) Option
```

示例代码如下：

```go
package main

// ...

func main() {
   h := server.Default(server.WithHostPorts(":8080"))
   h.Use(
		gzip.Gzip(
			gzip.DefaultCompression,
           gzip.WithExcludedPathRegexes([]string{".*"}),
		),
	)
// ...
}
```



更多用法示例详见 [gzip](https://github.com/hertz-contrib/gzip)
