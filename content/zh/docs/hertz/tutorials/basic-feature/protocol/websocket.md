---
title: "Websocket"
date: 2022-05-23
weight: 3
description: >

---
Hertz 提供了 WebSocket 的支持，参考 [gorilla/websocket](http://github.com/gorilla/websocket) 库使用`hijack`的方式在 Hertz 进行了适配，用法和参数基本保持一致。

用法示例：
```
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

