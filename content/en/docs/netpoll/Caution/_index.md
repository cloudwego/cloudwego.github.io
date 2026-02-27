---
title: "Caution"
linkTitle: "Caution"
weight: 4
description: >
---

## Wrong setting of NumLoops

If your server is running on a physical machine, the number of P created by the Go process is equal to the number of
CPUs of the machine. But the server may not use so many cores. In this case, too many pollers will cause performance
degradation.

There are several solutions:

1. Use the `taskset` command to limit CPU usage, such as:

```shell
taskset -c 0-3 $run_your_server
```

2. Actively set the number of P, for instance:

```go
package main

import (
	"runtime"
)

func init() {
	runtime.GOMAXPROCS(num_you_want)
}
```

3. Actively set the number of pollers, e.g:

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func init() {
	netpoll.SetNumLoops(num_you_want)
}
```
