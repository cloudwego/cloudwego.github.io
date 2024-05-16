---
title: "Cache"
date: 2023-02-25
weight: 15
keywords: ["HTTP Response", "Cache"]
description: "Hertz provides the adaptation of cache, supporting multi-backend."
---

cache is a middleware for caching HTTP Responses, which helps to improve the concurrent access capacity of the Server. Hertz also provides the [adaptation](https://github.com/hertz-contrib/cache) of cache, supporting multi-backend, referring to [gin-cache](https://github.com/chenyahui/gin-cache).

## Install

```shell
go get github.com/hertz-contrib/cache
```

## Import

```shell
import "github.com/hertz-contrib/cache"
```

## Example

- memory

```go
func main() {
    h := server.New()
    // sets the global TTL value for items in the cache, which can be overridden at the item level
    memoryStore := persist.NewMemoryStore(1 * time.Minute)
    // sets the TTL value for URI-based items in the cache
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

## Initialization

`cache` provides three ways of initialization.

### NewCacheByRequestURI

NewCacheByRequestURI is used to create middleware that caches response results with URI as the key.

Function Signature:

```go
func NewCacheByRequestURI(defaultCacheStore persist.CacheStore, defaultExpire time.Duration, opts ...Option) app.HandlerFunc
```

Sample Code:

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

NewCacheByRequestPath is used to create middleware that caches response results with URL as the key, discarding the query parameter.

Function Signature:

```go
func NewCacheByRequestPath(defaultCacheStore persist.CacheStore, defaultExpire time.Duration, opts ...Option) app.HandlerFunc
```

Sample Code:

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

NewCache is used to create middleware for custom cache logic, and the cache key must be declared manually (required in conjunction with `WithCacheStrategyByRequest`).

Function Signature:

```go
func NewCache(
    defaultCacheStore persist.CacheStore,
    defaultExpire time.Duration,
    opts ...Option,
) app.HandlerFunc
```

Sample Code:

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

Create caching middleware that uses URIs as keys and ignores the order of query parameters

Function Signature:

```go
func NewCacheByRequestURIWithIgnoreQueryOrder(defaultCacheStore persist.CacheStore, defaultExpire time.Duration, opts ...Option) app.HandlerFunc
```

Sample Code:

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

## Configuration

### Generic Configuration

| Configuration                 | Default | Description                                                                                  |
| :---------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| WithOnHitCache                | nil     | Used to set the callback function after a cache hits                                         |
| WithOnMissCache               | nil     | Used to set the callback function for cache misses                                           |
| WithBeforeReplyWithCache      | nil     | Used to set the callback function before returning the cached response                       |
| WithOnShareSingleFlight       | nil     | Used to set the callback function when the result of a SingleFlight is shared by the request |
| WithSingleFlightForgetTimeout | 0       | Used to set the timeout for SingleFlight                                                     |
| WithPrefixKey                 | ""      | Used to set the prefix of the cache response key                                             |
| WithoutHeader                 | false   | Used to set whether response headers need to be cached                                       |
| WithCacheStrategyByRequest    | nil     | Used to set custom caching policies                                                          |

### WithCacheStrategyByRequest

Customize the cache policy by using `WithCacheStrategyByRequest`, including the cache key, storage medium, and expiration time.

This configuration assumes that the `cache` middleware is initialized via the `cache.NewCache` method.

Function Signature:

```go
func WithCacheStrategyByRequest(getGetCacheStrategyByRequest GetCacheStrategyByRequest) Option
```

Sample Code:

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

Set the callback function for cache hits by using `WithOnHitCache`.

Set the callback function for cache misses by using `WithOnMissCache`.

Function Signature:

```go
func WithOnHitCache(cb OnHitCacheCallback) Option

func WithOnMissCache(cb OnMissCacheCallback) Option
```

Sample Code:

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

Set the callback function before returning the cached response by using `WithBeforeReplyWithCache`.

Function Signature:

```go
func WithBeforeReplyWithCache(cb BeforeReplyWithCacheCallback) Option
```

Sample Code:

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

Set the callback function when a SingleFlight result is requested to be shared by using `WithOnShareSingleFlight`.

Set the timeout for SingleFlight by using `WithSingleFlightForgetTimeout`.

Function Signature:

```go
func WithOnShareSingleFlight(cb OnShareSingleFlightCallback) Option

func WithSingleFlightForgetTimeout(forgetTimeout time.Duration) Option
```

Sample Code:

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

Set the prefix of the response key by using `WithPrefixKey`.

Function Signature:

```go
func WithPrefixKey(prefix string) Option
```

Sample Code:

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

Set whether the response header should be cached by using `WithoutHeader`, or cache the response header if it is false.

Function Signature:

```go
func WithoutHeader(b bool) Option
```

Sample Code:

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

## Full Example

Refer to the [cache/example](https://github.com/hertz-contrib/cache/tree/main/example) for full usage examples.
