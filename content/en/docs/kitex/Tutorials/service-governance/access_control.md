---
title: "Customized Access Control"
date: 2021-08-31
weight: 4
keywords: ["Kitex", "Access Control", "ACL"]
description: Kitex provides a simple middleware builder that supports self-defined access control logic to reject requests under certain conditions.
---

Below is a simple example that randomly rejects 1% of all requests through self-defined access control logic:

```go
package myaccesscontrol

import (
    "math/rand"
    "github.com/cloudwego/kitex/pkg/acl"
)

var errRejected = errors.New("1% rejected")

// Implements a judge function.
func reject1percent(ctx context.Context, request interface{}) (reason error) {
    if rand.Intn(100) == 0 {
        return errRejected // an error should be returned when a request is rejected
    }
    return nil
}

var MyMiddleware = acl.NewACLMiddleware(reject1percent) // create the middleware
```

Then, you can enable this middleware with `WithMiddleware(myaccesscontrol.MyMiddleware)` at the creation of a client or a server.
