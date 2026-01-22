---
Description: ""
date: "2026-01-22"
lastmod: ""
tags: []
title: AgenticModel - ARK
weight: 0
---

A Volcengine Ark model implementation based on [Eino](https://github.com/cloudwego/eino), implementing the `AgenticModel` component interface. This enables the model to seamlessly integrate into Eino's Agent capabilities, providing enhanced natural language processing and generation features.

## Features

- Implements the `github.com/cloudwego/eino/components/model.AgenticModel` interface
- Easy integration into Eino's agent system
- Configurable model parameters
- Supports Responses API
- Supports streaming responses
- Supports tool calling, including Function Tools, MCP Tools, and Server Tools
- Supports Prefix Cache and Session Cache

## Installation

```bash
go get github.com/cloudwego/eino-ext/components/model/agenticark@latest
```

## Quick Start

Here is a quick example of how to use `AgenticModel`:

```go
package main

import (
        "context"
        "log"
        "os"

        "github.com/bytedance/sonic"
        "github.com/cloudwego/eino-ext/components/model/agenticark"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        am, err := agenticark.New(ctx, &agenticark.Config{
                Model:  os.Getenv("ARK_MODEL_ID"),
                APIKey: os.Getenv("ARK_API_KEY"),
        })
        if err != nil {
                log.Fatalf("failed to create agentic model, err: %v", err)
        }

        input := []*schema.AgenticMessage{
                schema.UserAgenticMessage("what is the weather like in Beijing"),
        }

        msg, err := am.Generate(ctx, input)
        if err != nil {
                log.Fatalf("failed to generate, err: %v", err)
        }

        meta := msg.ResponseMeta.Extension.(*agenticark.ResponseMetaExtension)

        log.Printf("request_id: %s
", meta.ID)
        respBody, _ := sonic.MarshalIndent(msg, "  ", "  ")
        log.Printf("  body: %s
", string(respBody))
}
```

## Configuration

The `AgenticModel` can be configured using the `agenticark.Config` struct:

```go
type Config struct {
    // Timeout specifies the maximum duration to wait for API responses
    // If HTTPClient is set, Timeout will not be used.
    // Optional. Default: 10 minutes
    Timeout *time.Duration
    
    // HTTPClient specifies the client used to send HTTP requests.
    // If HTTPClient is set, Timeout will not be used.
    // Optional. Default: &http.Client{Timeout: Timeout}
    HTTPClient *http.Client
    
    // RetryTimes specifies the number of retries for failed API calls
    // Optional. Default: 2
    RetryTimes *int
    
    // BaseURL specifies the base URL for the Ark service
    // Optional. Default: "https://agenticark.cn-beijing.volces.com/api/v3"
    BaseURL string 
    
    // Region specifies the region where the Ark service is located
    // Optional. Default: "cn-beijing"
    Region string
    
    // The following three fields are related to authentication - either APIKey or AccessKey/SecretKey pair is required
    // For details on authentication, see: https://www.volcengine.com/docs/82379/1298459
    // If both are provided, APIKey takes precedence
    APIKey string 
    
    AccessKey string 
    
    SecretKey string 
    
    // The following fields correspond to Ark's responses API parameters
    // Reference: https://www.volcengine.com/docs/82379/1298454
    
    // Model specifies the endpoint ID on the ark platform
    // Required
    Model string 
    
    // MaxTokens specifies the maximum number of tokens to generate in the response.
    // Optional.
        MaxTokens *int
    
    // Temperature specifies the sampling temperature to use
    // It is generally recommended to modify this or TopP, but not both
    // Range: 0.0 to 1.0. Higher values make output more random
    // Optional. Default: 1.0
    Temperature *float64
    
    // TopP controls diversity via nucleus sampling
    // It is generally recommended to modify this or Temperature, but not both
    // Range: 0.0 to 1.0. Lower values make output more focused
    // Optional. Default: 0.7
    TopP *float64
    
    // Stop sequences where the API will stop generating more tokens
    // Optional. Example: []string{"
", "User:"}
    Stop []string
    
    // FrequencyPenalty penalizes tokens based on frequency to prevent repetition
    // Range: -2.0 to 2.0. Positive values reduce likelihood of repetition
    // Optional. Default: 0
    FrequencyPenalty *float64 
    
    // LogitBias modifies the likelihood of specific tokens appearing in completions
    // Optional. Maps token IDs to bias values from -100 to 100
    LogitBias map[string]int32
    
    // PresencePenalty penalizes tokens based on presence to prevent repetition
    // Range: -2.0 to 2.0. Positive values increase likelihood of new topics
    // Optional. Default: 0
    PresencePenalty *float64
        
    // LogProbs specifies whether to return log probabilities of output tokens.
    LogProbs *bool
    
    // TopLogProbs specifies the number of most likely tokens to return at each token position, each with an associated log probability.
    TopLogProbs *int 
    
    // RepetitionPenalty penalizes tokens based on their existing frequency in the text so far.
    // Range: 0.0 to 2.0. 1.0 means no penalty.
    RepetitionPenalty *float64

    // Thinking controls whether the model is set to activate deep thinking mode.
    // Enabled by default.
    Thinking *responses.ResponsesThinking

    // Reasoning specifies the reasoning effort of the model.
    // Optional.

    // EnablePassBackReasoning controls whether the model passes back reasoning items in the next request.
    // Note that doubao 1.6 does not support passing back reasoning items.
    // Optional. Default: true
    EnablePassBackReasoning *bool

    // MaxToolCalls limits the maximum number of tool calls generated in chat completions.
    // Optional.
    MaxToolCalls *int64

    // ParallelToolCalls controls whether the model is set to perform parallel tool calls.
    // Optional.
    ParallelToolCalls *bool

    // ServerTools specifies the server-side tools available to the model.
    // Optional.
    ServerTools []*ServerToolConfig

    // MCPTools specifies the MCP tools available to the model.
    // Optional.
    MCPTools []*responses.ToolMcp

    // Cache specifies the cache configuration for the model.
    // Optional.
    Cache *CacheConfig

    // CustomHeader HTTP headers passed when requesting the model
    CustomHeader map[string]string 
}
```

## Advanced Usage

### Tool Calling

`AgenticModel` supports tool calling, including function tools, MCP tools, and server tools.

#### Function Tool Example

```go
package main

import (
        "context"
        "errors"
        "io"
        "log"
        "os"

        "github.com/bytedance/sonic"
        "github.com/cloudwego/eino-ext/components/model/agenticark"
        "github.com/cloudwego/eino/components/model"
        "github.com/cloudwego/eino/schema"
        "github.com/eino-contrib/jsonschema"
        "github.com/volcengine/volcengine-go-sdk/service/arkruntime/model/responses"
        "github.com/wk8/go-ordered-map/v2"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        am, err := agenticark.New(ctx, &agenticark.Config{
                Model:  os.Getenv("ARK_MODEL_ID"),
                APIKey: os.Getenv("ARK_API_KEY"),
                Thinking: &responses.ResponsesThinking{
                        Type: responses.ThinkingType_disabled.Enum(),
                },
        })
        if err != nil {
                log.Fatalf("failed to create agentic model, err=%v", err)
        }

        functionTools := []*schema.ToolInfo{
                {
                        Name: "get_weather",
                        Desc: "get the weather in a city",
                        ParamsOneOf: schema.NewParamsOneOfByJSONSchema(&jsonschema.Schema{
                                Type: "object",
                                Properties: orderedmap.New[string, *jsonschema.Schema](
                                        orderedmap.WithInitialData(
                                                orderedmap.Pair[string, *jsonschema.Schema]{
                                                        Key: "city",
                                                        Value: &jsonschema.Schema{
                                                                Type:        "string",
                                                                Description: "the city to get the weather",
                                                        },
                                                },
                                        ),
                                ),
                                Required: []string{"city"},
                        }),
                },
        }

        allowedTools := []*schema.AllowedTool{
                {
                        FunctionName: "get_weather",
                },
        }

        opts := []model.Option{
                model.WithAgenticToolChoice(&schema.AgenticToolChoice{
                        Type: schema.ToolChoiceForced,
                        Forced: &schema.AgenticForcedToolChoice{
                                Tools: allowedTools,
                        },
                }),
                model.WithTools(functionTools),
        }

        firstInput := []*schema.AgenticMessage{
                schema.UserAgenticMessage("what's the weather like in Beijing today"),
        }

        sResp, err := am.Stream(ctx, firstInput, opts...)
        if err != nil {
                log.Fatalf("failed to stream, err: %v", err)
        }

        var msgs []*schema.AgenticMessage
        for {
                msg, err := sResp.Recv()
                if err != nil {
                        if errors.Is(err, io.EOF) {
                                break
                        }
                        log.Fatalf("failed to receive stream response, err: %v", err)
                }
                msgs = append(msgs, msg)
        }

        concatenated, err := schema.ConcatAgenticMessages(msgs)
        if err != nil {
                log.Fatalf("failed to concat agentic messages, err: %v", err)
        }

        lastBlock := concatenated.ContentBlocks[len(concatenated.ContentBlocks)-1]
        
        toolCall := lastBlock.FunctionToolCall
        toolResultMsg := schema.FunctionToolResultAgenticMessage(toolCall.CallID, toolCall.Name, "20 degrees")

        secondInput := append(firstInput, concatenated, toolResultMsg)

        gResp, err := am.Generate(ctx, secondInput)
        if err != nil {
                log.Fatalf("failed to generate, err: %v", err)
        }

        meta := concatenated.ResponseMeta.Extension.(*agenticark.ResponseMetaExtension)
        log.Printf("request_id: %s
", meta.ID)

        respBody, _ := sonic.MarshalIndent(gResp, "  ", "  ")
        log.Printf("  body: %s
", string(respBody))
}
```

#### Server Tool Example

```go
package main

import (
        "context"
        "errors"
        "io"
        "log"
        "os"

        "github.com/bytedance/sonic"
        "github.com/cloudwego/eino-ext/components/model/agenticark"
        "github.com/cloudwego/eino/components/model"
        "github.com/cloudwego/eino/schema"
        "github.com/volcengine/volcengine-go-sdk/service/arkruntime/model/responses"
)

func main() {
        ctx := context.Background()

        // Get ARK_API_KEY and ARK_MODEL_ID: https://www.volcengine.com/docs/82379/1399008
        am, err := agenticark.New(ctx, &agenticark.Config{
                Model:  os.Getenv("ARK_MODEL_ID"),
                APIKey: os.Getenv("ARK_API_KEY"),
        })
        if err != nil {
                log.Fatalf("failed to create agentic model, err=%v", err)
        }

        serverTools := []*agenticark.ServerToolConfig{
                {
                        WebSearch: &responses.ToolWebSearch{
                                Type: responses.ToolType_web_search,
                        },
                },
        }

        allowedTools := []*schema.AllowedTool{
                {
                        ServerTool: &schema.AllowedServerTool{
                                Name: string(agenticark.ServerToolNameWebSearch),
                        },
                },
        }

        opts := []model.Option{
                agenticark.WithServerTools(serverTools),
                model.WithAgenticToolChoice(&schema.AgenticToolChoice{
                        Type: schema.ToolChoiceForced,
                        Forced: &schema.AgenticForcedToolChoice{
                                Tools: allowedTools,
                        },
                }),
                agenticark.WithThinking(&responses.ResponsesThinking{
                        Type: responses.ThinkingType_disabled.Enum(),
                }),
        }

        input := []*schema.AgenticMessage{
                schema.UserAgenticMessage("what's the weather like in Beijing today"),
        }

        resp, err := am.Stream(ctx, input, opts...)
        if err != nil {
                log.Fatalf("failed to stream, err: %v", err)
        }

        var msgs []*schema.AgenticMessage
        for {
                msg, err := resp.Recv()
                if err != nil {
                        if errors.Is(err, io.EOF) {
                                break
                        }
                        log.Fatalf("failed to receive stream response, err: %v", err)
                }
                msgs = append(msgs, msg)
        }

        concatenated, err := schema.ConcatAgenticMessages(msgs)
        if err != nil {
                log.Fatalf("failed to concat agentic messages, err: %v", err)
        }

        meta := concatenated.ResponseMeta.Extension.(*agenticark.ResponseMetaExtension)
        for _, block := range concatenated.ContentBlocks {
                if block.ServerToolCall == nil {
                        continue
                }

                serverToolArgs := block.ServerToolCall.Arguments.(*agenticark.ServerToolCallArguments)

                args, _ := sonic.MarshalIndent(serverToolArgs, "  ", "  ")
                log.Printf("server_tool_args: %s
", string(args))
        }

        log.Printf("request_id: %s
", meta.ID)
        respBody, _ := sonic.MarshalIndent(concatenated, "  ", "  ")
        log.Printf("  body: %s
", string(respBody))
}
```

For more examples, please refer to the `examples` directory.
