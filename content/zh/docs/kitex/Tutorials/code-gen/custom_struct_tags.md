---
title: "自定义结构体 Tags"
linkTitle: "自定义结构体 Tags"
weight: 9
date: 2024-04-18
keywords: ["kitex", "代码生成", "自定义 Tag"]
description: 自定义生成代码中结构体的 Tags
---

## 介绍

默认情况下，一个 IDL 生成的 golang 代码会有 thrift、frugal、json_tag

在 IDL 定义的结构体 field 后增加 go.tag= "xxx" 的 annotation 后，对应内容会作为 go 语言结构体中对应字段的 tags。

## 使用说明

当 IDL 中定义如下结构体时（注意用 \ 转义）：

```Thrift
struct foo {
  1: required string Bar (go.tag = "some_tag:\"some_tag_value\"")
}
```

生成的go语言结构体如下

```go
type Foo struct {
  Bar string `thrift:"bar,1,required" frugal:"1,required,string" some_tag:"some_tag_value"`
}
```

可以看到，原本的 thrift tag 和 frugal tag 依然存在，但其他的 tag（主要是 json tag）就变成了 go.tag 指定的内容。

## 注意事项

### 自定义 Tag 覆盖默认 JSON Tag

JSON Tag 属于默认 tag ，一旦通过 go.tag 自定义 tag 后，原来的 JSON Tag 便不会再生成。

解决方案：

- 升级 thriftgo >=0.2.10，kitex 执行时带上 `-thrift always_gen_json_tag` 参数

  ```bash
  # upgrade thriftgo
  go install github.com/cloudwego/thriftgo@latest
  
  # regenerate with the argument
  kitex -thrift always_gen_json_tag -module $mod -service $svc xxx.thrift
  ```

- 在 go.tag 里把你需要的 json tag 也加上，例如：

  ```Thrift
  // 可以把之前生成的 json tag 拷贝过来（注意转义）
  struct foo {
    1: required string Bar (go.tag = "json=\"Bar,omitempty\" some_tag:\"xxx\"")
  }
  ```

  
