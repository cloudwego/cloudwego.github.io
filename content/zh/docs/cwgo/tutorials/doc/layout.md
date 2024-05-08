---
title: "生成代码的结构"
linkTitle: "生成代码的结构"
weight: 3
description: >
---

![image](/img/docs/cwgo_doc_generate_file.png)

> biz/doc/dao/{struct name}：存放 mongodb curd 代码，生成位置可通过 --dao_dir 修改
>
> - {struct name}\_repo.go 函数接口文件
> - {struct name}\_repo_mongo.go 接口实现及具体 curd 代码
>
> biz/doc/model：thriftgo 或 protoc 生成的代码，Mongodb 集合对应的 go struct 位于此处，生成位置可通过 --model_dir 修改

用户需传入要使用集合的 `*mongo.Collection` 参数并调用 `{struct name}_repo_mongo.go` 中的 `New{struct name}Repository` 函数来使用工具生成的 CURD 函数。

示例代码：

```go
// call NewUserRepository
userMongo := user.NewUserRepository(collection)
// call InsertUser to insert user document to mongodb
user.InsertUser(ctx, user)...
```
