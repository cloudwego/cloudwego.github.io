---
title: "Hertz Release v0.3.2"
linkTitle: "Release v0.3.2"
projects: ["Hertz"]
date: 2022-09-20
description: >
---

## Feature

- [[#198](https://github.com/cloudwego/hertz/pull/198)] feat: add the function to get the client dialer name.
- [[#251](https://github.com/cloudwego/hertz/pull/251)] feat: add a startup log to display the name of the loaded network library.

## Refactor

- [[#238](https://github.com/cloudwego/hertz/pull/238)] refactor: refactor the client logic initialize for HostClient and TLSHostClient.

## Optimize

- [[#226](https://github.com/cloudwego/hertz/pull/226)] optimize: add a warning log for illegal status code.

## Fix

- [[#249](https://github.com/cloudwego/hertz/pull/249)] fix: add channel signal judge to allow onShutdownHook to complete or timeout.
- [[#232](https://github.com/cloudwego/hertz/pull/232)] fix: fix some trailing slash redirect bugs.

## Chore

- [[#217](https://github.com/cloudwego/hertz/pull/217)] chore: update pr template.
