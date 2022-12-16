---
title: "Netpoll Release v0.1.0"
linkTitle: "Release v0.1.0"
date: 2021-12-01
description: >

---

## Improvement

* add mux.ShardQueue to support connection multiplexing
* input at a single LinkBuffer Node to improve performance
* fix waitReadSize logic bug and enhance input trigger
* reduce timeout issues when waitRead and inputAck have competition
* unify and simplify conn locks

## Bugfix

* ensure EventLoop object will not be finalized before serve return

## Chore

* update readme
* update issue templates

## Breaking Change

* remove WriteBuffer() returned parameter n
