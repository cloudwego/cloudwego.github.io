---
title: "注意事项"
linkTitle: "注意事项"
weight: 3
description: >
---

## 错误设置 NumLoops

如果你的服务器运行在物理机上，Go 进程创建的 P 个数就等于机器的 CPU 核心数。 但是 Server 可能不会使用这么多核心。在这种情况下，过多的 poller 会导致性能下降。

这里提供了以下几种解决方案：

1. 使用 `taskset` 命令来限制 CPU 个数，例如：

```shell
taskset -c 0-3 $run_your_server
```

2. 主动设置 P 的个数，例如：

```go
package main

import (
	"runtime"
)

func init() {
	runtime.GOMAXPROCS(num_you_want)
}
```

3. 主动设置 poller 的个数，例如：

```go
package main

import (
	"github.com/cloudwego/netpoll"
)

func init() {
	netpoll.SetNumLoops(num_you_want)
}
```
