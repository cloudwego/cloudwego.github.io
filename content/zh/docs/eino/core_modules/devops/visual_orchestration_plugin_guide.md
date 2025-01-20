---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: EinoDev 可视化编排插件功能指南
weight: 2
---

# 简介

> 💡
> Goland 提供的 Eino 可视化编排插件, 在 GoLand 中可以通过组件拖拽实现 Graph 的编排生成代码，并支持导入导出

## 初认插件

### 插件功能介绍

![](/img/eino/P1Y5bQG0Po6kGEx2JNRc8c8Lnlh.png)

## 编排组件介绍

## 图 （ Graph ）

- 与 Eino 中的 Graph 概念一致，指最终由插件侧生成的 Graph，可在以下界面添加 Graph。
- 点击添加插件，则弹出创建对话框，根据字段说明补充配置信息，即可生成一个 Graph 编排对象。

<table><tbody><tr>
<td>
<img src="/img/eino/Um1NbdXQVo8JrTxU3VOcBlnonOf.png" />
</td>
<td>
<img src="/img/eino/Jt19bWHr5oIZg0x0thLcJRTRnRc.png" />
</td>
<td>
<img src="/img/eino/Dw2sb9xwXoHNgbxmOmecyX1Anof.png" />
</td>
</tr></tbody></table>

### 节点 （ Node ）

- 与  Eino  中的  Node  一致，创建 Graph 完成后，通过界面右上角 AddNodes ，添加不同类型 Node 到画布。
- 添加到 Graph 中 Node 插件会默认填写 NodeKey ，此外可展开 More config 为 Node 配置可选配置。

<table><tbody><tr>
<td>
<img src="/img/eino/MatXbGz9zo2QjPxMUL3csOJ8nzg.png" />
</td>
<td>
<img src="/img/eino/Hqlvb9PRao5irfxkBWocQAGJnSe.png" />
</td>
<td>
<img src="/img/eino/SG6tb6PI0o2t9Yx9mBycYx4HnVf.png" />
</td>
</tr></tbody></table>

### 组件 （ Component ）

- Component 是组成 Node 的必要信息，不同的 Component 对应不同的 Node 类型，并且提供了内置的官方  Official Components  与  Custom Components  。
- 完成添加  Node  操作后，可按需配置组件的 Runtime Config 信息。

<table><tbody><tr>
<td>
<img src="/img/eino/RlDWblfPXoTPoMxm9brcBV35n0n.png" />
</td>
<td>
<img src="/img/eino/CX4Pb4E6souBC1xBNwucR9HInYb.png" />
</td>
</tr></tbody></table>

### 插槽 （ Slot ）

- 不同类型的 Component 的生成会依赖其他组件，将其作为自身配置依赖的一部分，这部分依赖被称作插槽（ Slot ）。
- 比如官方提供的 volc_vikingDB  组件，其依赖了 Embeding Component 作为插槽；再比如官方提供的 ToolsNode 组件，其依赖了多个 Tool  Component。

<table><tbody><tr>
<td>
<img src="/img/eino/BEsRbqI39oKAiaxM1r2cORUjndc.png" />
</td>
<td>
<img src="/img/eino/SOnyb4oinoKnE7xJTgqc4fy7n9f.png" />
</td>
</tr></tbody></table>

## 开始编排

### 初始化插件

点击进入 Eino Dev 插件，会展示如下界面，可点击图中圈选框进入编排。
![](/img/eino/LbntbO2kroPGKExqpG6cIAuTn1f.png)

### 创建并编排 Graph

- 界面左下角新增 Graph，在弹窗对话框填写 Graph 相关配置，生成 Graph 画布。
- 按需从 AddNodes  选择合适的 Node 组件，添加的画布。
- 依据业务编排逻辑将 Node 组件连接，完成 Graph 业务编排逻辑。

<table><tbody><tr>
<td>
<img src="/img/eino/JuLfbpcido9Ws0xy5H6c4TpAnBb.png" />
</td>
<td>
<img src="/img/eino/WxOLb5hbYohJpVxiF7ocotIun3f.png" />
</td>
<td>
<img src="/img/eino/PfSnbx0lkorHiGxTvRscfne4nc6.png" />
</td>
</tr></tbody></table>

- 点击 “Generate as code” 并填写指定路径，将编排的 Graph 生成代码并保存到指定路径。

<table><tbody><tr>
<td>
<img src="/img/eino/V1ZSbrkKTog19jxRC29cGTHSnlt.png" />
</td>
<td>
<img src="/img/eino/SOyYbGxDCoiLisxdiagcv1mCnnf.png" />
</td>
</tr></tbody></table>

- 特别的当添加的 Component 为 Graph 类型时，添加的 嵌套 Graph 可展开做 Node 组件的配置，配置完成后，通过顶层面包屑路径跳回首页界面。

<table><tbody><tr>
<td>
<img src="/img/eino/ZB5UbYmijo2IG8x0ylPcm11enAf.png" />
</td>
<td>
<img src="/img/eino/MQefb99lJoFVCuxo346cNnOMnoc.png" />
</td>
</tr></tbody></table>

##
