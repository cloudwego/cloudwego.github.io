---
Description: ""
date: "2025-01-06"
lastmod: ""
tags: []
title: 'Eino: v0.3.*-tiny break change'
weight: 3
---

## v0.3.1-Internal Release

> Release date: 2024-12-17
>
> Going forward, only the open source version will be maintained. Migration scripts will be provided to help migrate from the internal version to the open source version

### Features

- Simplified concepts exposed by Eino
  - Graph, Chain support State, removed StateGraph, StateChain
  - Removed GraphKey concept
- Optimized MultiReader read performance during stream merging

### BugFix

- Fixed missing Error check when AddNode in Chain

## v0.3.0

> Release date: 2024-12-09

### Features

- schema.ToolInfo.ParamsOneOf changed to pointer. Supports scenarios where ParamsOneOf is nil
- Compile Callback now supports returning GenStateFn
- Support for global Compile Callback

### BugFix

- When CallOption DesignateNode, should not execute Graph aspects, only execute aspects of the designated node
