---
title: "FAQ"
linkTitle: "FAQ"
weight: 7
keywords: ["Monolake", "HTTP", "Proxy", "Q&A"]
description: "Monolake Frequently Asked Questions and Answers."
---

## Monolake 

**Q1: Can you run monolake on Mac OS？**
* Yes, monolake will default to kqueue instead of io-uring on MacOS.

**Q2: Does Monolake support HTTP2？**
* Yes, monolake supports HTTP2 on the downstream(client to proxy) connection 
* Monolake defaults to HTTP1_1 on the upstream(proxy to server) connection with future support for HTTP2 planned   
