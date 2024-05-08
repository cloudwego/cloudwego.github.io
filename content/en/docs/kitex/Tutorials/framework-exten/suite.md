---
title: "Suite Extensions"
date: 2021-08-31
weight: 2
description: >
---

## Introduction

Suite is a high-level abstraction for extensions, which can be understood as a combination and encapsulation of Option and Middleware.
In the process of expansion, we need to remember two principles:

1. Suite can only be set when initializing Server and Client, and dynamic modification is not allowed.
2. The suite is executed in the order of the settings. For the client, it executes in the order of the settings, while for the server, it is the opposite.

The definition of Suite is as follows:

```golang
type Suite interface {
    Options() []Option
}
```

Both Server and Client use the `WithSuite` method to enable the new suite.

## Example

```golang
type mockSuite struct{
    config *Config
}

func (m *mockSuite) Options() []Option {
    return []Option{
       WithClientBasicInfo(mockEndpointBasicInfo),
       WithDiagnosisService(mockDiagnosisService),
       WithRetryContainer(mockRetryContainer),
       WithMiddleware(mockMW(m.config)),
       WithSuite(mockSuite2),
    }
}
```

The above code defines a simple client suite implementation, and we can use `client.WithSuite(&mockSuite{})` in the code to use all middleware/options encapsulated by this suite.

## Summary

Suite is a higher-level combination and encapsulation. It is highly recommended for third-party developers to provide Kitex extensions to the outside world based on Suite. Suite allows dynamic injection of values during creation or dynamically specifying values in its middleware based on certain runtime values. This makes it more convenient for users and third-party developers, eliminating the need for reliance on global variables and enabling the possibility of using different configurations for each client.
