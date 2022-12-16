---
title: "Websocket"
date:  2022-09-13
weight: 3
description: >

---
WebSocket 是一种可以在单个 TCP 连接上进行全双工通信，位于 OSI 模型的应用层。WebSocket 使得客户端和服务器之间的数据交换变得更加简单，允许服务端主动向客户端推送数据。在 WebSocket API 中，浏览器和服务器只需要完成一次握手，两者之间就可以创建持久性的连接，并进行双向数据传输。

Hertz 提供了 WebSocket 的支持，参考 [gorilla/websocket](http://github.com/gorilla/websocket) 库使用`hijack`的方式在 Hertz 进行了适配，用法和参数基本保持一致。

用法示例：
```go
package main

import (
	"context"
	"log"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/hertz-contrib/websocket"
)

var upgrader = websocket.HertzUpgrader{} // use default options

func echo(_ context.Context, c *app.RequestContext) {
	err := upgrader.Upgrade(c, func(conn *websocket.Conn) {
		for {
			mt, message, err := conn.ReadMessage()
			if err != nil {
				log.Println("read:", err)
				break
			}
			log.Printf("recv: %s", message)
			err = conn.WriteMessage(mt, message)
			if err != nil {
				log.Println("write:", err)
				break
			}
		}
	})
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
}


func main() {
	h := server.Default(server.WithHostPorts(addr))
	// https://github.com/cloudwego/hertz/issues/121
	h.NoHijackConnPool = true
	h.GET("/echo", echo)
	h.Spin()
}

```
更多用法示例详见 [hertz-contrib/websocket](https://github.com/hertz-contrib/websocket)。

