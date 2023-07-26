---
title: "Graceful Shutdown"
date: 2022-05-23
weight: 11
description: >

---

Hertz supports graceful shutdown, which is executed as follows：

1. Set the state of `engine` to `closed`
2. Sequential non-blocking trigger callback function `[]OnShutDown` (consistent with standard library net/http), `Select` waits them until wait timeout or finish
3. `Select` waits for the business coroutine to exit：
   1. For netpoll network library, turn on `ticker` with default 1s (set in netpoll, not changeable at the moment) and check if `active conn` (business handle exits and connection is not in blocking read state) is 0 at regular intervals; for go net network library, turn off listening and do not process the connection.
   2. Triggered by the context of `ExitWaitTime`, default 5s
4. Uniformly add `Connection:Close header` to request packets in the process of closing
5. Registration Center deregisters this service.
6. Shut down the signal listening of the network library

If you want to modify the wait timeout, you can configure it with `server.WithExitWaitTime()`.

If you want to register the `hook` function, you can do so by getting the `Engine` and registering it:

```go
h.Engine.OnShutdown = append(h.Engine.OnShutdown, shutDownFunc)
```

`waitSignal` is default implementation for signal waiter,which is executed as follows:

- SIGTERM triggers immediately close.
- SIGHUP|SIGINT triggers graceful shutdown.

If Default one is not met the requirement, `SetCustomSignalWaiter` set this function to customize.

```go
package main

import (
	"github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
	h := server.New()
	h.SetCustomSignalWaiter(func(err chan error) error {
		return nil
	})
	...
}

```

Hertz will exit immediately if f returns an error,otherwise it will exit gracefully.
