---
title: "Volo 0.4.1 版本发布"
linkTitle: "Release v0.4.1"
projects: ["Volo"]
date: 2023-03-20
description: >
---

Volo 0.4.1 版本中，除了常规 bugfix 之外，还有一些新的 feature 引入。

## 更为详细的 Thrift Decode 错误信息

之前版本的 Thrift Decode 错误信息只会报告出最基本的错误，而不带有任何上下文。
比如含有如下结构关系

```thrift
struct A {
    1: required B b,
}

struct B {
    2: required C c,
}

struct C {
    3: required string a,
}
```

在对结构`C`的字段`a`进行 Decode 如果发生错误。在之前的版本中错误信息只会报告针对出`a`字段的错误，而在现在的版本中会报告出 Decode 的错误信息链路是在 `A` -> `B` -> `C` 这个过程中发生的，会更方便信息的排查

## 框架 stats 信息

[#149](https://github.com/cloudwego/volo/pull/149) 为框架增加了更多的 stats 信息。用户可以在中间件自行处理这些数据，比如进行日志记录或者上报到监控系统。

## 在服务发现的 Discover 中支持部分 key 的监听

[#155](https://github.com/cloudwego/volo/pull/155) 在服务发现的 Discover 中支持部分 key 的监听，这样可以减少不必要的监听，提升性能。

## 完整 Release Note

完整的 Release Note 可以参考：[Volo Changelog](https://github.com/cloudwego/volo/compare/volo-thrift-0.3.2...volo-0.4.1)
