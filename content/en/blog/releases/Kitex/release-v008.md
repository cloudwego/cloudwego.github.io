---
title: "Kitex Release v0.0.8"
linkTitle: "Release v0.0.8"
projects: ["Kitex"]
date: 2021-11-05
description: >
---

## Improvement:

- Use shard rings to reduce lock overhead in connpool.
- Fill upstream information to rpcinfo from TTheader, for printing useful log when decode error happened.
- Move unlink uds operation to CreateListener.
- Replace sync.Mutex by sync.RWMutex of event.go and ring_single.go.

## Bugfix:

- Fix netpollmux shard index overflow.
- Remove reflection of `WithCircuitBreaker` option arguments to prevent data-race.
- Fix rpc finished error may happen small probability in failure retry scenario && add sample check for retry circuit breaking.
- Fix a test case mistake in endpoint_test.go.
- Modify longconn variable name to conn.

## Tool:

- Kitex codegen tool supports passing through thrift-go plugin arguments.

## Docs:

- Use a link to the the kitex-benchmark repository to replace the performance section in README.

## Dependency Change:

- github.com/tidwall/gjson: v1.8.0 -> v1.9.3
