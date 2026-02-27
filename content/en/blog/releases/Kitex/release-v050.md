---
title: "Kitex Release v0.5.0"
linkTitle: "Release v0.5.0"
projects: ["Kitex"]
date: 2023-03-08
description: >
---

## **Introduction to Key Changes**

### **Feature**

**1. Fallback: Support fallback for client-side**

When the RPC requests fail, users usually have some degradation measures to ensure the effective response (for example, construct the default response after the request timeout or circuit breaker).
Kitex's Fallback supports the processing of all error requests. At the same time, because business errors are usually returned through the Resp (BaseResp field), Kitex also supports the processing of Resp.
Refer to [Fallback](/docs/kitex/tutorials/service-governance/fallback/).

**2. Kitex - gRPC: Client add TLS option configuration**

Setup via client.WithGRPCTLSConfig option.

**3. Kitex - Tool**

- **Support customized scaffold templates**, refer to [Custom Scaffold Template](/docs/kitex/tutorials/code-gen/custom_tpl/)
- **Support specifying the directory for generating code**, refer to [Code Generation Tool -gen-path](/docs/kitex/tutorials/code-gen/code_generation/#-gen-path)
- **Support using protoc plugin**, refer to [Code Generation Tool -protobuf-plugin](/docs/kitex/tutorials/code-gen/code_generation/#-protobuf-plugin)

### **Optimization**

**1. Loadbalance：Use Weighted Round Robin algo as default Loadbalance policy**

The old version uses Weight Random to do the loadbalance by default. Random can achieve the global balance. However, in the case of a small number of server instances, there is a large probability of random continuous access to the same instance, resulting in an increase in the maximum concurrent requests of downstream nodes. Therefore, the new version adjusts the default policy to Weight Round Robin.
Refer to [Loadbalance](/docs/kitex/tutorials/service-governance/loadbalance/)

**2. Goroutine Resource of Connection Pool**

When the old version uses a long connection, each client corresponds to a goroutine resource cleaning connection. When there are many clients, it will cause too many goroutines. The new version changes to share the goroutine to avoid the number of goroutines increasing with the number of clients.

### **Other**

Upgrade the frugal and pid dependency lib to support go 1.20.

---

## **Full Release Log**

### Feature

- [[#840](https://github.com/cloudwego/kitex/pull/840)] feat(fallback): support fallback ability for kitex client-side, usage guide refer to [Fallback](/docs/kitex/tutorials/service-governance/fallback)
- [[#841](https://github.com/cloudwego/kitex/pull/841)] feat(tool): add GetResult() and GetFirstArgument() methods for service params of protobuf
- [[#791](https://github.com/cloudwego/kitex/pull/791)] feat(tool): merge two ways of passing extensions, to support two ways at sametime
- [[#797](https://github.com/cloudwego/kitex/pull/797)] feat(loadbalance): use smooth weighted round robin algo as default Loadbalance policy
- [[#760](https://github.com/cloudwego/kitex/pull/760)] feat(grpc): support TLS config in kitex grpc client
- [[#781](https://github.com/cloudwego/kitex/pull/781)] feat(tool): supports custom templates
- [[#783](https://github.com/cloudwego/kitex/pull/783)] feat(ttheader): add encode logic for gdpr token in TransInfo
- [[#775](https://github.com/cloudwego/kitex/pull/775)] feat(tool): support custom generate path
- [[#687](https://github.com/cloudwego/kitex/pull/687)] feat(tool): add protoc plugin flag

### Optimize

- [[#750](https://github.com/cloudwego/kitex/pull/750)] optimize(generic): generic call write zero value for required and default fields to meet the specification of apache thrift and keep consistent with normal thrift encode of Kitex.
- [[#739](https://github.com/cloudwego/kitex/pull/739)] optimize(generic): modify the url routing to align with Hertz for HTTP generic call
- [[#752](https://github.com/cloudwego/kitex/pull/752)] optimize(ttheader): attach part of ttheader binary into error when readKVInfo failed, which is useful for troubleshooting
- [[#821](https://github.com/cloudwego/kitex/pull/821)] optimize(config): add DeepCopy() & Equals() to circuitbreaker.CBConfig and retry.Policy
- [[#827](https://github.com/cloudwego/kitex/pull/827)] optimize: revise the remoteInfo of retry call, using the remoteInfo of the RPCCall that returns
- [[#762](https://github.com/cloudwego/kitex/pull/762)] optimize(tool): add go mod auto replace to thrift 0.13 in thrift mode
- [[#755](https://github.com/cloudwego/kitex/pull/755)] optimize: improve client error msg when ctx cancel or timeout
- [[#756](https://github.com/cloudwego/kitex/pull/756)] optimize: use sync.Cond as the profiler event trigger
- [[#753](https://github.com/cloudwego/kitex/pull/753)] optimize: add recover for client's Close

### Fix

- [[#734](https://github.com/cloudwego/kitex/pull/734)] fix(retry): fix the panic problem caused by concurrent read and write of rpcinfo under backup retry
- [[#837](https://github.com/cloudwego/kitex/pull/837) [#842](https://github.com/cloudwego/kitex/pull/842)] fix(metahandler): adjust MetainfoHandler to the top of the MetaHandlers array to ensure that the logic of custom MetaHandlers that depends on MetainfoHandler works
- [[#812](https://github.com/cloudwego/kitex/pull/812)] fix: use detectionHandler to perform protocol detection in windows environment to support gRPC
- [[#851](https://github.com/cloudwego/kitex/pull/851)] fix: upgrade frugal to v0.1.6 for missing stop field
- [[#845](https://github.com/cloudwego/kitex/pull/845)] fix: fix the problem that RPCStat report status as success when biz handler return err
- [[#822](https://github.com/cloudwego/kitex/pull/822)] fix(loadbalance): don't share balancer factory when loadbalance is defined by user
- [[#732](https://github.com/cloudwego/kitex/pull/732)] fix(mux): mux server waits for shardqueue close before shutdown
- [[#795](https://github.com/cloudwego/kitex/pull/795)] fix(grpc): zero first byte of grpc data frame, which could be random data from mcache
- [[#668](https://github.com/cloudwego/kitex/pull/668)] fix: fix race problem in queue.go/queue @dugenkui03
- [[#743](https://github.com/cloudwego/kitex/pull/743)] fix: use sharedTicker for long conn pool to prevent goroutine numbers increase as the number of client increases
- [[#799](https://github.com/cloudwego/kitex/pull/799)] fix(util): should return when get at least one GOPATH @StellarisW
- [[#807](https://github.com/cloudwego/kitex/pull/807)] fix(codec): fix fastpb nil ptr when struct fields are all default values
- [[#794](https://github.com/cloudwego/kitex/pull/794)] fix(tool): fix fastpb codegen by updating dependency
- [[#787](https://github.com/cloudwego/kitex/pull/787)] fix(tool): the import did not use the new method to render when template append content
- [[#785](https://github.com/cloudwego/kitex/pull/785)] fix(tool): remove useless combine service files
- [[#754](https://github.com/cloudwego/kitex/pull/754)] fix: fix the usage of metainfo in grpc scene

### Refactor

- [[#814](https://github.com/cloudwego/kitex/pull/814) [#843](https://github.com/cloudwego/kitex/pull/843)] refactor(trans): return error in onRead of defaultServerHandler and close conn in outer method
- [[#816](https://github.com/cloudwego/kitex/pull/816)] refactor(utils): add utils.GetEnvLogDir and deprecate utils.GetLogDir

### Test & Docs & Chore

- [[#839](https://github.com/cloudwego/kitex/pull/839) [#693](https://github.com/cloudwego/kitex/pull/693)] test: import mockey repo and add usage demo of mockey unit test
- [[#806](https://github.com/cloudwego/kitex/pull/806)] test(transmeta):add some test cases for tansmeta package
- [[#761](https://github.com/cloudwego/kitex/pull/761)] docs: update README.md @fuergaosi233
- [[#817](https://github.com/cloudwego/kitex/pull/817), [#832](https://github.com/cloudwego/kitex/pull/832)] chore: upgrade dependency lib to adapt go 1.20
- [[#772](https://github.com/cloudwego/kitex/pull/772)] chore: modify kitex gen code meta file name from kitex.yaml to kitex_info.yaml
