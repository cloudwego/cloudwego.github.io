---
title: "Kitex Release v0.4.3"
linkTitle: "Release v0.4.3"
projects: ["Kitex"]
date: 2022-11-02
description: >
---

## **Introduction to Key Changes**

### **Feature**

1. **Extend the Generated Code of client/server**: Add a new feature which can extend generated client.go/server.go with config file. It is applicable to the scenario for customizing the unified suite. See [Extend the Templates of Service Generated Code]([/docs/kitex/tutorials/code-gen/template_extension/]) for details.
2. **Biz Customized Exception** : Add supporting to return customized biz error which can distinguish with RPC error. See [Business Exception](/docs/kitex/tutorials/basic-feature/bizstatuserr/), [Proposal](https://github.com/cloudwego/kitex/issues/511).
3. **Request Profiler** : Add a new feature to do profiler for requests which can be used for cost statistics.
4. **Context Middleware** : Add Context Middleware which is used for adding request-level middlewares.

### **Optimization**

1. **Frugal Performance Optimization** : Support frugal precompile (pretouch) when new client or server, which is to reduce the impact of dynamic compilation on latency.
2. **Connpool Optimiztion** : Refactor connection pool to improve the idle connections cleanup.

---

## **Full Release Log**

### Feature

- [[#691](https://github.com/cloudwego/kitex/pull/691)] feat(client): add context middleware which is used for adding request-level middlewares.
- [[#649](https://github.com/cloudwego/kitex/pull/649)] feat(connpool): new long connection pool with minIdle config and idle connections cleanup.
- [[#672](https://github.com/cloudwego/kitex/pull/672)] feat(grpc): add kitex grpc metadata api to get header, tailer, and peer address metadata.
- [[#613](https://github.com/cloudwego/kitex/pull/613)] feat(exception): support customized biz error which can distinguish with RPC error.
- [[#670](https://github.com/cloudwego/kitex/pull/670)] feat(exception): support error format.
- [[#678](https://github.com/cloudwego/kitex/pull/678)] feat(tool): add git and record param for cmd.
- [[#662](https://github.com/cloudwego/kitex/pull/662)] feat(tool): support frugal precompile (pretouch) when new client or server.
- [[#657](https://github.com/cloudwego/kitex/pull/657)] feat(tool): support template extension.
- [[#527](https://github.com/cloudwego/kitex/pull/527)] feat(profiler): profiler for rpc request which can be used for cost statistics.

### Optimize

- [[#690](https://github.com/cloudwego/kitex/pull/690)] optimize(meta): remove error logic for adding default metaHandler in #503.
- [[#638](https://github.com/cloudwego/kitex/pull/638)] optimize(generic): httppb generic support map/list elem type as struct.
- [[#641](https://github.com/cloudwego/kitex/pull/641)] optimize(tool): add warnings comments for oneway methods.

### Fix

- [[#611](https://github.com/cloudwego/kitex/pull/611)] fix(client): fix resource leaks caused by Finalizer not being triggered in the scenario where clients are created frequently.
- [[#698](https://github.com/cloudwego/kitex/pull/698)] fix(connpool): adjust globalIdle based on the number of connections decreased during the Get.
- [[#636](https://github.com/cloudwego/kitex/pull/636)] fix(connpool): CloseCallback and statistical reporting of connection pool are invalid when the connection pool is reset in `ForwardProxy`.
- [[#647](https://github.com/cloudwego/kitex/pull/647)] fix(grpc): update grpc connection window size when initial and synchronize grpc pr #5459.
- [[#639](https://github.com/cloudwego/kitex/pull/639)] fix(generic): marshalling list<byte> in generic and enabling forJSON reader option for MapThriftGeneric.
- [[#655](https://github.com/cloudwego/kitex/pull/655)] fix(generic): numeric constant parsing fails when used as generic default value.
- [[#654](https://github.com/cloudwego/kitex/pull/654)] fix(frugal): fix compilation error when using lower go version.
- [[#682](https://github.com/cloudwego/kitex/pull/682)] fix(profiler): profiler stops pprof profile.
- [[#637](https://github.com/cloudwego/kitex/pull/637)] fix(tool): fix imports in handler.go template.
- [[#630](https://github.com/cloudwego/kitex/pull/630)] fix(tool): remove redundant kitex comments for file that do not declare an interface.
- [[#627](https://github.com/cloudwego/kitex/pull/627)] fix(tool): fix import missing when having different alias for the same path.

### Refactor

- [[#651](https://github.com/cloudwego/kitex/pull/651)] refactor(server): server handler read/write interface return new context.

### Docs

- [[#656](https://github.com/cloudwego/kitex/pull/656)] docs: remove wrong message in CONTRIBUTING.md.
- [[#683](https://github.com/cloudwego/kitex/pull/683)] docs(kerrors): fix kerrors WithCauseAndExtraMsg method comment.
- [[#625](https://github.com/cloudwego/kitex/pull/625)] chore: fix grammar of pull request template.
- [[#623](https://github.com/cloudwego/kitex/pull/623)] chore: modify the template of pull request.

### Test & CI

- [[#646](https://github.com/cloudwego/kitex/pull/646)] test: fix ut failure caused by InitRPCInfoFunc not setting rpcinfo.
- [[#680](https://github.com/cloudwego/kitex/pull/680)] test: fix retry test race.
- [[#661](https://github.com/cloudwego/kitex/pull/661)] test: make wpool tests more stable.
- [[#643](https://github.com/cloudwego/kitex/pull/643)] test: add test for detection server handler.
- [[#632](https://github.com/cloudwego/kitex/pull/632)] test: replace handwritten mock classes with gomock auto-generated classes.
- [[#697](https://github.com/cloudwego/kitex/pull/697)] chore(ci): fixed skywalking-eyes version.
- [[#652](https://github.com/cloudwego/kitex/pull/652)] chore(ci): delete repeated tests to reduce unit tests cost times.
- [[#588](https://github.com/cloudwego/kitex/pull/588)] chore(ci): support codecov.
