---
title: "Kitex Tool 检查枚举类型说明"
linkTitle: "枚举类型检查"
weight: 12
date: 2025-09-29
description: "Kitex Tool 枚举类型检查说明，介绍 Thrift IDL 枚举值溢出问题的检查机制。"
---

## 背景：枚举 int32 溢出问题

Thrift 协议里，枚举类型实际是以 int32 进行传递的，如果 Thrift IDL 在定义枚举值的时候，值超出了 int32 的范围，在传递时会溢出，对端无法收到正确的值，不能匹配到正确的枚举类型。

**正确性已经存在问题，对服务风险较大！！！**

一种常见的错误写法如下：（把枚举值当成了类似固定格式的错误码的写法，实际作为 int32 溢出了）

```thrift
enum MyEnum{
    A = 3000000001000,
    B = 3000000001001,
    C = 3000000001002,
}
```

## 工具改动：严格检查正确性

一般 Goland IDE 不会提示这个 Thrift 语法问题，但实际只要这样写了，使用枚举就一定会出错。

所以为了保证正确性，避免风险隐患，Kitex Tool 在 v0.15.1 （Thriftgo v0.4.3）之后，会检查这种枚举场景，遇到越界会直接生成失败并提示位置：

```
[WARN] enum overflow: the value (3000000001000) of enum 'xxx/base.thrift MyEnum' exceeds the range of int32.
Due to legacy implementation, thriftgo generates int64 for enums in Go code.
However, during network, values undergo int64->int32->int64 conversion. Values outside int32 will overflow.
Please adjust the enum value to fit within the int32 range [-2147483648, 2147483647].
If you just want to define a very big constant, please use 'const i64 MyConst = xxx' instead.
```

这段报错表示，在 `xxx/base.thrift` 文件下，`MyEnum` 这个枚举的 `3000000001000` 存在溢出。

## 解决方式：修正错误的枚举值

工具的报错会包含错误的枚举值信息：

```
enum overflow: the value (3000000001000) of enum 'xxx/base.thrift MyEnum'
```

你需要根据提示找到有问题的枚举值并修正，调整到 int32 的范围内（-2147483648, 2147483647）。

如果这个 IDL 属于其他公共库，可以 blame 文件历史，联系对应同学进行修改。

**该拦截检查暂不支持跳过**

## 依赖引入的间接影响

非常抱歉，如果你的 IDL 里引入了别人定义的非法 Enum，会对你的产物生成造成影响，为杜绝的这种错误的用法，统一失败处理，辛苦联系对应 IDL 定义的同学进行修改。
