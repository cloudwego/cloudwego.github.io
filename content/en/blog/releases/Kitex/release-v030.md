---
title: "Kitex Release v0.3.0"
linkTitle: "Release v0.3.0"
projects: ["Kitex"]
date: 2022-04-29
description: >
---

## Feature

- [[#366](https://github.com/cloudwego/kitex/pull/366), [#426](https://github.com/cloudwego/kitex/pull/426) ] feat(client): support warming-up for kitex client
- [[#395](https://github.com/cloudwego/kitex/pull/395) ] feat(mux): support gracefully shutdown in connection multiplexing
- [[#399](https://github.com/cloudwego/kitex/pull/399) ] feat(protobuf): add fastpb protocol API and support it in the pkg/remote/codec module

## Optimise

- [[#402](https://github.com/cloudwego/kitex/pull/402) ] optimize(connpool): export getCommonReporter in pkg/remote/connpool
- [[#389](https://github.com/cloudwego/kitex/pull/389) ] optimize(rpcinfo): fill TransportProtocol, PackageName fields into RPCInfo of the server side after decoding

## Bugfix

- [[#413](https://github.com/cloudwego/kitex/pull/413) ] fix(mux): set PayloadCodec for sendMsg in NetpollMux trans handler to fix generic request codec error.[issue #411](https://github.com/cloudwego/kitex/issues/411)
- [[#406](https://github.com/cloudwego/kitex/pull/406) ] fix(grpc): fix the sending and receiving logic about http2 framer, such as preventing the peer unable to receive the framer in time
- [[#398](https://github.com/cloudwego/kitex/pull/398) ] fix(utils): fix the bug that Dump() func in ring.go can't dump the accurate data in ring shards
- [[#428](https://github.com/cloudwego/kitex/pull/428) ] fix(trans): close connection when flush data fails to avoid memory leak

## Tool

- [[#340](https://github.com/cloudwego/kitex/pull/340) ] tool(protobuf): redesign and implement new protobuf gen code called fastpb which doesn't use reflection and only supports proto3

## Chore

- [[#396](https://github.com/cloudwego/kitex/pull/396) ] chore: replace cespare/xxhash with xxhash3 from bytedance/gopkg
- [[#400](https://github.com/cloudwego/kitex/pull/400) ] chore: upgrade go version of workflow to 1.18
- [[#407](https://github.com/cloudwego/kitex/pull/407) ] chore: add a separate file to declare the use of gRPC source code

## Test

- [[#401](https://github.com/cloudwego/kitex/pull/401) ] test: add ut for kitex/server package
- [[#393](https://github.com/cloudwego/kitex/pull/393) ] test: add ut for pkg/remote/bound package
- [[#403](https://github.com/cloudwego/kitex/pull/403) ] test: add netpollmux unit test
- [[#401](https://github.com/cloudwego/kitex/pull/401) ] test: add klog unit test
- [[#392](https://github.com/cloudwego/kitex/pull/392) ] test(utils): add UT for utils and fix inaccurate err throw in json.go
- [[#373](https://github.com/cloudwego/kitex/pull/373), [#432](https://github.com/cloudwego/kitex/pull/432), [#434](https://github.com/cloudwego/kitex/pull/434) ] test(grpc): add gRPC transport unit tests, promoting the coverage to 76%
- [[#424](https://github.com/cloudwego/kitex/pull/424) ] test(transmeta): supplementary of unit tests for http2 and ttheader implementations of MetaHandler/StreamingMetaHandler in pkg/transmeta.

## Dependency Change

- github.com/cloudwego/netpoll: v0.2.0 -> v0.2.2
- github.com/bytedance/gopkg: 20210910103821-e4efae9c17c3 -> 20220413063733-65bf48ffb3a7
