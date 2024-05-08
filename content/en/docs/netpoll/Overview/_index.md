---
title: "Overview"
linkTitle: "Overview"
weight: 1
description: >
---

## Introduction

[Netpoll][Netpoll] is a high-performance non-blocking I/O networking framework, which focused on RPC scenarios, developed by [ByteDance][ByteDance].

RPC is usually heavy on processing logic and therefore cannot handle I/O serially.
But Go's standard library [net][net] is designed for blocking I/O APIs,
so that the RPC framework can only follow the One Conn One Goroutine design.
It will waste a lot of cost for context switching, due to a large number of goroutines under high concurrency.
Besides, [net.Conn][net.Conn] has no API to check Alive, so it is difficult to make an efficient connection pool for RPC framework,
because there may be a large number of failed connections in the pool.

On the other hand, the open source community currently lacks Go network libraries that focus on RPC scenarios.
Similar repositories such as: [evio][evio], [gnet][gnet], etc., are all focus on scenarios like [Redis][Redis], [HAProxy][HAProxy].

But now, [Netpoll][Netpoll] was born and solved the above problems.
It draws inspiration from the design of [evio][evio] and [netty][netty],
has excellent [Performance](#performance), and is more suitable for microservice architecture.
Also [Netpoll][Netpoll] provides a number of [Features](#features),
and it is recommended to replace [net][net] in some RPC scenarios.

We developed the RPC framework [Kitex][Kitex] and HTTP framework [Hertz][Hertz] based on [Netpoll][Netpoll], both with industry-leading performance.

[Examples][netpoll-example] show how to build RPC client and server using [Netpoll][Netpoll].

## Features

- **Already**

  - [LinkBuffer][LinkBuffer] provides nocopy API for streaming reading and writing
  - [gopool][gopool] provides high-performance goroutine pool
  - [mcache][mcache] provides efficient memory reuse
  - `IsActive` supports checking whether the connection is alive
  - `Dialer` supports building clients
  - `EventLoop` supports building a server
  - TCP, Unix Domain Socket
  - Linux, macOS (operating system)

- **Future**

  - [io_uring][io_uring]
  - Shared Memory IPC
  - TLS
  - UDP

- **Unsupported**
  - Windows (operating system)

## Performance

Benchmark should meet the requirements of industrial use.
In the RPC scenario, concurrency and timeout are necessary support items.

We provide the [netpoll-benchmark][netpoll-benchmark] project to track and compare
the performance of [Netpoll][Netpoll] and other frameworks under different conditions for reference.

More benchmarks reference [kitex-benchmark][kitex-benchmark] and [hertz-benchmark][hertz-benchmark]

## Reference

- [Official Website](/)
- [Getting Started](/docs/netpoll/getting-started/)

[Netpoll]: https://github.com/cloudwego/netpoll
[net]: https://github.com/golang/go/tree/master/src/net
[net.Conn]: https://github.com/golang/go/blob/master/src/net/net.go
[evio]: https://github.com/tidwall/evio
[gnet]: https://github.com/panjf2000/gnet
[netty]: https://github.com/netty/netty
[Kitex]: https://github.com/cloudwego/kitex
[Hertz]: https://github.com/cloudwego/hertz
[netpoll-example]: https://github.com/cloudwego/netpoll-examples
[netpoll-benchmark]: https://github.com/cloudwego/netpoll-benchmark
[kitex-benchmark]: https://github.com/cloudwego/kitex-benchmark
[hertz-benchmark]: https://github.com/cloudwego/hertz-benchmark
[ByteDance]: https://www.bytedance.com
[Redis]: https://redis.io
[HAProxy]: http://www.haproxy.org
[LinkBuffer]: https://github.com/cloudwego/netpoll/blob/develop/nocopy_linkbuffer.go
[gopool]: https://github.com/bytedance/gopkg/tree/develop/util/gopool
[mcache]: https://github.com/bytedance/gopkg/tree/develop/lang/mcache
[io_uring]: https://github.com/axboe/liburing
