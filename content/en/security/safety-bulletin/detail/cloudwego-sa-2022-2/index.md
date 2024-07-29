---
date: 2022-05-09
title: "CloudWeGo-SA-2022-1"
linkTitle: "CloudWeGo-SA-2022-1"
description: Netpoll Panic
---

## Overview

Fixed Panic when "peer Close & local user Close" occurs simultaneously

## Severity Level

Middle

## Description

Fixed concurrency issues in extreme scenarios.

Scenario: "peer Close & local user Close" occurs at the same time, and `ctx.onClose` executes `lock(user)`, and Poller also executes `p.detaches` (all three conditions are met)

When two goroutines execute `op.Control(PollDetach)` at the same time, `op.unused` will be executed twice.

When the program is idle, it is possible that `ctx.onclose` has completed the `close` callback, `freeop` has been reused, and the state becomes `inuse` again.
That's when the `op.unused` in `p.detaches` is executed; This will incorrectly set the operator of a new connection to 0, causing all subsequent `op.do` to fail in an infinite loop.

## Solution

`Poller` no longer executes `detach` asynchronously to ensure that it does not run concurrently with `ctx.onclose` and the changes are performance-neutral.

## Affected Components

netpoll-v0.2.2

kitex-v0.3.0

## CVE

None

## References

- https://github.com/cloudwego/netpoll/issues/149
- https://github.com/cloudwego/netpoll/pull/142
