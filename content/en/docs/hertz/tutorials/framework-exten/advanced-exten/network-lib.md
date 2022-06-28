---
title: "Network Library Extensions"
linkTitle: "Network Library Extensions"
weight: 1
description: >

---

Hertz provides the ability to extend the network library. If users need to replace with other network libraries, they can implement the corresponding interfaces according to their needs. Server needs to implement the `network.Conn` interface, Client needs to implement the `network.Dialer` interface.

## Interface Definition

Interfaces in `pkg/network/connection.go`

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

For Client, you should implement the following interface in order to replace the Client-side network library.

```go
type Dialer interface {
    DialConnection(network, address string, timeout time.Duration, tlsConfig *tls.Config) (conn Conn, err error)
    DialTimeout(network, address string, timeout time.Duration, tlsConfig *tls.Config) (conn net.Conn, err error)
    AddTLS(conn Conn, tlsConfig *tls.Config) (Conn, error)
}
```

## Custom Network Library

The Hertz Server and Client provide separate initialization configuration items

Server

```go
server.New(server.WithTransport(YOUR_TRANSPORT))
```

Client

```go
client.NewClient(client.WithDialer(YOUR_DIALER))
```
