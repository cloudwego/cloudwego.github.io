---
title: "redis"
date: 2023-04-22
weight: 9
keywords: ["Service Registration and Discovery", "redis"]
description: "Service Registration and Discovery redis Extensions provided by Hertz."
---

## Install

```go
go get github.com/hertz-contrib/registry/redis
```

## Service Registry

### Option

The Redis extension provides option configuration in the service registry section.

#### WithExpireTime

The Redis extension provides the `WithExpireTime` to set the expiration time (in seconds) for the key storing service information. The default is 60 seconds.

**NOTE: Expiration time must be greater than refresh interval.**

Function signature:

```go
func WithExpireTime(time int) Option
```

Sample code:

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithExpireTime(10))
    // ...
    h := server.Default(
    server.WithHostPorts(addr),
    server.WithRegistry(r, &registry.Info{
        ServiceName: "hertz.test.demo",
        Addr:        utils.NewNetAddr("tcp", addr),
        Weight:      10,
        Tags:        nil,
    }),
    )
    // ...
}
```

#### WithRefreshInterval

The Redis extension provides the `WithRefreshInterval` to set the expiration time refresh interval (in seconds) for the key storing service information. The default is 30 seconds.

**NOTE: Refresh interval must be less than expiration time.**

Function signature:

```go
func WithRefreshInterval(interval int) Option
```

Sample code:

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithRereshInterval(5))
    // ...
    h := server.Default(
    server.WithHostPorts(addr),
    server.WithRegistry(r, &registry.Info{
        ServiceName: "hertz.test.demo",
        Addr:        utils.NewNetAddr("tcp", addr),
        Weight:      10,
        Tags:        nil,
    }),
    )
    // ...
}
```

#### WithPassword

The Redis extension provides `WithPassword` to configure the redis password, which must match the password specified in the server configuration options. Default to empty.

Function signature:

```go
func WithPassword(password string) Option
```

Sample code:

```go
func main() {
	r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithPassword("123456"))
	// ...
	h := server.Default(
		server.WithHostPorts(addr),
		server.WithRegistry(r, &registry.Info{
			ServiceName: "hertz.test.demo",
			Addr:        utils.NewNetAddr("tcp", addr),
			Weight:      10,
			Tags:        nil,
		}),
	)
	// ...
}
```

#### WithDB

The Redis extension provides `WithDB` to configure the database to choose after connecting to the server. Default to 0.

Function signature:

```go
func WithDB(db int) Option
```

Sample code:

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDB(1))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithTLSConfig

The Redis extension provides `WithTLSConfig` configuration items for configuring TLS.

Function signature:

```go
func WithTLSConfig(t *tls.Config) Option
```

Sample code:

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithTLSConfig(&tls.Config{
    // ...
    }))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithDialer

The Redis extension provides `WithDialer` to configure Dialer, Dialer will create a new network connection and take precedence over Network and Addr options.

Function signature:

```go
func WithDialer(dialer func(ctx context.Context, network, addr string) (net.Conn, error)) Option
```

Sample code:

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDialer(
    // ...
    ))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithReadTimeout

The Redis extension provides `WithReadTimeout` to configure the read socket timeout time, the default is 3 seconds.

Function signature:

```go
func WithReadTimeout(t time.Duration) Option
```

Sample code:

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithReadTimeout(5*time.Second))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

#### WithWriteTimeout

The Redis extension provides `WithWriteTimeout` to configure the write socket timeout time, the default is equivalent to `ReadTimeout`.

Function signature:

```go
func WithWriteTimeout(t time.Duration) Option
```

Sample code:

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithWriteTimeout(5*time.Second))
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

### NewRedisRegistry

`NewRedisRegistry` uses redis to create a new service registry and needs to pass in the target address. You can customize the client configuration and pass in `NewClient` to create a new client.

Function signature:

```go
func NewRedisRegistry(addr string, opts...Option) registry.Registry
```

Sample code:

```go
func main() {
    r := redis.NewRedisRegistry("127.0.0.1:6379")
    // ...
    h := server.Default(
        server.WithHostPorts(addr),
        server.WithRegistry(r, &registry.Info{
            ServiceName: "hertz.test.demo",
            Addr:        utils.NewNetAddr("tcp", addr),
            Weight:      10,
            Tags:        nil,
        }),
    )
    // ...
}
```

## Service Discovery

### Option

Redis extension provides option configuration in the service discovery section.

#### WithPassword

The Redis extension provides `WithPassword` to configure the redis password, which must match the password specified in the server configuration options. Default to empty.

Function signature:

```go
func WithPassword(password string) Option
```

Sample code:

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithPassword("123456"))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithDB

The Redis extension provides `WithDB` to configure the database to choose after connecting to the server. Default to 0.

Function signature:

```go
func WithDB(db int) Option
```

Sample code:

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithDB(1))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithTLSConfig

The Redis extension provides `WithTLSConfig` configuration items for configuring TLS.

Function signature:

```go
func WithTLSConfig(t *tls.Config) Option
```

Sample code:

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379", redis.WithTLSConfig(&tls.Config{
    // ...
    }))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithDialer

The Redis extension provides `WithDialer` to configure Dialer, Dialer will create a new network connection and take precedence over Network and Addr options.

Function signature:

```go
func WithDialer(dialer func(ctx context.Context, network, addr string) (net.Conn, error)) Option
```

Sample code:

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithDialer(
    // ...
    ))
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithReadTimeout

The Redis extension provides `WithReadTimeout` to configure the read socket timeout time, the default is 3 seconds.

Function signature:

```go
func WithReadTimeout(t time.Duration) Option
```

Sample code:

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithReadTimeout(5*time.Second))
    // ...
    cli.Use(sd.Discovery(r))
    // ...
}
```

#### WithWriteTimeout

The Redis extension provides `WithWriteTimeout` to configure the write socket timeout time, the default is equivalent to `ReadTimeout`.

Function signature:

```go
func WithWriteTimeout(t time.Duration) Option
```

Sample code:

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisRegistry("127.0.0.1:6379", redis.WithWriteTimeout(5*time.Second))
    // ...
    cli.Use(sd.Discovery(r))
    // ...
}
```

### NewRedisResolver

`NewRedisResolver` uses redis to create a new service discovery center, and needs to pass in the target address. You can customize the client configuration and pass in `NewClient` to create a new client.

Function signature:

```go
func NewRedisResolver(addr string, opts ...Option) discovery.Resolver
```

Sample code:

```go
func main() {
    cli, err := client.NewClient()
    // ...
    r := redis.NewRedisResolver("127.0.0.1:6379")
    cli.Use(sd.Discovery(r))
    // ...
}
```

## How to use

### Server

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/app/server/registry"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/hertz-contrib/registry/redis"
)

func main() {
	r := redis.NewRedisRegistry("127.0.0.1:6379")
	addr := "127.0.0.1:8888"
	h := server.Default(
		server.WithHostPorts(addr),
		server.WithRegistry(r, &registry.Info{
			ServiceName: "hertz.test.demo",
			Addr:        utils.NewNetAddr("tcp", addr),
			Weight:      10,
			Tags:        nil,
		}),
	)
	h.GET("/ping", func(_ context.Context, ctx *app.RequestContext) {
		ctx.JSON(consts.StatusOK, utils.H{"ping": "pong"})
	})
	h.Spin()
}
```

### Client

```go
package main

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app/client"
	"github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
	"github.com/cloudwego/hertz/pkg/common/config"
	"github.com/cloudwego/hertz/pkg/common/hlog"
	"github.com/hertz-contrib/registry/redis"
)

func main() {
	cli, err := client.NewClient()
	if err != nil {
		panic(err)
	}
	r := redis.NewRedisResolver("127.0.0.1:6379")
	cli.Use(sd.Discovery(r))
	for i := 0; i < 10; i++ {
		status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
		if err != nil {
			hlog.Fatal(err)
		}
		hlog.Infof("HERTZ: code=%d, body=%s", status, string(body))
	}
}
```

## Configuration

You can customize the configuration of redis client and server, refer to [go-redis](https://github.com/go-redis/redis) configuration.

## Complete Example

For more, see [example](https://github.com/hertz-contrib/registry/tree/main/redis/example).
