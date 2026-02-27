---
title: "Kitex Release v0.1.3"
linkTitle: "Release v0.1.3"
projects: ["Kitex"]
date: 2021-12-30
description: >
---

## Feature

- Transmit the Base from client to server for getting the caller info in JSON generic

## Bugfix

- Fix(grpc): fix metric missing method tag in streaming
- Fix(generic): fix the incompatible modification about base64 binary in the JSON and HTTP generic
- Fix(grpc): fix the bug of grpc flow control, which brings the problem of continuous timeout

## CI

- Add scenario tests

## Chore

- update the [ROADMAP](https://github.com/cloudwego/kitex/blob/develop/ROADMAP.md)
