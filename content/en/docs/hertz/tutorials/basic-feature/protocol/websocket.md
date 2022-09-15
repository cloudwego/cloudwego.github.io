---
title: "Websocket"
date:  2022-09-13
weight: 3
description: >

---
WebSocket is a type of full-duplex communication that can be performed on a single TCP connection and is located at the application layer of the OSI model.
WebSocket makes data exchange between client and server easier, allowing the server to actively push data to the client.
In the WebSocket API, the browser and the server only need to complete a handshake that a persistent connection can be created between the two, and two-way data transmission can be performed.

Hertz provides support for WebSocket and adapts it in Hertz by referring to [gorilla/websocket](https://github.com/gorilla/websocket) using `hijack`.
The usage and parameters are basically the same.

For example:
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
For more examples: [hertz-contrib/websocket](https://github.com/hertz-contrib/websocket)。

