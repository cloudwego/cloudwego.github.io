---
title: "Service Registration and Service Discovery"
date: 2022-08-14
weight: 3
description: >
---

The service discovery extensions currently supported in the open source version of Hertz are stored in the [registry](https://github.com/hertz-contrib/registry). You are welcomed to join us in contributing and maintaining for this project.

## Usage

The implementation of the Nacos registry is used as an example for reference. You can adjust the relevant parameters by yourself in the production environment.

### Service Registration

- Use `server.WithRegistry` to set up registration extensions and registration information.
```go
import (
	//...
	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/app/server/registry"
	"github.com/cloudwego/hertz/pkg/common/utils"
	//...
)

func main(){
    // ....
    r := nacos_demo.NewNacosRegistry(cli)
    h := server.Default(
    	server.WithHostPorts(addr),
    	server.WithRegistry(r, &registry.Info{
    		ServiceName: "hertz.test.demo",
    		Addr:        utils.NewNetAddr("tcp", addr),
    		Weight:      10,
    		Tags:        nil,
    	}))
    h.GET("/ping", func(c context.Context, ctx *app.RequestContext) {
    	ctx.JSON(consts.StatusOK, utils.H{"ping": "pong1"})
    })
    h.Spin()
}
```

### Service Discovery

- Use the `sd.Discovery` built-in middleware to support incoming custom service discovery extensions as well as load balance extensions.
- When using service discovery, replace Host with the service name and use `config.WithSD` to confirm that this request uses service registration.

```go
import (
    "github.com/cloudwego/hertz/pkg/app/client"
    "github.com/cloudwego/hertz/pkg/app/middlewares/client/sd"
    "github.com/cloudwego/hertz/pkg/common/config"
    "github.com/cloudwego/hertz/pkg/common/hlog"
)

func main(){
    cli, err := client.NewClient()
    if err != nil {
        panic(err)
    }
    r := nacos_demo.NewNacosResolver()
    cli.Use(sd.Discovery(r))
    for i := 0; i < 10; i++ {
        status, body, err := cli.Get(context.Background(), nil, "http://hertz.test.demo/ping", config.WithSD(true))
        if err != nil {
            hlog.Fatal(err)
        }
        hlog.Infof("code=%d,body=%s", status, string(body))
    }
}

```
