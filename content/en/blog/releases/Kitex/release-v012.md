---
title: "Kitex Release v0.1.2"
linkTitle: "Release v0.1.2"
date: 2021-12-22
description: >

---

## Hotfix

* Revert: revert optimization of gRPC connpool
* Perf: Improve the grpc performance by connpool
* Revert: revert "perf: recycle grpc codec buffer by close linkbuffer"
* Fix(gRPC): mistake gRPC method path when no package definition in IDL

## Dependency Change

* Chore: upgrade netpoll-http2 to fix the problem about large request package (>4K) in streaming

## Chore

* Chore: use GitHub's `PULL_REQUEST_TEMPLATE` to create a PR.
