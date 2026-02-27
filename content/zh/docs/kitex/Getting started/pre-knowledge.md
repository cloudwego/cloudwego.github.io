---
title: "前置知识"
linkTitle: "前置知识"
weight: 1
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "前置知识"]
description: "Kitex 开发前置知识"
---

## RPC

**RPC** (Remote Procedure Call) ，即远程过程调用。通俗来讲，就是调用远端服务的某个方法，并获取到对应的响应。RPC 本质上定义了一种通信的流程，而具体的实现技术没有约束，核心需要解决的问题为**序列化**与**网络通信**。如可以通过 `gob/json/pb/thrift` 来序列化和反序列化消息内容，通过 `socket/http` 来进行网络通信。只要客户端与服务端在这两方面达成共识，能够做到消息正确的解析接口即可。

一般来说，RPC 框架包括了代码生成、序列化、网络通讯等，主流的微服务框架也会提供服务治理相关的能力，比如服务发现、负载均衡、熔断等等。

### RPC 调用的流程

一次 rpc 调用包括以下基本流程，分为客户端和服务端两个部分：

1. （客户端）构造请求参数，发起调用
2. （客户端）通过服务发现、负载均衡等得到服务端实例地址，并建立连接
3. （客户端）请求参数序列化成二进制数据
4. （客户端）通过网络将数据发送给服务端

---

5. （服务端）服务端接收数据
6. （服务端）反序列化出请求参数
7. （服务端）handler 处理请求并返回响应结果
8. （服务端）将响应结果序列化成二进制数据
9. （服务端）通过网络将数据返回给客户端

---

10. （客户端）接收数据
11. （客户端）反序列化出结果
12. （客户端）得到调用的结果

其中步骤 2 中包含的流程称为「**服务治理**」，通常包括并不限于服务发现、负载均衡、ACL、熔断、限流等等功能。这些功能是由其他组件提供的，并不是 Thrift 框架所具有的功能。

### RPC 服务开发流程

例如基于 Thrift 的 RPC 服务开发，通常包括如下过程：

1. 编写 IDL，定义服务 (Service) 接口。
2. 使用 thrift（或者等价的生成代码工具，如 kitex 等）生成客户端、服务端的支持代码。
3. 服务端开发者编写 handler ，即请求的处理逻辑。
4. 服务端开发者运行服务监听端口，处理请求。
5. 客户端开发者编写客户端程序，经过服务发现连接上服务端程序，发起请求并接收响应。

## IDL

**IDL** 全称是 Interface Definition Language，接口定义语言。

如果我们要使用 RPC 进行调用，就需要知道对方的接口是什么，需要传什么参数，同时也需要知道返回值是什么样的，就好比两个人之间交流，需要保证在说的是同一个语言、同一件事。IDL 就是为了解决这样的问题，通过 IDL 来约定双方的协议，就像在写代码的时候需要调用某个函数，我们需要知道 `签名`一样。

对于 RPC 框架，IDL 不仅作为接口描述语言，还会根据 IDL 文件生成指定语言的接口定义模块，这样极大简化了开发工作。服务提供方（服务端）需要做的变为 编写 IDL -> 使用代码生成工具生成代码 -> 实现接口；服务调用方（客户端）只需根据服务提供方（服务端）提供的 IDL 生成代码后进行调用。这当中还有服务发现、负载均衡等问题，但不属于 IDL 范畴，故不展开介绍。

Kitex 默认支持 `thrift` 和 `proto3` 两种 IDL。本文简单介绍 Thrift IDL 语法，proto3 语法可参考：[Language Guide(proto3)](https://developers.google.com/protocol-buffers/docs/proto3)

> 注意：Thrift 是一款 RPC 框架，其使用的 IDL 以 .thrift 为后缀，故常常也使用 thrift 来表示 IDL，请根据上下文判断语意。

### 基础语法

#### 基本类型

Thrift IDL 有以下几种基本类型：

- **bool**: 布尔型
- **byte**: 有符号字节
- **i8**: 8位有符号整型（低版本不支持）
- **i16**: 16位有符号整型
- **i32**: 32位有符号整型
- **i64**: 64位有符号整型
- **double**: 64位浮点型
- **string**: 字符串（编码方式未知或二进制字符串）

**注意**：Thrift IDL 没有无符号整数类型。 因为许多编程语言中没有原生的无符号整数类型。

#### 特殊类型

- binary: 表示无编码要求的 byte 二进制数组。因此是字节数组情况下（比如 json/pb 序列化后数据在 thrift rpc 间传输）请使用 binary 类型，不要使用 string 类型；
  - Golang 的实现 string/binary 都使用 string 类型进行存储，string 底层只是字节数组不保证是 UTF-8 编码的，可能与其他语言的行为不一致。

#### 容器

Thrift 提供的容器是强类型容器，映射到大多数编程语言中常用的容器类型。具体包括以下三种容器：

- **list< t1 >**: 元素类型为 t1 的有序列表，允许元素重复。Translates to an STL vector, Java ArrayList, native arrays in scripting languages, etc.
- **set< t1 >**: 元素类型为 t1 的无序表，不允许元素重复。
- **map<t1,t2>**: 键类型为 t1，值类型为 t2 的 map。

#### 类型定义

Thrift 支持类似 C/C++ 的类型定义

```Thrift
typedef i32 MyInteger

typedef Tweet ReTweet
```

**注意：typedef** 定义的末尾没有分号

#### 枚举类型

Thrift 提供了枚举类型

- 编译器默认从 0 开始赋值
- 可以对某个变量进行赋值（整数）
- 不支持嵌套的 enum

```Thrift
enum TweetType {
    TWEET, //
    RETWEET = 2, //
    DM = 0xa,
    REPLY
}
```

#### 注释

Thrift 支持 c风格的多行注释 和 c++/Java 风格的单行注释

```Thrift
/*
* This is a multi-line comment.
* Just like in C.
*/

// C++/Java style single-line comments work just as well.
```

#### 命名空间

Thrift 的命名空间与 C++ 的 namespace 和 java 的 package 类似，提供了一种组织（隔离）代码的方式，也可避免类型定义内名字冲突的问题。

Thrift 提供了针对不同语言的 namespace 定义方式：

```Thrift
namespace cpp com.example.project

namespace java com.example.project

namespace go com.example.project
```

#### Include

为了方便管理、维护 IDL，常常需要将 Thrift IDL 定义拆分到不同的文件。Thrift 允许文件 include 其它的 thrift 文件，用户可利用文件名作为前缀对具体定义进行访问。

```Thrift
include "tweet.thrift" ...

struct TweetSearchResult {
    1: list<tweet.Tweet> tweets;
}
```

#### 常量

Thrift 内定义常量的方式如下：

```Thrift
const i32 INT_CONST = 1234;

const map<string,string> MAP_CONST = {
    "hello": "world",
    "goodnight": "moon"
}
```

#### Struct 及 Requiredness 说明

Struct 由不同的 fields 构成，其中每个 **field** 有唯一的整型 **id**，类型 **type**，名字 **name** 和 一个可选择设置的默认值 **default value**。

- **id**：每个 field 必须有一个正整数的标志符
- type：包括三种类型
  - required：编码必写字段（建议**必填**），从维护角度不建议用 required 修饰字段
    - 注意：该修饰在 thrift 官方的解释如下，期望被 set，在 Golang 的实现里如果某个字段为 nil，实际还是会编码，所以对端收到的是空struct。
  - optional：可选字段。
    - 若没有设置该字段且**没有默认值**的话，则不对该字段进行序列化
    - 对于非指针字段，**需要调用** NewXXX 方法来初始化结构体**才能填入默认值**，不能用 &XXX{} 方式
  - default：不加修饰则是 default 类型
    - 注意：**发送方发 nil，接收方会构造默认值**，如果希望接收方同样接收 nil 需要用 optional 修饰

```Thrift
struct Location {
    1: required double latitude;
    2: required double longitude;
}

struct Tweet {
    1: required i32 userId;
    2: required string userName;
    3: required string text;
    4: optional Location loc; // Struct的定义内可以包含其他 Struct
    16: optional string language = "english" // 可设置默认值
}
```

**注意：**

1. Thrift 不支持嵌套定义 Struct
2. **如果 struct 已经在使用了，请不要更改各个 field 的 id 和 type**
3. 如果没有特殊需求，**建议都使用 optional**。由于 Kitex 需要保留和 apache 官方 Go 实现兼容性，也保留了对于 required 和 default 修饰的字段处理逻辑的不合理之处。例如 Request(struct类型).User(struct类型).Name(string类型) 这样一个结构，如果 User 和 Name 都是 required，但 client 端没有给 User 赋值（即 request.User == nil), 在 client 端编码不会报错，但是会将 User 的 id 和 type(struct) 写入，在 server 端解码时会初始化 User（即 request.User != nil），但是在继续解码 User 时读不到 Name 字段，就会报错。

#### Exception

Exception 与 struct 类似，但它被用来集成 目标编程语言 中的异常处理机制。Exception 内定义的所有 field 的名字都是唯一的。

#### Service

Thrift 内的 service 定义在语义上和 oop 内的接口是相同的。代码生成工具会根据 service 的定义生成 client 和 service 端的接口实现。

- Service 的参数和返回值类型可以是 基础类型 或者 struct

> oneway 本身不具有可靠性，且在处理上比较特殊会带来一些隐患，不建议使用

```Thrift
service Twitter {
    // A method definition looks like C code. It has a return type, arguments,
    // and optionally a list of exceptions that it may throw. Note that argument
    // lists and exception list are specified using the exact same syntax as
    // field lists in structs.

    void ping(); // 1
    bool postTweet(1:Tweet tweet); // 2
    TweetSearchResult searchTweets(1:string query); // 3

    // The 'oneway' modifier indicates that the client only makes a request and does not wait for any response at all. Oneway methods MUST be void.
    oneway void zip() // 4
}
```

### IDL 示例

以下为简单的 thrift idl 示例，包含 common.thrift 和 service.thrift 两个文件。

- common.thrift：包含各种类型的使用和 struct 的定义。

```Thrift
namespace go example.common

// typedef
typedef i32 TestInteger

// Enum
enum TestEnum {
    Enum1 = 1,
    Enum2,
    Enum3 = 10,
}

// Constant
const i32 TestIntConstant = 1234;

// Struct
struct TestStruct {
    1: bool sBool
    2: required bool sBoolReq
    3: optional bool sBoolOpt
    4: list<string> sListString
    5: set<i16> sSetI16
    6: map<i32,string> sMapI32String
}
```

- service.thrift：引用 common.thrift，定义 service。
  - tMethod：接收一个类型为 TestRequest 的参数，返回一个类型为 TestResponse 的返回值。

```Thrift
namespace go example.service

include "common.thrift"

struct TestRequest {
   1: string msg
   2: common.TestStruct s
}

struct TestResponse {
   1: string msg
   2: common.TestStruct s
}

service TestService {
   TestResponse tMethod(1: TestRequest req)
}
```

### Kitex Thrift IDL 规范

为满足服务调用的规范，Kitex 对 IDL 的定义提出了一些必须遵守的要求：

- 方法只能拥有一个参数，并且这个参数类型必须是自定义的 Struct 类型，参数类型名字使用驼峰命名法，通常为：`XXXRequest`
- 方法的返回值类型必须是自定义的 Struct 类型，不可以为 void，使用驼峰命名法，通常为：`XXXResponse`

### 参考

[Apache Thrift - Thrift Type system](https://thrift.apache.org/docs/types)

[Thrift: The Missing Guide](https://diwakergupta.github.io/thrift-missing-guide/)
