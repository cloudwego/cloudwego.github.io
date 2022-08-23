---
title: "自定义服务发现与负载均衡"
linkTitle: "自定义服务发现与负载均衡"
weight: 2
description: >

---

## 服务发现
`Discover` trait 提供了自定义服务发现的能力，其支持自定义静态或可订阅的服务发现能力。

**Trait** 定义

```rust
/// [`Instance`] contains information of an instance from the target service.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Instance {
    pub address: Address,
    pub weight: u32,
    pub tags: HashMap<Cow<'static, str>, Cow<'static, str>>,
}

/// Change indicates the change of the service discover.
///
/// Change contains the difference between the current discovery result and the previous one.
/// It is designed for providing detail information when dispatching an event for service
/// discovery result change.
///
/// Since the loadbalancer may rely on caching the result of discover to improve performance,
/// the discover implementation should dispatch an event when result changes.
#[derive(Debug, Clone)]
pub struct Change<K> {
    /// `key` should be the same as the output of `WatchableDiscover::key`,
    /// which is often used by cache.
    pub key: K,
    pub all: Vec<Arc<Instance>>,
    pub added: Vec<Arc<Instance>>,
    pub updated: Vec<Arc<Instance>>,
    pub removed: Vec<Arc<Instance>>,
}

/// [`Discover`] is the most basic trait for Discover.
pub trait Discover: Send + Sync + 'static {
    /// `Key` identifies a set of instances, such as the cluster name.
    type Key: Hash + PartialEq + Eq + Send + Sync + Clone + 'static;
    /// `Error` is the discovery error.
    type Error: std::error::Error + Send + Sync;
    /// `DiscFut` is a Future object which returns a discovery result.
    type DiscFut<'future>: Future<Output = Result<Vec<Arc<Instance>>, Self::Error>> + Send + 'future;

    /// `discover` allows to request an endpoint and return a discover future.
    fn discover(&self, endpoint: &Endpoint) -> Self::DiscFut<'_>;
    /// `key` should return a key suitable for cache.
    fn key(&self, endpoint: &Endpoint) -> Self::Key;
    /// `watch` should return a [`async_broadcast::Receiver`] which can be used to subscribe
    /// [`Change`].
    fn watch(&self) -> Option<Receiver<Change<Self::Key>>>;
}
```

示例

```rust
pub struct StaticDiscover {
    instances: Vec<Arc<Instance>>,
}

impl Discover for StaticDiscover {
    type Key = ();
    type DiscFut<'a> = impl Future<Output = anyhow::Result<Vec<Arc<Instance>>>> + 'a;

    fn discover(&self, _: &Endpoint) -> Self::DiscFut<'_> {
        async { Ok(self.instances.clone()) }
    }

    fn key(&self, _: &Endpoint) -> Self::Key {}

    fn watch(&self) -> Option<Receiver<Change<Self::Key>>> {
        None
    }
}
```

## 负载均衡

Volo 提供基于 `LoadBalance` trait 自定义负载均衡策略的能力：

```rust
/// [`LoadBalance`] promise the feature of the load balance policy.
pub trait LoadBalance<D>: Send + Sync + 'static
where
    D: Discover,
{
    /// `InstanceIter` is an iterator of [`crate::discovery::Instance`].
    type InstanceIter<'iter>: Iterator<Item = Address> + Send + 'iter;
    /// `Error` is the error of the `get_picker` result.
    type Error: std::error::Error + Send + Sync;
    /// `GetFut` is the return type of `get_picker`.
    type GetFut<'future, 'iter>: Future<Output = Result<Self::InstanceIter<'iter>, Self::Error>>
        + Send; // remove +'future temporarily, see https://github.com/rust-lang/rust/issues/100013

    /// `get_picker` allows to get an instance iterator of a specified endpoint from self or
    /// service discovery.
    fn get_picker<'future, 'iter>(
        &'iter self,
        endpoint: &'future Endpoint,
        discover: &'future D,
    ) -> Self::GetFut<'future, 'iter>;
    /// `reblance` is the callback method be used in service discovering subscription.
    fn rebalance(&self, changes: Change<D::Key>);
}
```

示例

```rust
pub struct InstancePicker {
    instances: Vec<Arc<Instance>>,
    index: usize
}

impl Iterator for InstancePicker {
    type Item = Address;

    fn next(&mut self) -> Option<Self::Item> {
        let i = self.instances.get(index);
        self.index += 1;
        i
    }
}

#[derive(Clone)]
pub struct RoundRobin<K>
where
    K: Hash + PartialEq + Eq + Send + Sync + 'static,
{
    router: DashMap<K, Arc<Vec<Arc<Instance>>>>,
}

impl<D> LoadBalance<D> for RoundRobin<D::Key>
where
    D: Discover,
{
    type InstanceIter<'iter> = InstancePicker;
    type Error = D::Error;
    type GetFut<'future, 'iter> =
        impl Future<Output = Result<Self::InstanceIter<'iter>, Self::Error>> + Send;

    fn get_picker<'future, 'iter>(
        &'iter self,
        endpoint: &'future Endpoint,
        discover: &'future D,
    ) -> Self::GetFut<'future, 'iter> {
        async {
            let key = discover.key(endpoint);
            let list = match self.router.entry(key) {
                Entry::Occupied(e) => e.get().clone(),
                Entry::Vacant(e) => {
                    let instances =
                        Arc::new(discover.discover(endpoint).await?);
                    e.insert(instances).value().clone()
                }
            };
            Ok(InstancePicker {
                instances: list,
                index: 0
            })
        }
    }

    fn rebalance(&self, changes: Change<D::Key>) {
        if let Entry::Occupied(entry) = self.router.entry(changes.key.clone()) {
            entry.replace_entry(Arc::new(changes.all));
        }
    }
}
```
