---
title: "Kitex Release v0.1.0"
linkTitle: "Release v0.1.0"
projects: ["Kitex"]
date: 2021-12-13
description: >
---

## Feature

### Generic Call

- Support combined services
- Export SetSeqID and add GetSeqID for binary generic call of server side
- Support close generic client to avoid memory leak

### Log

- Use key=value style in log messages
- Use klog as global log in some logs
- Use the global default logger across kitex
- Print detail loginfo by ctx
- Pass service info to go func which is used to output for troubleshooting

### Option

- Add NewThriftCodecDisableFastMode to disable FastWrite/Read
- Add server option - WithReusePort
- Default rpc timeout = 0

### Proxy

- Proxy add ContextHandler interface to support passing initialization context to mwBuilder
- Register Dump in lbcache to diagnosis
- Pass RPCConfig to proxy.Config

## Improvement

- Reduce heap allocation
- Optimize mux performance
- Recycle grpc codec buffer by close linkbuffer
- Distinguish ErrRPCFinish in cost info of backup request
- Move mux.ShardQueue to netpoll, rename sharedMap to shardMap
- Add container length encoding guard in fast api

## Bugfix

- Enable server error handle middleware
- Adjust Balancer initialization in lbcache
- Init TraceCtl when it is nil (only affect unit test)
- Set default rpctimeout and disable timeout logic if rpctimeout == 0
- Defaultlogger wrong calldepth
- Rename BackwardProxy to ReverseProxy
- Avoid nil panic in grpc keepalive
- Fix hidden dangers about grpc
- Fix exception missing in void method
- Fix mistake dump info when instances change.

## Docs

- Fix link in readme_zh
- Remove docs; maintain cloudwego.io only

## Netpoll API Change

- Adapt netpoll.Writer.Append API

## Dependency Change

- github.com/cloudwego/netpoll: v0.0.4 -> v0.1.2
