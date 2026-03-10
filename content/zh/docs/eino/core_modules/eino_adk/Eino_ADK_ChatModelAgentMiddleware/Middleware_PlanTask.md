---
Description: ""
date: "2026-03-09"
lastmod: ""
tags: []
title: PlanTask
weight: 4
---

# PlanTask 中间件

adk/middlewares/plantask

> 💡
> 本中间件在 v0.8.0 版本引入。

## 概述

`plantask` 是一个任务管理中间件，让 Agent 可以创建和管理任务列表。中间件通过 `BeforeAgent` 钩子注入四个工具：

- **TaskCreate**: 创建任务
- **TaskGet**: 查看任务详情
- **TaskUpdate**: 更新任务
- **TaskList**: 列出所有任务

主要用途：

- 跟踪复杂任务的进度
- 把大任务拆成小步骤
- 管理任务间的依赖关系

---

## 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Agent                                      │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  BeforeAgent: 注入任务工具                                         │  │
│  │    - TaskCreate                                                    │  │
│  │    - TaskGet                                                       │  │
│  │    - TaskUpdate                                                    │  │
│  │    - TaskList                                                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             Backend                                     │
│                                                                         │
│  存储结构:                                                               │
│    baseDir/                                                             │
│    ├── .highwatermark    # ID 计数器                                    │
│    ├── 1.json            # 任务 #1                                      │
│    ├── 2.json            # 任务 #2                                      │
│    └── ...                                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 配置

```go
type Config struct {
    Backend Backend  // 存储后端，必填
    BaseDir string   // 任务文件目录，必填
}
```

- 注意这个 Backend 的实现，应该是 session 维度隔离的，不同的 session 对应不同的 Backend（任务列表）

---

## Backend 接口

```go
type Backend interface {
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    Read(ctx context.Context, req *ReadRequest) (string, error)
    Write(ctx context.Context, req *WriteRequest) error
    Delete(ctx context.Context, req *DeleteRequest) error
}
```

---

## 任务结构

```go
type task struct {
    ID          string         `json:"id"`          // 任务 ID
    Subject     string         `json:"subject"`     // 标题
    Description string         `json:"description"` // 描述
    Status      string         `json:"status"`      // 状态
    Blocks      []string       `json:"blocks"`      // 阻塞哪些任务
    BlockedBy   []string       `json:"blockedBy"`   // 被哪些任务阻塞
    ActiveForm  string         `json:"activeForm"`  // 进行时文案
    Owner       string         `json:"owner"`       // 负责 agent
    Metadata    map[string]any `json:"metadata"`    // 自定义数据
}
```

### 状态

<table>
<tr><td>状态</td><td>说明</td></tr>
<tr><td><pre>pending</pre></td><td>待处理（默认）</td></tr>
<tr><td><pre>in_progress</pre></td><td>进行中</td></tr>
<tr><td><pre>completed</pre></td><td>已完成</td></tr>
<tr><td><pre>deleted</pre></td><td>删除（会删掉文件）</td></tr>
</table>

状态流转：`pending` → `in_progress` → `completed`，任何状态都可以直接 `deleted`。

---

## 工具

### TaskCreate

创建任务。

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td><pre>subject</pre></td><td>string</td><td>是</td><td>标题</td></tr>
<tr><td><pre>description</pre></td><td>string</td><td>是</td><td>描述</td></tr>
<tr><td><pre>activeForm</pre></td><td>string</td><td>否</td><td>进行时文案，比如"正在运行测试"</td></tr>
<tr><td><pre>metadata</pre></td><td>object</td><td>否</td><td>自定义数据</td></tr>
</table>

什么时候用：

- 任务比较复杂，有 3 步以上
- 用户给了一堆事情要做
- 需要让用户看到进度

什么时候不用：

- 就一个简单任务
- 三两下就能搞定的事

### TaskGet

查看任务详情。

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td><pre>taskId</pre></td><td>string</td><td>是</td><td>任务 ID</td></tr>
</table>

返回任务的完整信息：标题、描述、状态、依赖关系等。

### TaskUpdate

更新任务。

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td><pre>taskId</pre></td><td>string</td><td>是</td><td>任务 ID</td></tr>
<tr><td><pre>subject</pre></td><td>string</td><td>否</td><td>新标题</td></tr>
<tr><td><pre>description</pre></td><td>string</td><td>否</td><td>新描述</td></tr>
<tr><td><pre>activeForm</pre></td><td>string</td><td>否</td><td>新的进行时文案</td></tr>
<tr><td><pre>status</pre></td><td>string</td><td>否</td><td>新状态</td></tr>
<tr><td><pre>addBlocks</pre></td><td>[]string</td><td>否</td><td>添加被阻塞的任务</td></tr>
<tr><td><pre>addBlockedBy</pre></td><td>[]string</td><td>否</td><td>添加阻塞自己的任务</td></tr>
<tr><td><pre>owner</pre></td><td>string</td><td>否</td><td>负责 agent</td></tr>
<tr><td><pre>metadata</pre></td><td>object</td><td>否</td><td>自定义数据（设 null 删除）</td></tr>
</table>

注意：

- `status: "deleted"` 会直接删掉任务文件
- 加依赖时会检查循环依赖
- 所有任务都完成后会自动清理

### TaskList

列出所有任务，不需要参数。

返回每个任务的摘要：ID、状态、标题、负责 agent、依赖关系。

---

## 使用示例

```go
ctx := context.Background()

// plantask middleware 正常情况下应该 session 维度的
// 不同的 session 对应不同的任务列表
middleware, err := plantask.New(ctx, &plantask.Config{
    Backend: myBackend,
    BaseDir: "/tasks",
})
if err != nil {
    return err
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    myModel,
    Handlers: []adk.ChatModelAgentMiddleware{middleware},
})
```

### 典型流程

```
1. 收到复杂任务
       │
       ▼
2. TaskCreate 创建任务
   - #1: 分析需求
   - #2: 写代码
       │
       ▼
3. TaskUpdate 设置依赖
   - #2 依赖 #1
   - #3 依赖 #2
       │
       ▼
4. TaskList 看看有啥任务
       │
       ▼
5. TaskUpdate 开始干活
   - #1 改成 in_progress
       │
       ▼
6. 干完了 TaskUpdate
   - #1 改成 completed
       │
       ▼
7. 循环 4-6 直到全部完成
       │
       ▼
8. 自动清理
```

---

## 依赖管理

- **blocks**: 我完成了，这些任务才能开始
- **blockedBy**: 这些任务完成了，我才能开始

```
Task #1 (blocks: ["2"])  ────►  Task #2 (blockedBy: ["1"])

#1 完成后 #2 才能开始
```

循环依赖会报错：

```
#1 blocks #2
#2 blocks #1  ← 不行，循环了
```

---

## 自动清理

所有任务都 `completed` 后，会自动把任务文件都删掉。

---

## 注意事项

- 任务文件以 JSON 格式存储在 `BaseDir` 目录下，文件名为 `{id}.json`
- `.highwatermark` 文件用于记录已分配的最大任务 ID，确保 ID 不重复
- 所有工具操作都有互斥锁保护，并发安全
- 工具的 description 里已经包含了详细的使用指南，Agent 会根据这些指南来使用工具

---

## 多语言支持

工具的 description 支持中英文切换，通过 `adk.SetLanguage()` 设置：

```go
// 使用中文 description
adk.SetLanguage(adk.LanguageChinese)

// 使用英文 description（默认）
adk.SetLanguage(adk.LanguageEnglish)
```

这个设置是全局的，会影响所有 ADK 内置的 prompt 和工具 description。
