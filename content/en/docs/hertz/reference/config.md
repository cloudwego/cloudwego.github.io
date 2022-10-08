---
title: "Configuration instruction"
linkTitle: "Configuration instruction"
weight: 1
description: >

---

## Server

The configuration items on the Server side all use `server.xxx` when initializing the Server, such as:

```go
package main

import "github.com/cloudwego/hertz/pkg/app/server"

func main() {
	h := server.New(server.WithXXXX())
	...
}
```

|  Configuration Name   | Type  |  Description  |
|  :----  | :----  | :---- |
| WithTransport  | network.NewTransporter | Replace the transport. Default：netpoll.NewTransporter |
| WithHostPorts  | string | Specify the listening address and port |
| WithKeepAliveTimeout | time.Duration | Set the keep-alive time of tcp persistent connection, generally no need to modify it, you should more pay attention to idleTimeout rather than modifying it. Default: 1min. |
| WithReadTimeout | time.Duration | The timeout of data reading. Default：3min. |
| WithIdleTimeout | time.Duration | The free timeout of the request link for persistent connection. Default: 3min. |
| WithMaxRequestBodySize | int | Max body size of a request. Default: 4M (the corresponding value of 4M is 4\*1024\*1024). |
| WithRedirectTrailingSlash | bool | Whether to redirect with the / which is at the end of the router automatically. For example： If there is only /foo/ in the router, /foo will be redirected to /foo/. And if there is only /foo in the router, /foo/ will be redirected to /foo. Default: true. |
| WithRemoveExtraSlash | bool | RemoveExtraSlash makes the parameter still valid when it contains an extra /. For example, if WithRemoveExtraSlash is true user//xiaoming can match the user/:name router. Default: false. |
| WithUnescapePathValues | bool | If true, the request path will be escaped automatically (eg. '%2F' -> '/'). If UseRawPath is false (the default), UnescapePathValues is true, because  URI().Path() will be used and it is already escaped. To set WithUnescapePathValues to false, you need to set WithUseRawPath to true. Default (true). |
| WithUseRawPath | bool | If true, the original path will be used to match the route. Default: false. |
| WithHandleMethodNotAllowed | bool | If true when the current path cannot match any method, the server will check whether other methods are registered with the route of the current path, and if exist other methods, it will respond "Method Not Allowed" and return the status code 405; if not, it will use the handler of NotFound to handle it. Default: false. |
| WithDisablePreParseMultipartForm | bool | If true, the multipart form will not be preprocessed. The body can be obtained via ctx.Request.Body() and then can be processed by user. Default: false. |
| WithStreamBody | bool | If true, the body will be handled by stream processing. Default: false. |
| WithNetwork | string | Set the network protocol, optional: tcp，udp，unix(unix domain socket). Default: tcp. |
| ContinueHandler | func(header *RequestHeader) bool | Call the ContinueHandler after receiving the Expect 100 Continue header. With ContinueHandler, the server can decide whether to read the potentially large request body based on the header. |
| PanicHandler | HandlerFunc | Handle panic used to generate error pages and return error code 500. |
| NotFound | HandlerFunc | The handler to be called when the route does not match. |
| WithExitWaitTime | time.Duration | Set the graceful exit time. the Server will stop connection establishment for new requests and set the Connection: Close header for each request after closing. When the set time is reached, Server will to be closed. the Server can be closed early when all connections have been closed. Default: 5s. |
| WithTLS | tls.Config | Configuring server tls capabilities. |
| WithListenConfig | net.ListenConfig | Set the listener configuration. Can be used to set whether to allow reuse ports, etc.|
| WithALPN | bool | Whether to enable ALPN. Default: false. |
| WithTracer | tracer.Tracer | Inject tracer implementation, if not inject Tracer. Default: close. |
| WithTraceLevel | stats.Level | Set trace level, Default: LevelDetailed. |

Server Connection limitation:

* If you are using the standard network library, there is no such restriction.
* If netpoll is used, the maximum number of connections is 10000 (this is
  the [gopool](https://github.com/bytedance/gopkg/blob/b9c1c36b51a6837cef4c2223e11522e3a647460c/util/gopool/gopool.go#L46))
  used at the bottom of netpoll. Yes, the modification method is also very simple, just call the function provided by
  gopool: `gopool.SetCap(xxx)` (you can call it once in main.go).

## Client

The configuration items on the Client side all use `server.xxx` when initializing the Server, such as:

```go
package main

import "github.com/cloudwego/hertz/pkg/app/client"

func main() {
	c, err := client.NewClient(client.WithXxx())
	...
}
```

|  Configuration Name   | Type  |  Description  |
|  :----  | :----  | :---- |
| WithDialTimeout | time.Duration | Connection establishment timeout. Default: 1s. |
| WithMaxConnsPerHost | int | Set the maximum number of connections for every host. Default: 512. |
| WithMaxIdleConnDuration | time.Duration | Set the idle connection timeout, which will close the connection after the timeout Default: 10s. |
| WithMaxConnDuration | time.Duration | Set the maximum keep-alive time of the connection, when the timeout expired, the connection will be closed after the current request is completed. Default: infinite. |
| WithMaxConnWaitTimeout | time.Duration | Set the maximum time to wait for an idle connection. Default: no wait. |
| WithKeepAlive | bool | Whether to use persistent connection. Default: true. |
| WithMaxIdempotentCallAttempts | int | Set the times of failed retries. Default: 5. |
| WithClientReadTimeout | time.Duration | Set the maximum time to read the response. Default: infinite. |
| WithTLSConfig | *tls.Config | Set the client's TLS config for mutual TLS authentication. |
| WithDialer | network.Dialer | Set the network library used by the client. Default: netpoll. |
| WithResponseBodyStream | bool | Set whether to use stream processing. Default: false. |
| WithDialFunc | client.DialFunc | Set Dial Function. |
