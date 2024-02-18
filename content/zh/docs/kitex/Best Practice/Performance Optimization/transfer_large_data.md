---
title: "使用 set<struct> 传输大量数据"
linkTitle: "使用 set<struct> 传输大量数据"
weight: 1
date: 2024-02-18
description: >

---

## Case：12M 数据 set 改为 map 耗时 20s -> 100ms

业务 IDL 数据结构如下：

```thrift
struct DataResponse {
    1: required i32 code
    2: required string msg
    3: optional map<string, set<Grid>> data
}
```

## 原因

Thrift 官方0.11.0开始在 go 生成代码中将 set 类型由 `map[T]bool` 改为 `[]T`，见 https://github.com/apache/thrift/pull/1156。

由于 ` []T` 无法去重，避免发送重复元素，编码时对 slice 的元素进行校验，校验方式是 O(n^2) 遍历 + `reflect.DeepEqual`，代码如下：

```go
for i := 0; i < len(p.StringSet); i++ {
   for j := i + 1; j < len(p.StringSet); j++ {
      if reflect.DeepEqual(p.StringSet[i], p.StringSet[j]) {
         return thrift.PrependError("", fmt.Errorf("%T error writing set field: slice is not unique", p.StringSet[i]))
      }
   }
}
```

如果 set 中元素数据很多，同时数据结构复杂将导致编码耗时急剧增加，如前面所述 case。

## 如何处理

**方式一：更新 KiteX 工具重新生成代码( >= v1.3.1支持)**

KiteX 的 thrift 生成工具 thriftgo 对 struct 单独生成了 DeepEqual 方法避免反射调用。

> 同时向 thrift 官方提交了 [PR](https://github.com/apache/thrift/pull/2307) 优化该问题，已经被官方合并。  

**方式二：将 set 改成 map（不兼容的变更）**

如果元素是 struct 生成出来是指针类型，也不能保证唯一性。

**方式三：生成代码时通过参数禁用 set 校验（业务自行保证元素的唯一性）**

即使增加了校验也是返回 error，如果业务能自行保证唯一性，编码时可不做该校验

`kitex -thrift validate_set=false yourIDL`