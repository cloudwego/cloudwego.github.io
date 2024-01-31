---
title: "Generic Call"
date: 2021-09-26
weight: 1
keywords: ["Kitex", "Generic Call"]
description: Generic call is typically used for mid-platform services that do not need generated code.
---

In traditional RPC (Remote Procedure Call) calls, the client usually relies on the server's Interface Definition Language (IDL), which defines the service interfaces, parameter structures, data types, and other information. The client generates code based on the IDL and makes RPC calls. However, for general-purpose platforms like API gateways and interface testing platforms, which have thousands of services connected to them, it is impractical for the platform to rely on generating code from the IDL of every service to make RPC calls. In this context, the concept of generalized RPC calls emerged. It provides a generic interface that accepts data in formats like JSON or Map and converts it into the data format specified by the RPC protocol to initiate the call.
