---
title: "SkipDecoder"
date: 2024-06-20
weight: 10
keywords: ["SkipDecoder", "Simplify Generated Code"]
description: "Enable SkipDecoder to break the protocol limitations of Frugal and FastCodec, and simplify the generated code"
---

## Background

For Thrift serialisation protocols, the current Thrift Framed transport (e.g. TTHeader, TTHeaderFramed) uses FastCodec or Frugal for better performance, but for the sake of compatibility with the small number of services that use the Thrift Buffered transport, Kitex still generates Apache Thrift Codec code that conforms to the official interface requirements. (See [Framed and Buffered protocols](https://github.com/apache/thrift/blob/master/doc/specs/thrift-rpc.md#framed-vs-unframed-transport) for details).

This part of the code is huge, averaging close to forty per cent, but there are very few scenarios where it can be used. Removing this part of the code will improve the IDE's loading and compilation speed.

Currently thriftgo (>= v0.3.7) can use `-thrift no_default_serdes` to reduce code generation in this section:

```shell
kitex -thrift no_default_serdes path/to/idl
```

In order to remove this part of the code and still be compatible with the Thrift Buffered protocol, we introduced the SkipDecoder in **Kitex v1.16.0** to achieve this goal.

## Introduction to the principle

The Thrift Buffered protocol does not indicate the length of the Payload in the Header, so it is not possible to directly intercept the Payload for processing by FastCodec or Frugal.

It's natural to think that we could avoid using the Apache Thrift Codec altogether by parsing the Thrift Buffered protocol byte-by-byte and feeding the full Payload to FastCodec and Frugal, which is exactly what SkipDecoder does.

Below is a comparison of the flow with and without SkipDecoder in the Thrift Buffered protocol scenario:

![img](/img/docs/skip_decoder_process_comparison.png)

## Trimming Effect

Take a very complex IDL for example

Before trimming:

```
117M    kitex_gen
```

After trimming:

```
74M    kitex_gen
```

Trims 36% of generated code, nearly 40%, with significant results.

## Using

1. Remove the Apache Thrift Codec with `-thrift no_default_serdes` and regenerate the code.

   ```shell
   kitex -thrift no_default_serdes path/to/your/idl
   ```
    
   This feature requires thriftgo version >= 0.3.7, the latest version is recommended.

2.  Configure SkipDecoder to be enabled 

    Please specify what the code generated in step 1 is used for:

    - Used to construct a Client to call downstream services

    - With FastCodec
  
    ```go
    import (
        "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
        "demo/kitex_gen/kitex/samples/echo/echoservice"
    )
    
    func main() {
        cli := echoservice.MustNewClient("kitex.samples.echo", 
            client.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FastRead|thrift.FastWrite|thrift.EnableSkipDecoder)),
        )
    }
    ```
    
    - With Frugal
  
    ```go
    import (
        "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
        "demo/kitex_gen/kitex/samples/echo/echoservice"
    )
    
    func main() {
        cli := echoservice.MustNewClient("kitex.samples.echo", 
            client.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FrugalRead|thrift.FrugalWrite|thrift.EnableSkipDecoder)),
        )
    }
    ```
    
  - Used to construct a Server for upstream calls

    - With FastCodec
  
    ```go
    import (
        "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
        "demo/kitex_gen/kitex/samples/echo/echoservice"
    )
    
    func main() {
        srv := echoservice.NewServer(handler,
            server.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FastWrite|thrift.FastRead|thrift.EnableSkipDecoder)),
        )
    }
    ```
    
    - With Frugal
  
    ```go
    import (
        "github.com/cloudwego/kitex/pkg/remote/codec/thrift"
        "demo/kitex_gen/kitex/samples/echo/echoservice"
    )
    
    func main() {
        srv := echoservice.NewServer(handler,
            server.WithPayloadCodec(thrift.NewThriftCodecWithConfig(thrift.FrugalWrite|thrift.FrugalRead|thrift.EnableSkipDecoder)),
        )
    }
    ```
    
## Attention

1.  `-thrift no_default_serdes` must be used with SkipDecoder.

- Upstream uses `-thrift no_default_serdes`, then upstream needs to enable SkipDecoder.

- If `-thrift no_default_serdes` is used downstream, then SkipDecoder needs to be enabled downstream.

    Reducing Apache Thrift Codec code generation without turning on SkipDecoder can prevent deserialization.

2.  In order to identify problems that may occur when the SkipDecoder is turned on, the error messages are handled specially.

- SkipDecoder parses the complete Payload period.

    If there is an error in this process, it will contain the following error message:

    ```
    caught in SkipDecoder NextStruct phase
    ```

- SkipDecoder parses the Payload and passes it to FastCodec/Frugal for decoding.
    If there is an error in this process, it will contain the following error message:

  - Using FastCodec

    ```
    caught in FastCodec using SkipDecoder Buffer
    ```

  - Using Frugal

    ```
    caught in Frugal using SkipDecoder Buffer
    ```

## Performance

In SkipDecoder + FastCodec scenarios, deserialization is up to 10% more throughput compared to Apache Thrift Codec.

```
Benchmark_Unmarshal_apache/small                     3763096         294.4 ns/op    1980.61 MB/s
Benchmark_Unmarshal_apache/medium                     145512          7525 ns/op    2327.89 MB/s
Benchmark_Unmarshal_apache/large                        6244        190503 ns/op    2329.64 MB/s
Benchmark_Unmarshal_fastcodec_skip/small             4549530         255.3 ns/op    2283.58 MB/s
Benchmark_Unmarshal_fastcodec_skip/medium             186720          6269 ns/op    2794.32 MB/s
Benchmark_Unmarshal_fastcodec_skip/large                7424        161485 ns/op    2748.27 MB/s
```
