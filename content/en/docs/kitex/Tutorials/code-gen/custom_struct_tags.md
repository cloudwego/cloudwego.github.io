---
title: "Custom Struct Tags"
linkTitle: "Custom Struct Tags"
weight: 9
date: 2024-04-18
keywords: ["Kitex", "Code Gen", "Custom Tag"]
description: Custom Tags for structures in generated code

---

## Introduction

By default, the golang code generated from an IDL will have thrift, frugal, and json tags.

When an annotation `go.tag = "xxx"` is added after a field definition in the IDL, the corresponding content will be used as the tags for the corresponding field in the Go struct.

## Usage Instructions

When the following struct is defined in the IDL (note the use of `\` for escaping):

```thrift
struct foo {
  1: required string Bar (go.tag = "some_tag:\"some_tag_value\"")
}
```

The generated Go struct will be:

```go
type Foo struct {
  Bar string `thrift:"bar,1,required" frugal:"1,required,string" some_tag:"some_tag_value"`
}
```

As you can see, the original thrift tag and frugal tag still exist, but other tags (especially the JSON tag) have been replaced with the content specified in the `go.tag`.

## Notes

### Custom Tags Override the Default JSON Tag

The JSON tag is a default tag, and once a custom tag is specified using `go.tag`, the original JSON tag will no longer be generated.

Solution:

- Upgrade `thriftgo` to version `>=0.2.10` and use the `-thrift always_gen_json_tag` flag when running `kitex`.

  ```bash
  # Upgrade thriftgo
  go install github.com/cloudwego/thriftgo@latest
  
  # Regenerate with the argument
  kitex -thrift always_gen_json_tag -module $mod -service $svc xxx.thrift
  ```

- Include the desired JSON tag in the `go.tag`. For example:

  ```thrift
  // You can copy the previously generated JSON tag (note the escaping)
  struct foo {
    1: required string Bar (go.tag = "json=\"Bar,omitempty\" some_tag:\"xxx\"")
  }
  ```