---
title: "http.Handler adaptor"
date: 2025-05-21
weight: 20
keywords: ["adaptor"]
description: ""
---

## Background

- We will deprecate the Hertz's native file system
- Provide an fs implementation that is both compatible and performs well, using the official net/http ecosystem.
- Reduce the implementation of a large number of extensions by expanding the hertz function through the official net/http ecosystem

## What is adaptor.HertzHandler

- You are allowed to directly convert your existing http.HandlerFunc method into a HertzHandler.
- You can directly use http.FileServer, embed.FS, and other official ecosystems
- You can even use this directly at Hertz github.com/gorilla/websocket

## Example

```go
package main

import (
  "embed"
  "net/http"

  "github.com/cloudwego/hertz/pkg/app/server"
  "github.com/cloudwego/hertz/pkg/common/adaptor"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
  h := server.Default()

  helloHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Hello hertz!"))
  })
  h.GET("/hello", adaptor.HertzHandler(helloHandler))

  staticFS := adaptor.HertzHandler(http.FileServer(http.FS(staticFiles)))
  h.GET("/static/*filepath", staticFS)
  h.HEAD("/static/*filepath", staticFS)
  h.Spin()
}
```
