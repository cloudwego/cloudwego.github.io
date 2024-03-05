---
title: "Extension of Codec"
date: 2021-08-31
weight: 7
description: >
---

![remote_module](/img/docs/remote_module.png)

Kitex supports extending protocols, including overall Codec and Payloadcodec. Generally, RPC protocol includes application layer transport protocol and payload protocol. For example, HTTP/HTTP2 belong to application layer transport protocol, payloads with different formats and protocols can be carried over HTTP/HTTP2.

Kitex supports built-in TTHeader as transport protocol, and supports Thrift, Kitex Protobuf, gRPC protocol as payload. In addition, Kitex integrates  [netpoll-http2](https://github.com/cloudwego/netpoll-http2) to support HTTP2. At present, it is mainly used for gRPC,  Thrift over HTTP2 is considered to support in the future.

The definition of TTHeader transport protocol as follows, service information can be transparently transmitted through the TTHeader to do service governance.

```
*  TTHeader Protocol
*  +-------------2Byte--------------|-------------2Byte-------------+
*  +----------------------------------------------------------------+
*  | 0|                          LENGTH                             |
*  +----------------------------------------------------------------+
*  | 0|       HEADER MAGIC          |            FLAGS              |
*  +----------------------------------------------------------------+
*  |                         SEQUENCE NUMBER                        |
*  +----------------------------------------------------------------+
*  | 0|     Header Size(/32)        | ...
*  +---------------------------------
*
*  Header is of variable size:
*  (and starts at offset 14)
*
*  +----------------------------------------------------------------+
*  | PROTOCOL ID  |NUM TRANSFORMS . |TRANSFORM 0 ID (uint8)|
*  +----------------------------------------------------------------+
*  |  TRANSFORM 0 DATA ...
*  +----------------------------------------------------------------+
*  |         ...                              ...                   |
*  +----------------------------------------------------------------+
*  |        INFO 0 ID (uint8)      |       INFO 0  DATA ...
*  +----------------------------------------------------------------+
*  |         ...                              ...                   |
*  +----------------------------------------------------------------+
*  |                                                                |
*  |                              PAYLOAD                           |
*  |                                                                |
*  +----------------------------------------------------------------+
```

## Extension API of Codec

Codec API is defined as follows:

```go
// Codec is the abstraction of the codec layer of Kitex.
type Codec interface {
	Encode(ctx context.Context, msg Message, out ByteBuffer) error

	Decode(ctx context.Context, msg Message, in ByteBuffer) error

	Name() string
}
```

Codec is the overall codec interface, which is extended in combination with the transmission protocol and payload to be supported. The PayloadCodec interface is called according to the protocol type. Decode needs to detect the protocol to judge the transmission protocol and payload. Kitex provides defaultCodec extension implementation by default.

## Extension API of PayloadCodec

PayloadCodec API is defined as follows:

```go
// PayloadCodec is used to marshal and unmarshal payload.
type PayloadCodec interface {
	Marshal(ctx context.Context, message Message, out ByteBuffer) error

	Unmarshal(ctx context.Context, message Message, in ByteBuffer) error

	Name() string
}
```

By default, the payload supported by Kitex includes Thrift, Kitex Protobuf and gRPC protocols. Kitex Protobuf is the message protocol based Protobuf, the protocol definition is similar to Thrift message.

In particular, generic call of Kitex is also implemented by extending payloadcodec:

![genericCodecExtension](/img/docs/generic_codec_extension.png)

## Default Codec Usage

Kitex will use the built-in Codec if no customized codec provider set.

- Set default codec size limit, no limit by default
  option: `codec.NewDefaultCodecWithSizeLimit`

```go
maxSizeBytes = 1024 * 1024 * 10 // 10 MB

// server side
svr := xxxservice.NewServer(handler, server.WithCodec(codec.NewDefaultCodecWithSizeLimit(maxSizeBytes)))

// client side
cli, err := xxxservice.NewClient(targetService, client.WithCodec(codec.NewDefaultCodecWithSizeLimit(maxSizeBytes)))
```

## Customized Codec or PayloadCodec Usage

Specify customized Codec and PayloadCodec through option.

- Specify Codec
  option: `WithCodec`

```go
// server side
svr := xxxservice.NewServer(handler, server.WithCodec(yourCodec))

// client side
cli, err := xxxservice.NewClient(targetService, client.WithCodec(yourCodec))

```

-  Specify PayloadCodec
  option: `WithPayloadCodec`

```go
// server side
svr := xxxservice.NewServer(handler, server.WithPayloadCodec(yourPayloadCodec))

// client side
cli, err := xxxservice.NewClient(targetService, client.WithPayloadCodec(yourPayloadCodec))
```
