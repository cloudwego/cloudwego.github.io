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

    /// `discover` allows to request an endpoint and return a discover future.
    async fn discover(&self, endpoint: &Endpoint) -> Result<Vec<Arc<Instance>>, Self::Error>;
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
    type Error = Infallible;

    async fn discover(&self, _: &Endpoint) -> Result<Vec<Arc<Instance>>, Self::Error> {
        async { Ok(self.instances.clone()) }.await
    }

    fn key(&self, _: &Endpoint) -> Self::Key {}

    fn watch(&self) -> Option<async_broadcast::Receiver<Change<Self::Key>>> {
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
    type InstanceIter: Iterator<Item = Address> + Send;

    /// `get_picker` allows to get an instance iterator of a specified endpoint from self or
    /// service discovery.
    async fn get_picker(
        &self,
        endpoint: &Endpoint,
        discover: &D,
    ) -> Result<Self::InstanceIter, LoadBalanceError>;
    /// `rebalance` is the callback method be used in service discovering subscription.
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
        let i = self.instances.get(self.index);
        self.index += 1;
        i.map(|i| i.clone().address.clone())
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
    type InstanceIter = InstancePicker;

    async fn get_picker(
        &self,
        endpoint: &Endpoint,
        discover: &D,
    ) -> Result<Self::InstanceIter, LoadBalanceError> {
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
            instances: list.to_vec(),
            index: 0
        })
    }

    fn rebalance(&self, changes: Change<D::Key>) {
        if let Entry::Occupied(entry) = self.router.entry(changes.key.clone()) {
            entry.replace_entry(Arc::new(changes.all));
        }
    }
}
```
