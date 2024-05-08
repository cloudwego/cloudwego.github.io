---
title: "Kitex Release v0.0.2"
linkTitle: "Release v0.0.2"
projects: ["Kitex"]
date: 2021-07-30
description: >
---

## Improvement:

- Kitex now disables all stats to improve performance when no tracer is provided.
- The Kitex client now will reuse connections by default.

## Bugfix:

- A nil-pointer bug in lbcache has been fixed.
- A data-race issue in the retry(backup request) is fixed.

## Tool:

- The kitex tool no longer generates a default config file.
- The kitex tool now uses the latest API of thriftgo which fixes several bad corner cases in code generation.
- The kitex tool now checks the existence of the go command instead of assuming it. Thanks to @anqiansong

## Docs:

- We have updated some documentations in this version.

- Several lint issues and typos are fixed thanks to @rleungx @Huangxuny1 @JeffreyBool.
