---
title: "Kitex Tool Enum Type Checking Instructions"
linkTitle: "Enum Type Checking"
weight: 12
date: 2025-09-29
description: "Kitex Tool enum type checking instructions, introducing the checking mechanism for Thrift IDL enum value overflow issues."
---

## Background: Enum int32 Overflow Issue

In the Thrift protocol, enum types are actually passed as int32. If the Thrift IDL defines enum values that exceed the int32 range, they will overflow during transmission, and the peer cannot receive the correct value and cannot match the correct enum type.

**The correctness already has issues, posing a significant risk to the service!!!**

A common error writing is as follows: (treating enum values as similar to fixed-format error codes, actually overflowing as int32)

```thrift
enum MyEnum{
    A = 3000000001000,
    B = 3000000001001,
    C = 3000000001002,
}
```

## Tool Changes: Strict Correctness Checking

Generally, Goland IDE will not prompt this Thrift syntax issue, but as long as it's written this way, using enums will definitely cause errors.

Therefore, to ensure correctness and avoid risk hazards, Kitex Tool after v0.15.1 (Thriftgo v0.4.3) will check this enum scenario, and when encountering out-of-bounds, it will directly fail to generate and prompt the location:

```
[WARN] enum overflow: the value (3000000001000) of enum 'xxx/base.thrift MyEnum' exceeds the range of int32.
Due to legacy implementation, thriftgo generates int64 for enums in Go code.
However, during network, values undergo int64->int32->int64 conversion. Values outside int32 will overflow.
Please adjust the enum value to fit within the int32 range [-2147483648, 2147483647].
If you just want to define a very big constant, please use 'const i64 MyConst = xxx' instead.
```

This error message indicates that in the `xxx/base.thrift` file, the enum `3000000001000` of `MyEnum` overflows.

## Solution: Correct Incorrect Enum Values

The tool's error message will contain information about the incorrect enum value:

```
enum overflow: the value (3000000001000) of enum 'xxx/base.thrift MyEnum'
```

You need to find the problematic enum value according to the prompt and correct it to within the int32 range (-2147483648, 2147483647).

If this IDL belongs to other public libraries, you can blame the file history and contact the corresponding classmate to modify it.

**This interception check does not support skipping for now**

## Indirect Impact of Dependency Introduction

Sorry, if your IDL introduces illegally defined Enums from others, it will affect your product generation. To eliminate this wrong usage, unified failure handling is applied. Please contact the corresponding IDL definition classmates to modify it.
