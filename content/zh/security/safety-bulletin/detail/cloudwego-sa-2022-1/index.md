---
date: 2022-01-13
title: "CloudWeGo-SA-2022-1"
linkTitle: "CloudWeGo-SA-2022-1"
description: "Connection Leaking"
---

## 简介

修复客户端编码失败时连接会泄漏的问题

## 严重级别

Low

## 描述

修复客户端编码失败时连接会泄漏的问题

## 解决办法

当客户端编码失败时，释放连接

## 影响组件

kitex-v0.1.3

## CVE

无

## 参考链接

- https://github.com/cloudwego/kitex/pull/315
