---
title: "Payload 校验"
date: 2024-09-19
weight: 1
keywords: ["Payload 校验"]
description: ""
---

在复杂的网络环境中，硬件故障或数据恶意篡改可能导致发送方与接收方之间的数据不一致。在数据敏感的场景下，用户需要能够识别出 RPC 请求或响应中可能出现的数据篡改问题。

为此，Kitex 现已支持 payload 校验功能，能够有效检测并防范此类问题。同时，还支持扩展用户自定义的校验逻辑，提供灵活的接入方式，以满足多样化的安全需求。

## 使用须知

- Kitex 版本 >= v0.11.0
- 传输协议为 ttheader（配置方式参见 [传输协议](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/protocol/transport_protocol/)）
- 使用 thrift 作为 payload 协议（暂不支持泛化调用, gRPC）
- 生成的校验码长度限制为 4KB（超过该限制会直接返回错误）

## 配置方式

### CRC32 校验

client 和 server 均使用 `WithCodec` 的 option 配置包含 crc32 check 的 codec。

**client 侧**

```go
import "github.com/cloudwego/kitex/client"
codecCfg := client.WithCodec(codec.NewDefaultCodecWithConfig(codec.CodecConfig{CRC32Check: true})
cli, err := xxx.NewClient(serviceName, codeCfg)
```

**server 侧**

```go
import "github.com/cloudwego/kitex/server"
codecCfg := server.WithCodec(codec.NewDefaultCodecWithConfig(codec.CodecConfig{CRC32Check: true})
svr, err := xxx.NewServer(handler, codecCfg)
```

Demo 可参考：[https://github.com/cloudwego/kitex-tests/blob/main/thriftrpc/normalcall/normalcall_test.go#L523](https://github.com/cloudwego/kitex-tests/blob/main/thriftrpc/normalcall/normalcall_test.go#L523)

### 扩展自定义的 validator

该功能允许用户扩展自己的 validator，仅需要实现以下 interface

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

并使用 `codec.CodecConfig` 进行配置

```go
codecOpt := client.WithCodec(
    codec.NewDefaultCodecWithConfig(
       codec.CodecConfig{PayloadValidator: ${your_payload_validator}},
    ),
)
```

可参考以下示例（仅测试参考，请勿直接使用）

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
