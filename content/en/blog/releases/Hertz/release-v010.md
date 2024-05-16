---
title: "Hertz Release v0.1.0"
linkTitle: "Release v0.1.0"
projects: ["Hertz"]
date: 2022-06-20
description: >
---

## Feature

- [[#31](https://github.com/cloudwego/hertz/pull/31)] feat: close connection after responding to the short-connection request.
- [[#44](https://github.com/cloudwego/hertz/pull/44)] feat: add the VisitAllCustomHeader method.
- [[#59](https://github.com/cloudwego/hertz/pull/59)] feat: support windows.
- [[#70](https://github.com/cloudwego/hertz/pull/70)] feat: add code generator hz.
- [[#64](https://github.com/cloudwego/hertz/pull/64)] feat: add adaptor for Hertz Request & Response to net/http Request & ResponseWriter.
- [[#45](https://github.com/cloudwego/hertz/pull/45)] feat: add ctx.Body().

## Optimize

- [[#57](https://github.com/cloudwego/hertz/pull/57)] optimize: use http.TimeFormat as layout for http date, which can avoid more copying.
- [[#58](https://github.com/cloudwego/hertz/pull/58)] optimize: add remote address to the error log when server processes the error.
- [[#41](https://github.com/cloudwego/hertz/pull/41)] optimize: use CtxErrorf instead of ‘Errorf’ when server panic.

## Refactor

- [[#37](https://github.com/cloudwego/hertz/pull/37)] refactor: unify the entry of setting request options to prevent options uninitialized from causing panic.
- [[#52](https://github.com/cloudwego/hertz/pull/52)] refactor: omit redundant nil check around loop.
- [[#33](https://github.com/cloudwego/hertz/pull/33)] refactor: simplify code in AddMissingPort.
- [[#27](https://github.com/cloudwego/hertz/pull/27)] refactor: use errors.NewPublic rather than fmt.Errorf.
- [[#34](https://github.com/cloudwego/hertz/pull/34)] refactor: remove fshandler and related tests.

## Style

- [[#29](https://github.com/cloudwego/hertz/pull/29)] style(\*): fix typos.

## Docs

- [[#60](https://github.com/cloudwego/hertz/pull/60)] docs: add icon in README.md and README_cn.md.
- [[#54](https://github.com/cloudwego/hertz/pull/54)] docs: Update README.md.
