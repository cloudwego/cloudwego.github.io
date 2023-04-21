---
title: "Kitex v0.5.3 版本发布"
linkTitle: "Release v0.5.3"
date: 2023-04-21
description: >
---
## 重要变更介绍

### 功能

1. 异常重试：添加配置，支持不对超时错误进行重试，用于请求非幂等的场景。
2. 代码生成工具：支持 windows 环境使用。
3. 超时错误码拆分：支持细粒度的超时错误码，将 ErrRPCTimeout 细分为三个错误码：超时、业务cancel、业务timeout。
4. Thrift Fast Codec：支持 unknown fields

### 修复
1. 失败重试策略：修复失败重试策略被动态修改后，结果重试 (resultRetry) 策略失效的问题。

----

## 详细变更

Feature:
---
* [[#887](https://github.com/cloudwego/kitex/pull/887)] feat(retry): 增加配置，支持异常重试场景下不对超时做重试，用于请求非幂等的场景
* [[#881](https://github.com/cloudwego/kitex/pull/881)] feat(tool): 支持 windows 场景下的代码生成
* [[#880](https://github.com/cloudwego/kitex/pull/880)] feat(rpctimeout): 支持细粒度的超时错误码
* [[#872](https://github.com/cloudwego/kitex/pull/872)] feat(thrift): 在 fast codec 中支持 unknown fields 的序列化及反序列化

Optimize:
---
* [[#884](https://github.com/cloudwego/kitex/pull/884)] optimize(rpcinfo): RPCInfo.To().Tag() 优先使用服务发现的instance tag而不是remoteinfo tag

Fix:
---
* [[#896](https://github.com/cloudwego/kitex/pull/896)] fix(remoteinfo): 修复 remoteinfo 中非深拷贝的 CopyFrom 引入的 race 问题
* [[#892](https://github.com/cloudwego/kitex/pull/892)] fix(grpc): 注释 ReadFrame error 时输出的 error 日志
* [[#889](https://github.com/cloudwego/kitex/pull/889)] fix(retry): 在失败重试策略被动态修改后，结果重试策略失效
* [[#866](https://github.com/cloudwego/kitex/pull/866)] fix(grpc): stream 的 sendMsg/recvMsg 返回的 ctx 无需赋值给 stream 的 ctx

Chore:
---
* [[#898](https://github.com/cloudwego/kitex/pull/898)] chore: 更新 PR 的模板，对用户文档的更新做 check
* [[#854](https://github.com/cloudwego/kitex/pull/854)] style(nphttp2): 保证 receiver 的名字一致

