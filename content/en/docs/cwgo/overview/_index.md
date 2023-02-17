---
title: "Overview"
linkTitle: "Overview"
weight: 1
description: >

---

# cwgo

cwgo is a CloudWeGo All in one code generation tool, which integrates the advantages of each component to improve the developer experience.
The cwgo tool can easily generate engineering templates, and its main features are as follows:

## Features
- User-friendly way of generating

  The cwgo tool provides both interactive command line and static command line. The interactive command line can generate code at low cost, no need to care about passing parameters, and no need to execute multiple commands,
  It is suitable for most users; users who need advanced functions can still use the regular static command line construction to generate commands.
- Support for generating engineering templates

  The cwgo tool supports the generation of MVC project layout. Users only need to complete their own business code in the corresponding position according to the functions of different directories, focusing on business logic.
- Support generating Server and Client code

  The cwgo tool supports generating Server and Client codes of Kitex and Hertz, and provides an encapsulation of Client. Users can call downstream out of the box, eliminating the cumbersome steps of encapsulating the Client
- Support for generating database code

  The cwgo tool supports generating database CURD code. Users no longer need to encapsulate the cumbersome CURD code by themselves, which improves the user's work efficiency.
- Support fallback to Kitex, Hz tools

  If you were a Kitex or Hz user before, you can still use the cwgo tool. The cwgo tool supports the fallback function and can be used as Kitex and Hz, truly realizing a tool to generate all.

## Install
```
# Go 1.15 and earlier versions
GO111MODULE=on GOPROXY=https://goproxy.cn/, direct go get github.com/cloudwego/cwgo@latest

# Go 1.16 and later
GOPROXY=https://goproxy.cn/, direct go install github.com/cloudwego/cwgo@latest
```
