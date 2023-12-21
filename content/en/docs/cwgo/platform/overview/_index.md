---
title: "Overview"
linkTitle: "Overview"
weight: 1
description: >
---

Cwgo is a CloudWeGo All in One code generation tool that integrates the advantages of various components to improve the
developer experience. At present, most of the code generation work for Server and Client can be automated and
platformized, and the user experience can be improved through unified code hosting.

We don't need to focus on how the tool generates code internally, we just need to focus on information management, code
generation, and other functions.

The platform mainly provides IDL information management and code repository information management, which allows users
to configure IDL and generate kitex/hertz client call packages, making it convenient for users.

## Platform features

- friendly user interface

  Users only need to manage repo and IDL information on the platform, which supports bright and dark themes.

  ![platform interface](/img/docs/cwgo_platform.png)

- Single access point, integrating the functions of various components, simplifying the development process for
  developers

  Provide a unified entry point to integrate IDL management, code generation, and other functions
  into one platform, allowing developers to complete all related operations on the platform. Developers only need to
  interact with the platform without considering backend technical details when use client/server call code.


- Automatically generate and synchronize code, and dynamically generate service call packages.

  Support IDL dynamic change monitoring. When IDL file is changed, the platform can
  timely perceive and synchronously update the generated calling code, realizing the synchronization of interface
  definition and calling code updates.
