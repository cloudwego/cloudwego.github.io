---
title: "Payload Validator"
date: 2024-09-19
weight: 1
keywords: ["Payload Validator"]
description: ""
---

In complex network environments, hardware failures or malicious data tampering may lead to inconsistencies between the data sent and received. In certain scenarios, users need the ability to identify potential data tampering in RPC requests or responses.

Kitex now supports payload validation, which can effectively detect and prevent such issues. Additionally, the framework allows for the extension of custom verification logic, providing a flexible integration approach to meet diverse security needs.

## Note:

- Kitex version >= v0.11.0
- Transport protocol uses ttheader（refer to the doc for configuration [Transport Protocol](https://www.cloudwego.io/docs/kitex/tutorials/basic-feature/protocol/transport_protocol/)）
- Payload protocol uses Thrift（Generic call, gRPC, etc. are not supported now）
- The generated checksum length is limited to 4KB (exceeding this limit will directly return an error).

## Configuration

### CRC32 Check

Both client and server use the `WithCodec` option to configure the codec with crc32 check.

**client side**

```go
import "github.com/cloudwego/kitex/client"
codecCfg := client.WithCodec(codec.NewDefaultCodecWithConfig(codec.CodecConfig{CRC32Check: true})
cli, err := xxx.NewClient(serviceName, codeCfg)
```

**server side**

```go
import "github.com/cloudwego/kitex/server"
codecCfg := server.WithCodec(codec.NewDefaultCodecWithConfig(codec.CodecConfig{CRC32Check: true})
svr, err := xxx.NewServer(handler, codecCfg)
```

Demo：[https://github.com/cloudwego/kitex-tests/blob/main/thriftrpc/normalcall/normalcall_test.go#L523](https://github.com/cloudwego/kitex-tests/blob/main/thriftrpc/normalcall/normalcall_test.go#L523)

### Customize your validator

This feature allows users to extend their own validators by implementing the following interface

```go
// PayloadValidator is the interface for validating the payload of RPC requests, which allows customized Checksum function.
type PayloadValidator interface {
    // Key returns a key for your validator, which will be the key in ttheader
    Key(ctx context.Context) string

    // Generate generates the checksum of the payload.
    // The value will not be set to the request header if "need" is false.
    // DO NOT modify the input payload since it might be obtained by nocopy API from the underlying buffer.
    Generate(ctx context.Context, outboundPayload []byte) (need bool, checksum string, err error)

    // Validate validates the input payload with the attached checksum.
    // Return pass if validation succeed, or return error.
    // DO NOT modify the input payload since it might be obtained by nocopy API from the underlying buffer.
    Validate(ctx context.Context, expectedValue string, inboundPayload []byte) (pass bool, err error)
}
```

use `codec.CodecConfig` to configure

```go
codecOpt := client.WithCodec(
    codec.NewDefaultCodecWithConfig(
       codec.CodecConfig{PayloadValidator: ${your_payload_validator}},
    ),
)
```

Please refer to the following examples (for testing reference only, do not use directly).

```go
var _ PayloadValidator = &mockPayloadValidator{}

type mockPayloadValidator struct {
}

func (m *mockPayloadValidator) Key(ctx context.Context) string {
    return "mockValidator"
}

func (m *mockPayloadValidator) Generate(ctx context.Context, outPayload []byte) (need bool, value string, err error) {
    hash := xxhash3.Hash(outPayload)
    return true, strconv.FormatInt(int64(hash), 10), nil
}

func (m *mockPayloadValidator) Validate(ctx context.Context, expectedValue string, inputPayload []byte) (pass bool, err error) {
    _, value, err := m.Generate(ctx, inputPayload)
    if err != nil {
       return false, err
    }
    return value == expectedValue, nil
}
```
