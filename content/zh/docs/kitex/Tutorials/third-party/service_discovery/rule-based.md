---
title: "服务过滤"
date: 2024-02-09
weight: 10
keywords: ["服务注册与发现", "过滤"]
description: "Kitex 提供了基于规则的解析器，允许用户过滤服务实例。"
---

## 概述

Kitex 拓展 [resolver-rule-based](https://github.com/kitex-contrib/resolver-rule-based) 提供了一个基于规则的解析器。它允许用户配置规则以过滤服务发现中的服务实例，实现流量切分的功能。

这个解析器需要一个已实现的 Resolver，能够从注册中心解析实例，同时还需要一些定制化的过滤规则（例如，在实例中根据标签进行过滤）。

**功能特性**

- 支持自定义过滤规则，能够基于实例的标签或其他元数据进行筛选。

- 支持顺序执行多个过滤函数，灵活定义服务解析的逻辑。

## 用法

1. 实现你自己的解析器。参考这个文档关于解析器的定义： [服务发现扩展](/zh/docs/kitex/tutorials/framework-exten/service_discovery/)

2. 定义过滤规则。

   ```go
   // 定义一个过滤函数
   // 例如，只获取具有标签 {"k":"v"} 的实例
   filterFunc := func(ctx context.Context, instance []discovery.Instance) []discovery.Instance {
        var res []discovery.Instance
        for _, ins := range instance {
            if v, ok := ins.Tag("k"); ok && v == "v" {
                res = append(res, ins)
            }
        }
        return res
   }
   // 构造过滤规则
   filterRule := &FilterRule{Name: "rule-name", Funcs: []FilterFunc{filterFunc}}
   ```

   注意：FilterFuncs 将按顺序执行。

3. 配置解析器

   ```go
   import (
      ruleBasedResolver "github.com/kitex-contrib/resolver-rule-based"
      "github.com/cloudwego/kitex/client"
      "github.com/cloudwego/kitex/pkg/discovery"
   )

   // 实现你的解析器
   var newResolver discovery.Resolver

   // 使用 `newResolver` 和 `filterRule` 构造一个 RuleBasedResolver
   tagResolver := ruleBasedResolver.NewRuleBasedResolver(resolver, filterRule)

   // 在构建 Kitex 客户端时添加此选项
   opt := client.WithResolver(tagResolver)
   ```

## 示例

使用示例请参考 [Demo](https://github.com/kitex-contrib/resolver-rule-based/tree/main/demo) 。
