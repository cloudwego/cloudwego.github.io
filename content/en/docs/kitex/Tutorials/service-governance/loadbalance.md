---
title: "LoadBalancer"
date: 2021-08-31
weight: 2
keywords: ["Kitex", "LoadBalancer", "LoadBalance", "ConsistentHash"]
description: "This doc covers LoadBalancer implementation principles and usage guidelines provided by Kitex."
---

Kitex provides these LoadBalancers officially:

- WeightedRoundRobin
- InterleavedWeightedRoundRobin (kitex >= v0.7.0)
- WeightedRandom
- Alias Method（kitex >= v0.9.0）
- ConsistentHash
- Tagging Based

Kitex uses WeightedRoundRobin by default.

## WeightedRoundRobin

WeightedRoundRobin uses a round-robin strategy based on weights, which is also Kitex's default strategy.

This LoadBalancer will make all instances have the min inflight requests to reduce the overload of instance.

If all instances have the same weights, it will use a pure round-robin implementation to avoid extra overhead of weighting calculations.

**Usage:**

```go
cli, err := echo.NewClient("echo", client.WithLoadBalancer(loadbalance.NewWeightedRoundRobinBalancer()))
```

## InterleavedWeightedRoundRobin

Same as [WeightedRoundRobin](#weightedroundrobin), this LoadBalancer also uses a round-robin strategy based on weights.

The difference is that the space complexity of [WeightedRoundRobin](#weightedroundrobin) is the minimum positive cycle for selecting all instances by weight (the sum of all instance weights divided by the greatest common divisor of all instance weights),
The space complexity of this LoadBalancer is the number of downstream instances, and it saves space when the sum of the weights of the downstream instances is very large.

**Usage:**

```go
cli, err := echo.NewClient("echo", client.WithLoadBalancer(loadbalance.NewInterleavedWeightedRoundRobinBalancer()))
```

## WeightedRandom

WeightedRandom uses a random strategy.

This LoadBalancer will be weighted randomly according to the weight of the instance, and ensure that the load assigned to each instance is proportional to its own weight.

If all instances have the same weights, it uses a purely random implementation to avoid extra overhead of weighting calculations.

**Usage:**

```go
cli, err := echo.NewClient("echo", client.WithLoadBalancer(loadbalance.NewWeightedRandomBalancer()))
```

## Alias Method

LoadBalancer that uses the Alias Method, specifically implementing Vose's Alias Method from [Darts, Dice, and Coins](https://www.keithschwarz.com/darts-dice-coins/).

Generates an alias table in O(n) time, then selects an instance in O(1) time, achieving higher selection efficiency than [WeightedRandom](#weightedrandom).

```go
cli, err := echo.NewClient("echo", client.WithLoadBalancer(loadbalance.NewWeightedRandomWithAliasMethodBalancer()))
```

## ConsistentHash

### Introduction

Consistent hashing is mainly suitable for scenarios with high dependence on context (such as instance local cache). If you want the same type of request to hit the same endpoint, you can use this load balancing method.

**If you don't know what a consistent hash is, or don't know the side effects, _DO NOT_ use a consistent hash.**

### Usage

When creating the client, initialize the consistent hashing strategy:

```go
cli, err := echo.NewClient(
    "echo",
    client.WithLoadBalancer(loadbalance.NewConsistBalancer(loadbalance.NewConsistentHashOption(func(ctx context.Context, request interface{}) string {
		// Set the key based on the request context information
        return "key"
    }))),
)
```

`ConsistentHashOption` is defined as follows:

```go
type ConsistentHashOption struct {
    GetKey KeyFunc

    // Whether or not to use Replica
    // If replica is set, it would be tried in turn when the request fails (connection failure)
    // Replica brings additional memory and computational overhead
    // If replica is not set, then the request returns directly after failure (connection failure)
    Replica uint32

    // Number of virtual nodes
    // The number of virtual nodes corresponding to each real node
    // The higher the value, the higher the memory and computational cost, and the more balanced the load
    // When the number of nodes is large, it can be set smaller; conversely, it can be set larger
    // It is recommended that the median VirtualFactor * Weight (if Weighted is true) is around 1000, and the load should be well balanced
    // Recommended total number of virtual nodes within 2000W (it takes 250ms to build once under 1000W, but it is theoretically fine to build in the background within 3s)
    VirtualFactor    uint32

    // Whether to follow Weight for load balancing
    // If false, Weight is ignored for each instance, and VirtualFactor virtual nodes are generated for indiscriminate load balancing
    // Weight() * VirtualFactor virtual nodes for each instance
    // Note that for instance with weight 0, no virtual nodes will be generated regardless of the VirtualFactor number
    // It is recommended to set it to true, but be careful to reduce the VirtualFactor appropriately
    Weighted bool

    // Whether or not to perform expiration processing
    // Implementation will cache all keys
    // Never expiring will cause memory to keep growing
    // Setting expiration will result in additional performance overhead
    // Current implementations scan for deletions every minute and delete once when the instance changes rebuild
    // It is recommended to always set the value not less than one minute
    ExpireDuration time.Duration
}
```

Note that if GetKey is nil or VirtualFactor is 0, panic will occur.

### Performance

After testing, with a weight of 10 and a VirtualFactor of 100, the build performance of different instances is as follows:

```
BenchmarkNewConsistPicker_NoCache/10ins-16                 6565        160670 ns/op      164750 B/op          5 allocs/op
BenchmarkNewConsistPicker_NoCache/100ins-16                 571       1914666 ns/op     1611803 B/op          6 allocs/op
BenchmarkNewConsistPicker_NoCache/1000ins-16                 45      23485916 ns/op    16067720 B/op         10 allocs/op
BenchmarkNewConsistPicker_NoCache/10000ins-16                 4     251160920 ns/op    160405632 B/op        41 allocs/op
```

Therefore, when there are 10,000 instances, each instance weight is 10, and the VirtualFactor is 100 (the total number of virtual nodes is 10,000,000), it takes 251 ms to build once.

Both build and request information are cached, so the latency of a normal request (no build is required) has nothing to do with the number of nodes:

```
BenchmarkNewConsistPicker/10ins-16             12557137            81.1 ns/op         0 B/op          0 allocs/op
BenchmarkNewConsistPicker/100ins-16            13704381            82.3 ns/op         0 B/op          0 allocs/op
BenchmarkNewConsistPicker/1000ins-16           14418103            81.3 ns/op         0 B/op          0 allocs/op
BenchmarkNewConsistPicker/10000ins-16          13942186            81.0 ns/op         0 B/op          0 allocs/op
```

### Note

1. When the target node changes, the consistent hash result may change, and some keys may change;
2. If there are too many target nodes, the build time may be longer during the first cold start, and if the rpc timeout is short, it could cause a timeout;
3. If the first request fails and Replica is larger than 0, the try will hit the Replica, so the second and subsequent requests will still be sent to the first instance.

### The degree of load balance

As tested, when the number of target instances is 10, if the VirtualFactor is set to 1 and Weighted is not turned on, the load is very uneven, as follows:

```
addr2: 28629
addr7: 13489
addr3: 10469
addr9: 4554
addr0: 21550
addr6: 6516
addr8: 2354
addr4: 9413
addr5: 1793
addr1: 1233
```

When VirtualFactor is set to 10, the load is as follows:

```
addr7: 14426
addr8: 12469
addr3: 8115
addr4: 8165
addr0: 8587
addr1: 7193
addr6: 10512
addr9: 14054
addr2: 9307
addr5: 7172
```

It can be seen that it is much better than when the VirtualFactor is 1.

When the VirtualFactor is 1000, the load is as follows:

```
addr7: 9697
addr5: 9933
addr6: 9955
addr4: 10361
addr8: 9828
addr0: 9729
addr9: 10528
addr2: 10121
addr3: 9888
addr1: 9960
```

Load is basically balanced at this time.

Let's take the situation with Weight. We set the weight of addr0 to 0, the weight of addr1 to 1, the weight of addr2 to 2... and so on.

Set VirtualFactor to 1000 and get the load result as follows:

```
addr4: 8839
addr3: 6624
addr6: 13250
addr1: 2318
addr8: 17769
addr2: 4321
addr5: 11099
addr9: 20065
addr7: 15715
```

You could see that it is basically consistent with the distribution of weight. There is no addr0 here because weight is 0 and will not be scheduled.

In summary, increase VirtualFactor can make the load more balanced, but it will also increase the performance overhead, so you need to make trade-offs.

## Tagging Based

Expansion of [loadbalance-tagging](https://github.com/kitex-contrib/loadbalance-tagging) provides a tag-based load balancing strategy that allows the cluster to be divided into different subsets based on tags on the client side.

This is suitable for stateful services or multi-tenant services scenarios, enabling finer-grained control and routing of service instances.

### Features

- Subset division based on tags: Facilitates directing specific requests to the corresponding service instances;

- Suitable for polymorphic services: Supports the specific needs of stateful services, implementing request routing in a multi-tenant environment;

- Customizable tag functions: Allows the use of tags through custom functions to achieve more complex load balancing strategies.

### Usage

```go
cli, err := echo.NewClient("echo",
    client.WithLoadBalancer(tagging.New(
        "tag",
        func(ctx context.Context, req interface{}) string {
            return "value"
        },
		// You can choose the load balancing strategy on your own, if multi-tag based balancing is needed, tagging.new() can be used again with a new tag
        loadbalance.NewWeightedRoundRobinBalancer(),
    )))
```
