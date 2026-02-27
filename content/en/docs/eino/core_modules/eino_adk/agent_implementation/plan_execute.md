---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 'Eino ADK MultiAgent: Plan-Execute Agent'
weight: 3
---

## Overview

### Import Path

`import "github.com/cloudwego/eino/adk/prebuilt/planexecute"`

### What Is Plan-Execute Agent?

Plan-Execute Agent in Eino ADK follows the "plan–execute–reflect" paradigm to solve complex tasks through step decomposition, execution, and dynamic adjustment. It coordinates three core agents — Planner, Executor, and Replanner — to structure tasks, call tools to execute, evaluate progress, and replan iteratively until the user's goal is achieved.

<a href="/img/eino/eino_adk_plan_execute_steps.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute_steps.png" width="100%" /></a>

It suits multi-step reasoning, tool integration, and strategy adjustment scenarios (e.g., research, complex problem solving, automated workflows). Key advantages:

- Structured planning: break complex tasks into clear, executable steps
- Iterative execution: complete single-step tasks via tool calling and accumulate results
- Dynamic adjustment: evaluate progress to update plan or finish
- Model/tool agnostic: works with any tool-calling model and external tools

### Architecture

Plan-Execute Agent is built from three core agents plus a coordinator, leveraging ChatModelAgent and Workflow Agents capabilities:

<a href="/img/eino/eino_adk_plan_execute_replan_architecture_overview.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute_replan_architecture_overview.png" width="100%" /></a>

#### 1. Planner

- Core function: generate an initial task plan (ordered step list)
- Implementation:
  - Use a tool-calling model with `PlanTool` to produce steps matching a JSON Schema
  - Or use a structured-output model to directly produce a `Plan`
- Output: `Plan` object stored in session for later stages

```go
// PlannerConfig provides configuration options for creating a planner agent.
// There are two ways to configure the planner to generate structured Plan output:
//  1. Use ChatModelWithFormattedOutput: A model already configured to output in the Plan format
//  2. Use ToolCallingChatModel + ToolInfo: A model that will be configured to use tool calling
//     to generate the Plan structure
type PlannerConfig struct {
    // ChatModelWithFormattedOutput is a model pre-configured to output in the Plan format.
    // This can be created by configuring a model to output structured data directly.
    // See https://github.com/cloudwego/eino-ext/components/model/openai/examples/structured/structured.go
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

- Core function: execute the first step in the plan, calling external tools
- Implementation: built with `ChatModelAgent`, configured with a toolset (search, compute, DB, etc.)
- Workflow:
  - Load current `Plan` and executed steps from session
  - Pick the first unexecuted step as the target
  - Call tools to execute and store results in session
- Key capability: supports multi-round tool calling via `MaxIterations` to complete a single step

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

- Core function: evaluate progress, decide to continue (produce a new plan) or finish (return a response)
- Implementation: use a tool-calling model configured with `PlanTool` (for new plan) and `RespondTool` (for final response)
- Decision logic:
  - Continue: if the goal is not met, generate a new `Plan` with remaining steps and update session
  - Finish: if the goal is met, call `RespondTool` to produce the user response

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

- Core function: compose the three agents into a "plan → execute → replan" loop
- Implementation: combine `SequentialAgent` and `LoopAgent`:
  - Outer `SequentialAgent`: run `Planner` once to produce the initial plan, then enter the loop
  - Inner `LoopAgent`: iterate `Executor` and `Replanner` until done or max iterations

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

### Workflow

1. Initialize: user provides a goal, start `PlanExecuteAgent`
2. Plan phase:
   - `Planner` generates the initial `Plan` (step list)
   - Store `Plan` in session (`PlanSessionKey`)
3. Execute–replan loop (controlled by `LoopAgent`):
   - Execute step: `Executor` takes the first step from `Plan`, calls tools, stores results in session (`ExecutedStepsSessionKey`)
   - Reflect step: `Replanner` evaluates executed steps and results:
     - If goal reached: call `RespondTool` to generate the final response and exit
     - If continue: generate a new `Plan`, update session, and loop
4. Termination: task completes (response) or reaches `MaxIterations`

## Usage Example

### Scenario

Build a "research" agent:

1. Planner: plan detailed steps for the research goal
2. Executor: execute the first step, using a search tool if needed (duckduckgo)
3. Replanner: evaluate results, adjust plan if insufficient, otherwise respond with a summary

### Code

#### 1. Initialize model and tools

```go
// Initialize an OpenAI model that supports tool calling
func newToolCallingModel(ctx context.Context) model.ToolCallingChatModel {
    cm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey: os.Getenv("OPENAI_API_KEY"),
        Model:  "gpt-4o", // must support tool calling
    })
    if err != nil {
        log.Fatalf("failed to init model: %v", err)
    }
    return cm
}

// Initialize search tool (used by Executor)
func newSearchTool(ctx context.Context) tool.BaseTool {
    config := &duckduckgo.Config{
       MaxResults: 20, // limit to 20 results
       Region:     duckduckgo.RegionWT,
       Timeout:    10 * time.Second,
    }
    tool, err := duckduckgo.NewTextSearchTool(ctx, config)
    if err != nil {
       log.Fatalf("failed to init search tool: %v", err)
    }
    return tool
}
```

#### 2. Create Planner

```go
func newPlanner(ctx context.Context, model model.ToolCallingChatModel) adk.Agent {
    planner, err := planexecute.NewPlanner(ctx, &planexecute.PlannerConfig{
        ToolCallingChatModel: model,               // generate plan with tool-calling model
        ToolInfo:             &planexecute.PlanToolInfo, // default Plan tool schema
    })
    if err != nil {
        log.Fatalf("failed to create Planner: %v", err)
    }
    return planner
}
```

#### 3. Create Executor

```go
func newExecutor(ctx context.Context, model model.ToolCallingChatModel) adk.Agent {
    // Configure Executor toolset (only search tool here)
    toolsConfig := adk.ToolsConfig{
       ToolsNodeConfig: compose.ToolsNodeConfig{
          Tools: []tool.BaseTool{newSearchTool(ctx)},
       },
    }
    executor, err := planexecute.NewExecutor(ctx, &planexecute.ExecutorConfig{
       Model:         model,
       ToolsConfig:   toolsConfig,
       MaxIterations: 5, // ChatModel runs at most 5 times
    })
    if err != nil {
       log.Fatalf("failed to create Executor: %v", err)
    }
    return executor
}
```

#### 4. Create Replanner

```go
func newReplanner(ctx context.Context, model model.ToolCallingChatModel) adk.Agent {
    replanner, err := planexecute.NewReplanner(ctx, &planexecute.ReplannerConfig{
       ChatModel: model, // evaluate progress with tool-calling model
    })
    if err != nil {
       log.Fatalf("failed to create Replanner: %v", err)
    }
    return replanner
}
```

#### 5. Compose into PlanExecuteAgent

```go
func newPlanExecuteAgent(ctx context.Context) adk.Agent {
    model := newToolCallingModel(ctx)

    // Instantiate the three core agents
    planner := newPlanner(ctx, model)
    executor := newExecutor(ctx, model)
    replanner := newReplanner(ctx, model)

    // Compose into PlanExecuteAgent (fixed execute–replan max iterations = 10)
    planExecuteAgent, err := planexecute.NewPlanExecuteAgent(ctx, &planexecute.PlanExecuteConfig{
       Planner:       planner,
       Executor:      executor,
       Replanner:     replanner,
       MaxIterations: 10,
    })
    if err != nil {
       log.Fatalf("failed to compose PlanExecuteAgent: %v", err)
    }
    return planExecuteAgent
}
```

#### 6. Run and Output

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

    // Create Runner to execute agent
    runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent, EnableStreaming: true})

    // User input goal
    userInput := []adk.Message{
       schema.UserMessage("Research and summarize the latest developments in AI for healthcare in 2024, including key technologies, applications, and industry trends."),
    }

    // Execute and print results
    events := runner.Run(ctx, userInput)
    for {
       event, ok := events.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Printf("error: %v", event.Err)
          break
       }
       // Print agent output (plan, execution results, final response, etc.)
       if msg, err := event.Output.MessageOutput.GetMessage(); err == nil && msg.Content != "" {
          log.Printf("\n=== Agent Output ===\n%s\n", msg.Content)
       }
    }
}
```

### Run Result

```markdown
2025/09/08 11:47:42 
=== Agent:Planner Output ===
{"steps":["Identify the most recent and credible sources for AI developments in healthcare in 2024, such as scientific journals, industry reports, news articles, and expert analyses.","Extract and compile the key technologies emerging or advancing in AI for healthcare in 2024, including machine learning models, diagnostic tools, robotic surgery, personalized medicine, and data management solutions.","Analyze the main applications of AI in healthcare during 2024, focusing on areas such as diagnostics, patient care, drug discovery, medical imaging, and healthcare administration.","Investigate current industry trends related to AI in healthcare for 2024, including adoption rates, regulatory changes, ethical considerations, funding landscape, and market forecasts.","Synthesize the gathered information into a comprehensive summary covering the latest developments in AI for healthcare in 2024, highlighting key technologies, applications, and industry trends with examples and implications."]}
2025/09/08 11:47:47 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Artificial Intelligence in Healthcare: 2024 Year in Review","url":"https://www.researchgate.net/publication/389402322_Artificial_Intelligence_in_Healthcare_2024_Year_in_Review","summary":"The adoption of LLMs and text data types amongst various healthcare specialties, especially for education and administrative tasks, is unlocking new potential for AI applications in..."},{"title":"AI in Healthcare - Nature","url":"https://www.nature.com/collections/hacjaaeafj","summary":"\"AI in Healthcare\" encompasses the use of AI technologies to enhance various aspects of healthcare delivery, from diagnostics to treatment personalization, ultimately aiming to improve..."},{"title":"Evolution of artificial intelligence in healthcare: a 30-year ...","url":"https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2024.1505692/full","summary":"Conclusion: This study reveals a sustained explosive growth trend in AI technologies within the healthcare sector in recent years, with increasingly profound applications in medicine. Additionally, medical artificial intelligence research is dynamically evolving with the advent of new technologies."},{"title":"The Impact of Artificial Intelligence on Healthcare: A Comprehensive ...","url":"https://onlinelibrary.wiley.com/doi/full/10.1002/hsr2.70312","summary":"This review analyzes the impact of AI on healthcare using data from the Web of Science (2014-2024), focusing on keywords like AI, ML, and healthcare applications."},{"title":"Artificial intelligence in healthcare (Review) - PubMed","url":"https://pubmed.ncbi.nlm.nih.gov/39583770/","summary":"Furthermore, the barriers and constraints that may impede the use of AI in healthcare are outlined, and the potential future directions of AI-augmented healthcare systems are discussed."},{"title":"Full article: Towards new frontiers of healthcare systems research ...","url":"https://www.tandfonline.com/doi/full/10.1080/2047[... 1787 chars omitted ...]
2025/09/08 11:47:52 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Generative AI in healthcare: Current trends and future outlook","url":"https://www.mckinsey.com/industries/healthcare/our-insights/generative-ai-in-healthcare-current-trends-and-future-outlook","summary":"The latest survey, conducted in the fourth quarter of 2024, found that 85 percent of respondents—healthcare leaders from payers, health systems, and healthcare services and technology (HST) groups—were exploring or had already adopted gen AI capabilities."},{"title":"AI in Healthcare - statistics & facts | Statista","url":"https://www.statista.com/topics/10011/ai-in-healthcare/","summary":"Distribution of confidence in using a new technology and AI in healthcare among health professionals in Denmark, France, Germany, and the United Kingdom as of 2024"},{"title":"Medscape and HIMSS Release 2024 Report on AI Adoption in Healthcare","url":"https://www.prnewswire.com/news-releases/medscape-and-himss-release-2024-report-on-ai-adoption-in-healthcare-302324936.html","summary":"The full \"AI Adoption in Healthcare Report 2024\" is now available on both Medscape and HIMSS websites offering detailed analysis and insights into the current state of AI adoption..."},{"title":"AI in Healthcare Market Size, Share | Growth Report [2025-2032]","url":"https://www.fortunebusinessinsights.com/industry-reports/artificial-intelligence-in-healthcare-market-100534","summary":"The global AI in healthcare market research report delivers an in-depth market analysis, highlighting essential elements such as an overview of advanced technologies, the regulatory landscape in key countries, and the challenges encountered in adopting and implementing AI-based solutions."},{"title":"Artificial Intelligence in Healthcare Market Size to Hit USD 613.81 Bn ...","url":"https://www.precedenceresearch.com/industry-reports/artificial-intelligence-in-healthcare-market","summary":"The global artificial intelligence (AI) in healthcare market size reached USD 2[... 1994 chars omitted ...]
2025/09/08 11:47:58 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Artificial Intelligence in Healthcare: 2024 Year in Review","url":"https://www.researchgate.net/publication/389402322_Artificial_Intelligence_in_Healthcare_2024_Year_in_Review","summary":"The adoption of LLMs and text data types amongst various healthcare specialties, especially for education and administrative tasks, is unlocking new potential for AI applications in..."},{"title":"Trustworthy AI in Healthcare Insights from IQVIA 2024 Report","url":"https://aipressroom.com/trustworthy-ai-healthcare-insights-iqvia-2024/","summary":"Discover how AI is advancing healthcare with trusted frameworks, real-world impact, and strategies for ethical, scalable adoption."},{"title":"The Impact of Artificial Intelligence on Healthcare: A Comprehensive ...","url":"https://onlinelibrary.wiley.com/doi/full/10.1002/hsr2.70312","summary":"This review analyzes the impact of AI on healthcare using data from the Web of Science (2014-2024), focusing on keywords like AI, ML, and healthcare applications."},{"title":"Generative AI in Healthcare: 2024's Breakthroughs and What's Next for ...","url":"https://www.signifyresearch.net/insights/generative-ai-news-round-up-december-2024/","summary":"As 2024 draws to a close, generative AI in healthcare has achieved remarkable milestones. This year has been defined by both groundbreaking innovation and insightful exploration, with AI transforming workflows in medical imaging and elevating patient care across digital health solutions."},{"title":"Generative AI in healthcare: Current trends and future outlook","url":"https://www.mckinsey.com/industries/healthcare/our-insights/generative-ai-in-healthcare-current-trends-and-future-outlook","summary":"The latest survey, conducted in the fourth quarter of 2024, found that 85 percent of respondents—healthcare leaders from payers, health systems, and healthcare services and technology (HST) groups—were exploring or had already adopted gen AI c[... 1885 chars omitted ...]
2025/09/08 11:48:01 
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

These sources cover journals, market reports, reputable news, and expert thought leadership on 2024 AI innovations, applications, and trends in healthcare.
2025/09/08 11:48:15 
=== Agent:Replanner Output ===
{"steps":["Extract and compile the key technologies emerging or advancing in AI for healthcare in 2024, focusing on machine learning models, diagnostic tools, robotic surgery, personalized medicine, and data management solutions.","Analyze the main applications of AI in healthcare during 2024, concentrating on diagnostics, patient care, drug discovery, medical imaging, and healthcare administration.","Investigate current industry trends related to AI in healthcare for 2024, including adoption rates, regulatory changes, ethical considerations, funding landscape, and market forecasts.","Synthesize the gathered information into a comprehensive summary covering the latest developments in AI for healthcare in 2024, highlighting key technologies, applications, and industry trends with examples and implications."]}
2025/09/08 11:48:20 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Five Machine Learning Innovations Shaping Healthcare in 2024","url":"https://healthmanagement.org/c/artificial-intelligence/News/five-machine-learning-innovations-shaping-healthcare-in-2024","summary":"Discover 5 AI & ML trends transforming UK healthcare, from explainable AI to edge AI, enhancing patient care and operational efficiency."},{"title":"How AI is improving diagnostics and health outcomes","url":"https://www.weforum.org/stories/2024/09/ai-diagnostics-health-outcomes/","summary":"Effective and ethical AI solutions in diagnostics require collaboration. Artificial intelligence (AI) is transforming healthcare by improving diagnostic accuracy, enabling earlier disease detection and enhancing patient outcomes."},{"title":"The Impact of Artificial Intelligence on Healthcare: A Comprehensive ...","url":"https://onlinelibrary.wiley.com/doi/full/10.1002/hsr2.70312","summary":"The study aims to describe AI in healthcare, including important technologies like robotics, machine learning (ML), deep learning (DL), and natural language processing (NLP), and to investigate how these technologies are used in patient interaction, predictive analytics, and remote monitoring."},{"title":"Unveiling the potential of artificial intelligence in revolutionizing ...","url":"https://eurjmedres.biomedcentral.com/articles/10.1186/s40001-025-02680-7","summary":"The rapid advancement of Machine Learning (ML) and Deep Learning (DL) technologies has revolutionized healthcare, particularly in the domains of disease prediction and diagnosis."},{"title":"Trends in AI for Disease and Diagnostic Prediction: A Healthcare ...","url":"https://link.springer.com/chapter/10.1007/978-3-031-84404-1_5","summary":"This chapter explores the transformative impact of artificial intelligence (AI) on the healthcare system, particularly in enhancing the accuracy, efficiency, and speed of disease diagnostics. A key advantage of AI integration in [... 2328 chars omitted ...]
2025/09/08 11:48:28 
=== Agent:Executor Output ===
Key technologies emerging or advancing in AI for healthcare in 2024 include:

1. Machine Learning Models:
- Advanced ML and DL technologies revolutionize disease prediction, diagnostic accuracy, and patient outcomes.
- Explainable AI improves transparency and trust in clinical decision-making.
- Edge AI enables real-time processing at facilities for faster diagnostics.

2. Diagnostic Tools:
- AI-enabled systems enhance speed, accuracy, and early disease detection.
- AI in medical imaging improves abnormality detection and tailored plans.
- NLP analysis of records and literature supports predictive analytics.

3. Robotic Surgery:
- AI-equipped medical robots increase precision and reduce invasiveness.
- Real-time guidance and adaptive control improve safety and effectiveness.

4. Personalized Medicine:
- AI analyzes patient data to recommend customized treatments.
- Predictive analytics identify risk factors and responses.
- Genomics and biomarker analysis accelerate personalized drugs.

5. Data Management Solutions:
- AI platforms integrate and analyze large heterogeneous healthcare data.
- Remote monitoring and predictive analytics optimize care and operations.
- Secure, compliant solutions address privacy and ethics.
2025/09/08 11:48:33 
=== Agent:Replanner Output ===
{"steps":["Analyze the main applications of AI in healthcare during 2024, concentrating on diagnostics, patient care, drug discovery, medical imaging, and healthcare administration.","Investigate current industry trends related to AI in healthcare for 2024, including adoption rates, regulatory changes, ethical considerations, funding landscape, and market forecasts.","Synthesize the gathered information into a comprehensive summary covering the latest developments in AI for healthcare in 2024, highlighting key technologies, applications, and industry trends with examples and implications."]}
2025/09/08 11:48:39 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"How AI is improving diagnostics and health outcomes","url":"https://www.weforum.org/stories/2024/09/ai-diagnostics-health-outcomes/","summary":"By leveraging the power of AI for diagnostics, we can improve health outcomes and contribute to a future where healthcare is more accessible and effective for everyone, particularly in the communities that need it the most."},{"title":"14 Top Use Cases for AI in Healthcare in 2024","url":"https://www.cake.ai/blog/top-ai-healthcare-use-cases","summary":"We will explore the 14 top use cases for AI in healthcare, demonstrating how these technologies are improving patient outcomes and streamlining operations from the front desk to the operating room."},{"title":"Artificial Intelligence (AI) Applications in Drug Discovery and Drug ...","url":"https://pubmed.ncbi.nlm.nih.gov/39458657/","summary":"In this review article, we will present a comprehensive overview of AI's applications in the pharmaceutical industry, covering areas such as drug discovery, target optimization, personalized medicine, drug safety, and more."},{"title":"Top 10 AI in Healthcare Applications 2025 | Diagnosis to Patient Care","url":"https://www.guvi.in/blog/ai-in-healthcare-applications/","summary":"Unravel the top 10 AI in healthcare applications transforming 2025, from diagnosis accuracy to patient care, drug discovery, monitoring, and cost reduction."},{"title":"AI in Healthcare: Enhancing Patient Care and Diagnosis","url":"https://www.park.edu/blog/ai-in-healthcare-enhancing-patient-care-and-diagnosis/","summary":"Below, we delve into the various applications of AI in healthcare and examine how it enhances patient care and diagnosis — along with the challenges and opportunities that lie ahead."},{"title":"Generative Artificial Intelligence in Healthcare: Applications ...","url":"https://www.mdpi.com/2673-7426/5/3/37","summary":"These generative AI models have shown widespread applications in[... 1990 chars omitted ...]
2025/09/08 11:48:46 
=== Agent:Executor Output ===
In 2024, AI applications in healthcare advance across these areas:

1. Diagnostics:
- Faster, more accurate, cost-effective detection and planning
- ML and generative AI improve early detection and outcomes
- Imaging and record analysis for precise diagnostics
- Real-world gains in accessibility and effectiveness

2. Patient Care:
- Personalized care via predictive analytics, remote monitoring, data integration
- Generative AI aids documentation and communication
- Tools for chronic disease management and decision support

3. Drug Discovery:
- Accelerated target optimization, safety assessment, personalized medicine
- Generative AI and ML identify candidates and predict responses
- Reduced costs and timelines

4. Medical Imaging:
- Better abnormality identification and customized plans
- DL models interpret complex data with high precision
- Earlier detection and more effective interventions

5. Administration:
- Streamlined scheduling, resource allocation, billing
- Predictive analytics optimize workflows and patient flow
- Improved efficiency, reduced administrative burden
2025/09/08 11:48:49 
=== Agent:Replanner Output ===
{"steps":["Investigate current industry trends related to AI in healthcare for 2024, including adoption rates, regulatory changes, ethical considerations, funding landscape, and market forecasts.","Synthesize the gathered information into a comprehensive summary covering the latest developments in AI for healthcare in 2024, highlighting key technologies, applications, and industry trends with examples and implications."]}
2025/09/08 11:48:55 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Ethical and legal considerations in healthcare AI: innovation and ...","url":"https://royalsocietypublishing.org/doi/10.1098/rsos.241873","summary":"Artificial intelligence (AI) is transforming healthcare by enhancing diagnostics, personalizing medicine and improving surgical precision. However, its integration into healthcare systems raises significant ethical and legal challenges."},{"title":"Ethical Considerations in AI-Enabled Healthcare","url":"https://link.springer.com/chapter/10.1007/978-3-031-80813-5_18","summary":"Integrating Artificial Intelligence (AI) in healthcare has revolutionized patient care and operational workflows, yet it introduces significant ethical considerations. This chapter explores the impact of AI on key ethical principles—beneficence, nonmaleficence, autonomy, and justice."},{"title":"Ethical implications of AI-driven clinical decision support systems on ...","url":"https://bmcmedethics.biomedcentral.com/articles/10.1186/s12910-024-01151-8","summary":"Artificial intelligence-driven Clinical Decision Support Systems (AI-CDSS) are increasingly being integrated into healthcare for various purposes, including resource allocation. While these systems promise improved efficiency and decision-making, they also raise significant ethical concerns."},{"title":"Ethical debates amidst flawed healthcare artificial intelligence ...","url":"https://www.nature.com/articles/s41746-024-01242-1","summary":"Healthcare AI faces an ethical dilemma between selective and equitable deployment, exacerbated by flawed performance metrics. These metrics inadequately capture real-world complexities and..."},{"title":"Ethical Implications in AI-Based Health Care Decision Making: A ...","url":"https://liebertpub.com/doi/abs/10.1089/aipo.2024.0007","summary":"This critical analysis explores the ethical implications of AI-based health care decision making, examining the existing literature, methodological [... 2096 chars omitted ...]
2025/09/08 11:49:01 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Medscape and HIMSS Release 2024 Report on AI Adoption in Healthcare","url":"https://www.prnewswire.com/news-releases/medscape-and-himss-release-2024-report-on-ai-adoption-in-healthcare-302324936.html","summary":"The full \"AI Adoption in Healthcare Report 2024\" is now available on both Medscape and HIMSS websites offering detailed analysis and insights into the current state of AI adoption..."},{"title":"AI in Healthcare Statistics 2025: Overview of Trends","url":"https://docus.ai/blog/ai-healthcare-statistics","summary":"As we step into 2025, let's see how AI in healthcare statistics from 2024 are shaping trends in patient care, diagnostics, and innovation."},{"title":"AI in healthcare - statistics & facts | Statista","url":"https://www.statista.com/topics/10011/ai-in-healthcare/","summary":"Distribution of confidence in using a new technology and AI in healthcare among health professionals in Denmark, France, Germany, and the United Kingdom as of 2024"},{"title":"AI In Healthcare Stats 2025: Adoption, Accuracy & Market","url":"https://www.demandsage.com/ai-in-healthcare-stats/","summary":"Get insights into AI in healthcare stats, including adoption rate, performance accuracy, and the rapidly growing market valuation."},{"title":"HIMSS and Medscape Unveil Groundbreaking Report on AI Adoption at ...","url":"https://gkc.himss.org/news/himss-and-medscape-unveil-groundbreaking-report-ai-adoption-health-systems","summary":"The findings, highlighted in the Medscape & HIMSS AI Adoption by Health Systems Report 2024, reveal that 86% of respondents already leverage AI in their medical organizations, with 60% recognizing its ability to uncover health patterns and diagnoses beyond human detection."},{"title":"Adoption of artificial intelligence in healthcare: survey of health ...","url":"https://academic.oup.com/jamia/article/32/7/1093/8125015","summary":"To evaluate the current state of AI adoption in US health[... 1817 chars omitted ...]
2025/09/08 11:49:04 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"AI in Healthcare: Funding Resurgence for Biotech Startups in 2024","url":"https://techainews.digital/2024/12/12/ai-in-healthcare-funding-resurgence-for-biotech-startups-in-2024/","summary":"In summary, the funding landscape for AI-driven biotech and healthcare startups in 2024 is showing a marked revival after a challenging previous year. With an influx of capital reflecting strong investor interest, companies harnessing AI to revolutionize drug discovery and enhance healthcare processes are at the forefront of this resurgence."},{"title":"AI Healthcare Startups: Investment & Funding Trends","url":"https://www.delveinsight.com/blog/ai-healthcare-startups-funding-trends","summary":"Discover how AI healthcare startups are attracting billions in funding and reshaping the future of healthcare and pharma."},{"title":"How healthcare AI led a 'paradigm shift' in a $23B year for startups","url":"https://carta.com/data/industry-spotlight-healthcare-2024/","summary":"The rate of all new healthcare investments in which valuations were lower than that of the previous round declined slightly over the course of 2024, settling at 19% in the final quarter of the year. Still, down rounds remain a persistent aspect of the healthcare fundraising landscape."},{"title":"AI-Healthcare Startups Surge with Record Funding: A Look at 2025's ...","url":"https://opentools.ai/news/ai-healthcare-startups-surge-with-record-funding-a-look-at-2025s-promising-landscape","summary":"Notably, the landscape of AI-healthcare startup funding has demonstrated robust growth, amounting to $7.5 billion worldwide in 2024, with an additional $1.68 billion earmarked for early 2025."},{"title":"The State of the Funding Market for AI Companies: A 2024 - 2025 Outlook","url":"https://www.mintz.com/insights-center/viewpoints/2166/2025-03-10-state-funding-market-ai-companies-2024-2025-outlook","summary":"In 2024, these AI-driven companies captured a subs[... 2214 chars omitted ...]
2025/09/08 11:49:05 
=== Agent:Executor Output ===
{"message":"Found 10 results successfully.","results":[{"title":"Artificial Intelligence in Healthcare Market Size to Hit USD 613.81 Bn ...","url":"https://www.precedenceresearch.com/artificial-intelligence-in-healthcare-market","summary":"The global artificial intelligence (AI) in healthcare market size reached USD 26.69 billion in 2024 and is projected to hit around USD 613.81 billion by 2034, at a CAGR of 36.83%."},{"title":"AI in Healthcare Market Size, Share | Growth Report [2025-2032]","url":"https://www.fortunebusinessinsights.com/industry-reports/artificial-intelligence-in-healthcare-market-100534","summary":"The global AI in healthcare market size was valued at $29.01 billion in 2024 & is projected to grow from $39.25 billion in 2025 to $504.17 billion by 2032"},{"title":"AI in Healthcare Statistics 2025: Overview of Trends","url":"https://docus.ai/blog/ai-healthcare-statistics","summary":"As we step into 2025, let's see how AI in healthcare statistics from 2024 are shaping trends in patient care, diagnostics, and innovation."},{"title":"Artificial Intelligence (AI) in Healthcare Market Size to","url":"https://www.globenewswire.com/news-release/2025/04/02/3054390/0/en/Artificial-Intelligence-AI-in-Healthcare-Market-Size-to-Hit-USD-613-81-Bn-by-2034.html","summary":"Ottawa, April 02, 2025 (GLOBE NEWSWIRE) -- According to Precedence Research, the artificial intelligence (AI) in healthcare market size was valued at USD 26.69 billion in 2024, calculated..."},{"title":"19+ AI in Healthcare Statistics for 2024: Insights & Projections","url":"https://www.allaboutai.com/resources/ai-statistics/healthcare/","summary":"Discover 19+ AI in healthcare statistics for 2024, covering public perception, market trends, and revenue projections with expert insights."},{"title":"AI in Healthcare Market Leads 37.66% Healthy CAGR by 2034","url":"https://www.towardshealthcare.com/insights/ai-in-healthcare-market","summary":"According to market projections, the AI in healthcare sec[... 1819 chars omitted ...]
```

## Summary

Plan-Execute Agent builds a closed-loop workflow of "plan–execute–reflect" to decompose complex tasks into executable steps, combine tool calling and dynamic adjustment, and improve reliability and efficiency.

- Structured task decomposition: reduces cognitive load for complex problems
- Tool integration: seamlessly connect external tools (search, compute, DB, etc.)
- Dynamic adaptability: adjust strategy based on feedback to handle uncertainty

With `PlanExecuteAgent` provided by Eino ADK, developers can quickly build agents that handle complex tasks for research analysis, office automation, customer service, and more.

## FAQ

### Error [NodeRunError] no tool call

Planner/Replanner must generate the plan via tool calling. Check:

1. The model supports forced tool calling (e.g., OpenAI `tool_choice="required"`)
2. The eino-ext wrapper is up to date (older SDKs may not support forced tool calling)

### Error [NodeRunError] unexpected tool call

ChatModel registered for Replanner should not carry extra tools via `WithTools`. Clear any extra tools if present.

### Error [NodeRunError] unmarshal plan error

Planner/Replanner config uses both PlanTool and NewPlan to generate the plan:

- PlanTool describes the Plan to the model
- NewPlan builds the plan struct used to unmarshal the model's JSON output

If this error occurs, ensure PlanTool's field descriptions match the struct returned by NewPlan, then rerun.
