---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 'Eino ADK: Workflow Agents'
weight: 2
---

## Overview

### Import Path

`import "github.com/cloudwego/eino/adk"`

### What are Workflow Agents

Workflow Agents are a specialized Agent type in Eino ADK that let developers organize and run multiple sub‑agents according to preset flows.

Unlike LLM‑driven autonomous Transfer, Workflow Agents use preset decisions defined in code, providing predictable and controllable multi‑agent collaboration.

Eino ADK provides three base Workflow Agent types:

- SequentialAgent — execute sub‑agents in order
- LoopAgent — repeat the sub‑agent sequence
- ParallelAgent — run multiple sub‑agents concurrently

These can be nested to build complex flows.

# SequentialAgent

## Functionality

SequentialAgent executes sub‑agents strictly in the order provided. Each sub‑agent’s output is passed via History to the next sub‑agent, forming a linear chain.

<a href="/img/eino/eino_adk_sequential_definition.png" target="_blank"><img src="/img/eino/eino_adk_sequential_definition.png" width="100%" /></a>

```go
type SequentialAgentConfig struct {
    Name        string    // Agent name
    Description string    // Agent description
    SubAgents   []Agent   // Sub‑agents in execution order
}

func NewSequentialAgent(ctx context.Context, config *SequentialAgentConfig) (Agent, error)
```

Execution rules:

1. Linear execution: strictly in `SubAgents` order
2. History passing: each agent’s result is added to History; subsequent agents can access prior history
3. Early termination: if any sub‑agent emits ExitAction / Interrupt, the whole Sequential flow ends immediately

Suitable for:

- Multi‑step pipelines: e.g., preprocessing → analysis → report
- Pipeline processing: each step’s output feeds the next
- Dependent task sequences: later tasks rely on earlier results

## Example

Create a three‑step document processing pipeline:

1. DocumentAnalyzer — analyze document content
2. ContentSummarizer — summarize analysis
3. ReportGenerator — generate final report

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/schema"
)

// 创建 ChatModel 实例
func newChatModel() model.ToolCallingChatModel {
    cm, err := openai.NewChatModel(context.Background(), &openai.ChatModelConfig{
        APIKey: os.Getenv("OPENAI_API_KEY"),
        Model:  os.Getenv("OPENAI_MODEL"),
    })
    if err != nil {
        log.Fatal(err)
    }
    return cm
}

// 文档分析 Agent
func NewDocumentAnalyzerAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
        Name:        "DocumentAnalyzer",
        Description: "分析文档内容并提取关键信息",
        Instruction: "你是一个文档分析专家。请仔细分析用户提供的文档内容，提取其中的关键信息、主要观点和重要数据。",
        Model:       newChatModel(),
    })
    if err != nil {
        log.Fatal(err)
    }
    return a
}

// 内容总结 Agent
func NewContentSummarizerAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
        Name:        "ContentSummarizer",
        Description: "对分析结果进行总结",
        Instruction: "基于前面的文档分析结果，生成一个简洁明了的总结，突出最重要的发现和结论。",
        Model:       newChatModel(),
    })
    if err != nil {
        log.Fatal(err)
    }
    return a
}

// 报告生成 Agent
func NewReportGeneratorAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
        Name:        "ReportGenerator",
        Description: "生成最终的分析报告",
        Instruction: "基于前面的分析和总结，生成一份结构化的分析报告，包含执行摘要、详细分析和建议。",
        Model:       newChatModel(),
    })
    if err != nil {
        log.Fatal(err)
    }
    return a
}

func main() {
    ctx := context.Background()

    // 创建三个处理步骤的 Agent
    analyzer := NewDocumentAnalyzerAgent()
    summarizer := NewContentSummarizerAgent()
    generator := NewReportGeneratorAgent()

    // 创建 SequentialAgent
    sequentialAgent, err := adk.NewSequentialAgent(ctx, &adk.SequentialAgentConfig{
        Name:        "DocumentProcessingPipeline",
        Description: "文档处理流水线：分析 → 总结 → 报告生成",
        SubAgents:   []adk.Agent{analyzer, summarizer, generator},
    })
    if err != nil {
        log.Fatal(err)
    }

    // 创建 Runner
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
        Agent: sequentialAgent,
    })

    // 执行文档处理流程
    input := "请分析以下市场报告：2024年第三季度，公司营收增长15%，主要得益于新产品线的成功推出。但运营成本也上升了8%，需要优化效率。"
    
    fmt.Println("开始执行文档处理流水线...")
    iter := runner.Query(ctx, input)
    
    stepCount := 1
    for {
        event, ok := iter.Next()
        if !ok {
            break
        }
        
        if event.Err != nil {
            log.Fatal(event.Err)
        }
        
        if event.Output != nil && event.Output.MessageOutput != nil {
            fmt.Printf("\n=== 步骤 %d: %s ===\n", stepCount, event.AgentName)
            fmt.Printf("%s\n", event.Output.MessageOutput.Message.Content)
            stepCount++
        }
    }
    
    fmt.Println("\n文档处理流水线执行完成！")
}
```

Run result:

```markdown
开始执行文档处理流水线...

=== 步骤 1: DocumentAnalyzer ===
市场报告关键信息分析：

1. 营收增长情况：
   - 2024年第三季度，公司营收同比增长15%。
   - 营收增长的主要驱动力是新产品线的成功推出。

2. 成本情况：
   - 运营成本上涨了8%。
   - 成本上升提醒公司需要进行效率优化。

主要观点总结：
- 新产品线推出显著推动了营收增长，显示公司在产品创新方面取得良好成果。
- 虽然营收提升，但运营成本的增加在一定程度上影响了盈利能力，指出了提升运营效率的重要性。

重要数据：
- 营收增长率：15%
- 运营成本增长率：8%

=== 步骤 2: ContentSummarizer ===
总结：2024年第三季度，公司实现了15%的营收增长，主要归功于新产品线的成功推出，体现了公司产品创新能力的显著提升。然而，运营成本同时上涨了8%，对盈利能力构成一定压力，强调了优化运营效率的迫切需求。整体来看，公司在增长与成本控制之间需寻求更好的平衡以保障持续健康发展。

=== 步骤 3: ReportGenerator ===
分析报告

一、执行摘要  
2024年第三季度，公司实现营收同比增长15%，主要得益于新产品线的成功推出，展现了强劲的产品创新能力。然而，运营成本也同比提升了8%，对利润空间形成一定压力。为确保持续的盈利增长，需重点关注运营效率的优化，推动成本控制与收入增长的平衡发展。

二、详细分析  
1. 营收增长分析  
- 公司营收增长15%，反映出新产品线市场接受度良好，有效拓展了收入来源。  
- 新产品线的推出体现了公司研发及市场响应能力的提升，为未来持续增长奠定基础。

2. 运营成本情况  
- 运营成本上升8%，可能来自原材料价格上涨、生产效率下降或销售推广费用增加等多个方面。  
- 该成本提升在一定程度上抵消了收入增长带来的利润增益，影响整体盈利能力。

3. 盈利能力及效率考量  
- 营收与成本增长的不匹配显示出当前运营效率存在改进空间。  
- 优化供应链管理、提升生产自动化及加强成本控制将成为关键措施。

三、建议  
1. 加强新产品线后续支持，包括市场推广和客户反馈机制，持续推动营收增长。  
2. 深入分析运营成本构成，识别主要成本驱动因素，制定针对性降低成本的策略。  
3. 推动内部流程优化与技术升级，提升生产及运营效率，缓解成本压力。  
4. 建立动态的财务监控体系，实现对营收与成本的实时跟踪与调整，确保公司财务健康。  

四、结论  
公司在2024年第三季度展现出了良好的增长动力，但同时面临成本上升带来的挑战。通过持续的产品创新结合有效的成本管理，未来有望实现盈利能力和市场竞争力的双重提升，推动公司稳健发展。

文档处理流水线执行完成！
```

# LoopAgent

## Functionality

LoopAgent builds on SequentialAgent and repeats the sub‑agent sequence until reaching `MaxIterations` or a sub‑agent emits ExitAction. Ideal for iterative optimization, repeated processing, or continuous monitoring.

<a href="/img/eino/eino_adk_implementation_nested_loop_sequential.png" target="_blank"><img src="/img/eino/eino_adk_implementation_nested_loop_sequential.png" width="100%" /></a>

```go
type LoopAgentConfig struct {
    Name          string    // Agent name
    Description   string    // Agent description  
    SubAgents     []Agent   // Sub‑agent list
    MaxIterations int       // Max iterations; 0 for infinite loop
}

func NewLoopAgent(ctx context.Context, config *LoopAgentConfig) (Agent, error)
```

Execution rules:

1. Loop execution: repeat the `SubAgents` sequence; each loop is a full Sequential run
2. History accumulation: results from each iteration accumulate into History
3. Exit conditions: ExitAction or reaching `MaxIterations` stops the loop; `MaxIterations=0` means infinite loop

Suitable for:

- Iterative optimization
- Continuous monitoring
- Repeated processing to reach a satisfactory result
- Self‑improvement based on prior outputs

## Example

An iterative code optimization loop:

1. CodeAnalyzer — analyze code issues
2. CodeOptimizer — optimize based on analysis
3. ExitController — decide whether to exit the loop

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/schema"
)

func newChatModel() model.ToolCallingChatModel {
    cm, err := openai.NewChatModel(context.Background(), &openai.ChatModelConfig{
        APIKey: os.Getenv("OPENAI_API_KEY"),
        Model:  os.Getenv("OPENAI_MODEL"),
    })
    if err != nil {
        log.Fatal(err)
    }
    return cm
}

// 代码分析 Agent
func NewCodeAnalyzerAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
        Name:        "CodeAnalyzer",
        Description: "分析代码质量和性能问题",
        Instruction: `你是一个代码分析专家。请分析提供的代码，识别以下问题：
1. 性能瓶颈
2. 代码重复
3. 可读性问题
4. 潜在的 bug
5. 不符合最佳实践的地方

如果代码已经足够优秀，请输出 "EXIT: 代码质量已达到标准" 来结束优化流程。`,
        Model: newChatModel(),
    })
    if err != nil {
        log.Fatal(err)
    }
    return a
}

// 代码优化 Agent
func NewCodeOptimizerAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
        Name:        "CodeOptimizer", 
        Description: "根据分析结果优化代码",
        Instruction: `基于前面的代码分析结果，对代码进行优化改进：
1. 修复识别出的性能问题
2. 消除代码重复
3. 提高代码可读性
4. 修复潜在 bug
5. 应用最佳实践

请提供优化后的完整代码。`,
        Model: newChatModel(),
    })
    if err != nil {
        log.Fatal(err)
    }
    return a
}

// 创建一个特殊的 Agent 来处理退出逻辑
func NewExitControllerAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
        Name:        "ExitController",
        Description: "控制优化循环的退出",
        Instruction: `检查前面的分析结果，如果代码分析师认为代码质量已达到标准（包含"EXIT"关键词），
则输出 "TERMINATE" 并生成退出动作来结束循环。否则继续下一轮优化。`,
        Model: newChatModel(),
    })
    if err != nil {
        log.Fatal(err)
    }
    return a
}

func main() {
    ctx := context.Background()

    // 创建优化流程的 Agent
    analyzer := NewCodeAnalyzerAgent()
    optimizer := NewCodeOptimizerAgent()
    controller := NewExitControllerAgent()

    // 创建 LoopAgent，最多执行 5 轮优化
    loopAgent, err := adk.NewLoopAgent(ctx, &adk.LoopAgentConfig{
        Name:          "CodeOptimizationLoop",
        Description:   "代码优化循环：分析 → 优化 → 检查退出条件",
        SubAgents:     []adk.Agent{analyzer, optimizer, controller},
        MaxIterations: 5, // 最多 5 轮优化
    })
    if err != nil {
        log.Fatal(err)
    }

    // 创建 Runner
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
        Agent: loopAgent,
    })

    // 待优化的代码示例
    codeToOptimize := `
func processData(data []int) []int {
    result := []int{}
    for i := 0; i < len(data); i++ {
        for j := 0; j < len(data); j++ {
            if data[i] > data[j] {
                result = append(result, data[i])
                break
            }
        }
    }
    return result
}
`

    fmt.Println("开始代码优化循环...")
    iter := runner.Query(ctx, "请优化以下 Go 代码：\n"+codeToOptimize)
    
    iteration := 1
    for {
        event, ok := iter.Next()
        if !ok {
            break
        }
        
        if event.Err != nil {
            log.Fatal(event.Err)
        }
        
        if event.Output != nil && event.Output.MessageOutput != nil {
            fmt.Printf("\n=== 第 %d 轮 - %s ===\n", iteration, event.AgentName)
            fmt.Printf("%s\n", event.Output.MessageOutput.Message.Content)
            
            // 检查是否需要退出
            if event.AgentName == "ExitController" {
                if event.Action != nil && event.Action.Exit {
                    fmt.Println("\n优化循环提前结束！")
                    break
                }
                iteration++
            }
        }
    }
    
    fmt.Println("\n代码优化循环执行完成！")
}
```

Run result (excerpt):

```java
开始代码优化循环...

=== 第 1 轮 - CodeAnalyzer ===
分析提供的代码：

```go
func processData(data []int) []int {
    result := []int{}
    for i := 0; i < len(data); i++ {
        for j := 0; j < len(data); j++ {
            if data[i] > data[j] {
                result = append(result, data[i])
                break
            }
        }
    }
    return result
}
```

... (analysis and optimized code)

=== 第 1 轮 - ExitController ===
TERMINATE
```

## BreakLoop

Use ADK’s Break Action to stop a loop without affecting outer agents:

```go
// BreakLoopAction is a programmatic-only agent action used to prematurely
// terminate the execution of a loop workflow agent.
// When a loop workflow agent receives this action from a sub-agent, it will stop its
// current iteration and will not proceed to the next one.
// It will mark the BreakLoopAction as Done, signalling to any 'upper level' loop agent
// that this action has been processed and should be ignored further up.
// This action is not intended to be used by LLMs.
type BreakLoopAction struct {
    // From records the name of the agent that initiated the break loop action.
    From string
    // Done is a state flag that can be used by the framework to mark when the
    // action has been handled.
    Done bool
    // CurrentIterations is populated by the framework to record at which
    // iteration the loop was broken.
    CurrentIterations int
}

// NewBreakLoopAction creates a new BreakLoopAction, signaling a request
// to terminate the current loop.
func NewBreakLoopAction(agentName string) *AgentAction {
    return &AgentAction{BreakLoop: &BreakLoopAction{
       From: agentName,
    }}}
```

Illustration:

<a href="/img/eino/eino_adk_sequential_with_loop.png" target="_blank"><img src="/img/eino/eino_adk_sequential_with_loop.png" width="100%" /></a>

- If Agent1 emits BreakAction, the Loop Agent stops and Sequential continues to Agent3
- If Agent1 emits ExitAction, the overall Sequential flow terminates; Agent2 / Agent3 do not run

# ParallelAgent

## Functionality

ParallelAgent runs multiple sub‑agents concurrently over shared input; all start together and it waits for all to finish. Best for independently processable tasks.

<a href="/img/eino/eino_adk_parallel_definition.png" target="_blank"><img src="/img/eino/eino_adk_parallel_definition.png" width="100%" /></a>

```go
type ParallelAgentConfig struct {
    Name        string    // Agent name
    Description string    // Agent description
    SubAgents   []Agent   // Concurrent sub‑agents
}

func NewParallelAgent(ctx context.Context, config *ParallelAgentConfig) (Agent, error)
```

Execution rules:

1. Concurrent execution: each sub‑agent runs in its own goroutine
2. Shared input: all sub‑agents receive the same initial input and context
3. Wait and aggregate: use sync.WaitGroup to wait for completion; collect outputs and emit in received order

Defaults include:

- Panic recovery per goroutine
- Error isolation: one sub‑agent’s error does not affect others
- Interrupt handling: supports sub‑agent interrupt/resume

Suitable for:

- Independent task parallelism
- Multi‑perspective analysis
- Performance optimization
- Multi‑expert consultation

## Example

Analyze a product proposal from four perspectives:

1. TechnicalAnalyst — technical feasibility
2. BusinessAnalyst — business value
3. UXAnalyst — user experience
4. SecurityAnalyst — security risks

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "sync"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/components/model"
)

func newChatModel() model.ToolCallingChatModel {
    cm, err := openai.NewChatModel(context.Background(), &openai.ChatModelConfig{
       APIKey: os.Getenv("OPENAI_API_KEY"),
       Model:  os.Getenv("OPENAI_MODEL"),
    })
    if err != nil {
       log.Fatal(err)
    }
    return cm
}

// 技术分析 Agent
func NewTechnicalAnalystAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "TechnicalAnalyst",
       Description: "从技术角度分析内容",
       Instruction: `你是一个技术专家。请从技术实现、架构设计、性能优化等技术角度分析提供的内容。
重点关注：
1. 技术可行性
2. 架构合理性  
3. 性能考量
4. 技术风险
5. 实现复杂度`,
       Model: newChatModel(),
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

// 商业分析 Agent
func NewBusinessAnalystAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "BusinessAnalyst",
       Description: "从商业角度分析内容",
       Instruction: `你是一个商业分析专家。请从商业价值、市场前景、成本效益等商业角度分析提供的内容。
重点关注：
1. 商业价值
2. 市场需求
3. 竞争优势
4. 成本分析
5. 盈利模式`,
       Model: newChatModel(),
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

// 用户体验分析 Agent
func NewUXAnalystAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "UXAnalyst",
       Description: "从用户体验角度分析内容",
       Instruction: `你是一个用户体验专家。请从用户体验、易用性、用户满意度等角度分析提供的内容。
重点关注：
1. 用户友好性
2. 操作便利性
3. 学习成本
4. 用户满意度
5. 可访问性`,
       Model: newChatModel(),
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

// 安全分析 Agent
func NewSecurityAnalystAgent() adk.Agent {
    a, err := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "SecurityAnalyst",
       Description: "从安全角度分析内容",
       Instruction: `你是一个安全专家。请从信息安全、数据保护、隐私合规等安全角度分析提供的内容。
重点关注：
1. 数据安全
2. 隐私保护
3. 访问控制
4. 安全漏洞
5. 合规要求`,
       Model: newChatModel(),
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

func main() {
    ctx := context.Background()

    // 创建四个不同角度的分析 Agent
    techAnalyst := NewTechnicalAnalystAgent()
    bizAnalyst := NewBusinessAnalystAgent()
    uxAnalyst := NewUXAnalystAgent()
    secAnalyst := NewSecurityAnalystAgent()

    // 创建 ParallelAgent，同时进行多角度分析
    parallelAgent, err := adk.NewParallelAgent(ctx, &adk.ParallelAgentConfig{
       Name:        "MultiPerspectiveAnalyzer",
       Description: "多角度并行分析：技术 + 商业 + 用户体验 + 安全",
       SubAgents:   []adk.Agent{techAnalyst, bizAnalyst, uxAnalyst, secAnalyst},
    })
    if err != nil {
       log.Fatal(err)
    }

    // 创建 Runner
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent: parallelAgent,
    })

    // 要分析的产品方案
    productProposal := `
产品方案：智能客服系统

概述：开发一个基于大语言模型的智能客服系统，能够自动回答用户问题，处理常见业务咨询，并在必要时转接人工客服。

主要功能：
1. 自然语言理解和回复
2. 多轮对话管理
3. 知识库集成
4. 情感分析
5. 人工客服转接
6. 对话历史记录
7. 多渠道接入（网页、微信、APP）

技术架构：
- 前端：React + TypeScript
- 后端：Go + Gin 框架
- 数据库：PostgreSQL + Redis
- AI模型：GPT-4 API
- 部署：Docker + Kubernetes
`

    fmt.Println("开始多角度并行分析...")
    iter := runner.Query(ctx, "请分析以下产品方案：\n"+productProposal)

    // 使用 map 来收集不同分析师的结果
    results := make(map[string]string)
    var mu sync.Mutex

    for {
       event, ok := iter.Next()
       if !ok {
          break
       }

       if event.Err != nil {
          log.Printf("分析过程中出现错误: %v", event.Err)
          continue
       }

       if event.Output != nil && event.Output.MessageOutput != nil {
          mu.Lock()
          results[event.AgentName] = event.Output.MessageOutput.Message.Content
          mu.Unlock()

          fmt.Printf("\n=== %s 分析完成 ===\n", event.AgentName)
       }
    }

    // 输出所有分析结果
    fmt.Println("\n" + "============================================================")
    fmt.Println("多角度分析结果汇总")
    fmt.Println("============================================================")

    analysisOrder := []string{"TechnicalAnalyst", "BusinessAnalyst", "UXAnalyst", "SecurityAnalyst"}
    analysisNames := map[string]string{
       "TechnicalAnalyst": "技术分析",
       "BusinessAnalyst":  "商业分析",
       "UXAnalyst":        "用户体验分析",
       "SecurityAnalyst":  "安全分析",
    }

    for _, agentName := range analysisOrder {
       if result, exists := results[agentName]; exists {
          fmt.Printf("\n【%s】\n", analysisNames[agentName])
          fmt.Printf("%s\n", result)
          fmt.Println("----------------------------------------")
       }
    }

    fmt.Println("\n多角度并行分析完成！")
    fmt.Printf("共收到 %d 个分析结果\n", len(results))
}
```

Run result (excerpt):

```markdown
开始多角度并行分析...

=== BusinessAnalyst 分析完成 ===

=== UXAnalyst 分析完成 ===

=== SecurityAnalyst 分析完成 ===

=== TechnicalAnalyst 分析完成 ===

============================================================
多角度分析结果汇总
============================================================

【技术分析】
针对该智能客服系统方案，下面从技术实现、架构设计及性能优化等角度进行详细分析：
...
```

# Summary

Workflow Agents provide robust multi‑agent collaboration in Eino ADK. By choosing and composing these agents appropriately, developers can build efficient, reliable multi‑agent systems for complex business needs.
