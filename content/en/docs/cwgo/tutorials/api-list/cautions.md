---
title: "cautions"
linkTitle: "cautions"
weight: 3
description: >
---

Considerations when using the `api-list` command.

## parsing limits of project code

- `*server.Hertz`, `*route.Engine`, `*route.Group` should be **local variables** only

  i.e. variable can only be declared within that **function parameter** or **function internally**

- The **relativePath** passed in the call to `Group()` and the **route registration function** must be a **string literal**, not a **variable**
