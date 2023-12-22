---
title: "file"
linkTitle: "file"
date: 2023-12-18
weight: 5
keywords: ["ConfigCenter Extension","file"]
description: "Use local files as Kitex's service governance configuration center"

---
## Supported file type

| json | yaml |
| ---  | --- |
| &#10004; | &#10004; |

## Install

`go get github.com/kitex-contrib/config-file`

## Suite
Local file configuration center adapter, kitex converts the configuration in local files into governance feature configurations of kitex through `WithSuite`.

The usage can be divided into two steps:

1. Create a file watcher (FileWatcher).
2. Use `WithSuite` to introduce configuration monitoring.

### Server

```go
type FileConfigServerSuite struct {
	watcher monitor.ConfigMonitor
}
```

Function Signature:

`func NewSuite(key string, watcher filewatcher.FileWatcher) *FileConfigServerSuite`

Sample code(or visit [here](https://github.com/kitex-contrib/config-file/blob/main/example/server/main.go)):

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

// EchoImpl implements the last service interface defined in the IDL.
type EchoImpl struct{}

// Echo implements the Echo interface.
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
	klog.Info("echo called")
	return &api.Response{Message: req.Message}, nil
}

func main() {
	klog.SetLevel(klog.LevelDebug)

	// Create a filewatcher object.
	fw, err := filewatcher.NewFileWatcher(filepath)
	if err != nil {
		panic(err)
	}
	// Start monitoring file changes.
	if err = fw.StartWatching(); err != nil {
		panic(err)
	}
	defer fw.StopWatching()

	svr := echo.NewServer(
		new(EchoImpl),
		server.WithServerBasicInfo(&rpcinfo.EndpointBasicInfo{ServiceName: serviceName}),
		server.WithSuite(fileserver.NewSuite(key, fw)), // Add watcher
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
Function Signature:

`func NewSuite(service, key string, watcher filewatcher.FileWatcher) *FileConfigClientSuite`

Sample code(or visit [here](https://github.com/kitex-contrib/config-file/blob/main/example/client/main.go)):

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

	// Create a file watcher object.
	fw, err := filewatcher.NewFileWatcher(filepath)
	if err != nil {
		panic(err)
	}
	// Start monitoring file changes.
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

Create a local file watcher

Function Signature:

`func NewFileWatcher(filePath string) (FileWatcher, error)`

Sample code:

```go
package main

import "github.com/kitex-contrib/config-file/filewatcher"

func main() {
	// Create a filewatcher object.
	fw, err := filewatcher.NewFileWatcher(filepath)
	if err != nil {
		panic(err)
	}
	// Start file monitoring (should be started before importing the Suite).
	if err = fw.StartWatching(); err != nil {
		panic(err)
	}

    // Cancel watching when the program exits.
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, os.Interrupt, os.Kill)
		<-sig
		fw.StopWatching()
		os.Exit(1)
	}()
}
```

In the server-side (Server), due to the characteristics of KitexServer, we only need to define `defer fw.StopWatching()`

## Configuration

### Governance Policy

In subsequent examples, we set the service name to `ServiceName` and the client name to `ClientName`.

#### Rate Limit
Category=limit

> Currently, current limiting only supports the server side, so ClientServiceName is empty.

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/limiter/item_limiter.go#L33)

|Variable|Introduction|
|----|----|
|connection_limit| Maximum concurrent connections |
|qps_limit| Maximum request number every 100ms |

Example:
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

Note:

- The granularity of the current limit configuration is server global, regardless of client or method.
- Not configured or value is 0 means not enabled.
- connection_limit and qps_limit can be configured independently, e.g. connection_limit = 100, qps_limit = 0
- Multiple different rate limiting strategies for multiple services can be written within a single JSON file. Simply use filewatch to monitor the same file and pass in different keys. As shown in the example, the key is `ServiceName`

#### Retry Policy
Category=retry

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/retry/policy.go#L63)

|Variable|Introduction|
|----|----|
|type| 0: failure_policy 1: backup_policy|
|failure_policy.backoff_policy| Can only be set one of `fixed` `none` `random` |

Example：

> key is ClientName/ServiceName

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
Note: retry.Container has built-in support for specifying the default configuration using the `*` wildcard (see the [getRetryer](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/retry/retryer.go#L240) method for details).

#### RPC Timeout
Category=rpc_timeout

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/rpctimeout/item_rpc_timeout.go#L42)

Example：

> key is ClientName/ServiceName

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

#### Circuit Break
Category=circuit_break

[JSON Schema](https://github.com/cloudwego/kitex/blob/develop/pkg/circuitbreak/item_circuit_breaker.go#L30)

|Variable|Introduction|
|----|----|
|min_sample| Minimum statistical sample number|

The echo method uses the following configuration (0.3, 100) and other methods use the global default configuration (0.5, 200)

Example：

> key is ClientName/ServiceName

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

Note: The circuit breaker implementation of kitex does not currently support changing the global default configuration (see [initServiceCB](https://github.com/cloudwego/kitex/blob/v0.5.1/pkg/circuitbreak/cbsuite.go#L195) for details).
#### More Info

Refer to [example](https://github.com/kitex-contrib/config-file/tree/main/example) for more usage.

## Note

### Client/Server Key

For client configuration, you should write all their configurations in the same pair of `$UserServiceName/$ServerServiceName`, for example

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

### Compatibility

The project uses the new features of `sync/atomic` added in version 1.19, so the Go version must be >= 1.19
