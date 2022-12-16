---
title: "poll_ready（背压）哪去了？"
linkTitle: "poll_ready（背压）哪去了？"
weight: 2
description: >

---

在 Tower 的 Service 中，有一个方法 poll_ready，用来在请求之前先确定下游 Service 有足够的处理能力，并在处理能力不足时提供背压。
这是一个非常精妙的设计，Tower 在 [inventing-the-service-trait](https://tokio.rs/blog/2021-05-14-inventing-the-service-trait) 这篇介绍文章中，也有详细介绍这么设计的原因。

但是在我们真实的开发体验中，我们总结出了以下的经验：
1. 绝大多数的 poll_ready 的实现都是直接 `self.inner.poll_ready(cx)`；剩下的 poll_ready 实现更干脆，直接 `Poll::Ready(Ok(()))`。
2. poll_ready 一般不会真正跨服务去 check 负载（也就是说，不会真的发个请求问下游“大兄弟，你还能支棱起来不？”），所以一般也就是在本地的中间件（比如 Tower 的例子是速率限制中间件）里面根据某些特定条件判断一下。
3. 基于上两条，几乎所有的 poll_ready 场景，我们都可以直接在 `call` 里面做达到一样的效果，因为实践中外层的 `service` 在返回 `Poll::Pending` 的时候就是空等，不如直接采用 `async-await` 的方式来编写代码，更符合人体工程学。
4. 至于（可能的）资源浪费的问题，一般来说可能发生拦截的中间件，肯定是放在越前面越好，所以通过合理地排布中间件的顺序，就能解决这个问题。

因此，出于“如无必要勿增实体”的原则，也为了提升易用性，我们最终决定在我们的设计中不包含 poll_ready 方法。
