---
Description: ""
date: "2025-12-01"
lastmod: ""
tags: []
title: 'Eino ADK MultiAgent: Plan-Execute Agent'
weight: 3
---

## Plan-Execute Agent 概述

### Import Path

`import ``github.com/cloudwego/eino/adk/prebuilt``/planexecute`

### 什么是 Plan-Execute Agent？

Plan-Execute Agent 是 Eino ADK 中一种基于「规划-执行-反思」范式的多智能体协作框架，旨在解决复杂任务的分步拆解、执行与动态调整问题。它通过 **Planner（规划器）**、**Executor（执行器）**和 **Replanner（重规划器）** 三个核心智能体的协同工作，实现任务的结构化规划、工具调用执行、进度评估与动态 replanning，最终达成用户目标。

<a href="/img/eino/eino_adk_plan_execute_steps.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute_steps.png" width="100%" /></a>

Plan-Execute Agent 适用于需要多步骤推理、工具集成或动态调整策略的场景（如研究分析、复杂问题解决、自动化工作流等），其核心优势在于：

- **结构化规划**：将复杂任务拆解为清晰、可执行的步骤序列
- **迭代执行**：基于工具调用完成单步任务，积累执行结果
- **动态调整**：根据执行进度实时评估是否需要调整计划或终止任务
- **模型与工具无关**：兼容任意支持工具调用的模型，可灵活集成外部工具

### Plan-Execute Agent 结构

Plan-Execute Agent 由三个核心智能体与一个协调器构成，基于 ADK 中提供的 ChatModelAgent 和 WorkflowAgents 能力共同完成构建：

<a href="/img/eino/eino_adk_plan_execute_replan_architecture_overview.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute_replan_architecture_overview.png" width="100%" /></a>

#### 1. Planner

- **核心功能**：根据用户目标生成初始任务计划（结构化步骤序列）
- **实现方式**：
  - 使用支持工具调用的模型（如 GPT-4），通过 `PlanTool` 生成符合 JSON Schema 的步骤列表
  - 或直接使用支持结构化输出的模型，直接生成 `Plan` 格式结果
- **输出**：`Plan` 对象（包含有序步骤列表），存储于 Session 中供后续流程使用

```go
// PlannerConfig provides configuration options for creating a planner agent.
// There are two ways to configure the planner to generate structured Plan output:
//  1. Use ChatModelWithFormattedOutput: A model already configured to output in the Plan format
//  2. Use ToolCallingChatModel + ToolInfo: A model that will be configured to use tool calling
//     to generate the Plan structure
type PlannerConfig struct {
    // ChatModelWithFormattedOutput is a model pre-configured to output in the Plan format.
    // This can be created by configuring a model to output structured data directly.
    // Can refer to https://github.com/cloudwego/eino-ext/blob/main/components/model/openai/examples/structured/structured.go.
    ChatModelWithFormattedOutput model.BaseChatModel

    // ToolCallingChatModel is a model that supports tool calling capabilities.
    // When provided along with ToolInfo, the model will be configured to use tool calling
    // to generate the Plan structure.
    ToolCallingChatModel model.ToolCallingChatModel
    // ToolInfo defines the schema for the Plan structure when using tool calling.
    // If not provided, PlanToolInfo will be used as the default.
    ToolInfo *schema.ToolInfo

    // GenInputFn is a function that generates the input messages for the planner.
    // If not provided, defaultGenPlannerInputFn will be used as the default.
    GenInputFn GenPlannerInputFn

    // NewPlan creates a new Plan instance for JSON.
    // The returned Plan will be used to unmarshal the model-generated JSON output.
    // If not provided, defaultNewPlan will be used as the default.
    NewPlan NewPlan
}
```

#### 2. Executor

- **核心功能**：执行计划中的首个步骤，调用外部工具完成具体任务
- **实现方式**：基于 `ChatModelAgent` 实现，配置工具集（如搜索、计算、数据库访问等）
- **工作流**：
  - 从 Session 中获取当前 `Plan` 和已执行步骤
  - 提取计划中的第一个未执行步骤作为目标
  - 调用工具执行该步骤，将结果存储于 Session
- **关键能力**：支持多轮工具调用（通过 `MaxIterations` 控制），确保单步任务完成

```go
// ExecutorConfig provides configuration options for creating a executor agent.
type ExecutorConfig struct {
    // Model is the chat model used by the executor.
    Model model.ToolCallingChatModel

    // ToolsConfig is the tools configuration used by the executor.
    ToolsConfig adk.ToolsConfig

    // MaxIterations defines the upper limit of ChatModel generation cycles.
    // The agent will terminate with an error if this limit is exceeded.
    // Optional. Defaults to 20.
    MaxIterations int

    // GenInputFn is the function that generates the input messages for the Executor.
    // Optional. If not provided, defaultGenExecutorInputFn will be used.
    GenInputFn GenPlanExecuteInputFn
}
```

#### 3. Replanner

- **核心功能**：评估执行进度，决定继续执行（生成新计划）或终止任务（返回结果）
- **实现方式**：基于工具调用模型，通过 `PlanTool`（生成新计划）或 `RespondTool`（返回结果）输出决策
- **决策逻辑**：
  - **继续执行**：若目标未达成，生成包含剩余步骤的新计划，更新 Session 中的 `Plan`
  - **终止任务**：若目标已达成，调用 `RespondTool` 生成最终用户响应

```go
type ReplannerConfig struct {

    // ChatModel is the model that supports tool calling capabilities.
    // It will be configured with PlanTool and RespondTool to generate updated plans or responses.
    ChatModel model.ToolCallingChatModel

    // PlanTool defines the schema for the Plan tool that can be used with ToolCallingChatModel.
    // If not provided, the default PlanToolInfo will be used.
    PlanTool *schema.ToolInfo

    // RespondTool defines the schema for the response tool that can be used with ToolCallingChatModel.
    // If not provided, the default RespondToolInfo will be used.
    RespondTool *schema.ToolInfo

    // GenInputFn is the function that generates the input messages for the Replanner.
    // if not provided, buildDefaultReplannerInputFn will be used.
    GenInputFn GenPlanExecuteInputFn

    // NewPlan creates a new Plan instance.
    // The returned Plan will be used to unmarshal the model-generated JSON output from PlanTool.
    // If not provided, defaultNewPlan will be used as the default.
    NewPlan NewPlan
}
```

#### 4. PlanExecuteAgent

- **核心功能**：组合上述三个智能体，形成「规划 → 执行 → 重规划」的循环工作流
- **实现方式**：通过 `SequentialAgent` 和 `LoopAgent` 组合：
  - 外层 `SequentialAgent`：先执行 `Planner` 生成初始计划，再进入执行-重规划循环
  - 内层 `LoopAgent`：循环执行 `Executor` 和 `Replanner`，直至任务完成或达到最大迭代次数

```go
// New creates a new plan execute agent with the given configuration.
func New(ctx context.Context, cfg *PlanExecuteConfig) (adk.Agent, error)

// Config provides configuration options for creating a plan execute agent.
type Config struct {
    Planner       adk.Agent
    Executor      adk.Agent
    Replanner     adk.Agent
    MaxIterations int
}
```

### Plan-Execute Agent 运行流程

Plan-Execute Agent 的完整工作流程如下：

1. **初始化**：用户输入目标任务，启动 `PlanExecuteAgent`
2. **规划阶段**：
   - `Planner` 接收用户目标，生成初始 `Plan`（步骤列表）
   - `Plan` 存储于 Session（`PlanSessionKey`）
3. **执行-重规划循环**（由 `LoopAgent` 控制）：
   - **执行步骤**：`Executor` 从 `Plan` 中提取首个步骤，调用工具执行，结果存入 Session（`ExecutedStepsSessionKey`）
   - **反思步骤**：`Replanner` 评估已执行步骤与结果：
     - 若目标达成：调用 `RespondTool` 生成最终响应，退出循环
     - 若需继续：生成新 `Plan` 并更新 Session，进入下一轮循环
4. **终止条件**：任务完成（`Replanner` 返回结果）或达到最大迭代次数（`MaxIterations`）

## Plan-Execute Agent 使用示例

### 场景说明

实现一个「调研」Agent：

1. **Planner**：为调研目标规划详细步骤
2. **Executor**：执行计划中的首个步骤，必要时使用搜索工具（duckduckgo）
3. **Replanner**：评估执行结果，若信息不足则调整计划，否则生成最终总结

### 代码实现

#### 1. 初始化模型与工具

```go
// 初始化支持工具调用的 OpenAI 模型
func newToolCallingModel(ctx context.Context) model.ToolCallingChatModel {
    cm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey: os.Getenv("OPENAI_API_KEY"),
        Model:  "gpt-4o", // 需支持工具调用
    })
    if err != nil {
        log.Fatalf("初始化模型失败: %v", err)
    }
    return cm
}

// 初始化搜索工具（用于 Executor 调用）
func newSearchTool(ctx context.Context) tool.BaseTool {
    config := &duckduckgo.Config{
       MaxResults: 20, // Limit to return 20 results
       Region:     duckduckgo._RegionWT_,
       Timeout:    10 * time._Second_,
    }
    tool, err := duckduckgo.NewTextSearchTool(ctx, config)
    if err != nil {
       log.Fatalf("初始化搜索工具失败: %v", err)
    }
    return tool
}
```

#### 2. 创建 Planner（规划器）

```go
func newPlanner(ctx context.Context, model model.ToolCallingChatModel) adk.Agent {
    planner, err := planexecute.NewPlanner(ctx, &planexecute.PlannerConfig{
        ToolCallingChatModel: model,                  // 使用工具调用模型生成计划
        ToolInfo:             &planexecute.PlanToolInfo, // 默认 Plan 工具 schema
    })
    if err != nil {
        log.Fatalf("创建 Planner 失败: %v", err)
    }
    return planner
}
```

#### 3. 创建 Executor（执行器）

```go
func newExecutor(ctx context.Context, model model.ToolCallingChatModel) adk.Agent {
    // 配置 Executor 工具集（仅包含搜索工具）
    toolsConfig := adk.ToolsConfig{
       ToolsNodeConfig: compose.ToolsNodeConfig{
          Tools: []tool.BaseTool{newSearchTool(ctx)},
       },
    }
    executor, err := planexecute.NewExecutor(ctx, &planexecute.ExecutorConfig{
       Model:       model,
       ToolsConfig: toolsConfig,
       MaxIterations:     5, // ChatModel 最多运行 5 次
    })
    if err != nil {
       log.Fatalf("创建 Executor 失败: %v", err)
    }
    return executor
}
```

#### 4. 创建 Replanner（重规划器）

```go
func newReplanner(ctx context.Context, model model.ToolCallingChatModel) adk.Agent {
    replanner, err := planexecute.NewReplanner(ctx, &planexecute.ReplannerConfig{
       ChatModel: model, // 使用工具调用模型评估进度
    })
    if err != nil {
       log.Fatalf("创建 Replanner 失败: %v", err)
    }
    return replanner
}
```

#### 5. 组合为 PlanExecuteAgent

```go
func newPlanExecuteAgent(ctx context.Context) adk.Agent {
    model := newToolCallingModel(ctx)

    // 实例化三大核心智能体
    planner := newPlanner(ctx, model)
    executor := newExecutor(ctx, model)
    replanner := newReplanner(ctx, model)

    // 组合为 PlanExecuteAgent（固定 execute - replan 最大迭代 10 次）
    planExecuteAgent, err := planexecute.NewPlanExecuteAgent(ctx, &planexecute.PlanExecuteConfig{
       Planner:       planner,
       Executor:      executor,
       Replanner:     replanner,
       MaxIterations: 10,
    })
    if err != nil {
       log.Fatalf("组合 PlanExecuteAgent 失败: %v", err)
    }
    return planExecuteAgent
}
```

#### 6. 运行与输出

```go
import (
    "context"
    "log"
    "os"
    "time"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino-ext/components/tool/duckduckgo/v2"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/prebuilt/planexecute"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    agent := newPlanExecuteAgent(ctx)

    // 创建 Runner 执行智能体
    runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent, EnableStreaming: true})

    // 用户输入目标任务
    userInput := []adk.Message{
       schema.UserMessage("Research and summarize the latest developments in AI for healthcare in 2024, including key technologies, applications, and industry trends."),
    }

    // 执行并打印结果
    events := runner.Run(ctx, userInput)
    for {
       event, ok := events.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Printf("执行错误: %v", event.Err)
          break
       }
       // 打印智能体输出（计划、执行结果、最终响应等）
       if msg, err := event.Output.MessageOutput.GetMessage(); err == nil && msg.Content != "" {
          log.Printf("\n=== Agent Output ===\n%s\n", msg.Content)
       }
    }
}
```

### 运行结果

```markdown
2025/09/08 11:47:42 
=== Agent:Planner Output ===
{"steps":["Identify the most recent and credible sources for AI developments in healthcare in 2024, such as scientific journals, industry reports, news articles, and expert analyses.","Extract and compile the key technologies emerging or advancing in AI for healthcare in 2024, including machine learning models, diagnostic tools, robotic surgery, personalized medicine, and data management solutions.","Analyze the main applications of AI in healthcare during 2024, focusing on areas such as diagnostics, patient care, drug discovery, medical imaging, and healthcare administration.","Investigate current industry trends related to AI in healthcare for 2024, including adoption rates, regulatory changes, ethical considerations, funding landscape, and market forecasts.","Synthesize the gathered information into a comprehensive summary covering the latest developments in AI for healthcare in 2024, highlighting key technologies, applications, and industry trends with examples and implications."]}
2025/09/08 11:47:47 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Artificial Intelligence in Healthcare: 2024 Year in Review","url":"https://www.researchgate.net/publication/389402322_Artificial_Intelligence_in_Healthcare_2024_Year_in_Review","summary":"The adoption of LLMs and text data types amongst various healthcare specialties, especially for education and administrative tasks, is unlocking new potential for AI applications in..."},{"title":"AI in Healthcare - Nature","url":"https://www.nature.com/collections/hacjaaeafj","summary":"\"AI in Healthcare\" encompasses the use of AI technologies to enhance various aspects of healthcare delivery, from diagnostics to treatment personalization, ultimately aiming to improve..."},{"title":"Evolution of artificial intelligence in healthcare: a 30-year ...","url":"https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2024.1505692/full","summary":"Conclusion: This study reveals a sustained explosive growth trend in AI technologies within the healthcare sector in recent years, with increasingly profound applications in medicine. Additionally, medical artificial intelligence research is dynamically evolving with the advent of new technologies."},{"title":"The Impact of Artificial Intelligence on Healthcare: A Comprehensive ...","url":"https://onlinelibrary.wiley.com/doi/full/10.1002/hsr2.70312","summary":"This review analyzes the impact of AI on healthcare using data from the Web of Science (2014-2024), focusing on keywords like AI, ML, and healthcare applications."},{"title":"Artificial intelligence in healthcare (Review) - PubMed","url":"https://pubmed.ncbi.nlm.nih.gov/39583770/","summary":"Furthermore, the barriers and constraints that may impede the use of AI in healthcare are outlined, and the potential future directions of AI-augmented healthcare systems are discussed."},{"title":"Full article: Towards new frontiers of healthcare systems research ...","url":"https://www.tandfonline.com/doi/full/10.1080/20476965.2024.2402128","summary":"In this editorial, we begin by taking a quick look at the recent past of AI and its use in health. We then present the current landscape of AI research in health. We further discuss promising avenues for novel innovations in health systems research."},{"title":"AI in healthcare: New research shows promise and limitations of ...","url":"https://www.sciencedaily.com/releases/2024/10/241028164534.htm","summary":"Researchers have studied how well doctors used GPT-4 -- an artificial intelligence (AI) large language model system -- for diagnosing patients."},{"title":"Artificial Intelligence in Healthcare: 2024 Year in Review","url":"https://www.medrxiv.org/content/10.1101/2025.02.26.25322978v2","summary":"The adoption of LLMs and text data types amongst various healthcare specialties, especially for education and administrative tasks, is unlocking new potential for AI applications in healthcare."},{"title":"Investigating the Key Trends in Applying Artificial Intelligence to ...","url":"https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0322197","summary":"The findings of this review are useful for healthcare professionals to acquire deeper knowledge on the use of medical AI from design to implementation stage. However, a thorough assessment is essential to gather more insights into whether AI benefits outweigh its risks."},{"title":"Revolutionizing healthcare and medicine: The impact of modern ...","url":"https://pubmed.ncbi.nlm.nih.gov/39479277/","summary":"Wearable technology, the Internet of Medical Things, and sensor technologies have empowered individuals to take an active role in tracking and managing their health. These devices facilitate real-time data collection, enabling preventive and personalized care."}]}
2025/09/08 11:47:52 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Generative AI in healthcare: Current trends and future outlook","url":"https://www.mckinsey.com/industries/healthcare/our-insights/generative-ai-in-healthcare-current-trends-and-future-outlook","summary":"The latest survey, conducted in the fourth quarter of 2024, found that 85 percent of respondents—healthcare leaders from payers, health systems, and healthcare services and technology (HST) groups—were exploring or had already adopted gen AI capabilities."},{"title":"AI in healthcare - statistics & facts | Statista","url":"https://www.statista.com/topics/10011/ai-in-healthcare/","summary":"Distribution of confidence in using a new technology and AI in healthcare among health professionals in Denmark, France, Germany, and the United Kingdom as of 2024"},{"title":"Medscape and HIMSS Release 2024 Report on AI Adoption in Healthcare","url":"https://www.prnewswire.com/news-releases/medscape-and-himss-release-2024-report-on-ai-adoption-in-healthcare-302324936.html","summary":"The full \"AI Adoption in Healthcare Report 2024\" is now available on both Medscape and HIMSS websites offering detailed analysis and insights into the current state of AI adoption in..."},{"title":"AI in Healthcare Market Size, Share | Growth Report [2025-2032]","url":"https://www.fortunebusinessinsights.com/industry-reports/artificial-intelligence-in-healthcare-market-100534","summary":"The global AI in healthcare market research report delivers an in-depth market analysis, highlighting essential elements such as an overview of advanced technologies, the regulatory landscape in key countries, and the challenges encountered in adopting and implementing AI-based solutions."},{"title":"Artificial Intelligence in Healthcare Market Size to Hit USD 613.81 Bn ...","url":"https://www.precedenceresearch.com/artificial-intelligence-in-healthcare-market","summary":"The global artificial intelligence (AI) in healthcare market size reached USD 26.69 billion in 2024 and is projected to hit around USD 613.81 billion by 2034, at a CAGR of 36.83%."},{"title":"AI In Healthcare Market Size, Share | Industry Report, 2033","url":"https://www.globalmarketstatistics.com/market-reports/artificial-intelligence-in-healthcare-market-12394","summary":"Market Size and Growth: The Artificial Intelligence in Healthcare Market Market size was USD 5011.24 Million in 2024, is projected to grow to USD 5762.41 Million by 2025 and exceed USD 8966.05 Million by 2033, with a CAGR of 21.4% from 2025-2033."},{"title":"AI in healthcare statistics: 62 findings from 18 research reports - Keragon","url":"https://www.keragon.com/blog/ai-in-healthcare-statistics","summary":"Bringing together the data — 12 data-driven insights from 6 different research reports — we revealed a range of concerns surrounding AI in healthcare. The key obstacles the data unpacked are misdiagnoses, transparency, data accuracy, and human oversight."},{"title":"AI in Healthcare Statistics By Market Share And Technology","url":"https://www.sci-tech-today.com/stats/ai-in-healthcare-statistics/","summary":"According to AI in Healthcare Statistics, the US will lead the global AI healthcare market in 2024, which is projected to reach USD 24.7 billion. In the same year, US healthcare AI..."},{"title":"Artificial Intelligence in Healthcare: 2024 Year in Review","url":"https://www.researchgate.net/publication/389402322_Artificial_Intelligence_in_Healthcare_2024_Year_in_Review","summary":"The adoption of LLMs and text data types amongst various healthcare specialties, especially for education and administrative tasks, is unlocking new potential for AI applications in..."},{"title":"19+ AI in Healthcare Statistics for 2024: Insights & Projections","url":"https://www.allaboutai.com/resources/ai-statistics/healthcare/","summary":"Discover 19+ AI in healthcare statistics for 2024, covering public perception, market trends, and revenue projections with expert insights."}]}
2025/09/08 11:47:58 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Artificial Intelligence in Healthcare: 2024 Year in Review","url":"https://www.researchgate.net/publication/389402322_Artificial_Intelligence_in_Healthcare_2024_Year_in_Review","summary":"The adoption of LLMs and text data types amongst various healthcare specialties, especially for education and administrative tasks, is unlocking new potential for AI applications in..."},{"title":"Trustworthy AI in Healthcare Insights from IQVIA 2024 Report","url":"https://aipressroom.com/trustworthy-ai-healthcare-insights-iqvia-2024/","summary":"Discover how AI is advancing healthcare with trusted frameworks, real-world impact, and strategies for ethical, scalable adoption."},{"title":"The Impact of Artificial Intelligence on Healthcare: A Comprehensive ...","url":"https://onlinelibrary.wiley.com/doi/full/10.1002/hsr2.70312","summary":"This review analyzes the impact of AI on healthcare using data from the Web of Science (2014-2024), focusing on keywords like AI, ML, and healthcare applications."},{"title":"Generative AI in Healthcare: 2024's Breakthroughs and What's Next for ...","url":"https://www.signifyresearch.net/insights/generative-ai-news-round-up-december-2024/","summary":"As 2024 draws to a close, generative AI in healthcare has achieved remarkable milestones. This year has been defined by both groundbreaking innovation and insightful exploration, with AI transforming workflows in medical imaging and elevating patient care across digital health solutions."},{"title":"Generative AI in healthcare: Current trends and future outlook","url":"https://www.mckinsey.com/industries/healthcare/our-insights/generative-ai-in-healthcare-current-trends-and-future-outlook","summary":"The latest survey, conducted in the fourth quarter of 2024, found that 85 percent of respondents—healthcare leaders from payers, health systems, and healthcare services and technology (HST) groups—were exploring or had already adopted gen AI capabilities."},{"title":"Artificial Intelligence in Healthcare: 2024 Year in Review","url":"https://www.medrxiv.org/content/10.1101/2025.02.26.25322978v2","summary":"The adoption of LLMs and text data types amongst various healthcare specialties, especially for education and administrative tasks, is unlocking new potential for AI applications in healthcare."},{"title":"How AI is improving diagnostics and health outcomes","url":"https://www.weforum.org/stories/2024/09/ai-diagnostics-health-outcomes/","summary":"By leveraging the power of AI for diagnostics, we can improve health outcomes and contribute to a future where healthcare is more accessible and effective for everyone, particularly in the communities that need it the most."},{"title":"Artificial Intelligence in Healthcare: 2024 Developments and Lega","url":"https://natlawreview.com/article/healthy-ai-2024-year-review","summary":"This publication provides an overview of important developments at the intersection of AI, healthcare and the law in 2024."},{"title":"What's next in AI and healthcare? | McKinsey & Company","url":"https://www.mckinsey.com/featured-insights/themes/whats-next-in-ai-and-healthcare","summary":"In healthcare—with patient well-being and lives at stake—the advancement of AI seems particularly momentous. In an industry battling staffing shortages and increasing costs, health system leaders need to consider all possible solutions, including AI technologies."},{"title":"AI in Healthcare: An Expert Analysis on Driving Transformational ...","url":"https://www.historytools.org/ai/healthcare-ai","summary":"Artificial intelligence (AI) has emerged as a disruptive force across industries, but few sectors are seeing more dramatic change than healthcare. Fueled by vast data growth, urgent cost pressures and new technological capabilities, AI adoption in health is accelerating rapidly."}]}
2025/09/08 11:48:01 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Deep Dive: AI 2024 | pharmaphorum","url":"https://pharmaphorum.com/digital/deep-dive-ai-2024","summary":"In this issue, we delve into the transformative impact of AI on healthcare and pharma, featuring insights on key AI trends from the floor of Frontiers Health, the ongoing battle against..."},{"title":"Artificial Intelligence - Healthcare IT News","url":"https://www.healthcareitnews.com/topics/artificial-intelligence","summary":"Dr. Ethan Goh, executive director of Stanford ARISE, the AI Research and Science Evaluation Network, describes a new study to explore models' diagnostic and management reasoning capabilities - and what that could mean for clinicians and patients."},{"title":"7 ways AI is transforming healthcare | World Economic Forum","url":"https://www.weforum.org/stories/2025/08/ai-transforming-global-health/","summary":"While healthcare lags in AI adoption, these game-changing innovations - from spotting broken bones to assessing ambulance needs - show what's possible."},{"title":"Artificial Intelligence (AI) in Health Care | NEJM Catalyst","url":"https://catalyst.nejm.org/browse/catalyst-topic/ai-in-healthcare","summary":"As AI technology rapidly evolves, health care professionals grapple with the ethical implications of data ownership, privacy concerns, and the actionable insights derived from AI."},{"title":"From Robots to Healthcare: The Real Story Behind 2024's AI Investments","url":"https://www.algorithm-research.com/post/from-robots-to-healthcare-the-real-story-behind-2024-s-ai-investments","summary":"AI continues to reshape industries across the globe, with capital flowing into areas that promise the highest long-term impact. According to the 2025 AI Index Report by Stanford University, global AI investments in 2024 reached new highs, but they were far from evenly distributed."},{"title":"2024 Medical Breakthroughs Revolutionizing Healthcare","url":"https://medicalnewscorner.com/2024-medical-breakthroughs-revolutionizing-healthcare/","summary":"The medical field is set for transformative advancements in 2024, with breakthroughs in gene editing, cancer treatment, artificial intelligence, telemedicine, mental health, and wearable technology, promising to enhance patient care and outcomes globally."},{"title":"Artificial Intelligence - JAMA Network","url":"https://jamanetwork.com/collections/44024/artificial-intelligence","summary":"Explore the latest in AI in medicine, including studies of how chatbots, large language models (LLMs), natural language processing, and machine learning are transforming medicine and health care."},{"title":"Ai医疗技术：2024年及以后的发展趋势-家医大健康","url":"https://www.familydoctor.cn/news/ai-yiliao-jishu-yihou-fazhanqushi-192483.html","summary":"本文深入探讨了新一代健康AI技术在2024年的发展前景，包括先进诊断工具和个性化治疗计划等创新应用。 文章指出，通过机器学习和深度学习技术的突破，AI将在疾病早期检测、患者数据实时分析和医疗资源优化分配方面发挥关键作用。"},{"title":"AI in Healthcare | Artificial intelligence in healthcare news","url":"https://aiin.healthcare/","summary":"AI in Healthcare is the leading source of information on the latest developments in the use of artificial intelligence in healthcare. We provide coverage of AI-powered medical devices, software, and algorithms, as well as the ethical and regulatory challenges surrounding the use of AI in healthcare."},{"title":"19+ AI in Healthcare Statistics for 2024: Insights & Projections","url":"https://www.allaboutai.com/resources/ai-statistics/healthcare/","summary":"Discover 19+ AI in healthcare statistics for 2024, covering public perception, market trends, and revenue projections with expert insights."}]}
2025/09/08 11:48:08 
=== Agent:Executor Output ===
Here are some of the most recent and credible sources identified for AI developments in healthcare in 2024:

Scientific Journals:
- "Artificial Intelligence in Healthcare: 2024 Year in Review" (ResearchGate)
- "AI in Healthcare - Nature" (nature.com collection)
- "Evolution of artificial intelligence in healthcare: a 30-year study" (frontiersin.org)
- "The Impact of Artificial Intelligence on Healthcare: A Comprehensive Review" (Wiley online library)
- "Artificial intelligence in healthcare (Review)" (PubMed)
- "Artificial Intelligence - JAMA Network" (jamanetwork.com collection)

Industry Reports:
- "Generative AI in healthcare: Current trends and future outlook" (McKinsey report, Q4 2024)
- "Medscape and HIMSS Release 2024 Report on AI Adoption in Healthcare"
- "AI in Healthcare Market Size, Share | Growth Report [2025-2032]" (Fortune Business Insights)
- "Artificial Intelligence in Healthcare Market Size to Hit USD 613.81 Bn" (Precedence Research)

News Articles:
- "AI in healthcare: New research shows promise and limitations of GPT-4" (ScienceDaily, Oct 2024)
- "Deep Dive: AI 2024" (pharmaphorum.com)
- "Artificial Intelligence - Healthcare IT News"
- "7 ways AI is transforming healthcare" (World Economic Forum, 2024)
- "2024 Medical Breakthroughs Revolutionizing Healthcare" (medicalnewscorner.com)

Expert Analyses:
- "Trustworthy AI in Healthcare Insights from IQVIA 2024 Report"
- "Generative AI in Healthcare: 2024's Breakthroughs and What's Next" (SignifyResearch)
- "AI in Healthcare: An Expert Analysis on Driving Transformational Change"

These sources cover a broad spectrum including peer-reviewed journals, authoritative market research reports, reputable news publications, and expert thought leadership on the latest AI innovations, applications, and trends in healthcare for 2024. Shall I proceed to extract and compile key technologies emerging or advancing in AI for healthcare in 2024 from these sources?
2025/09/08 11:48:15 
=== Agent:Replanner Output ===
{"steps":["Extract and compile the key technologies emerging or advancing in AI for healthcare in 2024, focusing on machine learning models, diagnostic tools, robotic surgery, personalized medicine, and data management solutions.","Analyze the main applications of AI in healthcare during 2024, concentrating on diagnostics, patient care, drug discovery, medical imaging, and healthcare administration.","Investigate current industry trends related to AI in healthcare for 2024, including adoption rates, regulatory changes, ethical considerations, funding landscape, and market forecasts.","Synthesize the gathered information into a comprehensive summary covering the latest developments in AI for healthcare in 2024, highlighting key technologies, applications, and industry trends with examples and implications."]}
2025/09/08 11:48:20 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Five Machine Learning Innovations Shaping Healthcare in 2024","url":"https://healthmanagement.org/c/artificial-intelligence/News/five-machine-learning-innovations-shaping-healthcare-in-2024","summary":"Discover 5 AI & ML trends transforming UK healthcare, from explainable AI to edge AI, enhancing patient care and operational efficiency."},{"title":"How AI is improving diagnostics and health outcomes","url":"https://www.weforum.org/stories/2024/09/ai-diagnostics-health-outcomes/","summary":"Effective and ethical AI solutions in diagnostics require collaboration. Artificial intelligence (AI) is transforming healthcare by improving diagnostic accuracy, enabling earlier disease detection and enhancing patient outcomes."},{"title":"The Impact of Artificial Intelligence on Healthcare: A Comprehensive ...","url":"https://onlinelibrary.wiley.com/doi/full/10.1002/hsr2.70312","summary":"The study aims to describe AI in healthcare, including important technologies like robotics, machine learning (ML), deep learning (DL), and natural language processing (NLP), and to investigate how these technologies are used in patient interaction, predictive analytics, and remote monitoring."},{"title":"Unveiling the potential of artificial intelligence in revolutionizing ...","url":"https://eurjmedres.biomedcentral.com/articles/10.1186/s40001-025-02680-7","summary":"The rapid advancement of Machine Learning (ML) and Deep Learning (DL) technologies has revolutionized healthcare, particularly in the domains of disease prediction and diagnosis."},{"title":"Trends in AI for Disease and Diagnostic Prediction: A Healthcare ...","url":"https://link.springer.com/chapter/10.1007/978-3-031-84404-1_5","summary":"This chapter explores the transformative impact of artificial intelligence (AI) on the healthcare system, particularly in enhancing the accuracy, efficiency, and speed of disease diagnostics. A key advantage of AI integration in healthcare lies in its capacity to..."},{"title":"Unleashing the potential of AI in modern healthcare: Machine learning ...","url":"https://www.researchgate.net/publication/385135063_Unleashing_the_potential_of_AI_in_modern_healthcare_Machine_learning_algorithms_and_intelligent_medical_robots","summary":"Overall, AI, through machine learning algorithms and intelligent medical robots, is revolutionizing healthcare by offering promising improvements in diagnostics, surgical precision,..."},{"title":"The impact of artificial intelligence on remote healthcare: Enhancing ...","url":"https://www.sciencedirect.com/science/article/pii/S2949866X24001230","summary":"Key applications of AI, such as AI-enabled diagnostic systems, predictive analytics, and teleconsultation platforms, are reviewed for their strengths in overcoming the limitations of the traditional models of remote healthcare."},{"title":"15 AI Tools Transforming Healthcare in 2025 | The Future of Medicine","url":"https://healthcarereaders.com/insights/top-ai-tools-in-healthcare","summary":"From predictive analytics to generative AI (GenAI), these technologies are improving patient outcomes while reducing costs. AI is not new to healthcare—predictive analytics and machine learning have been used for years in diagnostics, treatment planning, and patient monitoring."},{"title":"How AI Is Transforming Healthcare: Diagnosis, Treatment, and Beyond","url":"https://www.sciencenewstoday.org/how-ai-is-transforming-healthcare-diagnosis-treatment-and-beyond","summary":"In this sweeping journey into the AI-healthcare nexus, we will explore how artificial intelligence is reshaping diagnosis, revolutionizing treatment, enhancing patient care, and opening doors to possibilities once thought impossible."},{"title":"Top 10 AI in Healthcare Applications 2025 | Diagnosis to Patient Care","url":"https://www.guvi.in/blog/ai-in-healthcare-applications/","summary":"What is Artificial intelligence in Healthcare? AI in healthcare refers to the use of advanced algorithms and machine learning models that analyze complex medical data and support clinical decisions. It helps doctors identify patterns in imaging results, predict disease risks through patient records, and recommend treatment options tailored to individual needs. Top 10 Applications of AI in ..."}]}
2025/09/08 11:48:28 
=== Agent:Executor Output ===
Key technologies emerging or advancing in AI for healthcare in 2024, based on recent findings, include:

1. Machine Learning Models:
- Advanced machine learning (ML) and deep learning (DL) technologies are revolutionizing disease prediction, diagnostics accuracy, and patient outcome improvements.
- Innovations include explainable AI models that enhance transparency and trust in clinical decision-making.
- Edge AI is gaining traction, enabling real-time data processing at healthcare facilities for faster diagnostics and response.

2. Diagnostic Tools:
- AI-enabled diagnostic systems are enhancing speed, accuracy, and early detection of diseases.
- Integration of AI in medical imaging allows for better identification of abnormalities and tailored treatment plans.
- Use of natural language processing (NLP) to analyze patient records and literature supports predictive analytics and diagnostics.

3. Robotic Surgery:
- Intelligent medical robots equipped with AI algorithms are improving surgical precision and reducing invasiveness.
- AI facilitates real-time guidance and adaptive control during surgeries, increasing safety and effectiveness.

4. Personalized Medicine:
- AI models analyze individual patient data to recommend customized treatment plans.
- Predictive analytics support identification of patient-specific risk factors and therapeutic responses.
- AI-driven genomics and biomarker analysis accelerate personalized drug development.

5. Data Management Solutions:
- AI-powered data management platforms enable integration and analysis of large-scale heterogeneous healthcare data.
- Predictive analytics and remote monitoring systems optimize patient care and hospital operations.
- Secure and compliant AI solutions address privacy and ethical concerns in managing healthcare information.

These technologies collectively contribute to enhancing diagnostics, treatment precision, patient care, and operational efficiency in healthcare settings in 2024. Would you like me to proceed with analyzing the main applications of AI in healthcare during 2024 next?
2025/09/08 11:48:33 
=== Agent:Replanner Output ===
{"steps":["Analyze the main applications of AI in healthcare during 2024, concentrating on diagnostics, patient care, drug discovery, medical imaging, and healthcare administration.","Investigate current industry trends related to AI in healthcare for 2024, including adoption rates, regulatory changes, ethical considerations, funding landscape, and market forecasts.","Synthesize the gathered information into a comprehensive summary covering the latest developments in AI for healthcare in 2024, highlighting key technologies, applications, and industry trends with examples and implications."]}
2025/09/08 11:48:39 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"How AI is improving diagnostics and health outcomes","url":"https://www.weforum.org/stories/2024/09/ai-diagnostics-health-outcomes/","summary":"By leveraging the power of AI for diagnostics, we can improve health outcomes and contribute to a future where healthcare is more accessible and effective for everyone, particularly in the communities that need it the most."},{"title":"14 Top Use Cases for AI in Healthcare in 2024","url":"https://www.cake.ai/blog/top-ai-healthcare-use-cases","summary":"We will explore the 14 top use cases for AI in healthcare, demonstrating how these technologies are improving patient outcomes and streamlining operations from the front desk to the operating room."},{"title":"Artificial Intelligence (AI) Applications in Drug Discovery and Drug ...","url":"https://pubmed.ncbi.nlm.nih.gov/39458657/","summary":"In this review article, we will present a comprehensive overview of AI's applications in the pharmaceutical industry, covering areas such as drug discovery, target optimization, personalized medicine, drug safety, and more."},{"title":"Top 10 AI in Healthcare Applications 2025 | Diagnosis to Patient Care","url":"https://www.guvi.in/blog/ai-in-healthcare-applications/","summary":"Unravel the top 10 AI in healthcare applications transforming 2025, from diagnosis accuracy to patient care, drug discovery, monitoring, and cost reduction."},{"title":"AI in Healthcare: Enhancing Patient Care and Diagnosis","url":"https://www.park.edu/blog/ai-in-healthcare-enhancing-patient-care-and-diagnosis/","summary":"Below, we delve into the various applications of AI in healthcare and examine how it enhances patient care and diagnosis — along with the challenges and opportunities that lie ahead."},{"title":"Generative Artificial Intelligence in Healthcare: Applications ...","url":"https://www.mdpi.com/2673-7426/5/3/37","summary":"These generative AI models have shown widespread applications in clinical practice and research. Such applications range from medical documentation and diagnostics to patient communication and drug discovery."},{"title":"The Impact of Artificial Intelligence on Healthcare: A Comprehensive ...","url":"https://onlinelibrary.wiley.com/doi/full/10.1002/hsr2.70312","summary":"Core applications like remote monitoring and predictive analytics improve operational effectiveness and patient involvement. However, there are major obstacles to the mainstream implementation of AI in healthcare, including issues with data security and budget constraints."},{"title":"Reviewing Artificial Intelligence Applications in Healthcare ...","url":"https://worldscientificnews.com/reviewing-artificial-intelligence-applications-in-healthcare-diagnostics-benefits-challenges-and-future-directions/","summary":"Artificial intelligence (AI) transforms healthcare diagnostics by enabling faster, more accurate, cost-effective disease detection and treatment planning. This paper reviews AI's applications, benefits, challenges, and future directions in diagnostics."},{"title":"Artificial Intelligence in Healthcare: Transforming Diagnostics, Drug ...","url":"https://medtechnews.uk/research-reports/artificial-intelligence-in-healthcare-transforming-diagnostics-drug-discovery-and-ethical-considerations/","summary":"This report embarks on a detailed exploration of the diverse and expanding applications of AI in healthcare, with particular emphasis on its transformative contributions to disease diagnostics and the intricate, multi-stage process of drug discovery."},{"title":"AI in Healthcare Applications - admedica.com","url":"https://admedica.com/2024/12/23/real-world-applications-of-ai-in-healthcare/","summary":"From streamlining diagnostics to enhancing patient care, AI is making medical services faster, more accurate, and more personalized. Here's a closer look at how AI is being applied in healthcare, with real-world examples that highlight its impact."}]}
2025/09/08 11:48:46 
=== Agent:Executor Output ===
In 2024, AI applications in healthcare are notably advancing across several main areas:

1. Diagnostics:
- AI-powered diagnostic tools are enabling faster, more accurate, and cost-effective disease detection and treatment planning.
- Techniques such as machine learning and generative AI improve early detection of conditions and enhance health outcomes.
- AI supports analysis of medical imaging and patient records for precise diagnostics.
- Real-world implementations demonstrate improved accessibility and effectiveness, particularly benefiting underserved communities.

2. Patient Care:
- AI enhances personalized patient care through predictive analytics, remote monitoring, and data integration.
- Generative AI assists in medical documentation and patient communication, improving care coordination.
- AI-driven tools help in chronic disease management, patient monitoring, and decision support.
- These technologies facilitate more tailored, responsive healthcare experiences.

3. Drug Discovery:
- AI expedites drug discovery processes including target optimization, safety assessment, and personalized medicine development.
- Generative AI and machine learning models aid in identifying new drug candidates and predicting therapeutic responses.
- AI contributes to reducing costs and timelines in pharmaceutical research.

4. Medical Imaging:
- AI integration in medical imaging allows better identification of abnormalities and supports customized treatment planning.
- Enhanced imaging diagnostics rely on deep learning models interpreting complex data with a higher degree of precision.
- These advances enable earlier disease detection and more effective interventions.

5. Healthcare Administration:
- AI applications streamline healthcare operations such as scheduling, resource allocation, and billing.
- Predictive analytics optimize hospital workflows and patient flow management.
- AI solutions improve operational efficiency and reduce administrative burdens on healthcare providers.

Overall, these AI applications in 2024 are driving transformative changes in healthcare delivery by improving diagnostic accuracy, enhancing patient care personalization, accelerating drug development, refining medical imaging analysis, and optimizing administrative processes. Would you like me to proceed with investigating the current industry trends related to AI in healthcare for 2024 next?
2025/09/08 11:48:49 
=== Agent:Replanner Output ===
{"steps":["Investigate current industry trends related to AI in healthcare for 2024, including adoption rates, regulatory changes, ethical considerations, funding landscape, and market forecasts.","Synthesize the gathered information into a comprehensive summary covering the latest developments in AI for healthcare in 2024, highlighting key technologies, applications, and industry trends with examples and implications."]}
2025/09/08 11:48:55 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Ethical and legal considerations in healthcare AI: innovation and ...","url":"https://royalsocietypublishing.org/doi/10.1098/rsos.241873","summary":"Artificial intelligence (AI) is transforming healthcare by enhancing diagnostics, personalizing medicine and improving surgical precision. However, its integration into healthcare systems raises significant ethical and legal challenges."},{"title":"Ethical Considerations in AI-Enabled Healthcare","url":"https://link.springer.com/chapter/10.1007/978-3-031-80813-5_18","summary":"Integrating Artificial Intelligence (AI) in healthcare has revolutionized patient care and operational workflows, yet it introduces significant ethical considerations. This chapter explores the impact of AI on key ethical principles—beneficence, nonmaleficence, autonomy, and justice."},{"title":"Ethical implications of AI-driven clinical decision support systems on ...","url":"https://bmcmedethics.biomedcentral.com/articles/10.1186/s12910-024-01151-8","summary":"Artificial intelligence-driven Clinical Decision Support Systems (AI-CDSS) are increasingly being integrated into healthcare for various purposes, including resource allocation. While these systems promise improved efficiency and decision-making, they also raise significant ethical concerns."},{"title":"Ethical debates amidst flawed healthcare artificial intelligence ...","url":"https://www.nature.com/articles/s41746-024-01242-1","summary":"Healthcare AI faces an ethical dilemma between selective and equitable deployment, exacerbated by flawed performance metrics. These metrics inadequately capture real-world complexities and..."},{"title":"Ethical Implications in AI-Based Health Care Decision Making: A ...","url":"https://liebertpub.com/doi/abs/10.1089/aipo.2024.0007","summary":"This critical analysis explores the ethical implications of AI-based health care decision making, examining the existing literature, methodological approaches, and ethical frameworks."},{"title":"AI ethics in medical research: the 2024 Declaration of Helsinki","url":"https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(24)02376-6/fulltext","summary":"The recent update to the World Medical Association's Declaration of Helsinki,1 adopted at the 75th World Medical Association General Assembly in October, 2024, signals yet another milestone in the ongoing effort to safeguard ethical standards in medical research involving human participants."},{"title":"Navigating ethical considerations in the use of artificial intelligence ...","url":"https://pubmed.ncbi.nlm.nih.gov/39545614/","summary":"Results: The review highlighted critical ethical challenges, such as data privacy and security, accountability for AI-driven decisions, transparency in AI decision-making, and maintaining the human touch in care."},{"title":"The 5 Biggest Ethical Issues with AI in Healthcare","url":"https://www.keragon.com/blog/ethical-issues-with-ai-in-healthcare","summary":"What are the ethical issues with AI in healthcare? Dive into complex debates and considerations surrounding the ethical use of healthcare AI."},{"title":"Frontiers | Ethical-legal implications of AI-powered healthcare in ...","url":"https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1619463/full","summary":"It argues that by prioritizing ethical considerations in the development and deployment of AI, medical professionals can enhance health outcomes and cultivate patient trust, thereby bridging the gap between technological advancements and nuanced healthcare realities (Collins et al., 2024)."},{"title":"(PDF) Ethical framework for artificial intelligence in healthcare ...","url":"https://www.researchgate.net/publication/381669447_Ethical_framework_for_artificial_intelligence_in_healthcare_research_A_path_to_integrity","summary":"This article sets out to introduce a detailed framework designed to steer governance and offer a systematic method for assuring that AI applications in healthcare research are developed and..."}]}
2025/09/08 11:49:01 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Medscape and HIMSS Release 2024 Report on AI Adoption in Healthcare","url":"https://www.prnewswire.com/news-releases/medscape-and-himss-release-2024-report-on-ai-adoption-in-healthcare-302324936.html","summary":"The full \"AI Adoption in Healthcare Report 2024\" is now available on both Medscape and HIMSS websites offering detailed analysis and insights into the current state of AI adoption..."},{"title":"AI in Healthcare Statistics 2025: Overview of Trends","url":"https://docus.ai/blog/ai-healthcare-statistics","summary":"As we step into 2025, let's see how AI in healthcare statistics from 2024 are shaping trends in patient care, diagnostics, and innovation."},{"title":"AI in healthcare - statistics & facts | Statista","url":"https://www.statista.com/topics/10011/ai-in-healthcare/","summary":"Distribution of confidence in using a new technology and AI in healthcare among health professionals in Denmark, France, Germany, and the United Kingdom as of 2024"},{"title":"AI In Healthcare Stats 2025: Adoption, Accuracy & Market","url":"https://www.demandsage.com/ai-in-healthcare-stats/","summary":"Get insights into AI in healthcare stats, including adoption rate, performance accuracy, and the rapidly growing market valuation."},{"title":"HIMSS and Medscape Unveil Groundbreaking Report on AI Adoption at ...","url":"https://gkc.himss.org/news/himss-and-medscape-unveil-groundbreaking-report-ai-adoption-health-systems","summary":"The findings, highlighted in the Medscape & HIMSS AI Adoption by Health Systems Report 2024, reveal that 86% of respondents already leverage AI in their medical organizations, with 60% recognizing its ability to uncover health patterns and diagnoses beyond human detection."},{"title":"Adoption of artificial intelligence in healthcare: survey of health ...","url":"https://academic.oup.com/jamia/article/32/7/1093/8125015","summary":"To evaluate the current state of AI adoption in US healthcare systems, assess successes and barriers to implementation during the early generative AI era. This cross-sectional survey was conducted in Fall 2024, and included 67 health systems members of the Scottsdale Institute, a collaborative of US non-profit healthcare organizations."},{"title":"19+ AI in Healthcare Statistics for 2024: Insights & Projections","url":"https://www.allaboutai.com/resources/ai-statistics/healthcare/","summary":"Discover 19+ AI in healthcare statistics for 2024, covering public perception, market trends, and revenue projections with expert insights."},{"title":"AI in Healthcare Statistics By Market Share And Technology","url":"https://www.sci-tech-today.com/stats/ai-in-healthcare-statistics/","summary":"In the second quarter of 2024, the US held a dominant position with a 58% revenue share, reflecting its strong focus on AI development and deployment. Similarly, the rest of the world followed..."},{"title":"AI in healthcare statistics: 62 findings from 18 research reports - Keragon","url":"https://www.keragon.com/blog/ai-in-healthcare-statistics","summary":"⚪️ Consumer adoption of gen AI for health reasons has remained flat, with just 37% of consumers using it in 2024 versus 40% in 2023. Source: Deloitte Center for Health Solutions's' 2024 Health Care Consumer Survey"},{"title":"New AMA report highlights physician optimism about AI in health care","url":"https://www.medicaleconomics.com/view/new-ama-report-highlights-physician-optimism-about-ai-in-health-care","summary":"The adoption of artificial intelligence (AI) in health care nearly doubled in 2024 compared to 2023 — a reflection of growing enthusiasm and decreasing apprehension toward the technology, despite some lingering concerns, according to a new report from the American Medical Association (AMA)."}]}
2025/09/08 11:49:04 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"AI in Healthcare: Funding Resurgence for Biotech Startups in 2024","url":"https://techainews.digital/2024/12/12/ai-in-healthcare-funding-resurgence-for-biotech-startups-in-2024/","summary":"In summary, the funding landscape for AI-driven biotech and healthcare startups in 2024 is showing a marked revival after a challenging previous year. With an influx of capital reflecting strong investor interest, companies harnessing AI to revolutionize drug discovery and enhance healthcare processes are at the forefront of this resurgence."},{"title":"AI Healthcare Startups: Investment & Funding Trends","url":"https://www.delveinsight.com/blog/ai-healthcare-startups-funding-trends","summary":"Discover how AI healthcare startups are attracting billions in funding and reshaping the future of healthcare and pharma."},{"title":"How healthcare AI led a 'paradigm shift' in a $23B year for startups","url":"https://carta.com/data/industry-spotlight-healthcare-2024/","summary":"The rate of all new healthcare investments in which valuations were lower than that of the previous round declined slightly over the course of 2024, settling at 19% in the final quarter of the year. Still, down rounds remain a persistent aspect of the healthcare fundraising landscape."},{"title":"AI-Healthcare Startups Surge with Record Funding: A Look at 2025's ...","url":"https://opentools.ai/news/ai-healthcare-startups-surge-with-record-funding-a-look-at-2025s-promising-landscape","summary":"Notably, the landscape of AI-healthcare startup funding has demonstrated robust growth, amounting to $7.5 billion worldwide in 2024, with an additional $1.68 billion earmarked for early 2025."},{"title":"The State of the Funding Market for AI Companies: A 2024 - 2025 Outlook","url":"https://www.mintz.com/insights-center/viewpoints/2166/2025-03-10-state-funding-market-ai-companies-2024-2025-outlook","summary":"In 2024, these AI-driven companies captured a substantial share of venture capital funding. Overall, venture capital investment in healthcare rose to $23 billion, up from $20 billion in 2023, with nearly 30% of the 2024 funding directed toward AI-focused startups."},{"title":"2024 year-end market overview: Davids and Goliaths - Rock Health","url":"https://rockhealth.com/insights/2024-year-end-market-overview-davids-and-goliaths/","summary":"These dual trends—early-stage startup activity amidst big moves by large healthcare players—have created a David and Goliath dynamic in the healthcare innovation landscape. We see a future where David and Goliath can coexist, and even thrive together, to drive impactful change in healthcare."},{"title":"AI and TechBio Funding Lead the Charge: 2024 Digital Health Funding ...","url":"https://www.galengrowth.com/ai-and-techbio-funding-lead-the-charge-2024-digital-health-funding-resurgence/","summary":"Global digital health funding rebounded to $25.1 billion in 2024, marking a 5.5% year-on-year increase. Europe saw the highest regional growth, with funding surging by 27% from 2023, while the US retained its dominance, contributing $17.2 billion in funding."},{"title":"Healthcare venture capital investment amplified by AI in 2024: report","url":"https://www.healthcaredive.com/news/healthcare-venture-captial-funding-ai-boost-2024-silicon-valley-bank/736870/","summary":"Venture capital investment in healthcare increased in 2024, spurred by enthusiasm for artificial intelligence startups, according to a report by Silicon Valley Bank. Funding for U.S...."},{"title":"These 10 healthcare AI startups have pulled in the most cash","url":"https://pitchbook.com/news/articles/healthcare-ai-startups-vc-funding","summary":"As of Q3 2024, funding had surpassed 2023's total with $10.5 billion generated across 511 deals. These 10 healthcare AI startups have raised the most capital from VC investors, leading the space to new heights while capitalizing on the AI frenzy."},{"title":"AI Finance for Healthcare 2024 - byteplus.com","url":"https://www.byteplus.com/en/topic/394250","summary":"Explore AI finance trends in healthcare for 2024, including investment insights, market growth, and emerging technologies."}]}
2025/09/08 11:49:05 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Artificial Intelligence in Healthcare Market Size to Hit USD 613.81 Bn ...","url":"https://www.precedenceresearch.com/artificial-intelligence-in-healthcare-market","summary":"The global artificial intelligence (AI) in healthcare market size reached USD 26.69 billion in 2024 and is projected to hit around USD 613.81 billion by 2034, at a CAGR of 36.83%."},{"title":"AI in Healthcare Market Size, Share | Growth Report [2025-2032]","url":"https://www.fortunebusinessinsights.com/industry-reports/artificial-intelligence-in-healthcare-market-100534","summary":"The global AI in healthcare market size was valued at $29.01 billion in 2024 & is projected to grow from $39.25 billion in 2025 to $504.17 billion by 2032"},{"title":"AI in Healthcare Statistics 2025: Overview of Trends","url":"https://docus.ai/blog/ai-healthcare-statistics","summary":"As we step into 2025, let's see how AI in healthcare statistics from 2024 are shaping trends in patient care, diagnostics, and innovation."},{"title":"Artificial Intelligence (AI) in Healthcare Market Size to","url":"https://www.globenewswire.com/news-release/2025/04/02/3054390/0/en/Artificial-Intelligence-AI-in-Healthcare-Market-Size-to-Hit-USD-613-81-Bn-by-2034.html","summary":"Ottawa, April 02, 2025 (GLOBE NEWSWIRE) -- According to Precedence Research, the artificial intelligence (AI) in healthcare market size was valued at USD 26.69 billion in 2024, calculated..."},{"title":"19+ AI in Healthcare Statistics for 2024: Insights & Projections","url":"https://www.allaboutai.com/resources/ai-statistics/healthcare/","summary":"Discover 19+ AI in healthcare statistics for 2024, covering public perception, market trends, and revenue projections with expert insights."},{"title":"AI in Healthcare Market Leads 37.66% Healthy CAGR by 2034","url":"https://www.towardshealthcare.com/insights/ai-in-healthcare-market","summary":"According to market projections, the AI in healthcare sector is expected to grow from USD 27.59 billion in 2024 to USD 674.19 billion by 2034, reflecting a CAGR of 37.66%."},{"title":"AI In Healthcare Market Size, Share | Industry Report, 2033","url":"https://www.globalmarketstatistics.com/market-reports/artificial-intelligence-in-healthcare-market-12394","summary":"Market Size and Growth: The Artificial Intelligence in Healthcare Market Market size was USD 5011.24 Million in 2024, is projected to grow to USD 5762.41 Million by 2025 and exceed USD 8966.05 Million by 2033, with a CAGR of 21.4% from 2025-2033."},{"title":"AI in Healthcare Market Outlook 2024-2033: Trends ... - LinkedIn","url":"https://www.linkedin.com/pulse/ai-healthcare-market-outlook-20242033-trends-nil8c","summary":"AI in Healthcare Market size was valued at USD 11.6 Billion in 2024 and is forecasted to grow at a CAGR of 24% from 2026 to 2033, reaching USD 64.5 Billion by 2033."},{"title":"AI In Healthcare Market Size to Reach $187.7 Billion by 2030 at CAGR 38 ...","url":"https://www.prnewswire.com/news-releases/ai-in-healthcare-market-size-to-reach-187-7-billion-by-2030-at-cagr-38-5---grand-view-research-inc-302439558.html","summary":"SAN FRANCISCO, April 28, 2025 /PRNewswire/ -- The global AI in healthcare market size is expected to reach USD 187.7 billion by 2030, registering a CAGR of 38.5% from 2024 to 2030,..."},{"title":"AI in Healthcare Market to Soar to USD 629 B by 2032 with 51.87% CAGR","url":"https://www.medboundtimes.com/medbound-blog/ai-healthcare-market-set-to-soar-to-usd629b","summary":"The global artificial intelligence in healthcare market was valued at USD 22.23 billion in 2024 and is projected to skyrocket to USD 629.09 billion by 2032, exhibiting a compound annual growth rate (CAGR) of 51.87% from 2025 to 2032, according to Data Bridge Market Research."}]}
```

## 总结

Plan-Execute Agent 通过「规划-执行-反思」的闭环工作流，将复杂任务拆解为可执行步骤，结合工具调用与动态调整，有效提升了任务完成的可靠性与效率。其核心优势在于：

- **结构化任务拆解**：降低复杂问题的认知负荷
- **工具集成能力**：无缝对接外部工具（搜索、计算、数据库等）
- **动态适应性**：根据执行反馈实时调整策略，应对不确定性

通过 Eino ADK 提供的 `PlanExecuteAgent`，开发者可快速搭建具备复杂任务处理能力的智能体系统，适用于研究分析、自动化办公、智能客服等多种场景。

## 常见问题

### 报错 [NodeRunError] no tool call

Planner / Replanner 必须通过工具调用生成计划，出现此报错时请检查：

1. 所使用的模型是否支持强制工具调用（例如 openai tool_choice="required")
2. 所使用的模型 eino-ext 封装是否升级到最新（例如旧版本 ark sdk 不支持强制工具调用）

### 报错 [NodeRunError] unexpected tool call

Replanner 注册的 ChatModel 不应该通过 WithTools 方法携带额外工具，如有该情况请清空工具

### 报错 [NodeRunError] unmarshal plan error

Planner / Replanner config 中基于 PlanTool 和 NewPlan 两个字段共同生成计划：

- PlanTool 作为向模型提供的 Plan 描述
- NewPlan 方法作为框架构建 plan 的 builder，用于将模型返回的 Plan unmarshal 到该 struct 上供后续步骤运行

当出现该错误时，请检查 PlanTool 中提供的字段描述是否和 NewPlan 方法中返回的结构体字段匹配，对齐后重新运行即可。
