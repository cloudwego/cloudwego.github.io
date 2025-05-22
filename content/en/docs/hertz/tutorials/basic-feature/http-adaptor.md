---
title: "http.Handler adaptor"
date: 2025-05-21
weight: 20
keywords: ["adaptor"]
description: ""
---

## Background

- Phasing out the poorly maintained hertz app.FS implementation
- Providing a compatible and performant fs implementation through the official net/http ecosystem
- Extending hertz functionality through the official net/http ecosystem to reduce custom implementations

## What is adaptor.HertzHandler

- Allows you to convert existing http.HandlerFunc methods directly to HertzHandler
- Enables direct use of standard library methods like http.FileServer and embed.FS
- Even allows direct use of github.com/gorilla/websocket in Hertz

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
