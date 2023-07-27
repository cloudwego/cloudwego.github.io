---
title: "Stream"
date: 2022-06-21
weight: 9
description: >

---

Hertz supports both server and client stream processing to improve the usability of the framework.

## Server

For example:

```go
import (
    "github.com/cloudwego/hertz/pkg/app/server"
    "github.com/cloudwego/hertz/pkg/network/standard"
)

func main() {
    h := server.New(
        server.WithStreamBody(),
        server.WithTransport(standard.NewTransporter),
    )
    ...
}
```

Due to different trigger modes of *netpoll* and *go net*, netpoll streams are "pseudo" streams (Due to Level Triggered in epoll, the network library will read the data into the buffer of the network library).In the case of processing large data packets (eg: updating files), there may be memory problems when using netpoll, so we recommend using the *go net* method above.

## Client

For example:

```go
c, err := client.NewClient(client.WithResponseBodyStream(true))
```

Since the client has the problem of multiplexing connections, if streaming is used, the connection will be handled by the user(`resp.BodyStream()` is encapsulated by connection) once streaming is used. There are some differences in the management of connections in the above case:

1. If the user doesn't close the connection, the connection will eventually be closed by the GC without causing a connection leak. However, due to the need to wait for 2 Round-Trip Time to close the connection, in the case of high concurrency, the consequence is that there will be too many open files and creating a new connection will be impossible.

2. Users can recycle the connection by calling the relevant interface. After recycling, the connection will be put into the connection pool for reuse, so as to achieve higher resource utilization and better performance. The following methods will recycle the connection. Warning: Recycling can only be done once
   1. Show call: `protocol.ReleaseResponse(), resp.Reset(), resp.ResetBody()`
   1. Implicit call: The server side will also recycle the response. Assign the client side response to the server side or pass the server side response to the client (eg: client uses reverse proxy), there is no need to display the method of calling the recovery.
