---
title: "Overview"
linkTitle: "Overview"
weight: 1
description: >
---

The cwgo tool supports development in MAC, Linux, and Windows environments, and its main features are as follows:

## Features

- Support for generating engineering templates

  The cwgo tool supports the generation of MVC project layout. Users only need to complete their own business code in the corresponding position according to the functions of different directories, focusing on business logic.

- Support generating Server and Client code

  The cwgo tool supports generating Server and Client codes of Kitex and Hertz, and provides an encapsulation of Client. Users can call downstream out of the box, eliminating the cumbersome steps of encapsulating the Client.

  cwgo Server supports enabling both HTTP and RPC services on the same port. Please refer to [hex usage](https://github.com/cloudwego/hertz-examples/tree/main/hex).

- Support for generating relational database code

  The cwgo tool supports generating relational database CURD code. Users no longer need to encapsulate the cumbersome CURD code by themselves, which improves the user's work efficiency.

- Support for generating document database code

  The cwgo tool supports generating document database CURD code based on IDL (Thrift/protobuf), and currently supports Mongodb. Users no longer need to encapsulate the cumbersome CURD code by themselves, which improves the user's work efficiency.

- Support for generating command line automatic completion scripts

  The cwgo tool supports generating command line completion scripts to improve the efficiency of user command line writing.

- Support analysis of the relationship between Hertz project routing and (routing registration) code

  Cwgo supports analyzing Hertz project code to obtain the relationship between routing and (routing registration) code.

- Support fallback to Kitex, Hz tools

  If you were a Kitex or Hz user before, you can still use the cwgo tool. The cwgo tool supports the fallback function and can be used as Kitex and Hz, truly realizing a tool to generate all.

**cwgo is a CloudWeGo All in one code generation tool, which integrates the advantages of each component to improve the developer experience.**

## Install

{{< tabs "Go 1.16 and later" "Go 1.15 and earlier versions" >}}

{{% codetab %}}

```bash
# Go 1.16 and later
GOPROXY=https://goproxy.cn/ go install github.com/cloudwego/cwgo@latest
```

{{% /codetab %}}

{{% codetab %}}

```bash
# Go 1.15 and earlier versions
GO111MODULE=on GOPROXY=https://goproxy.cn/ go get github.com/cloudwego/cwgo@latest
```

{{% /codetab %}}
{{< /tabs >}}
