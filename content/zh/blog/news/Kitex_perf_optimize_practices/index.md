---
date: 2021-09-23
title: "字节跳动 Go RPC 框架 Kitex 性能优化实践"
projects: ["Kitex"]
linkTitle: "字节跳动 Go RPC 框架 Kitex 性能优化实践"
keywords: ["Kitex", "性能优化", "Netpoll", "Thrift", "序列化"]
description: "本文介绍了字节跳动 Go RPC 框架 Kitex 的性能优化实践，包括 Netpoll、Thrift、序列化等方面的优化。"
author: <a href="https://github.com/Hchenn" target="_blank">Hchen</a>, <a href="https://github.com/PureWhiteWu" target="_blank">Pure White</a>, <a href="https://github.com/simon0-o" target="_blank">Simon Wang</a>, <a href="https://github.com/SinnerA" target="_blank">bytexw</a>
---

## 前言

Kitex 是字节跳动框架组研发的下一代高性能、强可扩展性的 Go RPC 框架。除具备丰富的服务治理特性外，相比其他框架还有以下特点：
集成了自研的网络库 Netpoll；支持多消息协议（Thrift、Protobuf）和多交互方式（Ping-Pong、Oneway、 Streaming）；提供了更加灵活可扩展的代码生成器。

目前公司内主要业务线都已经大范围使用 Kitex，据统计当前接入服务数量多达 8k。Kitex 推出后，我们一直在不断地优化性能，本文将分享我们在 Netpoll 和 序列化方面的优化工作。

## 自研网络库 Netpoll 优化

自研的基于 epoll 的网络库 —— Netpoll，在性能方面有了较为显著的优化。测试数据表明，当前版本(2020.12) 相比于上次分享时(2020.05)，吞吐能力 ↑30%，延迟 AVG ↓25%，TP99 ↓67%，性能已远超官方 net 库。以下，我们将分享两点显著提升性能的方案。

### epoll_wait 调度延迟优化

Netpoll 在刚发布时，遇到了延迟 AVG 较低，但 TP99 较高的问题。经过认真研究 epoll_wait，我们发现结合 polling 和 event trigger 两种模式，并优化调度策略，可以显著降低延迟。

首先我们来看 Go 官方提供的 syscall.EpollWait 方法：

```go
func EpollWait(epfd int, events []EpollEvent, msec int) (n int, err error)
```

这里共提供 3 个参数，分别表示 epoll 的 fd、回调事件、等待时间，其中只有 msec 是动态可调的。

通常情况下，我们主动调用 EpollWait 都会设置 msec=-1，即无限等待事件到来。事实上不少开源网络库也是这么做的。但是我们研究发现，msec=-1 并不是最优解。

epoll_wait 内核源码(如下) 表明，msec=-1 比 msec=0 增加了 fetch_events 检查，因此耗时更长。

```go
static int ep_poll(struct eventpoll *ep, struct epoll_event __user *events,
                   int maxevents, long timeout)
{
    ...
    if (timeout > 0) {
       ...
    } else if (timeout == 0) {
        ...
        goto send_events;
    }

fetch_events:
    ...
    if (eavail)
        goto send_events;

send_events:
    ...
```

Benchmark 表明，在有事件触发的情况下，msec=0 比 msec=-1 调用要快 18% 左右，因此在频繁事件触发场景下，使用 msec=0 调用明显是更优的。

| Benchmark                   | time/op   | bytes/op |
| :-------------------------- | :-------- | :------- |
| BenchmarkEpollWait, msec=0  | 270 ns/op | 0 B/op   |
| BenchmarkEpollWait, msec=-1 | 328 ns/op | 0 B/op   |
| EpollWait Delta             | -17.68%   | ~        |

而在无事件触发的场景下，使用 msec=0 显然会造成无限轮询，空耗大量资源。

综合考虑后，我们更希望在有事件触发时，使用 msec=0 调用，而在无事件时，使用 msec=-1 来减少轮询开销。伪代码如下：

```go
var msec = -1
for {
   n, err = syscall.EpollWait(epfd, events, msec)
   if n <= 0 {
      msec = -1
      continue
   }
   msec = 0
   ...
}
```

那么这样就可以了吗？事实证明优化效果并不明显。

我们再做思考：

msec=0 仅单次调用耗时减少 50ns，影响太小，如果想要进一步优化，必须要在调度逻辑上做出调整。

进一步思考：

上述伪代码中，当无事件触发，调整 msec=-1 时，直接 continue 会立即再次执行 EpollWait，而由于无事件，msec=-1，当前 goroutine 会 block 并被 P 切换。
但是被动切换效率较低，如果我们在 continue 前主动为 P 切换 goroutine，则可以节约时间。因此我们将上述伪代码改为如下：

```go
var msec = -1
for {
   n, err = syscall.EpollWait(epfd, events, msec)
   if n <= 0 {
      msec = -1
      runtime.Gosched()
      continue
   }
   msec = 0
   ...
}
```

测试表明，调整代码后，吞吐量 ↑12%，TP99 ↓64%，获得了显著的延迟收益。

### 合理利用 unsafe.Pointer

继续研究 epoll_wait，我们发现 Go 官方对外提供的 syscall.EpollWait 和 runtime 自用的 epollwait 是不同的版本，即两者使用了不同的 EpollEvent。以下我们展示两者的区别：

```go
// @syscall
type EpollEvent struct {
   Events uint32
   Fd     int32
   Pad    int32
}
// @runtime
type epollevent struct {
   events uint32
   data   [8]byte // unaligned uintptr
}
```

我们看到，runtime 使用的 epollevent 是系统层 epoll 定义的原始结构；而对外版本则对其做了封装，将 epoll_data(epollevent.data) 拆分为固定的两字段：Fd 和 Pad。
那么 runtime 又是如何使用的呢？在源码里我们看到这样的逻辑：

```go
*(**pollDesc)(unsafe.Pointer(&ev.data)) = pd

pd := *(**pollDesc)(unsafe.Pointer(&ev.data))
```

显然，runtime 使用 epoll_data(&ev.data) 直接存储了 fd 对应结构体(pollDesc)的指针，这样在事件触发时，可以直接找到结构体对象，并执行相应逻辑。
而对外版本则由于只能获得封装后的 Fd 参数，因此需要引入额外的 Map 来增删改查结构体对象，这样性能肯定相差很多。

所以我们果断抛弃了 syscall.EpollWait，转而仿照 runtime 自行设计了 EpollWait 调用，同样采用 unsafe.Pointer 存取结构体对象。测试表明，该方案下 吞吐量 ↑10%，TP99 ↓10%，获得了较为明显的收益。

## Thrift 序列化/反序列化优化

序列化是指把数据结构或对象转换成字节序列的过程，反序列化则是相反的过程。RPC 在通信时需要约定好序列化协议，client 在发送请求前进行序列化，
字节序列通过网络传输到 server，server 再反序列进行逻辑处理，完成一次 RPC 请求。Thrift 支持 Binary、Compact 和 JSON 序列化协议。目前公司内部使用的基本都是 Binary，这里只介绍 Binary 协议。

Binary 采用 TLV 编码实现，即每个字段都由 TLV 结构来描述，TLV 意为：Type 类型， Length 长度，Value 值，Value 也可以是个 TLV 结构，其中 Type 和 Length 的长度固定，Value 的长度则由 Length 的值决定。
TLV 编码结构简单清晰，并且扩展性较好，但是由于增加了 Type 和 Length，有额外的内存开销，特别是在大部分字段都是基本类型的情况下有不小的空间浪费。

序列化和反序列的性能优化从大的方面来看可以从空间和时间两个维度进行优化。从兼容已有的 Binary 协议来看，空间上的优化似乎不太可行，只能从时间维度进行优化，包括：

- 减少内存操作次数，包括内存分配和拷贝，尽量预分配内存，减少不必要的开销；

- 减少函数调用次数，比如可调整代码结构和 inline 等手段进行优化；

### 调研

根据 go_serialization_benchmarks 的压测数据，我们找到了一些性能卓越的序列化方案进行调研，希望能够对我们的优化工作有所启发。

通过对 protobuf、gogoprotobuf 和 Cap'n Proto 的分析，我们得出以下结论：

- 网络传输中出于 IO 的考虑，都会尽量压缩传输数据，protobuf 采用了 Varint 编码在大部分场景中都有着不错的压缩效果；

- gogoprotobuf 采用预计算方式，在序列化时能够减少内存分配次数，进而减少了内存分配带来的系统调用、锁和 GC 等代价；

- Cap'n Proto 直接操作 buffer，也是减少了内存分配和内存拷贝（少了中间的数据结构），并且在 struct pointer 的设计中把固定长度类型数据和非固定长度类型数据分开处理，针对固定长度类型可以快速处理；

从兼容性考虑，不可能改变现有的 TLV 编码格式，因此数据压缩不太现实，但是 2 和 3 对我们的优化工作是有启发的，事实上我们也是采取了类似的思路。

### 思路

#### 减少内存操作

**buffer 管理**

无论是序列化还是反序列化，都是从一块内存拷贝数据到另一块内存，这就涉及到内存分配和内存拷贝操作，尽量避免内存操作可以减少不必要的系统调用、锁和 GC 等开销。

事实上 Kitex 已经提供了 LinkBuffer 用于 buffer 的管理，LinkBuffer 设计上采用链式结构，由多个 block 组成，其中 block 是大小固定的内存块，构建对象池维护空闲 block，由此复用 block，减少内存占用和 GC。

刚开始我们简单地采用 sync.Pool 来复用 netpoll 的 LinkBufferNode，但是这样仍然无法解决对于大包场景下的内存复用（大的 Node 不能回收，否则会导致内存泄漏）。
目前我们改成了维护一组 sync.Pool，每组中的 buffer size 都不同，新建 block 时根据最接近所需 size 的 pool 中去获取，这样可以尽可能复用内存，从测试来看内存分配和 GC 优化效果明显。

**string / binary 零拷贝**

对于有一些业务，比如视频相关的业务，会在请求或者返回中有一个很大的 Binary 二进制数据代表了处理后的视频或者图片数据，同时会有一些业务会返回很大的 String（如全文信息等）。
这种场景下，我们通过火焰图看到的热点都在数据的 copy 上，那我们就想了，我们是否可以减少这种拷贝呢？

答案是肯定的。既然我们底层使用的 Buffer 是个链表，那么就可以很容易地在链表中间插入一个节点。

![!image](/img/blog/buffer-linkerd-list.png)

我们就采用了类似的思想，当序列化的过程中遇到了 string 或者 binary 的时候， 将这个节点的 buffer 分成两段，在中间原地插入用户的 string / binary 对应的 buffer，这样可以避免大的 string / binary 的拷贝了。

这里再介绍一下，如果我们直接用 []byte(string) 去转换一个 string 到 []byte 的话实际上是会发生一次拷贝的，原因是 Go 的设计中 string 是 immutable 的但是 []byte 是 mutable 的，
所以这么转换的时候会拷贝一次；如果要不拷贝转换的话，就需要用到 unsafe 了：

```go
func StringToSliceByte(s string) []byte {
   l := len(s)
   return *(*[]byte)(unsafe.Pointer(&reflect.SliceHeader{
      Data: (*(*reflect.StringHeader)(unsafe.Pointer(&s))).Data,
      Len:  l,
      Cap:  l,
   }))
}
```

这段代码的意思是，先把 string 的地址拿到，再拼装上一个 slice byte 的 header，这样就可以不拷贝数据而将 string 转换成 []byte 了，不过要注意这样生成的 []byte 不可写，否则行为未定义。

**预计算**

线上存在某些服务有大包传输的场景，这种场景下会引入不小的序列化 / 反序列化开销。一般大包都是容器类型的大小非常大导致的，如果能够提前计算出 buffer，一些 O(n) 的操作就能降到 O(1)，减少了函数调用次数，在大包场景下也大量减少了内存分配的次数，带来的收益是可观的。

- 基本类型

  - 如果容器元素为基本类型（bool, byte, i16, i32, i64, double）的话，由于基本类型大小固定，在序列化时是可以提前计算出总的大小，并且一次性分配足够的 buffer，O(n) 的 malloc 操作次数可以降到 O(1)，从而大量减少了 malloc 的次数，同理在反序列化时可以减少 next 的操作次数。

- struct 字段重排

  - 上面的优化只能针对容器元素类型为基本类型的有效，那么对于元素类型为 struct 的是否也能优化呢？答案是肯定的。

  - 沿用上面的思路，假如 struct 中如果存在基本类型的 field，也可以预先计算出这些 field 的大小，在序列化时为这些 field 提前分配 buffer，写的时候也把这些 field 顺序统一放到前面写，这样也能在一定程度上减少 malloc 的次数。

- 一次性计算

  - 上面提到的是基本类型的优化，如果在序列化时，先遍历一遍 request 所有 field，便可以计算得到整个 request 的大小，提前分配好 buffer，在序列化和反序列时直接操作 buffer，这样对于非基本类型也能有优化效果。

- 定义新的 codec 接口：

```go
type thriftMsgFastCodec interface {
   BLength() int // count length of whole req/resp
   FastWrite(buf []byte) int
   FastRead(buf []byte) (int, error)
}
```

- 在 Marshal 和 Unmarshal 接口中做相应改造：

```go
func (c thriftCodec) Marshal(ctx context.Context, message remote.Message, out remote.ByteBuffer) error {
    ...
    if msg, ok := data.(thriftMsgFastCodec); ok {
       msgBeginLen := bthrift.Binary.MessageBeginLength(methodName, thrift.TMessageType(msgType), int32(seqID))
       msgEndLen := bthrift.Binary.MessageEndLength()
       buf, err := out.Malloc(msgBeginLen + msg.BLength() + msgEndLen)// malloc once
       if err != nil {
          return perrors.NewProtocolErrorWithMsg(fmt.Sprintf("thrift marshal, Malloc failed: %s", err.Error()))
       }
       offset := bthrift.Binary.WriteMessageBegin(buf, methodName, thrift.TMessageType(msgType), int32(seqID))
       offset += msg.FastWrite(buf[offset:])
       bthrift.Binary.WriteMessageEnd(buf[offset:])
       return nil
    }
    ...
}

func (c thriftCodec) Unmarshal(ctx context.Context, message remote.Message, in remote.ByteBuffer) error {
    ...
    data := message.Data()
if msg, ok := data.(thriftMsgFastCodec); ok && message.PayloadLen() != 0 {
   msgBeginLen := bthrift.Binary.MessageBeginLength(methodName, msgType, seqID)
   buf, err := tProt.next(message.PayloadLen() - msgBeginLen - bthrift.Binary.MessageEndLength()) // next once
   if err != nil {
      return remote.NewTransError(remote.PROTOCOL_ERROR, err.Error())
   }
   _, err = msg.FastRead(buf)
   if err != nil {
      return remote.NewTransError(remote.PROTOCOL_ERROR, err.Error())
   }
   err = tProt.ReadMessageEnd()
   if err != nil {
      return remote.NewTransError(remote.PROTOCOL_ERROR, err.Error())
   }
   tProt.Recycle()
   return err
   }
   ...
}
```

- 生成代码中也做相应改造：

```go
func (p *Demo) BLength() int {
        l := 0
        l += bthrift.Binary.StructBeginLength("Demo")
        if p != nil {
                l += p.field1Length()
                l += p.field2Length()
                l += p.field3Length()
    ...
        }
        l += bthrift.Binary.FieldStopLength()
        l += bthrift.Binary.StructEndLength()
        return l
}

func (p *Demo) FastWrite(buf []byte) int {
        offset := 0
        offset += bthrift.Binary.WriteStructBegin(buf[offset:], "Demo")
        if p != nil {
                offset += p.fastWriteField2(buf[offset:])
                offset += p.fastWriteField4(buf[offset:])
                offset += p.fastWriteField1(buf[offset:])
                offset += p.fastWriteField3(buf[offset:])
        }
        offset += bthrift.Binary.WriteFieldStop(buf[offset:])
        offset += bthrift.Binary.WriteStructEnd(buf[offset:])
        return offset
}
```

#### 使用 SIMD 优化 Thrift 编码

公司内广泛使用 list<i64/i32> 类型来承载 ID 列表，并且 list<i64/i32> 的编码方式十分符合向量化的规律，于是我们用了 SIMD 来优化 list<i64/i32> 的编码过程。

我们使用了 avx2，优化后的结果比较显著，在大数据量下针对 i64 可以提升 6 倍性能，针对 i32 可以提升 12 倍性能；在小数据量下提升更明显，针对 i64 可以提升 10 倍，针对 i32 可以提升 20 倍。

#### 减少函数调用

**inline**

inline 是在编译期间将一个函数调用原地展开，替换成这个函数的实现，它可以减少函数调用的开销以提高程序的性能。

在 Go 中并不是所有函数都能 inline，使用参数-gflags="-m"运行进程，可显示被 inline 的函数。以下几种情况无法内联：

- 包含循环的函数；

- 包含以下内容的函数：闭包调用，select，for，defer，go 关键字创建的协程；

- 超过一定长度的函数，默认情况下当解析 AST 时，Go 申请了 80 个节点作为内联的预算。每个节点都会消耗一个预算。比如，a = a + 1 这行代码包含了 5 个节点：AS, NAME, ADD, NAME, LITERAL。当一个函数的开销超过了这个预算，就无法内联。

编译时通过指定参数-l可以指定编译器对代码内联的强度（go 1.9+），不过这里不推荐大家使用，在我们的测试场景下是 buggy 的，无法正常运行：

```go
// The debug['l'] flag controls the aggressiveness. Note that main() swaps level 0 and 1, making 1 the default and -l disable. Additional levels (beyond -l) may be buggy and are not supported.
//      0: disabled
//      1: 80-nodes leaf functions, oneliners, panic, lazy typechecking (default)
//      2: (unassigned)
//      3: (unassigned)
//      4: allow non-leaf functions
```

内联虽然可以减少函数调用的开销，但是也可能因为存在重复代码，从而导致 CPU 缓存命中率降低，所以并不能盲目追求过度的内联，需要结合 profile 结果来具体分析。

```bash
go test -gcflags='-m=2' -v -test.run TestNewCodec 2>&1 | grep "function too complex" | wc -l
48

go test -gcflags='-m=2 -l=4' -v -test.run TestNewCodec 2>&1 | grep "function too complex" | wc -l
25
```

从上面的输出结果可以看出，加强内联程度确实减少了一些"function too complex"，看下 benchmark 结果：

| Benchmark             | time/op     | bytes/op | allocs/op |
| :-------------------- | :---------- | :------- | :-------- |
| BenchmarkOldMarshal-4 | 309 µs ± 2% | 218KB    | 11        |
| BenchmarkNewMarshal-4 | 310 µs ± 3% | 218KB    | 11        |

上面开启最高程度的内联强度，确实消除了不少因为“function too complex”带来无法内联的函数，但是压测结果显示收益不太明显。

### 测试结果

我们构建了基准测试来对比优化前后的性能，下面是测试结果。

环境：Go 1.13.5 darwin/amd64 on a 2.5 GHz Intel Core i7 16GB

**小包**

data size: 20KB

| Benchmark               | time/op     | bytes/op | allocs/op |
| :---------------------- | :---------- | :------- | :-------- |
| BenchmarkOldMarshal-4   | 138 µs ± 3% | 25.4KB   | 19        |
| BenchmarkNewMarshal-4   | 29 µs ± 3%  | 26.4KB   | 11        |
| Marshal Delta           | -78.97%     | 3.87%    | -42.11%   |
| BenchmarkOldUnmarshal-4 | 199 µs ± 3% | 4720     | 1360      |
| BenchmarkNewUnmarshal-4 | 94µs ± 5%   | 4700     | 1280      |
| Unmarshal Delta         | -52.93%     | -0.24%   | -5.38%    |

**大包**

data size: 6MB

| Benchmark               | time/op     | bytes/op | allocs/op |
| :---------------------- | :---------- | :------- | :-------- |
| BenchmarkOldMarshal-4   | 58.7ms ± 5% | 6.96MB   | 3350      |
| BenchmarkNewMarshal-4   | 13.3ms ± 3% | 6.84MB   | 10        |
| Marshal Delta           | -77.30%     | -1.71%   | -99.64%   |
| BenchmarkOldUnmarshal-4 | 56.6ms ± 3% | 17.4MB   | 391000    |
| BenchmarkNewUnmarshal-4 | 26.8ms ± 5% | 17.5MB   | 390000    |
| Unmarshal Delta         | -52.54%     | 0.09%    | -0.37%    |

## 无拷贝序列化

在一些 request 和 response 数据较大的服务中，序列化和反序列化的代价较高，有两种优化思路：

- 如前文所述进行序列化和反序列化的优化

- 以无拷贝序列化的方式进行调用

### 调研

通过无拷贝序列化进行 RPC 调用，最早出自 Kenton Varda 的 Cap'n Proto 项目，Cap'n Proto 提供了一套数据交换格式和对应的编解码库。

Cap'n Proto 本质上是开辟一个 bytes slice 作为 buffer ，所有对数据结构的读写操作都是直接读写 buffer，读写完成后，
在头部添加一些 buffer 的信息就可以直接发送，对端收到后即可读取，因为没有 Go 语言结构体作为中间存储，所有无需序列化这个步骤，反序列化亦然。

简单总结下 Cap'n Proto 的特点：

- 所有数据的读写都是在一段连续内存中

- 将序列化操作前置，在数据 Get/Set 的同时进行编解码

- 在数据交换格式中，通过 pointer（数据存储位置的 offset）机制，使得数据可以存储在连续内存的任意位置，进而使得结构体中的数据可以以任意顺序读写

  - 对于结构体的固定大小字段，通过重新排列，使得这些字段存储在一块连续内存中
  - 对于结构体的不定大小字段（如 list），则通过一个固定大小的 pointer 来表示，pointer 中存储了包括数据位置在内的一些信息

首先 Cap'n Proto 没有 Go 语言结构体作为中间载体，得以减少一次拷贝，然后 Cap'n Proto 是在一段连续内存上进行操作，编码数据的读写可以一次完成，因为这两个原因，使得 Cap' Proto 的性能表现优秀。

下面是相同数据结构下 Thrift 和 Cap'n Proto 的 Benchmark，考虑到 Cap'n Proto 是将编解码操作前置了，所以对比的是包括数据初始化在内的完整过程，即结构体数据初始化+（序列化）+写入 buffer +从 buffer 读出+（反序列化）+从结构体读出数据。

```Thrift
struct MyTest {
    1: i64 Num,
    2: Ano Ano,
    3: list<i64> Nums, // 长度131072 大小1MB
}

struct Ano {
    1: i64 Num,
}
```

| Benchmark                | Iter | time/op       | bytes/op     | alloc/op      |
| :----------------------- | :--- | :------------ | :----------- | :------------ |
| BenchmarkThriftReadWrite | 172  | 6855840 ns/op | 3154209 B/op | 545 allocs/op |
| BenchmarkCapnpReadWrite  | 1500 | 844924 ns/op  | 2085713 B/op | 9 allocs/op   |
| ReadWrite Delta          | /    | -87.68%       | -33.88%      | -98.35%       |

（反序列化）+读出数据，视包大小，Cap'n Proto 性能大约是 Thrift 的 8-9 倍。写入数据+（序列化），视包大小，Cap'n Proto 性能大约是 Thrift 的 2-8 倍。整体性能 Cap' Proto 性能大约是 Thrift 的 4-8 倍。

前面说了 Cap'n Proto 的优势，下面总结一下 Cap'n Proto 存在的一些问题：

- Cap'n Proto 的连续内存存储这一特性带来的一个问题：当对不定大小数据进行 resize ，且需要的空间大于原有空间时，只能在后面重新分配一块空间，导致原来数据的空间成为了一个无法去掉的 hole 。
  这个问题随着调用链路的不断 resize 会越来越严重，要解决只能在整个链路上严格约束：尽量避免对不定大小字段的 resize ，当不得不 resize 的时候，重新构建一个结构体并对数据进行深拷贝。

- Cap'n Proto 因为没有 Go 语言结构体作为中间载体，使得所有的字段都只能通过接口进行读写，用户体验较差。

### Thrift 协议兼容的无拷贝序列化

Cap'n Proto 为了更好更高效地支持无拷贝序列化，使用了一套自研的编解码格式，但在现在 Thrift 和 ProtoBuf 占主流的环境中难以铺开。为了能在协议兼容的同时获得无拷贝序列化的性能，我们开始了 Thrift 协议兼容的无拷贝序列化的探索。

Cap'n Proto 作为无拷贝序列化的标杆，那么我们就看看 Cap'n Proto 上的优化能否应用到 Thrift 上：

- 自然是无拷贝序列化的核心，不使用 Go 语言结构体作为中间载体，减少一次拷贝。此优化点是协议无关的，能够适用于任何已有的协议，自然也能和 Thrift 协议兼容，但是从 Cap'n Proto 的使用上来看，用户体验还需要仔细打磨一下。

- Cap'n Proto 是在一段连续内存上进行操作，编码数据的读写可以一次完成。Cap'n Proto 得以在连续内存上操作的原因：有 pointer 机制，数据可以存储在任意位置，允许字段可以以任意顺序写入而不影响解码。
  但是一方面，在连续内存上容易因为误操作，导致在 resize 的时候留下 hole，另一方面，Thrift 没有类似于 pointer 的机制，故而对数据布局有着更严格的要求。这里有两个思路：

  - 坚持在连续内存上进行操作，并对用户使用提出严格要求：1. resize 操作必须重新构建数据结构 2. 当存在结构体嵌套时，对字段写入顺序有着严格要求（可以想象为把一个存在嵌套的结构体从外往里展开，写入时需要按展开顺序写入），
    且因为 Binary 等 TLV 编码的关系，在每个嵌套开始写入时，需要用户主动声明（如 StartWriteFieldX）。
  - 不完全在连续内存上操作，局部内存连续，可变字段则单独分配一块内存，既然内存不是完全连续的，自然也无法做到一次写操作便完成输出。为了尽可能接近一次写完数据的性能，我们采取了一种链式 buffer 的方案，
    一方面当可变字段 resize 时只需替换链式 buffer 的一个节点，无需像 Cap'n Proto 一样重新构建结构体，另一方面在需要输出时无需像 Thrift 一样需要感知实际的结构，只要把整个链路上的 buffer 写入即可。

先总结下目前确定的两个点：1. 不使用 Go 语言结构体作为中间载体，通过接口直接操作底层内存，在 Get/Set 时完成编解码 2. 通过链式 buffer 存储数据

然后让我们看下目前还有待解决的问题：

- 不使用 Go 语言结构体后带来的用户体验劣化

  - 解决方案：改善 Get/Set 接口的使用体验，尽可能做到和 Go 语言结构体同等的易用

- Cap'n Proto 的 Binary Format 是针对无拷贝序列化场景专门设计的，虽然每次 Get 时都会进行一次解码，但是解码代价非常小。而 Thrift 的协议（以 Binary 为例），没有类似于 pointer 的机制，
  当存在多个不定大小字段或者存在嵌套时，必须顺序解析而无法直接通过计算偏移拿到字段数据所在的位置，而每次 Get 都进行顺序解析的代价过于高昂。

  - 解决方案：我们在表示结构体的时候，除了记录结构体的 buffer 节点，还加了一个索引，里面记录了每个不定大小字段开始的 buffer 节点的指针。
    下面是目前的无拷贝序列化方案与 FastRead/Write，在 4 核下的极限性能对比测试：

| 包大小 | 类型               | QPS    | TP90   | TP99   | TP999  | CPU  |
| :----- | :----------------- | :----- | :----- | :----- | :----- | :--- |
| 1KB    | 无序列化           | 70,700 | 1 ms   | 3 ms   | 6 ms   | /    |
|        | FastWrite/FastRead | 82,490 | 1 ms   | 2 ms   | 4 ms   | /    |
| 2KB    | 无序列化           | 65,000 | 1 ms   | 4 ms   | 9 ms   | /    |
|        | FastWrite/FastRead | 72,000 | 1 ms   | 2 ms   | 8 ms   | /    |
| 4KB    | 无序列化           | 56,400 | 2 ms   | 5 ms   | 10 ms  | 380% |
|        | FastWrite/FastRead | 52,700 | 2 ms   | 4 ms   | 10 ms  | 380% |
| 32KB   | 无序列化           | 27,400 | /      | /      | /      | /    |
|        | FastWrite/FastRead | 19,500 | /      | /      | /      | /    |
| 1MB    | 无序列化           | 986    | 53 ms  | 56 ms  | 59 ms  | 260% |
|        | FastWrite/FastRead | 942    | 55 ms  | 59 ms  | 62 ms  | 290% |
| 10MB   | 无序列化           | 82     | 630 ms | 640 ms | 645 ms | 240% |
|        | FastWrite/FastRead | 82     | 630 ms | 640 ms | 640 ms | 270% |

测试结果概述：

- 小包场景，无序列化性能表现较差，约为 FastWrite/FastRead 的 85%。

- 大包场景，无序列化性能表现较好，4K 以上的包较 FastWrite/FastRead 提升 7%-40%。

## 后记

希望以上的分享能够对社区有所帮助。同时，我们也在尝试 share memory-based IPC、io_uring、tcp zero copy 、RDMA 等，更好地提升 Kitex 性能；重点优化同机、同容器的通讯场景。欢迎各位感兴趣的同学加入我们，共同建设 Go 语言生态！

## 参考资料

- https://github.com/alecthomas/go_serialization_benchmarks

- https://capnproto.org/

- [Intel® C++ Compiler Classic Developer Guide and Reference](https://software.intel.com/content/www/us/en/develop/documentation/cpp-compiler-developer-guide-and-reference/top/compiler-reference/intrinsics/intrinsics-for-intel-advanced-vector-extensions-2/intrinsics-for-shuffle-operations-1/mm256-shuffle-epi8.html)
