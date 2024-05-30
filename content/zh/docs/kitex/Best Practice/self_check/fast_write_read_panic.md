---
title: "FastWrite/FastRead 报错 Panic"
linkTitle: "FastWrite/FastRead 报错 Panic"
weight: 3
date: 2024-02-18
description: "与 FastCodec（含 FastThrift、FastPB）有关的一些常见错误及解决方案"
---

## FastWrite

FastWrite 的实现是：(1) 扫描对象计算所需内存；(2) 分配内存；(3) 完成序列化。由于该方案不需要 append slice，减少了内存分配、拷贝，大幅提高了性能。

但是如果**用户代码有并发** **Bug**，在 Kitex「1-计算所需内存」和「3-序列化」之间，有另一个 `goroutine` 并发写入被序列化的对象（Client端-请求参数，Server端-返回值），可能会导致 Kitex 读到异常的对象，从而报错甚至 panic。

**注意**：

1. 虽然直接发生错误的位置是 Kitex 生成的 `FastWriteField` 方法，但导致产生错误数据的地方是用户代码，这是典型的并发现象；
2. **此类问题是用户代码的并发 Bug（不是 Kitex 的 Bug）**，FastWrite 只是让这类问题更容易暴露；
3. 典型情况是 Request/Response 对象中引用的某一个字段被复用，详见下文「case 分析」章节；
4. 特别地，没报错或没 panic 并不意味着没有并发问题，实际**可能已构造了异常数据，并传递给了上下游**。

### 典型现象

可能出现以下几种不同的报错信息：

- `runtime error: index out of range [3] with length 3`
- `runtime error: slice bounds out of range [86:59]`
- `runtime error: invalid memory address or nil pointer dereference`

### Case 分析

#### Client Panic

典型情况是 Request 内引用的某个字段是全局变量（或被缓存的对象），而该对象可能被并发写入。

报错信息简化如下：

```go
KITEX: panic, ..., error=runtime error: invalid memory address or nil pointer dereference
panic(...):
github.com/cloudwego/kitex/pkg/protocol/bthrift.binaryProcotol.WriteBinaryNocopy(...)
git/to/project/kitex_gen/some_package.(*SomeType).fastWriteField2(...)
```

其 panic 的 stack 中有 `fastWriteField2`，是典型的业务并发读写 case，其业务代码可简化为：

```go
key := "default" // reflect.StringHeader{Data=0xXXX, Len=7}
fallbackKey = "" // reflect.StringHeader{Data=nil, Len=0}
wg := sync.WaitGroup{}
for _, task := range taskList {
    wg.Add(1)
    go func() {
        defer wg.Done()
        if someCondition {
            key = fallbackKey // `key` may be read by another goroutine
        }
        kitexClient.GetByKey(ctx, &Request{Key: key})
    }()
}
wg.Wait()
```

**分析：**

1. `string` 类型变量 key **在循环中可能被不同的 `goroutine` 读/写**。
2. **`string` 的读写不是并发安全的**：在 Go Runtime 的实现是 `reflect.StringHeader{Data uintptr, Len int}`，有两个字段需要分别赋值。
3. Kitex `FastWrite` 可能会读到被「写了一半的 `string`」（Data = nil, Len = 7）并传给 `fastWriteField2` 方法
4. `fastWriteField2` 在尝试从 `Data = nil` 中读取 7 个字符时，会触发 `nil pointer dereference` panic。

**注意：**

1. slice 对应 `reflect.SliceHeader` 包含 `Data`、`Len`、`Cap` 3个字段，也存在类似问题；
2. map 的并发读写更到表现为 go 的 `fatal error`；
3. 没报错或没 panic 并不意味着没有并发问题，实际**可能已构造了异常数据，并传递给了上下游：**例如上面代码的 `fallbackKey = "123456789"`，那么可能序列化时读到的是 "1234567" ；如果 `fallbackKey = "123"`，还可能越界读取数据，甚至 panic。

#### Server Panic

典型情况是 Response 内引用的某个字段是全局变量（或被缓存的对象），而该对象可能被并发写入。

该 Case 报错信息如下（略作简化）：

```go
KITEX: panic happened, ..., error=<Error: runtime error: index out of range [3] with length 1>
panic(...)
encoding/binary.bigEndian.PutUint32(...)
github.com/cloudwego/kitex/pkg/protocol/bthrift.binaryProtocol.WriteI32(...)
git/to/project/kitex_gen/some_package.(*SomeType).fastWriteField3(...)
```

从 panic stack 可以看出，触发 panic 的是 Kitex 生成 `fastWriteField3` 方法，是典型的业务并发读写 case，其业务代码可简化为：

```go
var localCache sync.Map{}

func (*Handler) GetByKey(ctx context.Context, req *xxx.Request) (*xxx.Response, error) {
    resp := localCache.Get(req.Key)
    resp.UserID = req.UserID
    return resp, nil
}
```

**分析：**

1. `PutUint32(b []byte, v uint32)` 将 v 写入 b 前会先检查 b[3] 是否可读，panic 发生在这里，表示越界了；
2. `FastWrite` 事先已遍历 resp 得出所需长度，说明在「(1) 计算所需内存」和「(3) 序列化」之间，`resp` 中某个字段被修改了，需要更多的内存空间；
3. 假设 server 同时收到两个请求（Key 都是 "X"）
   1. `A.Request: {Key="X", UserID = "123" }`
   2. `B.Request: {Key="X", UserID = "123456"} `

4. 进程可能会按如下顺序执行:
   1. A 请求的 `FastWrite` 计算需要 N+3 个字节（N 表示 resp 里其他字段所需空间），完成内存分配
   2. B 请求执行了第 5 行，替换了 `UserID` 为 "123456" （注意 Response 是被缓存的，意味着 A 也将返回这个对象）
   3. A 请求开始将 resp 序列化到分配的空间中，尝试写入最后一个字段 UserID 时，发现所需空间不够了（需要 N+6 个字节了）：**`index out of range [3] with length 1`**

**注意：**

1. 没报错或没 panic 并不意味着没有并发问题，实际**可能已构造了异常数据，并传递给了上下游：**例如上面 A、B 的执行顺序反过来，不会报错，但是期望写入返回报文的是 "123456"，实际写入的是 "123"，**并且 Kitex Client 可以正常解码**。

### 排查建议

#### 参考上述 case 自查代码

如有对 Request 或 Response（包括其直接及间接引用的对象）的并发读写，请先修复该问题。

#### Go Race Detector

有条件的话请用 -race 排除掉代码里的并发问题，详见 https://go.dev/blog/race-detector

注意：生产环境慎用，有较大性能损失。

#### 定位异常字段：根据报错信息

可根据 panic stack 里出错的字段类型和 `fastWriteFieldN` 定位到具体的字段。

例如 stack panic 中最内层的 `fastWriteField*` 方法为：`kitex_gen/some_package.(***Base**).**fastWriteField3**(...)  `

那么直接导致错误的是 Base 类型下编号为 3 的字段，如下 IDL，3 号字段是 `string` 类型的 `Addr` 字段：

```go
struct Base {
    1: string LogID = "",
    2: string Caller = "",
    3: string Addr = "",
}
```

如果 panic 错误信息包含 `invalid memory address or nil pointer dereference`，说明 Addr 字段可能被另一个 `goroutine` 并发写入空值。

如果 panic 错误信息是其他错误（例如 `index out of range [3] with length 3`），**可能是**其他字段被并发读写（变长，占用了更多内存），导致该字段写入时分配的内存已经不够了，可参考下面的「对比两次采样结果」来定位。

**Client 端**

参考方案如下：

1. 第一次采样：在请求发出前，先用对 Request 整体做一次 json 序列化
   1. 注意：**性能有损**；可考虑按比例采样，降低对生产环境影响，但可能需要更长时间才能抓到case

2. 第二次采样（有两种思路，供参考）

   1. panic 采样：判断发生了 panic，再对 Request 做 json 序列化 

      判断方法：

      1. client 返回的 err 信息包含 panic 信息
      2. 在中间件中判断是否发生 panic，详见 「[Kitex - Panic 处理](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/panic/)」

   2. 延迟采样：创建 goroutine，sleep 若干时间后对 Request 做 json 序列化
      - sleep 时间越长，出现 diff 的概率越大

3. 对比两次采样的结果，找到不同的字段，再查看代码里可能有并发读写该字段的地方

注：

1. 如果可以接受一定的性能损失（两次额外的 `json.Marshal`、对比），可考虑 diff 所有请求。有些请求虽然没有panic，但是可能已经产生了脏数据了。
2. 通过 middleware 注入排查更简单，不需要修改业务代码

**Server** **端**

  由于  Server 端在 encode 时已退出了所有 middleware，因此无法捕捉到 panic、不能用中间件做采样对比  

参考方案如下：

1. 自定义 `PayloadCodec`：
   1. 在 Marshal 里执行采样，panic 时对比
   2. 注意：**性能有损**；可考虑按比例采样，降低对生产环境影响，但可能需要更长时间才能抓到case

```go
type codecForPanic struct {
    payloadCodec remote.PayloadCodec
}

func (c *codecForPanic) Marshal(ctx context.Context, message remote.Message, out remote.ByteBuffer) error {
    var before, after []byte
    var err error
    defer func() {
       if err := recover(); err != nil {
          klog.Errorf("panic: %v", err)
          after, _ = json.Marshal(message.Data())
          if bytes.Compare(before, after) != 0 {
             klog.Errorf("before = %s, after = %s", before, after)
          }
       }
    }()
    before, err = json.Marshal(message.Data()) // note the performance loss 
    if err != nil {
        klog.Errorf("json encode before Marshal failed: err = %v", err)
    }
    return c.payloadCodec.Marshal(ctx, message, out)
}

func (c *codecForPanic) Unmarshal(ctx context.Context, message remote.Message, in remote.ByteBuffer) error {
    // recover and compare here
    return c.payloadCodec.Unmarshal(ctx, message, in)
}

func (c *codecForPanic) Name() string {
    return "codecForPanic"
}
```

2. 在初始化 server 时指定该 PayloadCodec：

```go
svr := test.NewServer(new(TestServiceImpl),
    server.WithPayloadCodec(&codecForPanic{
       payloadCodec: thrift.NewThriftCodecWithConfig(thrift.FastRead | thrift.FastWrite),
    }),
    // other options
)
```

3. 对比两次采样的结果，找到不同的字段，再查看代码里可能有并发读写该字段的地方 

如果 panic 发生频率较低，也可以考虑新启动一个 goroutine，sleep 一段时间，再对比，这样更容易找到被修改的地方。

## FastRead

### 典型现象

`runtime error: slice bounds out of range [1600217702:1678338]`

### 原因

收到的报文（Client：收到Response，Server：收到 Request）编码有错。

### 排查建议

参考 FastWrite 的「排查建议」，在对端排查（如果报错在 server 端，就查 client；反之亦然）。

## FAQ

### 如何关闭 FastWrite/Read

> **不建议「掩耳盗铃」**：业务逻辑有竞态 bug 可能会导致业务数据不一致，产生难以预料的后果。

确有需要，可按需选择以下方式：

1. 通过 Option 关闭 Thrift 的 `FastCodec`:

```go
// Server side
svr := xxxService.NewServer(handler, server.WithPayloadCodec(
    thrift.NewThriftCodecDisableFastMode(true, false)))

// Client side
cli, err := xxxService.NewClient("", client.WithPayloadCodec(
    thrift.NewThriftCodecDisableFastMode(true, false)))
```

2. 不生成 `FastCodec` 编解码代码：使用 Kitex 命令行工具的参数 `-no-fast-api` 重新生成代码。
