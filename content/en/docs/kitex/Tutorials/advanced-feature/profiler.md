---
title: "Request Profiler"
date: 2022-11-07
weight: 9
keywords: ["Kitex", "Profiler"]
description: Kitex Profiler provides request-level runtime cost statistic capability.
---

Note: There is additional performance overhead when enable profiler module, overhead cause by: background continuous pprof, and the processing functions written by users.

## How it works

Go provides the [SetGoroutineLabels](https://pkg.go.dev/runtime/pprof#SetGoroutineLabels) API that can set labels for a Goroutine, and all other Goroutines started in this Goroutine will inherit the labels.

The Go Pprof sampler will sample and count the currently running function stack every 10ms, and summarize the cost times of Goroutine Labels including each stack. We can analyze this result, group by labels and finally get the runtime cost of different request tags.

Kitex will create or reuse a Goroutine for each request, so as long as the labels are set for Goroutine at the beginning of the request process, the costs of business logic can be calculated on the labels.

## Usage

### Write Tagging functions

We need to "color" the Goroutine and subsequent Goroutines according to Kitex request parameters.

The process of a request has two stages:

- Transport Stage: The stage where Kitex receives a complete binary packet. If it is the [TTHeader](/docs/kitex/reference/transport_protocol_ttheader/) protocol, we can quickly parse metadata information from the header without deserialization.
- Message Stage: The stage where Kitex deserializes the binary packet into a Request struct. The deserialization part tends to account for a large part of the overall overhead if the structure of the request is complex.

In our microservice governance practice, we recommend putting general information such as the source service name in the TTHeader, so that the Goroutine labels can be marked in advance without fully deserializing the request.

- If you need to collect tags from the transport layer, use: `server.WithProfilerTransInfoTagging`.
- If you need to collect tags from the message layer, use: `server.WithProfilerMessageTagging`.

Example:

```go
// example kitex_gen
type Request struct {
	Message     string          `thrift:"Message,1,required" json:"Message"`
	Type        int32           `thrift:"Type,2,required" json:"Type"`
}

// tagging logic
var msgTagging remote.MessageTagging = func(ctx context.Context, msg remote.Message) (context.Context, []string) {
	if data := msg.Data(); data == nil {
		return ctx, nil
	}
	var tags = make([]string, 0, 2)
	var reqType int32
	if args, ok := msg.Data().(ArgsGetter); ok {
		if req := args.GetReq(); req != nil {
			reqType = req.Type
			tags = append(tags, "req_type", strconv.Itoa(reqType))
		}
	}
	// if you don't need to get the tags in other middlewares, no need to change ctx
	return context.WithValue(ctx, "ctxKeyReqType", reqType), []string{"req_type", strconv.Itoa(reqType)}
}

// register tagging function
svr := xxxserver.NewServer(server.WithProfilerMessageTagging(msgTagging))
```

### Write Processor functions

Kitex will periodically run callback functions with statistical results. If we have a metric system, we can upload results in the processor function.

For example, if we want to log the results:

```go
func LogProcessor(profiles []*profiler.TagsProfile) error {
	if len(profiles) == 0 {
		return nil
	}
	klog.Infof("KITEX: profiler collect %d records", len(profiles))
	for _, p := range profiles {
		klog.Infof("KITEX: profiler - %s %.2f%% %d", p.Key, p.Percent*100, p.Value)
	}
	klog.Info("---------------------------------")
	return nil
}
```

### Setup profiler

We can configure two settings for the profiler:

- **interval**: how many times should wait for a sample. If it is 0, it means cyclic sampling. If sampling takes up too much CPU, you can increase this setting to reduce sampling accuracy and costs.
- **window**: how long a sample should last. The longer the time, the more statistical data in a window, and the larger paused time when results aggregation calculation is performed. It is generally recommended that 10s-60s is the best.

```go
interval, window := time.Duration(0), 30*time.Second
pc := profiler.NewProfiler(LogProcessor, interval, window)
svr := xxxserver.NewServer(
	new(ServerImpl),
	server.WithProfilerMessageTagging(msgTagging),
	server.WithProfiler(pc),
)
```
