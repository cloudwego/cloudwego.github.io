---
title: "Engine"
date: 2022-09-24
weight: 2
description: >
---

## 简介

Hertz 的路由、中间件的注册，服务启动，退出等重要方法都是包含在 `server.Hertz` 这个**核心**类型之中的。
它由 `route.Engine` 以及 `signalWaiter` 组成。

```go
// Hertz is the core struct of hertz.
type Hertz struct {
    *route.Engine
    signalWaiter func(err chan error) error
}
```

## 配置服务器

Hertz 在 `server` 包中提供了 `New` 和 `Default` 函数用于初始化服务器。

`Default` 默认使用了 `Recovery` 中间件以保证服务在运行时不会因为 `panic` 导致服务崩溃。

```go
// New creates a hertz instance without any default config.
func New(opts ...config.Option) *Hertz {
	options := config.NewOptions(opts)
	h := &Hertz{Engine: route.NewEngine(options)}
	return h
}

// Default creates a hertz instance with default middlewares.
func Default(opts ...config.Option) *Hertz {
	h := New(opts...)
	// 在 New 的基础上使用了内置的 Recovery 中间件
	h.Use(recovery.Recovery())
	return h
}
```
若想详细的了解可选的配置项, 可以在 [server/option.go](https://github.com/cloudwego/hertz/blob/develop/pkg/app/server/option.go) 中进行查看。

示例代码

```go
package main

// ...

func main() {
	h := server.New()
	// 使用 Default
	h := server.Default()
}
```

## 注册中间件

Hertz 提供 `Use` 函数用于将中间件注册进入路由。

我们支持用户自定义中间件，与此同时我们也提供了一些常用的中间件实现, 详情见[仓库](https://github.com/hertz-contrib)

`Use` 函数中 `middleware`变量必须为 `app.HandlerFunc` 的 http 处理函数。

函数签名:
```go
func (engine *Engine) Use(middleware ...app.HandlerFunc) IRoutes
```

示例代码
```go
package main

// ...

func main(){
    h := server.New()
	// 将内置的 Recovery 中间件注册进入路由
	h.Use(recovery.Recovery())
	// 使用自定义的中间件
	h.Use(exampleMiddleware())
}

func exampleMiddleware() app.handlerFunc {
	return func(ctx context.Context, c *app.RequestContext) {
		// 在 Next 中的函数执行之前打印日志
		hlog.Info("print before...")
		// 使用 Next 使得路由匹配的函数执行
		c.Next(ctx)
		// 在 Next 中的函数执行之后打印日志
		hlog.Ingo("print after...")
    }
}
```

## 服务启动

`Hertz` 提供了 `Spin` 和 `Run` 函数用于启动服务器。 但是除非有**特殊**需求，不然一般使用 `Spin` 函数。

在使用[服务注册发现](../service-governance/service_discovery.md)的功能时, `Spin` 会在服务启动时将服务注册进入注册中心，并使用 `signalWaiter` 监测服务异常。
只有使用 `Spin` 来启动服务才能支持[优雅退出](graceful-shutdown.md)的特性。

示例代码

```go
package main

// ...

func main(){
    h := server.New()
    // 我们通常推荐使用 Spin
    h.Spin()
    // 使用 Run 函数启动
    if err := h.Run(); err != nil {
		// ...
    }
}
```

## 服务注销

hertz 提供 `Shutdown` 函数用于进行优雅退出。

若是使用了[服务注册与发现](../service-governance/service_discovery.md)的能力, 服务注销发生时也会从注册中心下线相应数据。

函数签名:
```go
func (engine *Engine) Shutdown(ctx context.Context) (err error)
```

示例代码:

```go
package main

// ...

func main() {
	h := server.New()
	// 在访问该路径时, 会触发 shutdown 函数触发下线
    h.GET("/shutdown", func(ctx context.Context, c *app.RequestContext) {
		h.ShutDown(ctx)
    })
	h.Spin()
}
```
