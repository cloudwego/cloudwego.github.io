---
title: "Use set <struct> to transfer large amounts of data"
linkTitle: "Note: Use set <struct> to transfer large amounts of data"
weight: 1
date: 2024-02-18
description: >

---

## Case: Changing a 12M data set to a map reduces the time from 20s to 100ms

The IDL data structure for the business is as follows:

```thrift
struct DataResponse {
    1: required i32 code
    2: required string msg
    3: optional map<string, set<Grid>> data
}
```

## Reason

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

## How to handle

**Option 1: Update the KiteX tool and regenerate the code (supported in v1.3.1 or later)**

The thrift code generation tool, thriftgo, in KiteX generates a separate DeepEqual method for each struct to avoid using reflection.

> Additionally, a [pull request](https://github.com/apache/thrift/pull/2307) has been submitted to the Thrift official repository to address this issue, and it has been merged.

**Option 2: Change set to map (incompatible change)**

If the elements are structs, changing the set to map will result in pointer types, which cannot guarantee uniqueness.

**Option 3: Disable set validation during code generation (business needs to ensure element uniqueness)**

Even if validation is added, it will only return an error. If the business can ensure element uniqueness, the validation can be skipped during encoding.

`kitex -thrift validate_set=false yourIDL`.