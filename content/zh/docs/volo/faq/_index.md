---
title: "FAQ"
linkTitle: "FAQ"
weight: 5
description: >

---

### 为什么 Client 端中间件使用 Arc<Req>？

细心的你会发现，我们在 Client 端的生成代码中，会把用户传入的 Req 包装成 Arc<Req> 再真正执行 volo_thrift 的 client 的 call 方法，而在 server 端则是直接使用 Req。

这么设计的原因是因为，Client 端相比 Server 端，需要做更多复杂的服务治理逻辑，特别是有一些服务治理的逻辑和 Rust 的所有权模型是相悖的，比如：如果连接失败，那么就换个节点重试；甚至更复杂的超时重试等逻辑。如果我们直接使用 Req，那么当我们第一次执行 inner service 的 call 时，所有权就已经被 move 了，我们没有办法做重试逻辑。

同时，使用 Arc 还能帮助我们规避在 middleware 下并发访问带来的问题（如做 mirror/diff 等场景），在此不过多赘述。

并且，client 端本身不应该修改 Req，所以也不需要拿到可变的权限。

而在 server 端，不会有这么复杂的使用场景，并且最终是要把所有权给到用户的 handler 的，因此 server 端直接使用 Req 所有权即可。

### 为什么 volo-cli 生成的代码中要单独分拆成出 volo-gen crate？

因为 Rust 的编译是以 crate 为单元的，把生成代码单独作为一个 crate 可以更好地利用编译缓存（idl 一般不会经常变动）。

### 和 Kitex 的兼容性如何？

Volo 与 Kitex 完全兼容，包括元信息传递等功能。
