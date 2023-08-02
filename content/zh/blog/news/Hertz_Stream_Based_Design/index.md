---
date: 2023-08-02
title: "Hertz 支持 QUIC & HTTP/3"
linkTitle: "Hertz 支持 QUIC & HTTP/3"
keywords: ['Go', 'Hertz', 'QUIC', 'HTTP/3', '接口设计']
description: "本文介绍了 Hertz 为支持 QUIC & HTTP/3 在网络传输层和协议层提供的接口设计方案。"
author: <a href="https://github.com/CloudWeGo" target="_blank">CloudWeGo</a>
---

## 概述

根据 Hertz 的分层设计原则将 QUIC 和 HTTP3 的实现集成到框架中来，对外提供灵活的多协议支持，对内保持足够灵活的扩展性和清晰的架构。
要从头实现一个完整的 QUIC 协议涉及到的工作量比较大且投入产出比相对较低，目前采取更合理的方式：首先定义标准网络传输层接口，之后将开源社区主流的一个或多个成熟的
QUIC 协议实现经过简单的适配和封装通过模块化的方式接入到 Hertz 中来，同时也保留未来独立实现 QUIC 协议的空间。类似目前的网络传输层架构。HTTP/3
同理。
明确了实现路径之后，本文档讨论的主题也就基本上清晰了，主要为：

1. 网络传输层现状和 QUIC 设计层面统一：明确加入 QUIC 的网络传输层接口形态
2. 协议层扩展 HTTP/3：在明确网络传输层形态之后，基于网络传输层接口实现 HTTP/3

![HERTZ](/img/docs/hertz.png)

## 设计

### 网络传输层

#### 现状

当前的网络传输层设计主要还是基于 TCP 协议，基本语义为：当连接建立完成（包括 TLS）后为上层提供一个处理协议的回调函数：

```go
// Callback when data is ready on the connection
type Serve func(ctx context.Context, conn Conn) error
```

当前网络传输层提供的标准网络库和 Netpoll 都是在这套接口下面展开的；因此协议层只需要依赖这个接口进行实现，而无需关心网络传输层具体正在提供的实现是什么。
在 TCP 协议提供的框架和语义下面，这套接口是完全够用的，目前 Hertz 基于此接口构建的 HTTP/1.1、HTTP/2 足以证明这一点。

##### 详细描述

Conn 的定义为：

```go
type Conn interface {
    net.Conn
    Reader
    Writer
    // SetReadTimeout should work for every Read process
    SetReadTimeout(t time.Duration) error
}
```

主体由 Reader（提供从连接上读数据的能力）/Writer（提供往连接上写数据的能力）构成。
同时也是当前 Hertz 网络传输层高性能库实现的承载，具体定义为：

```go
type Reader interface {
    // Peek returns the next n bytes without advancing the reader.
    Peek(n int) ([]byte, error)
    
    // Skip discards the next n bytes.
    Skip(n int) error
    
    // Release the memory space occupied by all read slices. This method needs to be     executed actively to
    // recycle the memory after confirming that the previously read data is no longer in     use.
    // After invoking Release, the slices obtained by the method such as Peek will
    // become an invalid address and cannot be used anymore.
    Release() error
    
    // Len returns the total length of the readable data in the reader.
    Len() int
    
    // ReadByte is used to read one byte with advancing the read pointer.
    ReadByte() (byte, error)
    
    // ReadBinary is used to read next n byte with copy, and the read pointer will be     advanced.
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

#### 引入 QUIC

UDP + QUIC 大致可以对应到 TCP + TLS（严格的层级关系可以参考下图），按照当前的分层结构，同属于 Hertz 的网络传输层。不过 QUIC
的编程模型天然基于流（Stream）来进行的，而当前基于 TCP 的网络传输层提供的 Reader /Writer 本质上是基于字节流的编程模型。虽然
HTTP/2 非常类似地拥有流（Stream）的概念，但实际上是在 TCP 的字节流之上（应用协议层中）进行的封装，并非如 QUIC
这样原生实现到了传输协议内部。我们无法要求 TCP 直接内置流（Stream）的实现（这可能也是 HTTP/2 的愿望），换句话说，要想把 HTTP/2
和 HTTP/3 中流的概念在当下 Hertz 的某一层中统一起来，逻辑上其实是办不到的（虽然它们本质上是那么的相似）。

![quic & http3](/img/docs/quic_http3.png)

明确了上述问题之后，引入 QUIC 后的网络库形态其实也就比较清晰了：基于 TCP 的网络抽象接口仍然保持原样，新增一套基于
QUIC（UDP）的网络传输层抽象，协议层对应提供一个基于 QUIC（UDP）网络抽象的处理接口。关键点在于，不强制将 QUIC（UDP）融合至当前基于
TCP 的网络/协议层抽象当中来。

##### 接口设计

与当前 TCP 的抽象接口类似，QUIC 和 HTTP/3 的分界其实就是：

1. 网络传输层语义覆盖 QUIC 协议的连接准备、连接建立过程；请求对应的流完成准备之后就达到网络传输层的边界
2. 协议层关注从 QUIC 连接上打开的流（Stream）开始，通过这个打开的流完成请求的解析，handler 的处理，到将相应通过这条流写回对端（Server 视角，Client 同理，对调即可）

网络传输层和协议层拆分的优势非常明显，目前的 Hertz 支持 ET/LT 触发方式、标准网络库和 Netpoll 相互补充，丰富应用场景等都是很好的例子。

##### 方案 A

基于上述分层思想，一个和网络传输层 Serve 相对应的 QUIC 抽象其实就出具雏形了，命名为 OnStream，语义和 Serve 基本一致*
：当流完成准备。具体需要提供的实现就是上层协议（这里是 HTTP/3）。

```go
type ServeStream func(ctx context.Context, stream Stream) error
```

*注：ServeStream 语义和 Serve 一致具体指 HTTP/1 的 Serve 对应的其实就是“下一个请求的数据已经准备好”；通过实现该接口就可以完成协议处理。
如果进一步深入，其实和当前 Hertz HTTP/2 的实现其实并不完全对应，究其原因在于：

1. HTTP/2
的流实现在协议层上，本质上其实只是对引入的更小传输单元帧（Frame）的逻辑承载；
2. 理想形态应该是将 HTTP/2
的实现进行拆分：流（Stream）准备逻辑下层到网络传输层 & 基于流（Stream）的协议处理逻辑保留在协议层。

###### 详细设计

暂略

###### 优点

方案 A 最大的特点是理想化的将应用协议和网络协议进行分离。
由于各种历史原因的叠加，TCP、HTTP/1、Websocket、HTTP/2、QUIC、HTTP/3 各自的架构设计存在很多重叠和职责界定不清晰的地方，且当下的很多实现可能还并未形成标准，通过合理的解构，能够帮助
Hertz 在面对未来可能的协议变迁、实现变迁的过程中仍然能够聚焦在 HTTP 本身这个核心问题之上，最终达成“泛 HTTP 框架”的终极目标。

###### 缺点

方案 A 的缺点其实就是伴随清晰的边界产生的，这也是协议设计和发展中的妥协和不彻底带来的一个现实问题。
其中，基于流（Stream）的协议层能很好的处理一个流（Stream）上的消息交互，但是同时也是由于对于协议层来说，仅仅显示暴露了流（Stream）这样一个请求级别的接口，但类似
HTTP/2，HTTP/3 这样基于流（Stream）的应用层协议，一个核心特点在于连接本身的多路复用，换句话说，底层连接和流的对应关系往往是 1:N 的。因此，如果是在协议处理过程中存在对承载流（Stream）的连接本身的控制需求（应该难以避免），就会比较难办（实现上没问题），概念上会和方案 A 的分层抽象存在相抵的地方。
极致的理想态可能并不太适用于当下的真实环境。

##### 方案 B

平衡理想形态和事实现状，容易想到的一种解决方案：额外抽象一个连接层出来，这个连接能够拥有操作流（Stream）的语义。网络传输层和协议层的边界从流（Stream）移动到这个连接上面来：

1. 网络传输层负责这个连接的准备工作，当连接建立完成后直接将连接交给协议层
2. 协议层直接操作建连完成后的链接，不过和 Hertz
   当前的网络传输层连接抽象不同，这个连接不具备直接（理论上）读/写数据的接口和能力，涉及到数据交互的操作需要通过连接提供的流（Stream）相关操作进行，比如要想读取数据，需要通过连接接口开启一个双/单向的流，之后的数据交换操作通过这个开启的流来完成

```go
type ServeStream func(ctx context.Context, streamConn StreamConn) error
```

###### 详细设计

明确新增接口的形态之后，StreamConn 具体能够支持的语义就比较清晰了，具体来说，分为两部分：

- 支持连接级别控制能力
- 支持流（Stream）相关控制能力

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
    // AcceptStream returns the next stream opened by the peer, blocking until one is     available.
    // If the connection was closed due to a timeout, the error satisfies
    // the net.Error interface, and Timeout() will be true.
    AcceptStream(context.Context) (Stream, error)
    // AcceptUniStream returns the next unidirectional stream opened by the peer,     blocking until one is available.
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

###### 优点

相较于方案 A，本方案最大的优势在于，能够在语义层面很好的自洽：协议层与网络传输层的职责节点清晰明确，无需为一些历史问题妥协设计语义，同时当下主流的开源实现（HTTP/2
及 HTTP/3 over QUIC）都能够比较容易得融合到这个架构中来。
对协议层直接暴露连接的接口，给协议层提供了极大的自由度和对连接的控制力，是一个更加符合实际的抽象方式。

###### 缺点

相比于 Hertz 当前存在的网络传输层抽象（主要是 HTTP/1.1 的实现），新增的这套抽象层级上并不完全对等（不过这个也是 HTTP
协议大版本之间的一个明显的 break change），目前看起来，要想完全在抽象层面填平这个 gap
困难相对较大。不过，新增的“基于流的连接”这个概念应该也不完全是一件坏事，针对拥有相似语义的协议簇具有统一语义的作用，不过也要求类似基于流来实现多路复用的协议最好能够按照抽象进行拆分（目前的 Websocket、HTTP/2
还不是此形态）

##### 方案选型

方案 B
在综合考虑架构形态和事实的一些主流实现后方案 B 更加符合 Hertz 的分层演进路线

### 协议层

基于网络传输层方案 B 进一步往前走，协议层的实现就相对灵活的多了：针对 StreamConn 提供的接口管理连接，同时负责流（Stream）的开启和关闭即可。
不过，由于引入的 StreamConn 和当前网络传输层的 Conn 接口定义不一致，因此协议层更多需要考虑的是基于 StreamConn 和 Conn
的两套回调如何在协议层以及协议服务器（Protocol Server）注册阶段完成融合。基本的要求是对目前的现状不能有任何影响。

#### 现状

通过 Hertz 提供的接口就可以便捷的将实现了 Server 接口的自定义协议服务器（Protocol Server）添加到 Hertz 实例支持的协议 map
中来。详细方式参考这里。本质上其实还是要求扩展 Server 实现

```go
Serve(c context.Context, conn network.Conn) error
```

这个接口，而目前的 HTTP/1.1、HTTP/2 的实现也都是按照这个方式来进行的。

#### 引入 StreamConn

##### 接口设计

如网络传输层抽象方案 B 所述，新引入的 StreamConn 本身和当前的 network.Conn 在语义上存在很大的 diff，导致硬融合这两个接口为一个存在一定的困难。在“新增
QUIC & HTTP3 支持不能破坏存量抽象”的基本底线之上，更加合理的方式是显示增加一个独立且平行的基于流的 Server
接口：
StreamServer：

```go
type StreamServer interface {
    Serve(c context.Context, conn network.StreamConn) error
}
```

Protocol server factory:

```go
type StreamServerFactory interface {New(core Core) (server protocol.StreamServer, err error)}// Core is the core interface that promises to be provided for the protocol layer extensions
type Core interface {// IsRunning Check whether engine is running or not
    IsRunning() bool// A RequestContext pool ready for protocol server impl
    GetCtxPool() *sync.Pool// Business logic entrance
    // After pre-read works, protocol server may call this method
    // to introduce the middlewares and handlers
    ServeHTTP(c context.Context, ctx *app.RequestContext)// GetTracer for tracing requirement
    GetTracer() tracer.Controller
}
```

按照这套新的抽象接口展开，对于存量架构的影响就非常小了，不过需要新增针对新增的网络抽象和协议抽象的映射。
当前网络传输层、协议层间不存在明显耦合：

网络传输层原生提供：

1. 基于 netpoll 的实现
2. 基于标准库的实现

协议层提供：

1. HTTP/1.1
2. HTTP/2

排除掉 Netpoll 不支持 TLS 这一点来看，其实网络传输层和协议层是能够自由组合，总共 4（2*2）种不同的搭配。
但新引入的 StreamConn（网络传输层） 、StreamServer（协议层）其实和上述实现完全平行，如果网络传输层采用 StreamConn 这套抽象接口，协议层也就只能是对接实现了 StreamServer 的 Server 了（目前的 HTTP/1.1、HTTP/2 都不是，不过 HTTP/2 是条流写回对存在改造/重写适配上 StreamConn & StreamServer 的可能性的）。

## 实现

https://github.com/hertz-contrib/http3
