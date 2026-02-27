---
title: "网络库扩展"
linkTitle: "网络库扩展"
weight: 4
keywords: ["网络库扩展", "network.Conn", "network.StreamConn", "network.Dialer"]
description: "Hertz 提供的网络库扩展。"
---

Hertz 提供了网络库扩展的能力。用户如果需要更换其他的网络库，可以根据需求实现对应的接口。Server 需要实现 `network.Conn` 或 `network.StreamConn` 接口，Client 需要实现 `network.Dialer` 接口。

## Server 接口定义

### network.Conn

该接口通常用于实现基于字节流的连接，如 TCP 连接。

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

### network.StreamConn

该接口通常用于实现基于流的连接，如 QUIC 连接。

```go
 // StreamConn is interface for stream-based connection abstraction.
type StreamConn interface {
    GetRawConnection() interface{}
    // HandshakeComplete blocks until the handshake completes (or fails).
    HandshakeComplete() context.Context
    // CloseWithError closes the connection with an error.
    // The error string will be sent to the peer.
    CloseWithError(err ApplicationError, errMsg string) error
    // LocalAddr returns the local address.
    LocalAddr() net.Addr
    // RemoteAddr returns the address of the peer.
    RemoteAddr() net.Addr
    // The context is cancelled when the connection is closed.
    Context() context.Context
    // Streamer is the interface for stream operations.
    Streamer
}

type Streamer interface {
    // AcceptStream returns the next stream opened by the peer, blocking until one is available.
    // If the connection was closed due to a timeout, the error satisfies
    // the net.Error interface, and Timeout() will be true.
    AcceptStream(context.Context) (Stream, error)
    // AcceptUniStream returns the next unidirectional stream opened by the peer, blocking until one is available.
    // If the connection was closed due to a timeout, the error satisfies
    // the net.Error interface, and Timeout() will be true.
    AcceptUniStream(context.Context) (ReceiveStream, error)
    // OpenStream opens a new bidirectional QUIC stream.
    // There is no signaling to the peer about new streams:
    // The peer can only accept the stream after data has been sent on the stream.
    // If the error is non-nil, it satisfies the net.Error interface.
    // When reaching the peer's stream limit, err.Temporary() will be true.
    // If the connection was closed due to a timeout, Timeout() will be true.
    OpenStream() (Stream, error)
    // OpenStreamSync opens a new bidirectional QUIC stream.
    // It blocks until a new stream can be opened.
    // If the error is non-nil, it satisfies the net.Error interface.
    // If the connection was closed due to a timeout, Timeout() will be true.
    OpenStreamSync(context.Context) (Stream, error)
    // OpenUniStream opens a new outgoing unidirectional QUIC stream.
    // If the error is non-nil, it satisfies the net.Error interface.
    // When reaching the peer's stream limit, Temporary() will be true.
    // If the connection was closed due to a timeout, Timeout() will be true.
    OpenUniStream() (SendStream, error)
    // OpenUniStreamSync opens a new outgoing unidirectional QUIC stream.
    // It blocks until a new stream can be opened.
    // If the error is non-nil, it satisfies the net.Error interface.
    // If the connection was closed due to a timeout, Timeout() will be true.
    OpenUniStreamSync(context.Context) (SendStream, error)
}

type Stream interface {
    ReceiveStream
    SendStream
}

type ReceiveStream interface {
    StreamID() int64
    io.Reader

    // CancelRead aborts receiving on this stream.
    // It will ask the peer to stop transmitting stream data.
    // Read will unblock immediately, and future Read calls will fail.
    // When called multiple times or after reading the io.EOF it is a no-op.
    CancelRead(err ApplicationError)

    // SetReadDeadline sets the deadline for future Read calls and
    // any currently-blocked Read call.
    // A zero value for t means Read will not time out.
    SetReadDeadline(t time.Time) error
}

type SendStream interface {
    StreamID() int64
    // Writer writes data to the stream.
    // Write can be made to time out and return a net.Error with Timeout() == true
    // after a fixed time limit; see SetDeadline and SetWriteDeadline.
    // If the stream was canceled by the peer, the error implements the StreamError
    // interface, and Canceled() == true.
    // If the connection was closed due to a timeout, the error satisfies
    // the net.Error interface, and Timeout() will be true.
    io.Writer
    // CancelWrite aborts sending on this stream.
    // Data already written, but not yet delivered to the peer is not guaranteed to be     delivered reliably.
    // Write will unblock immediately, and future calls to Write will fail.
    // When called multiple times or after closing the stream it is a no-op.
    CancelWrite(err ApplicationError)
    // Closer closes the write-direction of the stream.
    // Future calls to Write are not permitted after calling Close.
    // It must not be called concurrently with Write.
    // It must not be called after calling CancelWrite.
    io.Closer

    // The Context is canceled as soon as the write-side of the stream is closed.
    // This happens when Close() or CancelWrite() is called, or when the peer
    // cancels the read-side of their stream.
    Context() context.Context
    // SetWriteDeadline sets the deadline for future Write calls
    // and any currently-blocked Write call.
    // Even if write times out, it may return n > 0, indicating that
    // some data was successfully written.
    // A zero value for t means Write will not time out.
    SetWriteDeadline(t time.Time) error
}

type ApplicationError interface {
    ErrCode() uint64
    fmt.Stringer
}
```

## Client 接口定义

实现以下接口就可以替换 Client 侧的网络库。

```go
type Dialer interface {
    DialConnection(network, address string, timeout time.Duration, tlsConfig *tls.Config) (conn Conn, err error)
    DialTimeout(network, address string, timeout time.Duration, tlsConfig *tls.Config) (conn net.Conn, err error)
    AddTLS(conn Conn, tlsConfig *tls.Config) (Conn, error)
}
```

## 自定义网络库

Hertz 的 Server 和 Client 分别提供了初始化配置项用于注册自定义的网络库。

### Server

```go
server.New(server.WithTransport(YOUR_TRANSPORT))
```

### Client

```go
client.NewClient(client.WithDialer(YOUR_DIALER))
```
