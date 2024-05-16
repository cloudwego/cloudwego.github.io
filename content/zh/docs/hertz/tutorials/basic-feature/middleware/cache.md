---
title: "Cache"
date: 2023-02-25
weight: 15
keywords: ["HTTP 响应", "缓存"]
description: "Hertz 提供了对 cache 的适配，支持 multi-backend。"
---

cache 是一个用于缓存 HTTP 响应的中间件，开启后有助于提高服务器的并发访问能力。Hertz 也提供了对 cache 的 [适配](https://github.com/hertz-contrib/cache)，支持 multi-backend，参考了 [gin-cache](https://github.com/chenyahui/gin-cache) 的实现。

## 安装

```shell
go get github.com/hertz-contrib/cache
```

## 导入

```shell
import "github.com/hertz-contrib/cache"
```

## 示例代码

- memory

```go
func main() {
    h := server.New()
    // 设置全局的缓存过期时间（会被更细粒度的设置覆盖）
    memoryStore := persist.NewMemoryStore(1 * time.Minute)
    // 设置针对以 URI 为 Key 的缓存过期时间
    h.Use(cache.NewCacheByRequestURI(memoryStore, 2*time.Second))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

- redis

```go
func main() {
    h := server.New()

    redisStore := persist.NewRedisStore(redis.NewClient(&redis.Options{
        Network: "tcp",
        Addr:    "127.0.0.1:6379",
    }))

    h.Use(cache.NewCacheByRequestURI(redisStore, 2*time.Second))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

## 初始化

`cache` 中间件提供了三种初始化的方式。

### NewCacheByRequestURI

用于创建以 URI 为 Key 的缓存响应结果的中间件。

函数签名：

```go
func NewCacheByRequestURI(defaultCacheStore persist.CacheStore, defaultExpire time.Duration, opts ...Option) app.HandlerFunc
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCacheByRequestURI(memoryStore, 2*time.Second))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })
    h.Spin()
}
```

### NewCacheByRequestPath

用于创建以 URL 为 Key 的缓存响应结果的中间件，丢弃 query 参数。

函数签名：

```go
func NewCacheByRequestPath(defaultCacheStore persist.CacheStore, defaultExpire time.Duration, opts ...Option) app.HandlerFunc
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCacheByRequestPath(memoryStore, 2*time.Second))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })
    h.Spin()
}
```

### NewCache

用于创建自定义缓存逻辑的中间件，必须手动声明缓存的 Key（需要使用 `WithCacheStrategyByRequest` 配置参数）。

函数签名：

```go
func NewCache(
    defaultCacheStore persist.CacheStore,
    defaultExpire time.Duration,
    opts ...Option,
) app.HandlerFunc
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCache(
        memoryStore,
        2*time.Second,
        cache.WithCacheStrategyByRequest(func(ctx context.Context, c *app.RequestContext) (bool, cache.Strategy) {
            return true, cache.Strategy{
                CacheKey: c.Request.URI().String(),
            }
        }),
    ))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

### NewCacheByRequestURIWithIgnoreQueryOrder

创建使用 URI 作为 key 并忽略查询参数顺序的缓存中间件

函数签名

```go
func NewCacheByRequestURIWithIgnoreQueryOrder(defaultCacheStore persist.CacheStore, defaultExpire time.Duration, opts ...Option) app.HandlerFunc
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCacheByRequestURIWithIgnoreQueryOrder(
        memoryStore,
        2*time.Second,
        cache.WithCacheStrategyByRequest(func(ctx context.Context, c *app.RequestContext) (bool, cache.Strategy) {
            return true, cache.Strategy{
                CacheKey: c.Request.URI().String(),
            }
        }),
    ))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

## 配置

| 配置                          | 默认值 | 介绍                                                                                         |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| WithOnHitCache                | nil    | 用于设置缓存命中的回调函数                                                                   |
| WithOnMissCache               | nil    | 用于设置缓存未命中的回调函数                                                                 |
| WithBeforeReplyWithCache      | nil    | 用于设置返回缓存响应前的回调函数                                                             |
| WithOnShareSingleFlight       | nil    | 用于设置请求共享 SingleFlight 结果时的回调函数                                               |
| WithSingleFlightForgetTimeout | 0      | 设置 SingleFlight 的超时时间，以控制并发操作的行为，确保请求在一定时间内被处理或者超时被取消 |
| WithPrefixKey                 | ""     | 用于设置缓存响应 Key 的前缀                                                                  |
| WithoutHeader                 | false  | 用于设置是否需要缓存响应头                                                                   |
| WithCacheStrategyByRequest    | nil    | 用于设置自定义的缓存策略                                                                     |

### WithCacheStrategyByRequest

通过使用 `WithCacheStrategyByRequest` 自定义缓存策略，包括缓存的 Key、存储介质，以及过期时间。

该配置生效的前提是，通过 `cache.NewCache` 方法初始化 `cache` 中间件。

函数签名：

```go
func WithCacheStrategyByRequest(getGetCacheStrategyByRequest GetCacheStrategyByRequest) Option
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCache(
        memoryStore,
        2*time.Second,
        cache.WithCacheStrategyByRequest(func(ctx context.Context, c *app.RequestContext) (bool, cache.Strategy) {
            return true, cache.Strategy{
                CacheKey: c.Request.URI().String(),
            }
        }),
    ))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

### WithOnHitCache & WithOnMissCache

通过使用 `WithOnHitCache` 设置缓存命中的回调函数。

通过使用 `WithOnMissCache` 设置缓存未命中的回调函数。

函数签名：

```go
func WithOnHitCache(cb OnHitCacheCallback) Option

func WithOnMissCache(cb OnMissCacheCallback) Option
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    var cacheHitCount, cacheMissCount int32

    h.Use(cache.NewCacheByRequestURI(
        memoryStore,
        2*time.Second,
        cache.WithOnHitCache(func(ctx context.Context, c *app.RequestContext) {
            atomic.AddInt32(&cacheHitCount, 1)
        }),
        cache.WithOnMissCache(func(ctx context.Context, c *app.RequestContext) {
            atomic.AddInt32(&cacheMissCount, 1)
        }),
    ))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })
    h.GET("/get_hit_count", func(ctx context.Context, c *app.RequestContext) {
        c.String(200, fmt.Sprintf("total hit count: %d", cacheHitCount))
    })
    h.GET("/get_miss_count", func(ctx context.Context, c *app.RequestContext) {
        c.String(200, fmt.Sprintf("total miss count: %d", cacheMissCount))
    })

    h.Spin()
}
```

### WithBeforeReplyWithCache

通过使用 `WithBeforeReplyWithCache` 设置返回缓存响应前的回调函数。

函数签名：

```go
func WithBeforeReplyWithCache(cb BeforeReplyWithCacheCallback) Option
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCacheByRequestURI(
        memoryStore,
        2*time.Second,
        cache.WithBeforeReplyWithCache(func(c *app.RequestContext, cache *cache.ResponseCache) {
            cache.Data = append([]byte{'p', 'r', 'e', 'f', 'i', 'x', '-'}, cache.Data...)
        }),
    ))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

### WithOnShareSingleFlight & WithSingleFlightForgetTimeout

通过使用 `WithOnShareSingleFlight` 设置请求共享 SingleFlight 结果时的回调函数。

通过使用 `WithSingleFlightForgetTimeout` 设置 SingleFlight 的超时时间。

函数签名：

```go
func WithOnShareSingleFlight(cb OnShareSingleFlightCallback) Option

func WithSingleFlightForgetTimeout(forgetTimeout time.Duration) Option
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCacheByRequestPath(
        memoryStore,
        10*time.Second,
        cache.WithOnShareSingleFlight(func(ctx context.Context, c *app.RequestContext) {
            hlog.Info("share the singleFlight result " + string(c.Response.Body()))
        }),
        cache.WithSingleFlightForgetTimeout(1*time.Second),
    ))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        time.Sleep(3 * time.Second)
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

### WithPrefixKey

通过使用 `WithPrefixKey` 设置响应 Key 的前缀。

函数签名：

```go
func WithPrefixKey(prefix string) Option
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCache(
        memoryStore,
        60*time.Second,
        cache.WithPrefixKey("prefix-"),
        cache.WithOnHitCache(func(c context.Context, ctx *app.RequestContext) {
            resp := &cache.ResponseCache{}
            memoryStore.Get(c, "prefix-test", &resp)
            hlog.Info("data = " + string(resp.Data))
        }),
        cache.WithCacheStrategyByRequest(func(ctx context.Context, c *app.RequestContext) (bool, cache.Strategy) {
            return true, cache.Strategy{
                CacheKey: "test",
            }
        }),
    ))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

### WithoutHeader

通过使用 `WithoutHeader` 设置是否需要缓存响应头，为 false 则缓存响应头。

函数签名：

```go
func WithoutHeader(b bool) Option
```

示例代码：

```go
func main() {
    h := server.New()

    memoryStore := persist.NewMemoryStore(1 * time.Minute)

    h.Use(cache.NewCache(
        memoryStore,
        60*time.Second,
        cache.WithoutHeader(true),
        cache.WithCacheStrategyByRequest(func(ctx context.Context, c *app.RequestContext) (bool, cache.Strategy) {
            return true, cache.Strategy{
                CacheKey: "test-key",
            }
        }),
        cache.WithOnHitCache(func(c context.Context, ctx *app.RequestContext) {
            resp := &cache.ResponseCache{}
            memoryStore.Get(c, "test-key", &resp)
            hlog.Info("header = " + string(resp.Header.Get("head")))
            hlog.Info("data = " + string(resp.Data))
        }),
    ))
    h.GET("/hello", func(ctx context.Context, c *app.RequestContext) {
        c.String(http.StatusOK, "hello world")
    })

    h.Spin()
}
```

## 完整示例

完整用法示例详见 [cache/example](https://github.com/hertz-contrib/cache/tree/main/example)
