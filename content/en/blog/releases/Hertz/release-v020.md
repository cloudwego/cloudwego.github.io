---
title: "Hertz Release v0.2.0"
linkTitle: "Release v0.2.0"
projects: ["Hertz"]
date: 2022-07-22
description: >
---

## Feature

- [[#124](https://github.com/cloudwego/hertz/pull/124)] feat: add option to remove hijackConnPool.
- [[#116](https://github.com/cloudwego/hertz/pull/116)] feat: update for template.
- [[#130](https://github.com/cloudwego/hertz/pull/130)] feat: add a warning log for invalid character in Cookie.Value.
- [[#143](https://github.com/cloudwego/hertz/pull/143)] feat: custom signal to graceful shutdown
- [[#114](https://github.com/cloudwego/hertz/pull/114)] feat: release buffer in standard network method.
- [[#112](https://github.com/cloudwego/hertz/pull/112)] feat: parse post args in bodystream.
- [[#105](https://github.com/cloudwego/hertz/pull/105)] feat: client abstracts hostclient layer.
- [[#92](https://github.com/cloudwego/hertz/pull/92)] feat: hz support windows.
- [[#102](https://github.com/cloudwego/hertz/pull/102)] feat: client removes default retry logic.

## Optimize

- [[#111](https://github.com/cloudwego/hertz/pull/111)] optimize: pre-allocate slice when calling bytesconv.AppendHTTPDate.
- [[#128](https://github.com/cloudwego/hertz/pull/128)] optimize: remove useless judgement.
- [[#108](https://github.com/cloudwego/hertz/pull/108)] optimize: avoid parsing regular expression repeatedly.

## Chore

- [[#125](https://github.com/cloudwego/hertz/pull/125)] Update pr-check.yml.

## Fix

- [[#104](https://github.com/cloudwego/hertz/pull/104)] fix: use defer to guarantee that mutex will be unlocked.
- [[#96](https://github.com/cloudwego/hertz/pull/96)] fix: ci exec /bin/license-eye: exec format error

## Style

- [[#103](https://github.com/cloudwego/hertz/pull/103)] style: fixed the typo "ungzipped" to "gunzipped".
- [[#90](https://github.com/cloudwego/hertz/pull/90)] style: use const var and remove duplicate type conversions.

## Refactor

- [[#94](https://github.com/cloudwego/hertz/pull/94)] refactor: use appendCookiePart to simplify code.

## Docs

- [[#97](https://github.com/cloudwego/hertz/pull/97)] docs: use comma to separate && remove extra space.
