---
Description: ""
date: "2025-09-30"
lastmod: ""
tags: []
title: 'Eino ADK: Workflow Agents'
weight: 2
---

## Workflow Agents 概述

### 导入路径

```
import github.com/cloudwego/eino/adk
```

### 什么是 Workflow Agents

Workflow Agents 是 eino ADK 中的一种特殊 Agent 类型，它允许开发者以预设的流程来组织和执行多个子 Agent。

与基于 LLM 自主决策的 Transfer 模式不同，Workflow Agents 采用**预设决策**的方式，按照代码中定义好的执行流程来运行子 Agent，提供了更可预测和可控的多 Agent 协作方式。

Eino ADK 提供了三种基础的 Workflow Agent 类型：

- **SequentialAgent**：按顺序依次执行子 Agent
- **LoopAgent**：循环执行子 Agent 序列
- **ParallelAgent**：并发执行多个子 Agent

这些 Workflow Agent 可以相互嵌套，构建更复杂的执行流程，满足各种业务场景需求。

## SequentialAgent

### 功能

SequentialAgent 是最基础的 Workflow Agent，它按照配置中提供的顺序，依次执行一系列子 Agent。每个子 Agent 执行完成后，其输出会通过 History 机制传递给下一个子 Agent，形成一个线性的执行链。

<a href="/img/eino/FrwxwAnJGhUVnvb1n05cA7N8n2e.png" target="_blank"><img src="/img/eino/FrwxwAnJGhUVnvb1n05cA7N8n2e.png" width="80%" /></a>

```go
type SequentialAgentConfig struct {
    Name        string    // Agent 名称
    Description string    // Agent 描述
    SubAgents   []Agent   // 子 Agent 列表，按执行顺序排列
}

func NewSequentialAgent(ctx context.Context, config *SequentialAgentConfig) (Agent, error)
```

SequentialAgent 的执行遵循以下设定：

1. **线性执行**：严格按照 SubAgents 数组的顺序执行
2. **History 传递**：每个 Agent 的执行结果都会被添加到 History 中，后续 Agent 可以访问前面 Agent 的执行历史
3. **提前退出**：如果任何一个子 Agent 产生 ExitAction / Interrupt，整个 Sequential 流程会立即终止

SequentialAgent 适用于以下场景：

- **多步骤处理流程**：如数据预处理 -> 分析 -> 生成报告
- **管道式处理**：每个步骤的输出作为下个步骤的输入
- **有依赖关系的任务序列**：后续任务依赖前面任务的结果

### 示例

示例展示了如何使用 SequentialAgent 创建一个三步骤的文档处理流水线：

1. **DocumentAnalyzer**：分析文档内容
2. **ContentSummarizer**：总结分析结果
3. **ReportGenerator**：生成最终报告

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

运行结果为：

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

## LoopAgent

### 功能

LoopAgent 基于 SequentialAgent 实现，它会重复执行配置的子 Agent 序列，直到达到最大迭代次数或某个子 Agent 产生 ExitAction。LoopAgent 特别适用于需要迭代优化、反复处理或持续监控的场景。

<a href="/img/eino/L1jTwKR8WhZyEUbqQpKcgaJBnbh.png" target="_blank"><img src="/img/eino/L1jTwKR8WhZyEUbqQpKcgaJBnbh.png" width="100%" /></a>

```go
type LoopAgentConfig struct {
    Name          string    // Agent 名称
    Description   string    // Agent 描述  
    SubAgents     []Agent   // 子 Agent 列表
    MaxIterations int       // 最大迭代次数，0 表示无限循环
}

func NewLoopAgent(ctx context.Context, config *LoopAgentConfig) (Agent, error)
```

LoopAgent 的执行遵循以下设定：

1. **循环执行**：重复执行 SubAgents 序列，每次循环都是一个完整的 Sequential 执行过程
2. **History 累积**：每次迭代的结果都会累积到 History 中，后续迭代可以访问所有历史信息
3. **条件退出**：支持通过 ExitAction 或达到最大迭代次数来终止循环，配置 `MaxIterations=0` 时表示无限循环

LoopAgent 适用于以下场景：

- **迭代优化**：如代码优化、参数调优等需要反复改进的任务
- **持续监控**：定期检查状态并执行相应操作
- **反复处理**：需要多轮处理才能达到满意结果的任务
- **自我改进**：Agent 根据前面的执行结果不断改进自己的输出

### 示例

示例展示了如何使用 LoopAgent 创建一个代码优化循环：

1. **CodeAnalyzer**：分析代码问题
2. **CodeOptimizer**：根据分析结果优化代码
3. **ExitController**：判断是否需要退出循环

循环会持续执行直到代码质量达到标准或达到最大迭代次数。

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

运行结果为:

```go
开始代码优化循环...

=== 第 1 轮 - CodeAnalyzer ===
分析提供的代码：

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


### 1. 性能瓶颈

- 双层循环，时间复杂度为 O(n²)，对于较大的数据量，性能不佳。
- 内层循环当条件满足时立即 break，减少了部分不必要的比较，但整体仍然是二次复杂度。

### 2. 代码重复

- 代码没有明显重复，但逻辑可以简化。

### 3. 可读性问题

- 代码的意图不太明确。根据代码逻辑，函数筛选出那些在数组里至少有一个元素比它小的元素。换句话说，剔除了数组里所有等于或最小的数字。
- 可以通过注释或重命名来增加可读性。

### 4. 潜在的 bug

- 目前没有明显的 bug，但输入为空数组时，返回空数组符合预期。

### 5. 不符合最佳实践的地方

- 过程较为低效，未使用 Go 语言的特性优化性能。
- 缺少注释或文档说明。

---

## 优化建议

如果目的确实是要返回所有比数组中某些元素大的元素（排除数组中的最小元素），可以改为：

- 找出数组中的最小元素 minVal。
- 遍历数组，将大于 minVal 的元素加入结果。
- 这样时间复杂度降为 O(n)。

优化代码：

func processData(data []int) []int {
    if len(data) == 0 {
        return nil
    }

    minVal := data[0]
    for _, v := range data[1:] {
        if v < minVal {
            minVal = v
        }
    }

    result := make([]int, 0, len(data))
    for _, v := range data {
        if v > minVal {
            result = append(result, v)
        }
    }

    return result
}

### 优化点说明

- 使用一次遍历确定最小值，O(n)。
- 再次遍历构造结果，O(n)。
- 适当使用切片容量初始化，减少内存分配。
- 代码意图明确且性能提升明显。

---

如果你期望的是其他逻辑，请告知我进一步调整。

=== 第 1 轮 - CodeOptimizer ===

// processData 返回输入切片中所有大于最小元素的值。
// 如果输入为空，则返回 nil。
func processData(data []int) []int {
    if len(data) == 0 {
        return nil
    }

    // 找出切片中的最小值
    minVal := data[0]
    for _, v := range data[1:] {
        if v < minVal {
            minVal = v
        }
    }

    // 收集所有大于最小值的元素
    result := make([]int, 0, len(data))
    for _, v := range data {
        if v > minVal {
            result = append(result, v)
        }
    }

    return result
}


=== 第 1 轮 - ExitController ===
TERMINATE

=== 第 2 轮 - CodeAnalyzer ===
EXIT: 代码质量已达到标准

...中间轮次省略...

=== 第 5 轮 - CodeAnalyzer ===
EXIT: 代码质量已达到标准

=== 第 5 轮 - CodeOptimizer ===


// processData 返回输入切片中所有大于最小元素的值。
// 如果输入为空，则返回 nil。
func processData(data []int) []int {
    if len(data) == 0 {
        return nil
    }

    minVal := data[0]
    for _, v := range data[1:] {
        if v < minVal {
            minVal = v
        }
    }

    result := make([]int, 0, len(data))
    for _, v := range data {
        if v > minVal {
            result = append(result, v)
        }
    }

    return result
}


=== 第 5 轮 - ExitController ===
TERMINATE

代码优化循环执行完成！

```



## ParallelAgent


### 功能


ParallelAgent 允许多个子 Agent 基于相同的输入上下文并发执行，所有子 Agent 同时开始执行，并等待全部完成后结束。这种模式特别适用于可以独立并行处理的任务，能够显著提高执行效率。

<a href="/img/eino/IyblwV7Y8hilJKbHYgHcdfxlnre.png" target="_blank"><img src="/img/eino/IyblwV7Y8hilJKbHYgHcdfxlnre.png" width="90%" /></a>



```go
type ParallelAgentConfig struct {
    Name        string    // Agent 名称
    Description string    // Agent 描述
    SubAgents   []Agent   // 并发执行的子 Agent 列表
}

func NewParallelAgent(ctx context.Context, config *ParallelAgentConfig) (Agent, error)
```

ParallelAgent 的执行遵循以下设定：

1. **并发执行**：所有子 Agent 同时启动，在独立的 goroutine 中并行执行
2. **共享输入**：所有子 Agent 接收相同的初始输入和上下文
3. **等待与结果聚合**：内部使用 sync.WaitGroup 等待所有子 Agent 执行完成，收集所有子 Agent 的执行结果并按接收顺序输出

另外 Parallel 内部默认包含异常处理机制：

- **Panic 恢复**：每个 goroutine 都有独立的 panic 恢复机制
- **错误隔离**：单个子 Agent 的错误不会影响其他子 Agent 的执行
- **中断处理**：支持子 Agent 的中断和恢复机制

ParallelAgent 适用于以下场景：

- **独立任务并行处理**：多个不相关的任务可以同时执行
- **多角度分析**：从不同角度同时分析同一个问题
- **性能优化**：通过并行执行减少总体执行时间
- **多专家咨询**：同时咨询多个专业领域的 Agent

### 示例

示例展示了如何使用 ParallelAgent 同时从四个不同角度分析产品方案：

1. **TechnicalAnalyst**：技术可行性分析
2. **BusinessAnalyst**：商业价值分析
3. **UXAnalyst**：用户体验分析
4. **SecurityAnalyst**：安全风险分析

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

运行结果为：

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

---

### 一、技术可行性

1. **自然语言理解和回复**
   - 利用 GPT-4 API 实现自然语言理解和自动回复是当前成熟且可行的方案。GPT-4具备强大的语言理解和生成能力，适合处理复杂、多样的问题。

2. **多轮对话管理**
   - 依赖后端维护上下文状态，结合GPT-4模型能够较好处理多轮交互。需要设计合理的上下文管理机制（例如对话历史维护、关键槽位抽取等），确保上下文信息完整性。

3. **知识库集成**
   - 可通过向GPT-4 API添加特定的知识库检索结果（检索增强生成），或者通过本地检索接口集成知识库。技术上可行，但对于实时性和准确性有较高要求。

4. **情感分析**
   - 情感分析功能可以用独立的轻量模型实现（例如基于BERT微调），也可尝试利用GPT-4输出，但成本较高。情感分析能力帮助智能客服更好地理解用户情绪，提升用户体验。

5. **人工客服转接**
   - 技术上通过建立事件触发规则（如轮次数、情绪阈值、关键词检测）实现自动转人工。系统需支持工单或会话传递机制，并保障会话无缝切换。

6. **多渠道接入**
   - 网页、微信、App等多渠道接入均可通过统一API网关实现，技术成熟，同时需要处理渠道差异性（消息格式、认证、推送机制等）。

---

### 二、架构合理性

- **前端 React + TypeScript**  
  非常适合搭建响应式客服界面，生态成熟，方便多渠道共享组件。

- **后端 Go + Gin**  
  Go语言性能优异，Gin框架轻量且性能高，适合高并发场景。后端承担对接 GPT-4 API、管理状态、多渠道消息转发等职责，选择合理。

- **数据库 PostgreSQL + Redis**  
  - PostgreSQL 负责存储结构化数据，如用户信息、对话历史、知识库元数据。  
  - Redis 负责缓存会话状态、热点知识库、限流等，提升访问性能。  
  架构设计符合常见大型互联网产品模式，组件分工明确。

- **AI模型 GPT-4 API**  
  使用成熟API降低开发难度和模型维护成本；缺点是对网络和API调用依赖度高。

- **部署 Docker + Kubernetes**  
  容器化和K8s编排能保证系统弹性伸缩、高可用和灰度发布，适合生产环境，符合现代微服务架构趋势。

---

### 三、性能考量

1. **响应时间**  
   - GPT-4 API调用本身有一定延迟（通常几百毫秒到1秒不等），对响应时间影响较大。需要做好接口异步处理与前端体验设计（如加载动画、部分渐进响应）。

2. **并发处理能力**  
   - 后端Go具有高并发处理优势，配合Redis缓存热点数据，能大幅提升整体吞吐能力。  
   - 但GPT-4 API调用受限于OpenAI服务的QPS限制与调用成本，需合理设计调用频率与降级策略。

3. **缓存策略**  
   - 对用户对话上下文和常见问题答案进行缓存，减少重复API调用。  
   - 如关键问题先做本地匹配，失败后才调用GPT-4，提升效率。

4. **多渠道负载均衡**  
   - 需要设计统一消息总线和可靠的异步队列，防止某渠道流量突增影响整体系统稳定。

---

### 四、技术风险

1. **GPT-4 API依赖**  
   - 高度依赖第三方API，风险包括服务中断、接口变更及成本波动。  
   - 建议设计本地缓存和有限的替代回答逻辑以应对API异常。

2. **多轮对话上下文管理难度**  
   - 上下文过长或复杂会导致回答质量降低，需要设计限制上下文长度、选择性保留重要信息机制。

3. **知识库集成复杂度**  
   - 如何做到知识库与
----------------------------------------

【商业分析】
以下是对智能客服系统产品方案的商业角度分析：

1. 商业价值  
- 提升客户服务效率：自动解答用户问题和常见咨询，减少人工客服压力，降低用人成本。  
- 提升用户体验：多轮对话和情感分析使交互更自然，增强客户满意度和粘性。  
- 数据驱动决策支持：对话历史与知识库集成为企业提供宝贵的用户反馈和行为数据，优化产品和服务。  
- 支持业务扩展：多渠道接入（网页、微信、APP）满足不同客户接入习惯，提升覆盖率。  

2. 市场需求  
- 市场对智能客服的需求持续增长，特别是在电商、金融、医疗、教育等行业，客户服务自动化是企业数字化转型的重要方向。  
- 随着AI技术的成熟，企业期望借助大语言模型提升客服智能化水平。  
- 用户对即时响应、全天候服务的需求增加，推动智能客服系统的广泛采用。  

3. 竞争优势  
- 采用先进的GPT-4大语言模型，拥有较强的自然语言理解与生成能力，提升问答准确率和对话自然度。  
- 情感分析功能有助于精准识别用户情绪，动态调整回复策略，提高客户满意度。  
- 多渠道接入设计满足企业多元化客户触达需求，增强产品适用性。  
- 技术架构采用微服务、容器化部署，便于弹性扩展和维护，提升系统稳定性和扩展能力。  

4. 成本分析  
- AI模型调用成本较高，依赖GPT-4 API，需根据调用量和响应速度调整预算。  
- 技术研发投入较大，涉及前后端、多渠道融合、AI和知识库管理。  
- 运维和服务器成本需考虑多渠道并发访问。  
- 长期来看，人工客服人数可显著减少，节省人力成本。  
- 可通过云服务降低硬件初期投入，但云资源使用需精细管理以控制费用。  

5. 盈利模式  
- SaaS订阅服务：按月/年向企业客户收取服务费，基于接入渠道数、并发量和功能级别分层定价。  
- 按调用次数或对话数收费，适合业务波动较大的客户。  
- 增值服务：数据分析报告定制、行业知识库集成、人工客服协同工具等收费。  
- 中大型客户可提供定制开发和技术支持，收取项目费用。  
- 通过持续优化模型和服务，增加客户留存和续费率。  

综上，该智能客服系统基于成熟技术与AI优势，具备良好的商业价值和市场潜力。其多渠道接入和情感分析等功能增强竞争力，但需合理控制AI调用成本和运营费用。建议重点推进SaaS订阅和增值服务，结合市场推广，快速占领客户资源，提升盈利能力。
----------------------------------------

【用户体验分析】
针对该智能客服系统方案，我将从用户体验、易用性、用户满意度及可访问性等角度进行分析：

1. 用户友好性
- 自然语言理解和回复能力提升了用户与系统的沟通体验，使用户能够用自然话语表达需求，降低交流障碍。
- 多轮对话管理允许系统理解上下文，减少重复解释，增强对话连贯性，进一步提升用户体验。
- 情感分析功能有助于系统识别用户情绪，做出更贴心的回应，提高互动的个性化和人性化。
- 多渠道接入覆盖用户常用的访问途径，方便用户随时随地获取服务，提升友好度。

2. 操作便利性
- 自动回答常见业务咨询能够减轻用户等待时间和操作负担，提高响应速度。
- 人工客服转接机制确保复杂问题可被及时处理，保障服务连续性和操作的无缝衔接。
- 对话历史记录方便用户回顾咨询内容，避免重复查询，提升操作便利。
- 使用现代技术栈（React、TypeScript）为前端交互提供良好性能和响应速度，间接增强操作流畅性。

3. 学习成本
- 基于自然语言处理，用户无需学习特殊指令，降低使用门槛。
- 多轮对话自然衔接，让用户更易理解系统响应逻辑，减少迷惑和挫败感。
- 不同渠道的一致性界面（如在网页和微信中保持类似体验）有助于用户迅速上手。
- 通过情感分析提供的更精准反馈，减少用户因误解而频繁尝试的时间成本。

4. 用户满意度
- 快速准确的自动回复和多轮对话减少用户等待和重复输入，提升满意度。
- 情感分析让系统更懂用户情绪，带来更温暖的交互体验，增加用户粘性。
- 人工客服介入保障复杂问题得到妥善处理，提高服务质量感知。
- 多渠道覆盖满足不同用户的使用场景，增强整体满意度。

5. 可访问性
- 多渠道接入覆盖网页、微信、APP，适应不同用户的设备和环境，提升可访问性。
- 方案未明确提及无障碍设计（如屏幕阅读器兼容、高对比度模式等），这可能是未来需要补充的部分。
- 前端采用React和TypeScript，有利于实现响应式设计和无障碍功能，但需确保开发规范落地。
- 后端架构和部署方案保证系统的稳定性和扩展性，间接提升用户持续可访问性。

总结：
该智能客服系统方案在用户体验和易用性方面考虑较为充分，利用大语言模型实现自然多轮对话、情感分析和知识库集成，满足用户多样化需求。同时，多渠道接入增强了系统的覆盖能力。建议在具体落地时，强化无障碍设计，实现更全面的可访问性保障，同时继续优化对话策略以提升用户满意度。
----------------------------------------

【安全分析】
针对该智能客服系统方案，结合信息安全、数据保护及隐私合规等方面，展开如下分析：

一、数据安全

1. 数据传输安全  
- 建议系统所有客户端与服务器间通信均采用TLS/SSL加密，保障数据在传输过程中的机密性与完整性。  
- 由于支持多渠道接入（网页、微信、APP），需确保每个入口均严格实施加密传输。  

2. 数据存储安全  
- PostgreSQL存储对话历史、用户资料等敏感信息，需启用数据库加密（如透明数据加密TDE或字段级加密），防止数据泄露。  
- Redis作为缓存，可能存储临时会话数据，也需开启访问认证与加密传输。  
- 对用户敏感数据实行最小存储原则，避免无关数据超范围保存。  
- 数据备份过程中需加密保存，且备份访问同样受控。  

3. API调用安全  
- GPT-4 API调用产生大量用户数据交互，应评估其数据处理及存储政策，确保符合数据安全要求。  
- 增加调用权限管理，限制API密钥访问范围和权限，避免被滥用。  

4. 日志安全  
- 系统日志中避免存储明文敏感信息，尤其是个人身份信息、对话内容。日志访问需严格控制。  

二、隐私保护

1. 个人数据处理  
- 采集和存储用户个人数据（姓名、联系方式、账务信息等）必须明确告知用户，并征得用户同意。  
- 实施数据匿名化/去标识化技术，尤其是对话历史中的身份信息处理。  

2. 用户隐私权利  
- 满足相关法律法规（例如《个人信息保护法》、《GDPR》）中用户的访问、更正、删除数据的权利。  
- 提供隐私政策明确披露数据收集、使用和共享情况。  

3. 交互隐私  
- 多轮对话和情感分析等功能应考虑避免过度侵犯用户隐私，例如敏感情绪数据的使用透明告知和限制。  

4. 第三方合规  
- GPT-4 API由第三方提供，需确保其服务符合相关隐私合规要求及数据保护标准。  

三、访问控制

1. 用户身份验证  
- 系统中涉及用户身份信息查询和管理时，需建立可靠的身份认证机制。  
- 支持多因素认证增强安全性。  

2. 权限管理  
- 后端管理接口及人工客服转接模块需采用基于角色的访问控制（RBAC），确保操作权限最小化。  
- 对访问敏感数据的操作需有详细审计和监控。  

3. 会话管理  
- 对多渠道的会话要有有效的会话管理机制，防止会话劫持。  
- 对话历史访问权限应限制仅允许相关用户或授权人员访问。  

四、安全漏洞

1. 应用安全  
- 前端React+TypeScript应防止XSS、CSRF攻击，合理使用Content Security Policy（CSP）。  
- 后端Go应用需防止SQL注入、请求伪造和权限缺失。Gin框架提供中间件支持，建议充分利用安全模块。  

2. AI模型风险  
- GPT-4 API本身输入输出可能存在敏感信息泄露或模型误用风险，需限制输入内容、过滤敏感信息。  
- 防止生成恶意回答或信息泄露，建立内容审核机制。  

3. 容器和部署安全  
- Docker容器须采用安全镜像，及时打补丁。Kubernetes集群网络策略和访问控制需完善。  
- 容器运行权限最小化，避免容器逃逸风险。  

五、合规要求

1. 数据保护法规  
- 根据运营地域，需符合《个人信息保护法》（PIPL）、《欧盟通用数据保护条例》（GDPR）或其他相关法律要求。  
- 明确用户数据的采集、处理、传输和存储流程符合法规。  

2. 用户隐私告知及同意  
- 应提供清晰的隐私政策和使用条款，说明数据用途及处理方式。  
- 实现用户同意管理（Consent Management）机制。  

3. 数据跨境传输合规  
- 若系统涉及跨境数据流，需评估合规风险和采取相应技术
----------------------------------------

多角度并行分析完成！
共收到 4 个分析结果
```

## 总结

Workflow Agents 为 Eino ADK 提供了强大的多 Agent 协作能力，通过合理选择和组合这些 Workflow Agent，开发者可以构建出高效、可靠的多 Agent 协作系统，满足各种复杂的业务需求。