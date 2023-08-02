---
title: "Network Lib"
date: 2022-06-20
weight: 3
description: >

---

Hertz integrated Netpoll and Golang network lib by default. Users can choose the appropriate one according to the actual scenarios to meet the best performance.

## Usage

While creating a server, Hertz uses netpoll by default, but this behavior can be modified by configuration:

>Note: Netpoll currently does not support Windows. Windows will automatically switch the network library to go net through conditional compilation.

```go
server.New(server.WithTransport(standard.NewTransporter))
server.New(server.WithTransport(netpoll.NewTransporter))
```

While creating a Client, it can also be modified by configuration:

```go
client.NewClient(client.WithDialer(standard.NewDialer()))
client.NewClient(client.WithDialer(netpoll.NewDialer()))
```

## Choosing appropriate network library

1. If you need to start a TLS server, Please use `go net` lib instead. `netpoll` is now working on it but not ready yet.
2. Due to the different I/O trigger model between the two network libs, `go net` for ET model and `netpoll` for LT model, which makes the application scenarios of the two libs somewhat different.
Under the ET mode, Read / Write events will be handled by the framework. Under the LT mode, Read / Write events will be handled by the network lib itself instead.
So with the small size requests, better schedule strategy provided by netpoll will makes LT model perform better; But under the situation with large size requests, since the Read / Write is not controlled by the framework layer, it may cause memory pressure because large amount of data will be loaded into the memory but can not be handled in time.

- Under the situation with large request size ( generally larger than 1M ), go net lib with streaming is recommended.
- In other situation, netpoll lib is recommended for extreme performance.
