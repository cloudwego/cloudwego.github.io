---
title: "Graceful Shutdown"
date: 2022-05-23
weight: 8
description: >

---

Hertz supports graceful shutdown, which is executed as follows：

1. Set the state of `engine` to `closed`
2. Sequential non-blocking trigger callback function `[]OnShutDown` (consistent with standard library net/http)
3. Shut down the signal listening of the network library
4. `Select` waits for the business coroutine to exit：
   1. For netpoll network library, turn on `ticker` with default 1s (set in netpoll, not changeable at the moment) and check if `active conn` (business handle exits and connection is not in blocking read state) is 0 at regular intervals; for go net network library, turn off listening and do not process the connection.
   2. Triggered by the context of `ExitWaitTime`, default 5s
5. Uniformly add `Connection:Close header` to request packets in the process of closing

If you want to modify the wait timeout, you can configure it with `server.WithExitWaitTime()`.

If you want to register the `hook` function, you can do so by getting the `Engine` and registering it:

```go
h.Engine.OnShutdown = append(h.Engine.OnShutdown, shutDownFunc)
```
