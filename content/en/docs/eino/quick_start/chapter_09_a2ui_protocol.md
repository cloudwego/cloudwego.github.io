---
Description: ""
date: "2026-03-16"
lastmod: ""
tags: []
title: "Final: A2UI protocol (streaming UI components)"
weight: 10
---

Goal of this chapter: implement the A2UI protocol and render the Agent output as a stream of UI components.

## Important: A2UI’s boundary

A2UI is not part of the Eino framework itself. It is a business-layer UI protocol/rendering approach. This chapter integrates A2UI into the Agent you built across previous chapters to provide an end-to-end, production-oriented example: model calls, tool calls, workflow orchestration, and finally delivering results as a more user-friendly UI.

In real-world products, you can choose different UI forms depending on your product:

- Web/App: custom components, tables, cards, charts
- IM/office suite: message cards, interactive forms
- CLI: plain text or TUI

## Full tutorial

- [ch10_a2ui.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch10_a2ui.md)
