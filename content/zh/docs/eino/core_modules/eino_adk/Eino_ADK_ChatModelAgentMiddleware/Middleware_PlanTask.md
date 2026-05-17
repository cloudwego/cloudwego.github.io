---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: PlanTask
weight: 6
---

> 💡
> 本中间件在 v0.8.0 版本引入。包路径：`github.com/cloudwego/eino/adk/middlewares/plantask`

## 概述

`plantask` 是一个任务管理中间件，通过 `BeforeAgent` 钩子向 Agent 注入四个工具，使其具备结构化任务规划能力：

<table>
<tr><td>工具</td><td>功能</td></tr>
<tr><td><pre>TaskCreate</pre></td><td>创建任务</td></tr>
<tr><td><pre>TaskGet</pre></td><td>获取单个任务详情</td></tr>
<tr><td><pre>TaskUpdate</pre></td><td>更新任务状态/字段、设置依赖、删除任务</td></tr>
<tr><td><pre>TaskList</pre></td><td>列出所有任务摘要</td></tr>
</table>

核心用途：将复杂请求拆解为可跟踪的小任务，管理任务间依赖关系，让用户看到执行进度。

---

## 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Agent                                      │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  BeforeAgent: 注入任务工具 (带 sync.Mutex 保证并发安全)             │  │
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
│    ├── .highwatermark    # 已分配的最大 ID（纯数字文本）                  │
│    ├── 1.json            # 任务 #1                                      │
│    ├── 2.json            # 任务 #2                                      │
│    └── ...                                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API

### 构造函数

```go
// 泛型版本，支持 *schema.Message 和 *schema.AgenticMessage
func NewTyped[M adk.MessageType](ctx context.Context, config *Config) (adk.TypedChatModelAgentMiddleware[M], error)

// 非泛型版本，等价于 NewTyped[*schema.Message]
func New(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)
```

### Config

```go
type Config struct {
    Backend Backend  // 存储后端，必填
    BaseDir string   // 任务文件存储目录，必填
}
```

> 💡
> Backend 应该是 session 维度隔离的——不同会话对应不同的 Backend 实例（即不同的任务列表）。

### Backend 接口

`Backend` 定义在 `plantask` 包内，是 `filesystem.Backend` 的精简子集，仅保留任务存储所需的四个方法：

```go
type Backend interface {
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    Read(ctx context.Context, req *ReadRequest) (*filesystem.FileContent, error)
    Write(ctx context.Context, req *WriteRequest) error
    Delete(ctx context.Context, req *DeleteRequest) error
}
```

其中类型别名关系：

```go
type FileInfo = filesystem.FileInfo        // Path, IsDir, Size, ModifiedAt
type LsInfoRequest = filesystem.LsInfoRequest  // Path string
type ReadRequest = filesystem.ReadRequest       // FilePath, Offset, Limit
type WriteRequest = filesystem.WriteRequest     // FilePath, Content string

// DeleteRequest 是 plantask 包自定义的（filesystem 包无此类型）
type DeleteRequest struct {
    FilePath string
}
```

> 💡
> 注意 `Read` 返回 `*filesystem.FileContent`（含 `Content string` 字段），不是裸 string。导入路径为 `github.com/cloudwego/eino/adk/filesystem`。

---

## 任务结构

```go
type task struct {
    ID          string         `json:"id"`
    Subject     string         `json:"subject"`
    Description string         `json:"description"`
    Status      string         `json:"status"`
    Blocks      []string       `json:"blocks"`
    BlockedBy   []string       `json:"blockedBy"`
    ActiveForm  string         `json:"activeForm,omitempty"`
    Owner       string         `json:"owner,omitempty"`
    Metadata    map[string]any `json:"metadata,omitempty"`
}
```

### 状态

<table>
<tr><td>状态值</td><td>说明</td></tr>
<tr><td><pre>pending</pre></td><td>待处理（创建时默认）</td></tr>
<tr><td><pre>in_progress</pre></td><td>进行中</td></tr>
<tr><td><pre>completed</pre></td><td>已完成</td></tr>
<tr><td><pre>deleted</pre></td><td>删除（物理删除 JSON 文件，并从其他任务的依赖列表中移除）</td></tr>
</table>

状态流转：`pending` → `in_progress` → `completed`；任何状态均可直接设为 `deleted`。

---

## 工具参数

### TaskCreate

工具名常量：`TaskCreateToolName = "TaskCreate"`

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td><pre>subject</pre></td><td>string</td><td>是</td><td>任务标题（祈使句形式）</td></tr>
<tr><td><pre>description</pre></td><td>string</td><td>是</td><td>任务详细描述，包含上下文和验收标准</td></tr>
<tr><td><pre>activeForm</pre></td><td>string</td><td>否</td><td>进行时文案（如"正在运行测试"），in_progress 时展示给用户</td></tr>
<tr><td><pre>metadata</pre></td><td>object</td><td>否</td><td>自定义键值对</td></tr>
</table>

创建后任务 ID 自动递增（基于 `.highwatermark` 文件），状态初始为 `pending`。

### TaskGet

工具名常量：`TaskGetToolName = "TaskGet"`

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td><pre>taskId</pre></td><td>string</td><td>是</td><td>任务 ID（纯数字字符串）</td></tr>
</table>

返回任务的完整信息：subject、description、status、blocks、blockedBy、owner。

### TaskUpdate

工具名常量：`TaskUpdateToolName = "TaskUpdate"`

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td><pre>taskId</pre></td><td>string</td><td>是</td><td>任务 ID</td></tr>
<tr><td><pre>subject</pre></td><td>string</td><td>否</td><td>新标题</td></tr>
<tr><td><pre>description</pre></td><td>string</td><td>否</td><td>新描述</td></tr>
<tr><td><pre>activeForm</pre></td><td>string</td><td>否</td><td>新进行时文案</td></tr>
<tr><td><pre>status</pre></td><td>string</td><td>否</td><td>新状态，enum: <pre>pending</pre> / <pre>in_progress</pre> / <pre>completed</pre> / <pre>deleted</pre></td></tr>
<tr><td><pre>addBlocks</pre></td><td>[]string</td><td>否</td><td>添加被当前任务阻塞的任务 ID（双向写入）</td></tr>
<tr><td><pre>addBlockedBy</pre></td><td>[]string</td><td>否</td><td>添加阻塞当前任务的任务 ID（双向写入）</td></tr>
<tr><td><pre>owner</pre></td><td>string</td><td>否</td><td>负责的 agent 名称</td></tr>
<tr><td><pre>metadata</pre></td><td>object</td><td>否</td><td>合并到现有 metadata；设 key 为 null 则删除该 key</td></tr>
</table>

关键行为：

- `status: "deleted"` 会物理删除任务文件，并从所有其他任务的 blocks/blockedBy 中移除该 ID
- 添加依赖时会进行**循环依赖检测**，若形成环则报错
- 当**所有任务均为 completed** 时，自动删除全部任务文件（清理机制）

### TaskList

工具名常量：`TaskListToolName = "TaskList"`

无参数。返回所有任务的摘要列表（按 ID 排序），每条格式为：

```
#ID [status] subject [owner: xxx] [blocked by #x, #y]
```

---

## 使用示例

```go
ctx := context.Background()

// Backend 应该是 session 维度隔离的
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
2. TaskCreate 创建多个子任务
   - #1: 分析需求
   - #2: 实现代码
   - #3: 编写测试
       │
       ▼
3. TaskUpdate 设置依赖
   - #2 addBlockedBy: ["1"]
   - #3 addBlockedBy: ["2"]
       │
       ▼
4. TaskList 查看可用任务
       │
       ▼
5. TaskUpdate #1 → in_progress
       │
       ▼
6. 完成后 TaskUpdate #1 → completed
       │
       ▼
7. 循环 4-6 直到全部完成
       │
       ▼
8. 全部 completed → 自动清理所有文件
```

---

## 依赖管理

- **blocks**: "我完成了，这些任务才能开始"
- **blockedBy**: "这些任务完成了，我才能开始"

依赖写入是**双向**的：对 Task A 执行 `addBlocks: ["2"]`，会同时在 Task #2 的 `blockedBy` 中写入 A 的 ID。

```
Task #1 (blocks: ["2"])  ────►  Task #2 (blockedBy: ["1"])

#1 完成后 #2 才能开始
```

循环依赖检测通过 DFS 可达性判断实现：

```
#1 blocks #2
#2 blocks #1  ← 报错：would create a cyclic dependency
```

---

## 实现细节

<table>
<tr><td>机制</td><td>说明</td></tr>
<tr><td>ID 分配</td><td><pre>.highwatermark</pre> 文件存储当前最大 ID，创建时 +1</td></tr>
<tr><td>并发安全</td><td>四个工具共享同一 <pre>sync.Mutex</pre>，同一 middleware 实例串行执行</td></tr>
<tr><td>文件格式</td><td>每个任务一个 <pre>{id}.json</pre> 文件，JSON 序列化使用 <pre>sonic</pre></td></tr>
<tr><td>自动清理</td><td>TaskUpdate 将任务标记为 completed 后检查——若所有任务均 completed 则批量删除</td></tr>
<tr><td>ID 校验</td><td>纯数字正则 <pre>^\d+$</pre></td></tr>
<tr><td>删除级联</td><td>删除任务时遍历所有任务文件，移除对该 ID 的引用</td></tr>
</table>

---

## 多语言支持

工具的 description 支持中英文双语，通过全局设置切换：

```go
// 使用中文 description
adk.SetLanguage(adk.LanguageChinese)

// 使用英文 description（默认）
adk.SetLanguage(adk.LanguageEnglish)
```

此设置影响所有 ADK 内置的 prompt 和工具 description。
