---
title: "CORS"
date: 2022-05-21
weight: 1
description: >

---

The CORS (Cross-Origin Resource Sharing) mechanism allows a server to identify any origin other than its own so that browsers can access and load those resources.
This mechanism is also used to check whether the server allows the browser to send a real request by sending a "precheck" request through the browser.
In the "precheck" request header, there are HTTP methods and headers that the real request will use.

Hertz provides [implementation](https://github.com/hertz-contrib/cors) of CORS middleware. The implementation here refers to GIN's [cors](https://github.com/gin-contrib/cors), and the usage method can be referred as well.

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
