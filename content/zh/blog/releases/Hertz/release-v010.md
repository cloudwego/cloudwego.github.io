---
title: "Hertz v0.1.0 版本发布"
linkTitle: "Release v0.1.0"
projects: ["Hertz"]
date: 2022-06-20
description: >
---

## Feature

- [[#70](https://github.com/cloudwego/hertz/pull/70)] feat: 增加 hz 脚手架。
- [[#64](https://github.com/cloudwego/hertz/pull/64)] feat: 增加 Hertz Request & Response 到 net/http Request & ResponseWriter 的适配器。
- [[#45](https://github.com/cloudwego/hertz/pull/45)] feat: 添加 ctx.Body() 方法。
- [[#44](https://github.com/cloudwego/hertz/pull/44)] feat: 在 request header 上添加 VisitAllCustomHeader 方法，使得传入的函数 f 只作用在用户自定义的 header 上（除了 cookie, host, content-length, content-type, user-agent 和 connection 以外的 header）。
- [[#59](https://github.com/cloudwego/hertz/pull/59)] feat: 支持 windows 开发环境。

## Refactor

- [[#37](https://github.com/cloudwego/hertz/pull/37)] refactor: 统一设置 request options 的入口，防止 options 未初始化导致 panic。
- [[#52](https://github.com/cloudwego/hertz/pull/52)] refactor: 去掉 for 循环中多余的判空。
- [[#33](https://github.com/cloudwego/hertz/pull/33)] refactor:
  当子串长度确定为 1 时，可以直接调用 strings.IndexByte 函数而不是像 strings.Index 一样先调用 len() 判断子串长度后再调用 strings.IndexByte 函数；
  为省去整型数字转字符串的工作，可以将相关变量直接定义成 string 类型而不是 int 类型；
  net 包下的 JoinHostPort 函数会再次判断 ':' 是否在 addr 中，如果不在则将 host 与 port 相关字符串连接起来。然而在 AddingMissingPort 函数中调用 net.JoinHostPort 时，':' 应不在 addr 中。所以在此可以不调用 net.JoinHostPort，而是直接连接 host 和 port 信息。

- [[#27](https://github.com/cloudwego/hertz/pull/27)] refactor: 当字符串不需要格式化时，使用 hertz 的 errors.NewPublic 创建 error 而不是使用 fmt.Errorf。

## Style

- [[#29](https://github.com/cloudwego/hertz/pull/29)] style(\*): 修正拼写错误。

## Optimize

- [[#57](https://github.com/cloudwego/hertz/pull/57)] optimize: 使用 http.TimeFormat 格式化 HTTP 中的 Date 信息，避免产生更多的复制。
- [[#58](https://github.com/cloudwego/hertz/pull/58)] optimize: 服务端错误日志中添加对端地址。
- [[#41](https://github.com/cloudwego/hertz/pull/41)] optimize(recovery): 使用 'CtxErrorf' 代替 'Errorf' 当服务 panic。

## Docs

- [[#60](https://github.com/cloudwego/hertz/pull/60)] docs: readme 文件中添加 icon。
