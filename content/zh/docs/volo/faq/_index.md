---
title: "FAQ"
linkTitle: "FAQ"
weight: 9
keywords: ["Volo", "FAQ", "volo-cli", "poll_ready"]
description: 常见问题回答汇总。
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

### poll_ready（背压）哪去了？

在 Tower 的 Service 中，有一个方法 `poll_ready`，用来在请求之前先确定下游 Service 有足够的处理能力，并在处理能力不足时提供背压。
这是一个非常精妙的设计，Tower 在 [inventing-the-service-trait](https://tokio.rs/blog/2021-05-14-inventing-the-service-trait) 这篇介绍文章中，也有详细介绍这么设计的原因。

但是在我们真实的开发体验中，我们总结出了以下的经验：

1. 绝大多数的 `poll_ready` 的实现都是直接 `self.inner.poll_ready(cx)`；剩下的 poll_ready 实现更干脆，直接 `Poll::Ready(Ok(()))`。
2. `poll_ready` 一般不会真正跨服务去 check 负载（也就是说，不会真的发个请求问下游“大兄弟，你还能支棱起来不？”），所以一般也就是在本地的中间件（比如 Tower 的例子是速率限制中间件）里面根据某些特定条件判断一下。
3. 基于上两条，几乎所有的 `poll_ready` 场景，我们都可以直接在 `call` 里面做达到一样的效果，因为实践中外层的 `service` 在返回 `Poll::Pending` 的时候就是空等，不如直接采用 `async-await` 的方式来编写代码，更符合人体工程学。
4. 至于（可能的）资源浪费的问题，一般来说可能发生拦截的中间件，肯定是放在越前面越好，所以通过合理地排布中间件的顺序，就能解决这个问题。

因此，出于“如无必要勿增实体”的原则，也为了提升易用性，我们最终决定在我们的设计中不包含 `poll_ready` 方法。
