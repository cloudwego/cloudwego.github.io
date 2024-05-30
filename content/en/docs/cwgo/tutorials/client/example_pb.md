---
title: "protobuf usage"
linkTitle: "protobuf usage"
weight: 3
description: >
---

## RPC Client

### Write IDL

```protobuf
// hello.proto
syntax = "proto3";

package hello;

option go_package = "cwgo/rpc/hello";

message HelloReq {
   string Name = 1;
}

message HelloResp {
   string RespBody = 1;
}

service HelloService {
   rpc Method1(HelloReq) returns(HelloResp);
}
```

### Execute Command

> Note: 项目位于非 GOPATH 下必须指定 gomod，GOPATH 下默认以相对于 GOPATH 的路径作为名字，可不指定 gomod。

```sh
cwgo client  --type RPC  --idl hello.proto  --server_name hellotest --module {{your_module_name}} -I .
```

### Generate Code

The directory structure and file meaning of the generated code are similar to Thrift, please refer to [Generate Code](/docs/cwgo/tutorials/client/example_thrift/#generate-code).

## HTTP Client

### Write IDL

Write a simple IDL for generating HTTP Server, which requires adding `api.$method` and `api.base_domain` annotations are used to fill in `uri` and `host`, please refer to them for details [Hertz IDL Annotation Description](/docs/hertz/tutorials/toolkit/annotation/).

#### 创建 api.proto

```protobuf
// api.proto; Annotation extension
syntax = "proto2";

package api;

import "google/protobuf/descriptor.proto";

option go_package = "cwgo/http/api";

extend google.protobuf.FieldOptions {
    optional string raw_body = 50101;
    optional string query = 50102;
    optional string header = 50103;
    optional string cookie = 50104;
    optional string body = 50105;
    optional string path = 50106;
    optional string vd = 50107;
    optional string form = 50108;
    optional string js_conv = 50109;
    optional string file_name = 50110;
    optional string none = 50111;

    // 50131~50160 used to extend field option by hz
    optional string form_compatible = 50131;
    optional string js_conv_compatible = 50132;
    optional string file_name_compatible = 50133;
    optional string none_compatible = 50134;
    // 50135 is reserved to vt_compatible
    // optional FieldRules vt_compatible = 50135;

    optional string go_tag = 51001;
}

extend google.protobuf.MethodOptions {
    optional string get = 50201;
    optional string post = 50202;
    optional string put = 50203;
    optional string delete = 50204;
    optional string patch = 50205;
    optional string options = 50206;
    optional string head = 50207;
    optional string any = 50208;
    optional string gen_path = 50301; // The path specified by the user when the client code is generated, with a higher priority than api_version
    optional string api_version = 50302; // Specify the value of the :version variable in path when the client code is generated
    optional string tag = 50303; // rpc tag, can be multiple, separated by commas
    optional string name = 50304; // Name of rpc
    optional string api_level = 50305; // Interface Level
    optional string serializer = 50306; // Serialization method
    optional string param = 50307; // Whether client requests take public parameters
    optional string baseurl = 50308; // Baseurl used in ttnet routing
    optional string handler_path = 50309; // handler_path specifies the path to generate the method

    // 50331~50360 used to extend method option by hz
    optional string handler_path_compatible = 50331; // handler_path specifies the path to generate the method
}

extend google.protobuf.EnumValueOptions {
    optional int32 http_code = 50401;

// 50431~50460 used to extend enum option by hz
}

extend google.protobuf.ServiceOptions {
    optional string base_domain = 50402;

    // 50731~50760 used to extend service option by hz
    optional string base_domain_compatible = 50731;
}

extend google.protobuf.MessageOptions {
    // optional FieldRules msg_vt = 50111;

    optional string reserve = 50830;
    // 550831 is reserved to msg_vt_compatible
    // optional FieldRules msg_vt_compatible = 50831;
}
```

#### Create hello.proto

```protobuf
// hello.proto
syntax = "proto3";

package hello;

option go_package = "cwgo/http/hello";

import "api.proto";

message HelloReq {
   string Name = 1[(api.query)="name"];
}

message HelloResp {
   string RespBody = 1;
}

service HelloService {
   rpc Method1(HelloReq) returns(HelloResp) {
      option (api.get) = "/hello";
   }
}
```

### Execute Command

> Note: If the project is located outside of GOPATH, gomod must be specified. GOPATH defaults to a path relative to GOPATH as the name, and gomod may not be specified.

```sh
cwgo client  --type HTTP  --idl hello.proto  --server_name hellotest --module {{your_module_name}}
```

### Generate Code

The directory structure and file meaning of the generated code are similar to Thrift, please refer to [Generate Code](/docs/cwgo/tutorials/client/example_thrift/#generate-code-1).
