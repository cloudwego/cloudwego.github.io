---
title: "跨源资源共享"
date: 2022-05-21
weight: 1
description: >

---

跨源资源共享（CORS）机制允许服务器标识除了它自己的其它 origin，使得浏览器可以访问加载这些资源；
该机制也用来检查服务器是否允许浏览器发送真实的请求，通过浏览器发送"预检"请求实现，在预检请求头部中有 HTTP 方法和真实请求会用到的头。

hertz 提供 cors 跨域中间件的[实现](https://github.com/hertz-contrib/cors) ，这里的实现参考了 gin 的 cors，使用方法可参考 gin 的 [cors](https://github.com/gin-contrib/cors) 。


```go
package main

import (
   "time"

	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/hertz-contrib/cors"
)

func main() {
	h := server.Default()
   // CORS for https://foo.com and https://github.com origins, allowing:
   // - PUT and PATCH methods
   // - Origin header
   // - Credentials share
   // - Preflight requests cached for 12 hours
   h.Use(cors.New(cors.Config{
      AllowOrigins:     []string{"https://foo.com"},
      AllowMethods:     []string{"PUT", "PATCH"},
      AllowHeaders:     []string{"Origin"},
      ExposeHeaders:    []string{"Content-Length"},
      AllowCredentials: true,
      AllowOriginFunc: func(origin string) bool {
         return origin == "https://github.com"
      },
      MaxAge: 12 * time.Hour,
   }))
   h.Spin()
}
```
