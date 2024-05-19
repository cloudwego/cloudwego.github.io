---
title: "Kitex Release v0.1.4"
linkTitle: "Release v0.1.4"
projects: ["Kitex"]
date: 2022-01-18
description: >
---

## Improvement

- Optimize(log): don't print timeout log in rpctimeout middleware
- Optimize(log): adjust default log level to info
- Optimize(gRPC): lock the sendAt avoid grpc bdp data race

## Bugfix

- Fix(client-connection): fix a connection leaking bug that happens when clients fail at Send
- Fix(timeout): fix TimeoutAdjust won't work when set in middleware builder

## Tool

- Fix(tool): fix protobuf handler arguments name
  > kitex will generate a stream type named "{{.ServiceName}}{{.Name}}Server" for each streaming server,
  > but in handler.go kitex use "{{.ServiceName}}{{.RawName}}Server" as stream name.

## Chore

- Style: remove unnecessary type conversions
