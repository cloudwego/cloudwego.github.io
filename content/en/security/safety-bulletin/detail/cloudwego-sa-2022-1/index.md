---
date: 2022-01-13
title: "CloudWeGo-SA-2022-1"
linkTitle: "CloudWeGo-SA-2022-1"
description: "Connection Leaking"
---

## Overview

Fixed connection leak when client encoding failed

## Severity Level

Low

## Description

Fixed connection leak when client encoding failed

## Solution

When client encoding fails, the connection is released

## Affected Components

kitex-v0.1.3

## CVE

None

## References

- https://github.com/cloudwego/kitex/pull/315
