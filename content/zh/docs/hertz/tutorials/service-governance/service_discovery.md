---
title: "服务注册与发现"
date: 2022-08-14
weight: 3
description: >
---

目前在 Hertz 的开源版本支持的服务发现扩展都存放在[registry](https://github.com/hertz-contrib/registry) 中，欢迎大家参与项目贡献与维护。

## 使用方式

下面以 Nacos 注册中心为例，仅供参考，生产环境下可自行调整相关参数。

### 服务注册

- 使用 `server.WithRegistry` 设置注册扩展以及注册信息。
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

### 服务发现

- 使用内置的 `sd.Discovery` 中间件，支持传入自定义的服务发现扩展以及负载均衡扩展。
- 使用服务发现时需要将 Host 替换为服务名，并使用 `config.WithSD` 确定本次请求使用服务注册。

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
