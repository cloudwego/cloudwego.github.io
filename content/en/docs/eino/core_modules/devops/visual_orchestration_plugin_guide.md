---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: Eino Dev Visual Orchestration Guide
weight: 2
---

## Overview

> The GoLand Eino visual orchestration plugin lets you compose Graphs by dragging components and generates code. Import/export are supported.

## First Look

<a href="/img/eino/eino_orchestration_describtion_page.png" target="_blank"><img src="/img/eino/eino_orchestration_describtion_page.png" width="100%" /></a>

## Orchestration Concepts

### Graph

- Matches Eino’s Graph concept. Add a Graph from the plugin UI.
- Fill the creation dialog to generate a Graph object.

<table><tbody><tr>
<td><a href="/img/eino/eino_orchestration_add_graph_2_page.png" target="_blank"><img src="/img/eino/eino_orchestration_add_graph_2_page.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_orchestration_add_graph_config_deatil_page.png" target="_blank"><img src="/img/eino/eino_orchestration_add_graph_config_deatil_page.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_orchestration_add_graph_page.png" target="_blank"><img src="/img/eino/eino_orchestration_add_graph_page.png" width="100%" /></a></td>
</tr></tbody></table>

### Node

- Matches Eino’s Node concept. After creating a Graph, click “AddNodes” to add different node types onto the canvas.
- Node keys are auto-filled; expand “More config” for optional settings.

<table><tbody><tr>
<td><a href="/img/eino/eino_orchestration_show_nodes_page.png" target="_blank"><img src="/img/eino/eino_orchestration_show_nodes_page.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_orchestration_add_nodes_page.png" target="_blank"><img src="/img/eino/eino_orchestration_add_nodes_page.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_dev_chat_model_config2.png" target="_blank"><img src="/img/eino/eino_dev_chat_model_config2.png" width="100%" /></a></td>
</tr></tbody></table>

### Component

- Components define node behavior. Official components and custom components are supported.
- Configure runtime settings after adding a node.

<table><tbody><tr>
<td><a href="/img/eino/eino_orchestration_add_nodes_3_page.png" target="_blank"><img src="/img/eino/eino_orchestration_add_nodes_3_page.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_dev_chat_model_config.png" target="_blank"><img src="/img/eino/eino_dev_chat_model_config.png" width="100%" /></a></td>
</tr></tbody></table>

### Slot

- Some components depend on other components — these dependencies are called slots.
- For example, `volc_vikingDB` depends on an `Embedding` component; `ToolsNode` depends on multiple `Tool` components.

<table><tbody><tr>
<td><a href="/img/eino/eino_orchestration_add_slot_page.png" target="_blank"><img src="/img/eino/eino_orchestration_add_slot_page.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_orchestration_node_add_slots__page.png" target="_blank"><img src="/img/eino/eino_orchestration_node_add_slots__page.png" width="100%" /></a></td>
</tr></tbody></table>

## Start Orchestrating

### Initialize the Plugin

Open Eino Dev and click into orchestration.

<a href="/img/eino/eino_orchestration_enter_page.png" target="_blank"><img src="/img/eino/eino_orchestration_enter_page.png" width="100%" /></a>

### Create and Orchestrate a Graph

- Add a Graph via the bottom-left control; fill the dialog to create the canvas.
- Use “AddNodes” to add nodes as needed.
- Connect nodes according to business logic.

<table><tbody><tr>
<td><a href="/img/eino/eino_dev_add_graph.png" target="_blank"><img src="/img/eino/eino_dev_add_graph.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_dev_add_chatmodel.png" target="_blank"><img src="/img/eino/eino_dev_add_chatmodel.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_orchestration_add_nodes_2_page.png" target="_blank"><img src="/img/eino/eino_orchestration_add_nodes_2_page.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_orchestration_add_edges_page.png" target="_blank"><img src="/img/eino/eino_orchestration_add_edges_page.png" width="100%" /></a></td>
</tr></tbody></table>

- Click “Generate as code”, choose a folder, and save the generated Graph code.

<table><tbody><tr>
<td><a href="/img/eino/eino_orchestration_generate_code.png" target="_blank"><img src="/img/eino/eino_orchestration_generate_code.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_orchestration_gencode_page.png" target="_blank"><img src="/img/eino/eino_orchestration_gencode_page.png" width="100%" /></a></td>
</tr></tbody></table>

- When adding a Graph component as a node, expand the nested Graph to configure its nodes; use the breadcrumb to return to the top-level after configuration.

<table><tbody><tr>
<td><a href="/img/eino/eino_orchestration_subgraph_show_page.png" target="_blank"><img src="/img/eino/eino_orchestration_subgraph_show_page.png" width="100%" /></a></td>
<td><a href="/img/eino/eino_orchestration_sub_graph_pos_page.png" target="_blank"><img src="/img/eino/eino_orchestration_sub_graph_pos_page.png" width="100%" /></a></td>
</tr></tbody></table>

