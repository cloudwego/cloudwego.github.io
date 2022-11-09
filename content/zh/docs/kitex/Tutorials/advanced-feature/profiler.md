---
title: "Profiler"
date: 2022-11-07
weight: 4
description: >
---

Kitex Profiler 模块提供了请求级别的运行时开销统计能力。


## 工作原理

Go 提供了 [SetGoroutineLabels](https://pkg.go.dev/runtime/pprof#SetGoroutineLabels) API 可以做到给一个 Goroutine 设置好 labels，这个 Goroutine 内启动的所有其他 Goroutine 都会继承这个 labels。

Go Pprof 采样程序会每 10ms 进行一次当前正在运行的函数 Stack 采样计数，最后汇总出包含了每个 Stack 的 Goroutine Labels 的统计结果。我们可以分析这份结果，将之前设置的 labels 作为 tags 再进行聚合统计，最后得出不同 tags 组合分别占用的程序运行时开销。

Kitex 会对每一个请求都开启或重用一个 Goroutine，所以只要在请求开始的时候为 Goroutine 设置好 labels，后续业务逻辑同步异步的开销都能够被计算在该 labels 上。

## 使用方法

### 编写请求 Tags 抽取函数

我们需要根据 Kitex Server 接受到的请求参数，对当前 Goroutine 以及后续的 Goroutine 进行“染色”。

Kitex 处理请求分为两个阶段：

- 传输层：Kitex 收到了一个完整的二进制数据包的阶段。如果是 [TTHeader](https://www.cloudwego.io/docs/kitex/reference/transport_protocol_ttheader/) 协议，在二进制包中，我们就能快速解析出一些 metadata 信息，而无需反序列化。
- 消息层：Kitex 将二进制反序列化为一个 Request 结构体的阶段。当结构体比较复杂时，反序列化部分对服务总体开销占比往往会比较大。

在我们的微服务治理实践里，我们推荐把来源服务名这类通用信息放在 TTHeader 中，这样不需要完全反序列化请求便可以提前进行 Goroutine 的 labels 打点。

- 如果需要从传输层采集 tags，则使用：`WithProfilerTransInfoTagging`。
- 如果需要从消息层采集 tags，则使用：`WithProfilerMessageTagging`。

使用示例：

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
	// if you don't need to get the tags after middleware, not need to change ctx
	return context.WithValue(ctx, "ctxKeyReqType", reqType), []string{"req_type", strconv.Itoa(reqType)}
}

// register tagging function
svr := xxxserver.NewServer(WithProfilerMessageTagging(msgTagging))
```

### 编写数据处理回调函数

Kitex 会定期将聚合后的统计结果传入到提前设置好的回调函数内执行，我们可以在这个回调函数中实现统计上报功能。这里以简单的日志打印作为示范：

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

### 设置 Profiler

我们可以为 profiler 配置两个参数：

- **interval**: 多少时间采一次样，为 0 则表示循环采样。如果采样占用 CPU 过高，可以增大该参数以降低采样精度，提高性能。
- **window**: 一次采样持续多少时间，时间越长，一个窗口内统计数据会越多，进行数据聚合计算时，采样停顿也会更大。一般建议 10s-60s 最佳。

```go
interval, window := time.Duration(0), 30*time.Second
pc := profiler.NewProfiler(LogProcessor, interval, window)
svr := xxxserver.NewServer(
	new(ServerImpl),
	server.WithProfilerMessageTagging(msgTagging),
	server.WithProfiler(pc),
)
```

