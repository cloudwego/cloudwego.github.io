---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: 贡献规范'
weight: 7
---

Eino 代码的贡献形式：

1. 贡献代码的同学以 Fork PR 的形式提交代码
   1. 提交 PR 时，请写清楚贡献代码的前因后果
2. Eino Maintainers 会定期 Review 提交的 PR，并在 PR 中的 Conversion 讨论代码内容
3. 代码达到合入条件后，由 Eino Maintainers 触发单测并合入。

# 组件贡献

Eino 组件的实现一般会在 Eino-Ext 仓库中的特定目录下，新建一个 Go Sub Module，独立开发和维护。

- 必须包含中英文的 README
- 必须包含丰富准确的 Examples
- 必须包含 callback.Handler 的切面点位的注入
