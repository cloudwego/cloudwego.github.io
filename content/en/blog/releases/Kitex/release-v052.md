---
title: "Kitex Release v0.5.3"
linkTitle: "Release v0.5.3"
date: 2023-04-21
description: >
---
## **Introduction to Key Changes**

### **Feature**

1. Failure retry：add configuration to support disable timeout retry when do failure retry, which is for the non-idempotent request
2. Codegen tool：support codegen in windows.
3. Error code: fine grained rpc timeout error code
4. Thrift Fast Codec: support unknown fields

### **Fix**
1. Result retry: fix the issue that the result retry becomes invalid after failure retry policy is modified dynamically

----

## **Full Release Log**

Feature:
---
* [[#887](https://github.com/cloudwego/kitex/pull/887)] feat(retry): add configuration to support disable timeout retry when do failure retry, which is for the non-idempotent request
* [[#881](https://github.com/cloudwego/kitex/pull/881)] feat(tool): support codegen in windows
* [[#880](https://github.com/cloudwego/kitex/pull/880)] feat(rpctimeout): fine grained rpc timeout error code
* [[#872](https://github.com/cloudwego/kitex/pull/872)] feat(thrift): support unknown fields in fast codec

Optimize:
---
* [[#884](https://github.com/cloudwego/kitex/pull/884)] optimize(rpcinfo): RPCInfo.To().Tag() use instance tag instead of remoteinfo tag firstly

Fix:
---
* [[#896](https://github.com/cloudwego/kitex/pull/896)] fix(remoteinfo): fix the race problem caused by non-deepcopy CopyFrom of remoteinfo
* [[#892](https://github.com/cloudwego/kitex/pull/892)] fix(grpc): comment error log for the error of ReadFrame.
* [[#889](https://github.com/cloudwego/kitex/pull/889)] fix(retry): result retry doesn’t work after failure retry policy is modified dynamically
* [[#866](https://github.com/cloudwego/kitex/pull/866)] fix(grpc): no need to set context return by sendMsg/recvMsg to the context of stream

Chore:
---
* [[#898](https://github.com/cloudwego/kitex/pull/898)] chore: modify template for PR to check the modification of user doc
* [[#854](https://github.com/cloudwego/kitex/pull/854)] style(nphttp2): keep struct receiver name same

