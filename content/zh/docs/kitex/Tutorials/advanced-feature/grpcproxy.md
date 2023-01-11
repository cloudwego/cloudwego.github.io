---
title: "gRPC Proxy"
date: 2022-06-27
weight: 6
keywords: ["Kitex", "gRPC", "Proxy"]
description: Kitex 支持对未注册的 gRPC 方法调用进行自定义 Proxy 路由处理。
---

Kitex 对 gRPC 场景提供了 `WithGRPCUnknownServiceHandler` 功能，当服务器接收到未注册的 gRPC 方法调用的请求时，将执行自定义的 Unknown Service Handler 函数进行处理：

```go

func handler(ctx context.Context, methodName string, stream streaming.Stream) error {

  // .... handle unknown service

}

func RunServer(){

  // ...

  svr := service.NewServer(server.WithGRPCUnknownServiceHandler(handler),xxx,xxx)

  // ...

}

```

通过 Kitex 提供的 gRPCUnknownServiceHandler，可以实现 gRPC Proxy 代理服务器。在 Kitex Example 中的[ grpc proxy](https://github.com/cloudwego/kitex-examples) 示例中，分别展示了两种场景的 gRPC Proxy 实现，分别是：

- 读取 gRPC Frame 并直接转发
- 读取 gRPC 并解码为结构体，在对结构体进行检查或自定义操作后再进行转发

下文对 Kitex Example 中的两种 Proxy 实现思路进行讲解，以便使用者参考，并按照自己的需求进行实现。

# gRPC Frame 直接转发

当我们要实现的 gRPC Proxy 并不关心 RPC 的具体内容时，无需编解码，直接将拿到的 gRPC Frame 报文转发至目标端，不需要引入桩模块等其他代码。示例如下：

```go
func GRPCFrameProxyHandler(ctx context.Context, methodName string, stream streaming.Stream) error {
	// find target address by methodName
	network, address := proxy.Resolve(methodName)

	// create a new RPC Info and modify some infos if you want.
	sri := rpcinfo.GetRPCInfo(ctx)
	ri := rpcinfo.NewRPCInfo(sri.From(), sri.To(), sri.Invocation(), sri.Config(), sri.Stats())
	clientCtx := rpcinfo.NewCtxWithRPCInfo(context.Background(), ri)

	conn, err := connPool.Get(clientCtx, network, address, remote.ConnOption{
		Dialer:         netpoll.NewDialer(),
		ConnectTimeout: 0,
	})
	if err != nil {
		return err
	}
	clientConn := conn.(nphttp2.GRPCConn)
	defer func() {
		clientConn.Close()
		connPool.Put(clientConn)
	}()

	serverConn, err := nphttp2.GetServerConn(stream)
	if err != nil {
		return err
	}

	s2c := redirectFrame(serverConn, clientConn)
	c2s := redirectFrame(clientConn, serverConn)

	// ...
}
```

首先获取目标端的 IP Address 等信息，然后从连接池中直接获取到一条对端连接，封装为 GRPCConn 结构体，利用其 ReadFrame 与 WriteFrame 进行数据发送。

需要注意的是，这里需要用户自己创建新的连接池，设置相应的参数，并在 Unknown Service Handler 中使用完连接后进行相应的连接释放等操作，相关写法可以参考本示例中的代码。

读取并转发 gRPC Frame 的代码实现如下：

```go
func redirectFrame(from, to nphttp2.GRPCConn) chan error {
	ret := make(chan error)

	go func() {
		for {
			hdr, data, err := from.ReadFrame()
			if err != nil {
				// write last empty data frame with END_STREAM flag
				to.WriteFrame(hdr, data)
				ret <- err
				break
			}
			_, err = to.WriteFrame(hdr, data)
			if err != nil {
				ret <- err
				break
			}
		}
	}()

	return ret
}
```

这里使用 ReadFrame 不断读取 gRPC Frame 并写入转发目标端。当最后一次读取 ReadFrame 收到带有 EndStream 标识符的 Data Frame 后，ReadFrame 会收到 io.EOF，代表连接处于半关闭状态，此时 hdr 和 data 的值都为 nil，所以使用 WriteFrame 也向远端发送一个带有 EndStream 的空包，表示发送内容结束，否则可能会出现 proxy server 阻塞的场景。



# 解码处理后转发

在有些 proxy server 的场景中，我们需要解码获取到结构体对象，并进行一些自定义的处理（例如读取请求做判断，或者修改请求的某些字段），再将结构体重新发送到远端。这种场景下，可能需要在 proxy server 的代码中引入对应的 client 桩模块代码。示例如下：

```go
func GRPCStructProxyHandler(ctx context.Context, methodName string, serverStream streaming.Stream) error {

  // find target address by methodName
	_, address := proxy.Resolve(methodName)

  //
	client, _ := servicea.NewClient("destService", client.WithHostPorts(address),
		client.WithTransportProtocol(transport.GRPC))

	clientStream, err := client.Chat(context.Background())
	if err != nil {
		return err
	}

	s2c := redirectStruct(serverStream, clientStream)
	c2s := redirectStruct(clientStream, serverStream)

	// ...
}

```

首先获取到目标端的 IP Address 等信息，然后创建客户端，和目标端进行连接。接下来进行数据的解码和转发处理。本示例为双向流的场景，所以客户端也通过 clientStream 进行多次的结构体收发操作，编写如下代码，使 serverStream 读取并解码结构体，然后转发到 clientStream 中：

```go
func redirectStruct(from, to streaming.Stream) chan error {
   ret := make(chan error)

   go func() {
      for {
         req := &grpcproxy.Request{}
         err := from.RecvMsg(req)
         if err != nil {
            from.Close()
            ret <- err
            break
         }

         // do your own filter logic here
         //if req.Name==xxx{
         // continue
         //}

         err = to.SendMsg(req)
         if err != nil {
            ret <- err
            break
         }
      }
   }()

   return ret
}
```

在这部分中，通过 RecvMsg 读取到的数据经过序列化，会写入结构体中，可以加入对结构体字段的判断和修改操作，然后再进行转发。
