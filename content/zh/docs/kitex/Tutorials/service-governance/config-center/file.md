---
title: "file"
linkTitle: "file"
date: 2023-12-18
weight: 5
keywords: ["配置中心扩展","file"]
description: "使用 本地文件 作为 Kitex 的服务治理配置中心"

---
## 支持文件类型

| json | yaml |
| ---  | --- |
| &#10004; | &#10004; |

## 安装

`go get github.com/kitex-contrib/config-file`

## Suite
本地文件 的配置中心适配器，kitex 通过 `WithSuite` 将 本地文件 中的配置转换为 kitex 的治理特性配置。

使用方法可以分为两个步骤

1. 创建文件监听器（FileWatcher）
2. 使用 `WithSuite` 引入配置监听

### Server

```go
type FileConfigServerSuite struct {
	watcher monitor.ConfigMonitor
}
```

函数签名:

`func NewSuite(key string, watcher filewatcher.FileWatcher) *FileConfigServerSuite`

示例代码(或访问[此处](https://github.com/kitex-contrib/config-file/blob/main/example/server/main.go)):

```go
package main

import (
	"context"
	"log"

	"github.com/cloudwego/kitex-examples/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	"github.com/cloudwego/kitex/pkg/klog"
	"github.com/cloudwego/kitex/pkg/rpcinfo"
	kitexserver "github.com/cloudwego/kitex/server"
	"github.com/kitex-contrib/config-file/filewatcher"
	fileserver "github.com/kitex-contrib/config-file/server"
)

var _ api.Echo = &EchoImpl{}

const (
	filepath    = "kitex_server.json"
	key         = "ServiceName"
	serviceName = "ServiceName"
)

type EchoImpl struct{}

func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	klog.Info("echo called")
	return &api.Response{Message: req.Message}, nil
}

func main() {
	klog.SetLevel(klog.LevelDebug)

	// 创建一个文件监听器对象
	fw, err := filewatcher.NewFileWatcher(filepath)
	if err != nil {
		panic(err)
	}
	// 开始监听文件变化
	if err = fw.StartWatching(); err != nil {
		panic(err)
	}
	defer fw.StopWatching()

	svr := echo.NewServer(
		new(EchoImpl),
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
		server.WithSuite(fileserver.NewSuite(key, fw)), // 添加监听
	)
	if err := svr.Run(); err != nil {
		log.Println("server stopped with error:", err)
	} else {
		log.Println("server stopped")
	}
}
```

### Client
```go
type FileConfigClientSuite struct {
	watcher monitor.ConfigMonitor
	service string
}
```
函数签名:

`func NewSuite(service, key string, watcher filewatcher.FileWatcher) *FileConfigClientSuite`

示例代码(或访问[此处](https://github.com/kitex-contrib/config-file/blob/main/example/client/main.go)):

```go
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/cloudwego/kitex-examples/kitex_gen/api"
	"github.com/cloudwego/kitex-examples/kitex_gen/api/echo"
	kitexclient "github.com/cloudwego/kitex/client"
	"github.com/cloudwego/kitex/pkg/klog"
	fileclient "github.com/kitex-contrib/config-file/client"
	"github.com/kitex-contrib/config-file/filewatcher"
)

const (
	filepath    = "kitex_client.json"
	key         = "ClientName/ServiceName"
	serviceName = "ServiceName"
	clientName  = "ClientName"
)

func main() {
	klog.SetLevel(klog.LevelDebug)

	// 创建一个文件监听器对象
	fw, err := filewatcher.NewFileWatcher(filepath)
	if err != nil {
		panic(err)
	}
	// 开始监听文件变化
	if err = fw.StartWatching(); err != nil {
		panic(err)
	}

	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, os.Interrupt, os.Kill)
		<-sig
		fw.StopWatching()
		os.Exit(1)
	}()

	client, err := echo.NewClient(
		serviceName,
		kitexclient.WithHostPorts("0.0.0.0:8888"),
		kitexclient.WithSuite(fileclient.NewSuite(serviceName, key, fw)),
	)
	if err != nil {
		log.Fatal(err)
	}

	for {
		req := &api.Request{Message: "my request"}
		resp, err := client.Echo(context.Background(), req)
		if err != nil {
			klog.Errorf("take request error: %v", err)
		} else {
			klog.Infof("receive response %v", resp)
		}
		time.Sleep(time.Second * 10)
	}
}
```

## NewFileWatcher

创建本地文件监听器

函数签名:

`func NewFileWatcher(filePath string) (FileWatcher, error)`

示例代码:

```go
package main

import "github.com/kitex-contrib/config-file/filewatcher"

func main() {
	// 创建文件监听器对象
	fw, err := filewatcher.NewFileWatcher(filepath)
	if err != nil {
		panic(err)
	}
	// 启动文件监听（应当在引入 Suite 之前启动）
	if err = fw.StartWatching(); err != nil {
		panic(err)
	}

    // 程序退出时监听退出行为
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, os.Interrupt, os.Kill)
		<-sig
		fw.StopWatching()
		os.Exit(1)
	}()
}
```

在服务端（Server）中，由于 KitexServer 的特性，我们只需要定义`defer fw.StopWatching()`即可

## 配置
### 治理策略

在后续样例中，我们设定服务名称为 `ServiceName`，客户端名称为 `ClientName`。

#### 限流
Category=limit

> 限流目前只支持服务端，所以只需要设置服务端的 ServiceName。

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

|字段|说明|
|----|----|
|connection_limit|最大并发数量|
|qps_limit|每 100ms 内的最大请求数量|

样例:
```json
{
    "ServiceName": {
        "limit": {
            "connection_limit": 300,
            "qps_limit": 200
        }
    }
}
```

注：

- 限流配置的粒度是 Server 全局，不分 client、method
- 「未配置」或「取值为 0」表示不开启
- connection_limit 和 qps_limit 可以独立配置，例如 connection_limit = 100, qps_limit = 0
- 可以在一个 json 内编写多个服务的不同限流策略，只需要 filewatch 监控同一个文件，然后传入不同的 key 即可，如样例所示，key 即为`ServiceName`

#### 重试
Category=retry

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/retry/policy.go#L63)

|参数|说明|
|----|----|
|type| 0: failure_policy 1: backup_policy|
|failure_policy.backoff_policy| 可以设置的策略： `fixed` `none` `random` |

样例：

> key 为 ClientName/ServiceName

```json
{
    "ClientName/ServiceName": {
        "retry": {
            "*": {
                "enable": true,
                "type": 0,
                "failure_policy": {
                    "stop_policy": {
                        "max_retry_times": 3,
                        "max_duration_ms": 2000,
                        "cb_policy": {
                            "error_rate": 0.2
                        }
                    }
                }
            },
            "Echo": {
                "enable": true,
                "type": 1,
                "backup_policy": {
                    "retry_delay_ms": 200,
                    "stop_policy": {
                        "max_retry_times": 2,
                        "max_duration_ms": 1000,
                        "cb_policy": {
                            "error_rate": 0.3
                        }
                    }
                }
            }
        }
    }
}
```
注：retry.Container 内置支持用 * 通配符指定默认配置（详见 [getRetryer](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/retry/retryer.go#L240) 方法）

#### 超时
Category=rpc_timeout

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/rpctimeout/item_rpc_timeout.go#L42)

样例：

> key 为 ClientName/ServiceName

```json
{
    "ClientName/ServiceName": {
        "timeout": {
            "*": {
                "conn_timeout_ms": 100,
                "rpc_timeout_ms": 2000
            },
            "Pay": {
                "conn_timeout_ms": 50,
                "rpc_timeout_ms": 1000
            }
        },
    }
}
```

#### 熔断
Category=circuit_break

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/circuitbreak/item_circuit_breaker.go#L30)

|参数|说明|
|----|----|
|min_sample|最小的统计样本数|

样例：
echo 方法使用下面的配置（0.3、100），其他方法使用全局默认配置（0.5、200）

> key 为 ClientName/ServiceName

```json
{
    "ClientName/ServiceName": {
        "circuitbreaker": {
            "Echo": {
                "enable": true,
                "err_rate": 0.3,
                "min_sample": 100
            }
        },
    }
}
```
注：kitex 的熔断实现目前不支持修改全局默认配置（详见 [initServiceCB](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/circuitbreak/cbsuite.go#L195)）
#### 更多信息

更多示例请参考 [example](https://github.com/kitex-contrib/config-file/tree/main/example)

## 注意事项

### 客户端键名

对于单一客户端配置，您应该将它们的所有配置写入同一对`$UserServiceName/$ServerServiceName`中，例如

```json
{
    "ClientName/ServiceName": {
        "timeout": {
            "*": {
                "conn_timeout_ms": 100,
                "rpc_timeout_ms": 2000
            },
            "Pay": {
                "conn_timeout_ms": 50,
                "rpc_timeout_ms": 1000
            }
        },
        "circuitbreaker": {
            "Echo": {
                "enable": true,
                "err_rate": 0.3,
                "min_sample": 100
            }
        },
        "retry": {
            "*": {
                "enable": true,
                "type": 0,
                "failure_policy": {
                    "stop_policy": {
                        "max_retry_times": 3,
                        "max_duration_ms": 2000,
                        "cb_policy": {
                            "error_rate": 0.2
                        }
                    }
                }
            },
            "Echo": {
                "enable": true,
                "type": 1,
                "backup_policy": {
                    "retry_delay_ms": 200,
                    "stop_policy": {
                        "max_retry_times": 2,
                        "max_duration_ms": 1000,
                        "cb_policy": {
                            "error_rate": 0.3
                        }
                    }
                }
            }
        }
    }
}
```

### 兼容性
项目中使用了`sync/atomic`在 1.19 版本加入的新特性，因此Go 的版本必须 >= 1.19
