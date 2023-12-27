---
title: "ConfigCenter"
linkTitle: "ConfigCenter"
date: 2023-11-29
weight: 1
keywords: ["ConfigCenter"]
description: "ConfigCenter Extension provided by kitex-contrib"

---

## Kitex provide configuration center

Kitex provides dynamically configurable service management capabilities, including client timeout, retry, circuit breaker, and server limiting.

kitex-contrib provides an extension to the community's mainstream configuration center and realizes dynamic configuration docking with kitex governance features.

Microservice developers can use the configuration center to dynamically obtain service governance configurations, which take effect in near real-time

Currently supported configuration centers are:

| config-center |                          depository                          |
| :-----------: | :----------------------------------------------------------: |
|     nacos     | [config-nacos](https://github.com/kitex-contrib/config-nacos) |
|     etcd      | [config-etcd](https://github.com/kitex-contrib/config-etcd)  |
|    apollo     | [config-apollo](https://github.com/kitex-contrib/config-apollo) |
|     file      | [config-file](https://github.com/kitex-contrib/config-file)  |
|   zookeeper   | [config-zookeepr](https://github.com/kitex-contrib/config-zookeeper) |

## Suite

In the process of connecting to the configuration center, Suite is used for third-party expansion.

Suite is defined as follows:
```go
type Suite interface {
    Options() []Option
}
```
Both the server and the client use the WithSuite method to enable new suites.

For more information about Suite, please see [Suite](../../framework-exten/suite)

