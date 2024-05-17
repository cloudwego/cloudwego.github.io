---
title: "Kitex Release v0.2.0"
linkTitle: "Release v0.2.0"
projects: ["Kitex"]
date: 2022-02-24
description: >
---

## Feature

- Feat(grpc): support options to set the internal params of gRPC
- Feat(kerror): add new func WithCauseAndExtraMsg for basicError
- Feat(rpcinfo): add FreezeRPCInfo to support asynchronous context usage
- Feat(codec): default codec supports size limit

## Bugfix

- Fix(remotecli): fix bug that released connections may be reused
- Fix(generic): generic call supports extended services
- Fix(generic): fix generic call oneway flag

## Optimise

- Optimize(retry): improve retry success rate when do failure retry

## Chore

- Chore: upgrade netpoll to v0.2.0
- Chore:add third party license
