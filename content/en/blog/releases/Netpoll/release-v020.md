---
title: "Netpoll Release v0.2.0"
linkTitle: "Release v0.2.0"
projects: []
date: 2022-02-22
description: >

---

## Improvement

* Feat: on connect callback
* Feat: new conn api - Until
* Feat: support dialing without timeout

## Fix

* Fix: trigger close callback if only set the onConnect callback
* Fix: add max node size to prevent OOM
* Fix: FDOperator.reset() not reset op.OnWrite
* Fix: Write panic when conn Close
* Fix: unit tests may fail

## Chore

* docs: update readme
