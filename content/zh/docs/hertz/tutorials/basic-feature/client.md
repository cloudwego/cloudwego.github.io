---
title: "Client"
date: 2023-04-12
weight: 3
description: >
---



## 快速开始

```go
package main

import (
	"context"
	"fmt"
	
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func performRequest() {
	c, _ := client.NewClient()
	req, resp := protocol.AcquireRequest(), protocol.AcquireResponse()
	req.SetRequestURI("http://localhost:8080/hello")

	req.SetMethod("GET")
	_ = c.Do(context.Background(), req, resp)
	fmt.Printf("get response: %s\n", resp.Body())

}

func main() {
	h := server.New(server.WithHostPorts(":8080"))
	h.GET("/hello", func(c context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, "hello hertz")
	})
	go performRequest()
	h.Spin()
}

```

## 配置

| 配置项                        | 默认值 | 描述                                                       |
| ----------------------------- | ------ | ---------------------------------------------------------- |
| DialTimeout                   |        | 拨号超时时间                                               |
| MaxConnsPerHost               |        | 每个主机可能建立的最大连接数                               |
| MaxIdleConnDuration           |        | 最大的空闲连接持续时间，空闲的保持连接在此持续时间后被关闭 |
| MaxConnDuration               |        | 最大的连接持续时间，keep-alive 连接在此持续时间后被关闭。  |
| MaxConnWaitTimeout            |        | 等待自由连接的最大时间。                                   |
| KeepAlive                     |        | 是否使用 keep-alive 连接                                   |
| ClientReadTimeout             |        | 完整读取响应（包括body）的最大持续时间。                   |
| TLSConfig                     |        | 用来创建一个 tls 连接的 tlsConfig                          |
| Dialer                        |        | 用户自定义拨号器                                           |
| ResponseBodyStream            |        | 是否在流中读取 body                                        |
| DisableHeaderNamesNormalizing |        | 是否禁用头名称规范化                                       |
| Name                          |        | 用户代理头中使用的客户端名称                               |
| NoDefaultUserAgentHeader      |        | 是否没有默认的User-Agent头                                 |
| DisablePathNormalizing        |        | 是否禁用路径规范化。                                       |
| RetryConfig                   |        | 重试配置                                                   |
| WriteTimeout                  |        | 写入超时时间                                               |
| ConnStateObserve              |        | 设置连接状态观察函数                                       |
| DialFunc                      |        | 自定义拨号器功能,会覆盖自定义拨号器                        |

示例代码：

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/network/standard"
)

func main() {
	c, err := client.NewClient(
		client.WithDialTimeout(1*time.Second),
		client.WithDialer(standard.NewDialer()),
		client.WithKeepAlive(true),
	)
	if err != nil {
		return
	}

	status, body, _ := c.Get(context.Background(), nil, "http://www.example.com")
	fmt.Printf("status=%v body=%v\n", status, string(body))
}
```

