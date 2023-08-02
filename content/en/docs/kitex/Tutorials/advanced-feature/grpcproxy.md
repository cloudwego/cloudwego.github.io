---
title: "gRPC Proxy"
date: 2022-06-27
weight: 6
keywords: ["Kitex", "gRPC", "Proxy"]
description: Kitex supports custom Proxy routing for unregistered gRPC method calls.
---

Kitex provides the `WithGRPCUnknownServiceHandler` function when transport is using gRPC. When the server receives a request from an unknown gRPC method, it will execute the unknown service handler:

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

A gRPC Proxy Server can be implemented through the gRPCUnknownServiceHandler provided by Kitex. In the [grpc proxy](https://github.com/cloudwego/kitex-examples) Kitex Example, the gRPC Proxy implementations of two scenarios are shown respectively, namely:

- Read gRPC Frame and forward it directly
- Read gRPC and decode it into a structure, and then forward it after checking or customizing the structure

The following two proxy implementation ideas in Kitex Example are explained, so that users can refer to them and implement them according to their own needs.

## Redirecting gRPC Frame

When the gRPC Proxy we want to implement does not care about the specific content of RPC, it does not need to encode and decode, and directly forwards the obtained gRPC Frame message to the target end, without introducing other codes such as stub modules. An example is as follows:

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

First, get IP Address and other information of the target terminal, and then directly obtain a peer connection from the connection pool, encapsulate it as a GRPCConn structure, and use its ReadFrame and WriteFrame to send data.

It should be noted that the user needs to create a new connection pool, set the corresponding parameters, and perform the corresponding connection release and other operations after using the connection in the Unknown Service Handler. For the relevant writing method, please refer to the code in this example.

The code for reading and forwarding gRPC Frame is implemented as follows:

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

ReadFrame is used to continuously read gRPC Frame and write to the forwarding destination. When the last read ReadFrame receives a Data Frame with an EndStream identifier, ReadFrame will receive io.EOF, which means the connection is in a half-closed state. At this time, the values of hdr and data are both nil, so using WriteFrame is also far away. The end sends an empty packet with EndStream, indicating that the sending content is over, otherwise the proxy server may be blocked.

## Decoding and Redrecting

In some proxy server scenarios, we need to decode and obtain the structure object, perform some custom processing (such as reading the request for judgment, or modify some fields of the request), and then resend the structure to the remote end. In this scenario, it may be necessary to introduce the corresponding client stub module code in the proxy server code. An example is as follows:

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

First, get IP Address and other information of the target, and then create a client to connect with the target. Next, the decoding and forwarding processing of the data is performed. This example is a bidirectional streaming scenario, so the client also performs multiple structure sending and receiving operations through clientStream. Write the following code to make serverStream read and decode the structure, and then forward it to clientStream:

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

In this part, the data read through RecvMsg is serialized and written into the structure, and the judgment and modification operations on the structure fields can be added, and then forwarded.
