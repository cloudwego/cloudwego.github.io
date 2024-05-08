---
title: "Kitex v0.0.2 版本发布"
linkTitle: "Release v0.0.2"
projects: ["Kitex"]
date: 2021-07-30
description: >
---

## 优化：

- Kitex 在没有 tracer 时关闭 stats 分阶段耗时采集，避免无 Trace 时额外的性能消耗。
- Kitex client 默认使用连接池。

## Bug 修复:

- 修复了一个 lbcache 中 nil-pointer 的错误。
- 修复了一个 retry 重试（Backup Request）中的 data race 问题。

## 工具:

- Kitex 工具去掉默认生成的配置文件。
- Kitex 工具现在使用最新的 thriftgo API 以避免老版 API 在生成代码时的几个边角案例。
- Kitex 工具现在会检查代码中是否包含 go 命令，不再假设它的存在。感谢 @anqiansong 的贡献。

## 文档:

- 我们在这个版本中更新了一些文档。
- 我们修改了一些拼写错误和错别字。感谢 @rleungx @Huangxuny1 @JeffreyBool 的贡献。
