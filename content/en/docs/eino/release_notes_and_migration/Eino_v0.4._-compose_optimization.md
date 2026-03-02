---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.4.*-compose optimization'
weight: 4
---

## Version Overview

v0.4.0 mainly optimized Graph orchestration capabilities, removed the `GetState` method, and enabled default eager execution mode for AllPredecessor trigger mode.

---

## v0.4.0

**Release Date**: 2025-07-25

### Breaking Changes

- **Removed GetState method**: Graph no longer supports the `GetState` method, state management needs to be implemented through other mechanisms

### New Features

- **AllPredecessor mode defaults to Eager Execution**: Graphs using AllPredecessor trigger mode now default to eager execution strategy, improving execution efficiency

---

## v0.4.1 - v0.4.8 Main Updates

### Feature Enhancements

- Support using JSONSchema to describe tool parameters (#402)
- `ToJSONSchema()` compatible with OpenAPIV3 to JSONSchema conversion (#418)
- React Agent added `WithTools` convenience function (#435)
- Support printing reasoning content (#436)
- Added `PromptTokenDetails` definition (#377)

### Bug Fixes

- Fixed subgraph saving state from parent graph incorrectly (#389)
- Fixed branch input type being interface with nil value handling (#403)
- Fixed `toolCallChecker` using wrong context in flow_react (#373)
- Fixed edge handlers only parsing when successor ready (#438)
- Fixed error reporting when end node is skipped (#411)
- Optimized stream wrapper error handling (#409)
