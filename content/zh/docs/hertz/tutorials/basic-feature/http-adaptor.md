---
title: "Hertz http.Handler adaptor"
date: 2025-05-21
weight: 12
keywords: ["adaptor"]
description: "Hertz http.Handler adaptor"
---

## 背景
- 主淘汰长期没有良好维护的 hertz 原生 fs 实现；
- 通过官方 net/http 生态提供一个兼容性较好，性能也不差的 fs 实现。
- 通过官方 net/http 生态扩展 hertz 功能，减少大量扩展实现

## 什么是 adaptor.HertzHandler
- 允许你将现有的 http.HandlerFunc 方法直接转为 HertzHandler
- 可以直接使用 http.FileServer embed.FS 等官方生态
- 甚至可以直接在 Hertz 使用 github.com/gorilla/websocket

## 具体例子
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
