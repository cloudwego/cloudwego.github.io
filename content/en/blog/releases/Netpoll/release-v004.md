---
title: "Netpoll Release v0.0.4"
linkTitle: "Release v0.0.4"
projects: []
date: 2021-09-16
description: >
  
---

## Improvement:

- Support TCP_NODELAY by default
- Read && write in a single loop
- Return real error for nocopy rw
- Change default number of loops policy
- Redefine EventLoop.Serve arg: Listener -> net.Listener
- Add API to DisableGopool
- Remove reading lock
- Blocking conn flush API

## Bugfix:

- Set leftover wait read size

