---
title: "Framework Extension"
linkTitle: "Framework Extension"
weight: 6
date: 2021-08-31
description: >
---

## Overview

The core of the Kitex framework is primarily developed based on interfaces rather than being restricted to specific components. This provides the framework with strong extensibility, allowing developers to easily integrate a variety of third-party components according to specific needs.

The framework mainly provides two basic ways of extension:

1. Middleware: which can perform certain operations and processing on the data related to each request before and after the request process, to customize the required functionalities;

2. Option: which is a limited number of selections provided by the framework, each with its corresponding extension capabilities, all different. This section will introduce the commonly used Options in detail, and you can also check the entire list of Options in the [Option](/docs/kitex/tutorials/options/) chapter;

In addition, there is a more advanced way of extension, which is adding a Suite. A Suite is a combination and packaging of Middleware and Option, meaning that adding a Suite is equivalent to adding multiple Options and Middleware.
