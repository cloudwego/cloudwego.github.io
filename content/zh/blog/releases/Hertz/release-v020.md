---
title: "Hertz v0.2.0 版本发布"
linkTitle: "Release v0.2.0"
projects: ["Hertz"]
date: 2022-07-22
description: >
---

## Feature

- [[#124](https://github.com/cloudwego/hertz/pull/124)] feat: 增加参数控制是否使用 hijackConnPool。
- [[#116](https://github.com/cloudwego/hertz/pull/116)] feat: update 也可使用模板更新 handler 及 middleware。
- [[#130](https://github.com/cloudwego/hertz/pull/130)] feat: 如果 Cookie.Value 中存在非法字符，则打印告警日志。
- [[#143](https://github.com/cloudwego/hertz/pull/143)] feat: 增加一个接口支持自定义信号捕捉逻辑，以便根据场景调节优雅退出需要应对的信号类型。
- [[#114](https://github.com/cloudwego/hertz/pull/114)] feat: 标准网络库 Read 方法中调用 connection.Release()，防止在多次少量调用 Read 方法时不回收内存导致的 OOM。
- [[#112](https://github.com/cloudwego/hertz/pull/112)] feat: 修正了 x-www-form-urlencoded 编码下无法读到 bodystream 类型数据。
- [[#105](https://github.com/cloudwego/hertz/pull/105)] feat: client 为 ALPN 和 http2 抽象出协议层 HostClient。client 删除 readbuffersize 和 writebuffersize 配置项。
- [[#92](https://github.com/cloudwego/hertz/pull/92)] feat: hz 命名行工具支持 windows。
- [[#102](https://github.com/cloudwego/hertz/pull/102)] feat: Hertz client 关闭默认的重试逻辑。

## Optimize

- [[#111](https://github.com/cloudwego/hertz/pull/111)] optimize: 调用 bytesconv.AppendHTTPDate 时，为切片预分配容量，以防止产生额外的拷贝。
- [[#128](https://github.com/cloudwego/hertz/pull/128)] optimize: 去掉路由树中无用逻辑。
- [[#108](https://github.com/cloudwego/hertz/pull/108)] optimize: 通过提前调用 regexp.MustCompile，避免程序重复解析正则表达式。

## Chore

- [[#125](https://github.com/cloudwego/hertz/pull/125)] chore: 更新 license check 方式。

## Fix

- [[#104](https://github.com/cloudwego/hertz/pull/104)] fix: cacheLock 可能会因潜在发生的 panic 导致解锁失败。
- [[#96](https://github.com/cloudwego/hertz/pull/96)] fix: ci 可能被调度到 arm 机器上导致报错 exec format error。

## Style

- [[#103](https://github.com/cloudwego/hertz/pull/103)] style: 修正不符合语义的错误拼写 “Ungzipped”。
- [[#90](https://github.com/cloudwego/hertz/pull/90)] style: 常量替换和去掉了重复的类型转换。

## Refactor

- [[#94](https://github.com/cloudwego/hertz/pull/94)] refactor: 使用 appendCookiePart 函数简化代码。

## Docs

- [[#97](https://github.com/cloudwego/hertz/pull/97)] docs: 文档标点符号优化。
