---
title: "Prutal"
date: 2025-04-09
weight: 11
keywords: ["Prutal"]
description: "Protobuf 的无生成代码序列化库"
---

## **概要**
    kitex 从 v0.13.0 版本开始将使用自研的 prutal 实现用于替换 Protobuf 的 protoc 、protoc-gen-go 来生成代码、序列化。
    kitex 将不再需要安装 protoc 、protoc-gen-go 。对于新的用户并不会感知相应的变化。
    prutal 在序列化上兼容现有的 protobuf，并且生成代码十分精简、没有多余的代码，并且在序列化性能优于官方。
    技术上 prutal 与 frugal 类似，借助 struct tag 还有高效的反射实现序列化，并不依赖冗余的生成代码。
    当前已经开源，具体实现还有后续的 benchmark 数据可以关注: https://github.com/cloudwego/prutal

## **使用建议**
    初期并不建议用户直接使用 prutal，当前只会承诺通过 kitex 里 prutal 集成的向前和向后兼容性。
    如果在使用 kitex 过程，发现任何问题，可以使用环境变量 KITEX_TOOL_USE_PROTOC 回退到 protobuf
    ```KITEX_TOOL_USE_PROTOC=1 kitex --version```
    长期来看，kitex 将废弃 protoc 的实现。建议遇到使用上的问题，可以反馈以帮助改进。

## **Kitex Tool 变更**
    由于不再使用 protoc 作为默认的代码生成工具，以下的参数将废弃：
    - --protobuf
    - --protobuf-plugin
    这两个参数主要用于直接透传参数到 protoc，kitex 自身并没有实际在使用。如果仍指定使用，将会报错：
    ```
    [ERROR] invalid value "xxx" for flag -protobuf: flag is deprecated
    [ERROR] invalid value "xxx" for flag -protobuf-plugin: flag is deprecated
    ```
    如果用户有需求，可以自行调用 protoc 以及相关的插件进行代码生成。而不是依赖 kitex 去调用 protoc。

    由于旧的protoc 实现的生成路径问题比较复杂，在老的实现中，以下参数并不生效：
    - -gen-path
    其默认值只能为 kitex_gen，在新的 Prutal 中，修复了这问题。

## **Prutal 与 Protobuf 兼容性问题**
    由于 kitex 默认使用 prutal 进行生成代码，
    如果用户直接通过 protobuf 的库 进行 Marshal / Unmarshal 新 kitex 的生成代码将会在编译期发生错误：
    ```cannot use &YourRequest{} (value of type *YourRequest) as protoreflect.ProtoMessage value in argument to proto.Marshal: *YourRequest does not implement protoreflect.ProtoMessage (missing method ProtoReflect)```
    这是因为 protobuf 库与 protobuf 的生成代码是强绑定的，protobuf 需要生成大量的二进制数据以协助其反射的实现。

    建议直接使用 github.com/cloudwego/prutal 包
    ```
    // MarshalAppend appends the protobuf encoding of v to b and returns the new bytes
    func MarshalAppend(b []byte, v interface{}) ([]byte, error)

    // Unmarshal parses the protobuf-encoded data and stores the result in the value pointed to by v.
    func Unmarshal(b []byte, v interface{}) error
    ```

    prutal 兼容 protobuf 的生成代码。因此哪怕原本的代码是官方 protobuf 生成的，都可以使用 prutal 来序列化，以获取更好的性能。
    由于 protobuf实现上比较复杂，功能十分丰富。prutal 很难保证 100% 的功能都可以兼容，如果发现任何问题，欢迎反馈。

## **问题反馈**
    有任何问题均可以向 prutal 提 issue 进行反馈。
    https://github.com/cloudwego/prutal/issues
