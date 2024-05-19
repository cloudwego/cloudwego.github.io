---
title: "Usage Attention"
linkTitle: "Usage Attention"
weight: 1
date: 2024-02-18
keywords: ["Kitex", "RPCInfo", "client", "Set", "Map"]
description: "This doc describes usage attentions in Kitex RPCInfo, client creation, and mass data transfer scenarios."
---

## Do not use RPCInfo asynchronously

By default, the lifecycle of Kitex's RPCInfo is from the start of the request until the response is returned (for performance reasons). Afterward, it is put into a `sync.Pool` for reuse. In the server-side, if RPCInfo is asynchronously accessed and used within the business handler, it may read dirty data or encounter a null pointer and panic.

If there is indeed a scenario where asynchronous usage is required, there are two approaches:

- Use `rpcinfo.FreezeRPCInfo` provided by Kitex to make a copy of the initial RPCInfo before using it.

  ```go
  import (
      "github.com/cloudwego/kitex/pkg/rpcinfo"
  )
  // this creates a read-only copy of `ri` and attaches it to the new context
  ctx2 := rpcinfo.FreezeRPCInfo(ctx)
  go func(ctx context.Context) {
      // ...
      ri := rpcinfo.GetRPCInfo(ctx) // OK

      //...
  }(ctx2)
  ```

- Set the environment variable `KITEX_DISABLE_RPCINFO_POOL=true` to disable RPCInfo recycling. (Supported version: v0.8.1)

## Do not create a new Kitex client for each request

The Kitex client object manages resources related to remote configuration, service discovery cache, connection pool, and other Service-related resources. It creates several goroutines to perform various asynchronous update tasks.
If Kitex clients are frequently created, it will cause a sudden increase in CPU usage, frequent timeouts in RPC calls, service discovery, and remote configuration retrieval, as well as a large increase in the number of goroutines.

**Correct usage**: Create a Kitex client for each downstream service being accessed, and cache it. Then, whenever you need to make a request to the downstream service, use the corresponding method of the cached Kitex client. The same client can be used concurrently and safely.

## Use set \<struct> to avoid transferring large amounts of data

### Case: Changing a 12M data set to a map reduces the time from 20s to 100ms

The IDL data structure for the business is as follows:

```thrift
struct DataResponse {
    1: required i32 code
    2: required string msg
    3: optional map<string, set<Grid>> data
}
```

### Reason

Starting from Thrift official version 0.11.0, the set type in generated Go code has been changed from `map[T]bool` to `[]T`, as mentioned in this [pull request](https://github.com/apache/thrift/pull/1156).

Since `[]T` does not support deduplication to avoid sending duplicate elements, the encoding process performs element validation on the slice using an O(n^2) traversal and `reflect.DeepEqual`, as shown in the following code:

```go
for i := 0; i < len(p.StringSet); i++ {
   for j := i + 1; j < len(p.StringSet); j++ {
      if reflect.DeepEqual(p.StringSet[i], p.StringSet[j]) {
         return thrift.PrependError("", fmt.Errorf("%T error writing set field: slice is not unique", p.StringSet[i]))
      }
   }
}
```

If the set contains a large number of elements and the data structure is complex, it will significantly increase the encoding time, as observed in the mentioned case.

### How to handle

**Option 1: Update the Kitex tool and regenerate the code**

The thrift code generation tool, thriftgo, in Kitex generates a separate DeepEqual method for each struct to avoid using reflection.

> Additionally, a [pull request](https://github.com/apache/thrift/pull/2307) has been submitted to the Thrift official repository to address this issue, and it has been merged.

**Option 2: Change set to map (incompatible change)**

If the elements are structs, changing the set to map will result in pointer types, which cannot guarantee uniqueness.

**Option 3: Disable set validation during code generation (business needs to ensure element uniqueness)**

Even if validation is added, it will only return an error. If the business can ensure element uniqueness, the validation can be skipped during encoding.

`kitex -thrift validate_set=false yourIDL`.
