---
title: "Volo Release 0.4.1"
linkTitle: "Release v0.4.1"
projects: ["Volo"]
date: 2023-03-20
description: >
---

In Volo 0.4.1, in addition to the usual bugfixes, some new features have been introduced.

## More detailed Thrift Decode error messages

Previous versions of Thrift Decode error messages reported only the most basic errors, without any context.
For example, it contained the following structural relationships

```thrift
struct A {
    1: required B b.
}

struct B {
    2: required C c.
}

struct C {
    3: required string a.
}
```

If an error occurs while decoding field `a` of struct `C`. In the previous version the error message was only reported for the field `a`, but in the current version the Decode error path message is reported in the process `A` -> `B` -> `C`, which makes it easier to catch bugs

## Framework stats information

[#149](https://github.com/cloudwego/volo/pull/149) adds more stats information for framework. Users can handle this data in the middleware itself, for example by logging or reporting to the monitoring system.

## Support partial key listening in Discover for service discovery

[#155](https://github.com/cloudwego/volo/pull/155) Support for partial key listening in Discover for service discovery, which reduces unnecessary listening and improves performance.

## Full Release Note

For the full Release Notes, please refer to: [Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.3.2...volo-0.4.1)
