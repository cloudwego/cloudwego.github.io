---
title: "Service Filtering"
date: 2024-02-09
weight: 10
keywords: ["Service Discovery", "filtering"]
description: "Kitex provides a rule-based parser that allows users to filter service instances."
---

## Overview

The Kitex extension [resolver-rule-based](https://github.com/kitex-contrib/resolver-rule-based) provides a rule-based resolver. It allows users to configure rules to filter service instances in service discovery, enabling the functionality of traffic splitting.

This resolver needs an implemented Resolver, which is able to resolve instances from the registry center, and some customized filter rules (e.g. filter by tags in the instances).

**Feature Highlights**

- Support for custom filtering rules, enabling filtering based on instance labels or other metadata.

- Support for sequentially executing multiple filtering functions, flexibly defining the logic for service resolution.

## Usage

1. Implement your own Resolver. Refer to this doc about the definition of Resolver: [Service Discovery Extension](/docs/kitex/tutorials/framework-exten/service_discovery/)

2. Define filter rules.

   ```go
   // Define a filter function.
   // For example, only get the instances with a tag of {"k":"v"}.
   filterFunc := func(ctx context.Context, instance []discovery.Instance) []discovery.Instance {
        var res []discovery.Instance
        for _, ins := range instance {
            if v, ok := ins.Tag("k"); ok && v == "v" {
                res = append(res, ins)
            }
        }
        return res
   }
   // Construct the filterRule
   filterRule := &FilterRule{Name: "rule-name", Funcs: []FilterFunc{filterFunc}}
   ```

   Notice: the FilterFuncs will be executed sequentially.

3. Configure the resolver

   ```go
    import (
       ruleBasedResolver "github.com/kitex-contrib/resolver-rule-based"
       "github.com/cloudwego/kitex/client"
       "github.com/cloudwego/kitex/pkg/discovery"
    )

    // implement your resolver
    var newResolver discovery.Resolver

    // construct a RuleBasedResolver with the `newResolver` and `filterRule`
    tagResolver := ruleBasedResolver.NewRuleBasedResolver(resolver, filterRule)

    // add this option when construct Kitex Client
    opt := client.WithResolver(tagResolver)
   ```

## Demo

Please refer to the [Demo](https://github.com/kitex-contrib/resolver-rule-based/tree/main/demo) for usage examples.
