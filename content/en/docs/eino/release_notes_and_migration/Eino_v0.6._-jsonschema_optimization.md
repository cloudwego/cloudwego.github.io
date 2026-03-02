---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.6.*-jsonschema optimization'
weight: 6
---

## Version Overview

v0.6.0 focuses on dependency optimization, removing kin-openapi dependency and OpenAPI3.0 related definitions, simplifying the JSONSchema module implementation.

---

## v0.6.0

**Release Date**: 2025-11-14

### Breaking Changes

- **Removed kin-openapi dependency** (#544):
  - Removed dependency on `kin-openapi` library
  - Removed OpenAPI 3.0 related type definitions
  - Simplified JSONSchema module implementation

### Migration Guide

If your code uses OpenAPI 3.0 related type definitions, you need to:

1. Check if there is code directly using `kin-openapi` related types
2. Replace OpenAPI 3.0 types with standard JSONSchema types
3. Use `schema.ToJSONSchema()` method to get JSONSchema definition for tool parameters

---

## v0.6.1 Main Updates

### Bug Fixes

- Routine bug fixes and stability improvements
