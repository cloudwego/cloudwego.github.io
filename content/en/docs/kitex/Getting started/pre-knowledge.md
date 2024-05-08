---
title: "Pre-knowledge"
linkTitle: "Pre-knowledge"
weight: 1
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "Pre-knowledge"]
description: "Pre-knowledge for using Kitex"
---

## RPC

**RPC** (Remote Procedure Call) is a method of calling a remote service and receiving a corresponding response. In simple terms, RPC defines a communication process, with no specific constraints on the implementation technology. The core challenges to address in RPC are **serialization** and **network communication**. For example, message content can be serialized and deserialized using `gob/json/pb/thrift`, and network communication can be achieved using `socket/http`. As long as the client and server agree on these aspects, they can correctly parse the messages.

Generally, an RPC framework includes code generation, serialization, and network communication. Mainstream microservices frameworks also provide capabilities for service governance, such as service discovery, load balancing, and circuit breaking.

### RPC Invocation Process

An RPC invocation involves the following basic steps, divided into the client and server sides:

1. (Client) Construct the request parameters and initiate the call.
2. (Client) Obtain the server instance address through service discovery, load balancing, etc., and establish a connection.
3. (Client) Serialize the request parameters into binary data.
4. (Client) Send the data to the server over the network.

---

1. (Server) The server receives the data.
2. (Server) Deserialize the request parameters.
3. (Server) The handler processes the request and returns the response.
4. (Server) Serialize the response into binary data.
5. (Server) Send the data back to the client over the network.

---

1. (Client) Receive the data.
2. (Client) Deserialize the response.
3. (Client) Obtain the result of the invocation.

Step 2, which includes service governance processes, is often referred to as "**service governance**." It typically includes, but is not limited to, service discovery, load balancing, ACL, circuit breaking, rate limiting, and other functionalities. These features are provided by other components and are not specific to the Thrift framework.

### RPC Service Development Process

For example, the development process for an RPC service based on Thrift typically involves the following steps:

1. Write an IDL to define the service interfaces.
2. Use Thrift (or an equivalent code generation tool like Kitex) to generate supporting code for the client and server.
3. The server-side developer writes the handler, which contains the logic to process requests.
4. The server-side developer runs the server to listen on a port and handle requests.
5. The client-side developer writes the client program, which discovers and connects to the server program, initiates requests, and receives responses.

## IDL

The abbreviation for IDL is Interface Definition Language. If we want to use RPC for invocation, we need to know the interface of the other party, what parameters need to be passed, and also the format of the return value. It's like two people communicating with each other, they need to ensure that they are speaking the same language and talking about the same thing. IDL is used to solve this problem by defining the protocol for both parties, just like when we call a function in code, we need to know its signature.

For RPC frameworks, IDL serves as both an interface description language and a module for generating specific language interfaces based on the IDL file. This greatly simplifies the development work. The service provider (server) only needs to write the IDL, use code generation tools to generate code, and then implement the interface. The service caller (client) only needs to generate code based on the IDL provided by the service provider and make calls. This also involves service discovery, load balancing, and other issues, but they are not within the scope of IDL and will not be discussed in detail here.

Kitex supports two types of IDL by default: Thrift and proto3. This article provides a brief introduction to the syntax of Thrift IDL. For proto3 syntax, you can refer to the [Language Guide (proto3)](https://developers.google.com/protocol-buffers/docs/proto3) provided by Google.

> Please note: Thrift is an RPC framework that uses IDL files with the .thrift extension. Therefore, the term "thrift" is often used to refer to IDL. Please determine the context to understand the meaning correctly.

### Basic Syntax

#### Primitive Types

Thrift IDL has the following primitive types:

- **bool**: Boolean type
- **byte**: Signed byte
- **i8**: 8-bit signed integer (not supported in older versions)
- **i16**: 16-bit signed integer
- **i32**: 32-bit signed integer
- **i64**: 64-bit signed integer
- **double**: 64-bit floating-point number
- **string**: String (encoding unknown or binary string)

**Note**: Thrift IDL does not have unsigned integer types because many programming languages do not have native support for unsigned integers.

#### Special Types

- binary

  : Represents a byte array without encoding requirements. It should be used for byte array cases (e.g., transmitting serialized data in JSON/PB between Thrift RPCs) instead of the string type.

  - The Go implementation of Thrift uses the string type to store both string and binary data. The underlying string is just a byte array and does not guarantee UTF-8 encoding. This behavior may differ from other languages.

#### Containers

Thrift provides strongly-typed containers that map to commonly used container types in most programming languages. The following three container types are supported:

- **list< t1 >**: An ordered list of elements of type t1 that allows duplicate elements. Translates to an STL vector, Java ArrayList, native arrays in scripting languages, etc.
- **set< t1 >**: An unordered set of elements of type t1 that does not allow duplicate elements.
- **map<t1,t2>**: A map with keys of type t1 and values of type t2.

#### Type Definitions

Thrift supports type definitions similar to C/C++:

```thrift
typedef i32 MyInteger

typedef Tweet ReTweet
```

**Note: typedef** definitions do not end with a semicolon.

#### Enumerations

Thrift provides enumeration types:

- The compiler assigns values starting from 0 by default.
- You can assign specific values (integers) to individual variables.
- Nested enums are not supported.

```thrift
enum TweetType {
    TWEET, // 0
    RETWEET = 2, // 2
    DM = 0xa, // 10
    REPLY // 11
}
```

#### Comments

Thrift supports C-style multi-line comments and C++/Java-style single-line comments:

```thrift
/*
* This is a multi-line comment.
* Just like in C.
*/

// C++/Java style single-line comments work just as well.
```

#### Namespaces

Thrift namespaces are similar to C++ namespaces and Java packages. They provide a way to organize (isolate) code and avoid naming conflicts within type definitions.

Thrift provides namespace definitions for different languages:

```thrift
namespace cpp com.example.project

namespace java com.example.project

namespace go com.example.project
```

#### Include

To facilitate the management and maintenance of IDL, it is often necessary to split the Thrift IDL definitions into different files. Thrift allows files to include other Thrift files, and users can access specific definitions using the file name as a prefix.

```thrift
include "tweet.thrift" ...

struct TweetSearchResult {
    1: list<tweet.Tweet> tweets;
}
```

#### Constants

Thrift defines constants as follows:

```thrift
const i32 INT_CONST = 1234;

const map<string,string> MAP_CONST = {
    "hello": "world",
    "goodnight": "moon"
}
```

#### Struct and Requiredness Explanation

A struct in Thrift is composed of different fields, where each field has a unique integer **id**, a **type**, a **name**, and an optional default value **default value**.

- **id**: Each field must have a positive integer identifier.
- type: There are three types:
  - required: Indicates a field that is required to be present during encoding (recommended **mandatory**). From a maintenance perspective, it is not recommended to use the required modifier for fields.
    - Note: The official explanation of this modifier in Thrift is that it is expected to be set. In the Golang implementation, if a field is nil, it will still be encoded. Therefore, the receiving end will receive an empty struct.
  - optional: Indicates an optional field.
    - If the field is not set and does not have a default value, it will not be serialized.
    - For non-pointer fields, the struct must be initialized using the NewXXX method **in order to populate the default value**. The &XXX{} syntax cannot be used.
  - default: Indicates a field without any modifier, making it a default type.
    - Note: If the sender sends nil, the receiver will construct the default value. If the receiver expects to receive nil, the field should be marked as optional.

```thrift
struct Location {
    1: required double latitude;
    2: required double longitude;
}

struct Tweet {
    1: required i32 userId;
    2: required string userName;
    3: required string text;
    4: optional Location loc; // Struct can contain other structs
    16: optional string language = "english" // Default value can be set
}
```

**Note:**

1. Thrift does not support nested struct definitions.
2. **If a struct is already in use, do not change the id and type of its fields**.
3. If there are no special requirements, it is **recommended to use optional**. Due to the need to maintain compatibility with the official Go implementation of Apache Thrift, Kitex retains the handling logic of required and default modifiers that may be unreasonable. For example, in a structure like Request(struct type).User(struct type).Name(string type), if both User and Name are marked as required, but the client does not assign a value to User (i.e., request.User == nil), encoding on the client side will not throw an error, but it will write the id and type(struct) of User. When decoding on the server side, User will be initialized (i.e., request.User != nil), but when trying to decode Name, an error will occur if it is not found.

#### Exception

An exception in Thrift is similar to a struct, but it is used to integrate with the exception handling mechanism of the target programming language. All the field names defined within an exception must be unique.

#### Service

In Thrift, a service definition is semantically equivalent to an interface in OOP. Code generation tools generate client and server-side interface implementations based on the service definition.

- The parameter and return value types of a service method can be basic types or structs.

> oneway itself does not guarantee reliability and has some special handling risks, so it is not recommended to use it.

```thrift
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

### IDL Example

Below is a simple Thrift IDL example consisting of two files: `common.thrift` and `service.thrift`.

- common.thrift: It includes the usage of various types and the definition of a struct.

```thrift
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

- service.thrift: It references `common.thrift` and defines a service.
  - tMethod: It takes a parameter of type `TestRequest` and returns a value of type `TestResponse`.

```thrift
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

### Kitex Thrift IDL Specification

To comply with the specifications for service invocations, Kitex imposes certain requirements on the IDL definitions:

- Methods can only have one parameter, and the parameter type must be a custom struct type with a name in camel case, typically `XXXRequest`.
- The return value type of methods must be a custom struct type, and it cannot be `void`. The return type should also be named using camel case, typically `XXXResponse`.

### References

[Apache Thrift - Thrift Type System](https://thrift.apache.org/docs/types)

[Thrift: The Missing Guide](https://diwakergupta.github.io/thrift-missing-guide/)
