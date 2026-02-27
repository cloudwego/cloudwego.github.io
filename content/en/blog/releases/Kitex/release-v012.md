---
title: "Kitex Release v0.1.2"
linkTitle: "Release v0.1.2"
projects: ["Kitex"]
date: 2021-12-22
description: >
---

## Hotfix

- Fix some gRPC request bugs which are involved by v0.1.0
- Fix mistake gRPC method path when no package definition in IDL

## Dependency Change

- Chore: upgrade netpoll-http2 to fix the problem about large request package (>4K) in streaming

## Chore

- Chore: use GitHub's `PULL_REQUEST_TEMPLATE` to create a PR
