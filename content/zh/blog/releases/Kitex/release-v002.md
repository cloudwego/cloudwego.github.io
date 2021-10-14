---
title: "Kitex v0.0.2 版本发布"
linkTitle: "Release v0.0.2"
date: 2021-07-30
weight: 2
description: >
  
---

## 优化：

- Kitex 已经禁用了所有的 stats 以优化在没有 tracer 时的性能表现。
- Kitex client 默认连接复用。

## Bug 修复:

- 修复了一个 lbcache 中 nil-pointer 的错误。
- 修复了一个 retry 重试（备份请求）中的数据竟态问题。


## 工具:

- Kitex 工具不再生成默认配置文件
- Kitex 工具现在使用最新的 thriftgo API 以避免老版 API 在生成代码时的几个边角案例。
- Kitex 工具现在会检查代码中是否包含 go 命令，不再假设它的存在。感谢 @anqiansong 的贡献。

## 文档:

- 我们在这个版本中更新了一些文档。
- 我们修改了一些拼写错误和错别字。感谢 @rleungx @Huangxuny1 @JeffreyBool 的贡献。
