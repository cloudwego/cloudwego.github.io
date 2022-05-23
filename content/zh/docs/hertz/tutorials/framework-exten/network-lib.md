---
title: "网络库扩展"
linkTitle: "网络库扩展"
weight: 1
description: >

---

Hertz 提供了网络库扩展的能力。用户如果需要更换其他的网络库，可以根据需求实现对应的接口。Server 需要实现 `network.Conn` 接口，Client 需要实现 `network.Dialer` 接口。

## 接口定义

接口在 `pkg/network/connection.go` 中

```go
type Conn interface {
    net.Conn
    Reader
    Writer
    SetReadTimeout(t time.Duration) error
}

// Reader is for buffered Reader
type Reader interface {
   // Peek returns the next n bytes without advancing the reader.
   Peek(n int) ([]byte, error)

   // Skip discards the next n bytes.
   Skip(n int) error

   // Release the memory space occupied by all read slices. This method needs to be executed actively to
   // recycle the memory after confirming that the previously read data is no longer in use.
   // After invoking Release, the slices obtained by the method such as Peek will
   // become an invalid address and cannot be used anymore.
   Release() error

   // Len returns the total length of the readable data in the reader.
   Len() int

   // ReadByte is used to read one byte with advancing the read pointer.
   ReadByte() (byte, error)

   // ReadBinary is used to read next n byte with copy, and the read pointer will be advanced.
   ReadBinary(n int) (p []byte, err error)
}

type Writer interface {
   // Malloc will provide a n bytes buffer to send data.
   Malloc(n int) (buf []byte, err error)

   // WriteBinary will use the user buffer to flush.
   // NOTE: Before flush successfully, the buffer b should be valid.
   WriteBinary(b []byte) (n int, err error)

   // Flush will send data to the peer end.
   Flush() error
}
```

对于 Client 来说，实现了以下接口就可以替换 Client 侧的网络库。

```go
type Dialer interface {
    DialConnection(network, address string, timeout time.Duration, tlsConfig *tls.Config) (conn Conn, err error)
    DialTimeout(network, address string, timeout time.Duration, tlsConfig *tls.Config) (conn net.Conn, err error)
    AddTLS(conn Conn, tlsConfig *tls.Config) (Conn, error)
}
```

### 自定义网络库

Hertz 的 Server 和 Client 分别提供了初始化配置项

Server

```go
server.New(server.WithTransport(YOUR_TRANSPORT))
```

Client

```go
client.NewClient(client.WithDialer(YOUR_DIALER))
```
