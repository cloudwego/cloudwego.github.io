---
title: "Panic 自查手册"
linkTitle: "Panic 自查手册"
weight: 1
date: 2024-02-18
description: "发生 Panic 时如何快速排查"

---

## 错误栈怎么看

遇到任何 panic，都请按以下 4 步原则来排查。

1. panic 的原因
2. 栈从哪开始看
3. 报错的方法是什么
4. 报错具体代码位置在哪 

下图是一个典型的 panic 错误栈，我们在图中描述了四项主要信息的位置。 

![image](/img/blog/Kitex_self_check/panic_stack.png)

以下具体描述如何依次查看四项主要信息

### panic 的原因

任何 panic 在开始打错误栈 `goroutine \d [running]:` 之前，都会有一段描述，格式为：

```go
panic: xxx...
// 或者
fatal error: xxx...
```

这段描述说明了造成 panic 的具体原因，因此是首先需要了解的内容。

常见的错误原因有以下几种：

1. **panic: runtime error: invalid memory address or nil pointer dereference**

   错误原因：代码空指针异常 

2. **panic: runtime error: index out of range [1] with length 1**

   错误原因：数组访问越界，比如这里意思就是访问了数组下标 1，但是数组长度是 1(只有下标 0)

3. **panic: runtime error: slice bounds out of range [2:1]**

​	错误原因：获取数组切片越界，一般是切片参数有问题，比如这里意思是p=p[2:1] 取切片非法

4. **fatal error: concurrent map writes**

5. **fatal error: concurrent map read and map write**

   错误原因：以上两个错误都是并发操作 `map` 导致的，并发写或者并发读写。

   这里需要**强调**的是：并发操作 map 会导致程序直接崩溃(crash)，这种崩溃是无法通过`recover` 恢复的，错误一般以 `fatal error:` 打头。不了解的用户可以参考：[解释](https://stackoverflow.com/questions/39288741/how-to-recover-from-concurrent-map-writes)

6. **panic: [happened in biz handler] ......**

   错误原因：以` [happened in biz handler]` 打头的描述是 x 框架主动捕获的 `panic`，但是 `panic` 是由于业务代码造成的，因此**一定是业务代码问题**，具体的错误原因应该看 `[happened in biz handler]` 后面的部分。

   举例说明：比如下面这个错误意思是，想把 `interface{}` 参数当作 `string` 来使用，但是 `interface{}` 参数本身是个 nil。

   `Go   panic: [happened in biz handler]  interface conversion: interface {} is nil, not string  `

7. **panic: ......**

   错误原因：有些 `panic` 可能是业务自己通过 `panic("xxx")` 自行打印的，那么在这里 `panic:` 后面就会出现自行打印的内容，可以根据这个内容检索代码，就可以找到 `panic` 的位置，进一步排查错误原因

### 栈的起始位置

知道了错误原因之后，接下来就要定位错误的代码位置。首先我们学习如何看错误栈，从哪里开始看。

![image](/img/blog/Kitex_self_check/panic_stack.png)

仍然附开始这张图来说明，**panic** **错误栈，以如下字样为开始**。如果没有该字样，说明 panic 没有被 recover，直接从头开始看即可。

```go
/.../go/src/runtime/panic.go:\d +0x\d
```

栈的最顶部分是描述框架捕获了这个 panic，并不是 panic 的原因，属于 recover 后的操作内容，对排查问题意义不大，可以直接忽略。

### 报错的具体方法

找到了错误栈的起始位置后，紧跟着的下一行，就是 panic 报错的具体方法。

![image](/img/blog/Kitex_self_check/panic_stack.png)

仍以开始图来说明，报错方法为

```go
main.(*EchoServerImpl).Echo(0x11b54b0, 0xcb2000, 0xc0000987e0, 0xc000283d40, 0x11b54b0, 0xc0003aca28, 0xcaef01)
```

以上内容意思是：在执行 `struct EchoServerImpl` 定义的 `func (*EchoServerImpl) Echo` 方法时，发生了 panic。括号里的内容描述了具体的请求参数和返回值。

### 报错的具体文件位置

panic 错误栈描述格式一般是 每2行 代表一个调用层次，第1行描述调用方法，第2行描述调用所在的文件地址。举例说明，如以下堆栈：

```go
main.(*EchoServerImpl).Echo(0x11b54b0, 0xcb2000, 0xc0000987e0, 0xc000283d40, 0x11b54b0, 0xc0003aca28, 0xcaef01)
        /home/tiger/go/src/xxx/performancetest/handler.go:18 +0x6d
xxx/performancetest/x_gen/echo/echoserver.echoHandler(0xcb2000, 0xc0000987e0, 0xadc1c0, 0x11b54b0, 0xb7dd80, 0xc000286520, 0xb7dec0, 0xc000286528, 0xc0000986f0, 0xae9c60)
  /home/tiger/go/src/xxx/performancetest/x_gen/echo/echoserver/echoserver.go:37 +0xa4
```

1. 第 1 行表明：调用方法为 `*EchoServerImpl.Echo`
2. 第 2 行表明：执行方法 `*EchoServerImpl.Echo` 在文件 `/.../handler.go:18` 的第 18 行位置发生了 panic 错误。
3. 第 3 行表明：`*EchoServerImpl.Echo` 是由 `echoHandler` 方法调用执行的(`echoHandler` 是 `Echo` 的调用上级)。
4. 第 4 行表明：`echoHandler` 方法在 文件 `echoserver.go:37` 的第 37 行调用了 `Echo` 方法。
5. 依次类推 ......

**知道报错具体文件位置后，我们直接找到对应代码，根据** **panic** **原因即可展开排查**。

那么仍以开始图为例，我们知道了报错在 /.../handler.go:18，错误原因是代码空指针，那么直接看代码，如下图所示：

![image](/img/blog/Kitex_self_check/echo_server.png)

显然，第 18 行这里，`a.Message` 中很有可能 `a == nil`，因为 `params` 取值没有空值校验。至此我们找到问题，并可以通过修改代码来 fix bug。

## 空指针

**我知道这行代码有空指针，但是不知道哪个参数空指针了**

上句话是排查空指针时的关键问题，这节进阶内容就是展开说明如何定位是哪个参数空指针了。

根据排查方式，我们将空指针情况分为两类：

1. 一类是传递参数空指针，这类空指针问题，可以通过错误栈直接定位。
2. 另一类是局部参数空指针，这类空指针无法根据错误栈定位，但是可以检查代码发现。

### 通过错误栈定位

错误栈里报错方法后面描述了具体的请求参数和返回值，如下所示：

```go
main.(*EchoServerImpl).Echo(0x11b54b0, 0xcb2000, 0xc0000987e0, 0xc000283d40, 0x11b54b0, 0xc0003aca28, 0xcaef01)
```

示例中这些 0x... 表示参数的特征值，我们可以通过观察这些值是否为 0x0，来快速判断某个参数是否为 nil。

首先我们先简单介绍这些 0x... 的输出规则和代表含义。

1. `0x...` 顺序描述了：方法本身、输入参数、返回值 三部分内容。

```go 
func (s *EchoServerImpl) Echo(ctx context.Context, req  *echo.Request) (*echo.Result_, error)  
```

举例说明：上述 Echo 方法报错，顺序描述了：

`(s *EchoServerImpl)(0x11b54b0)`、 `ctx(0xcb2000, 0xc0000987e0)` 、`req(0xc000283d40)`、 `*echo.Result_(0x11b54b0)` 、`error(0xc0003aca28, 0xcaef01)`

2. `0x...` 和系统字长有关，64位系统下，每个 `0x...` 都占 64bit，同时**栈最多打印** **10** **字长**
3. 每个参数和 `0x...` 输出关系如下表所示

| 类型                                  | 描述                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| 全局方法 func                         | 占 0 字长，即不会打印                                        |
| `(*struct) func`                      | 占 1 字长，即独占一个  `0x...  `                             |
| 指针类型                              | 占 1 字长，即独占一个  `0x... `                              |
| `int`                                 | 占 1 字长，表示为 int 的值，例如 `var a  int = 1`，会被表示为 `0x1` |
| 接口`(interface`)类型                 | 占 2 字长，即  `0x.., 0x..`，分别表示 1. 实际类型指针，2. 数据指针 |
| `string`                              | 占 2 字长，即  0x.., 0x..，分别表示 1. 底层数组指针，2. string 长度  例如 string("hello")，会被表示为 0x.., 0x5 |
| `slice []`                            | 占 3 字长，即  `0x., 0x., 0x.`，分别表示 1. 底层数组指针，2. 长度(len)，3. 容量(cap)  例如 `var p=make([]byte, 2, 4)`，会被表示为 `0x., 0x2, 0x4` |
| `bool`,  `byte`, `int16`, `int32` ... | 占和自身等长的字长，并且值为自身的值。这些参数如果连续出现，会被合并到一个字长中。  例如 `func(a, b int32); a,b=1,2` 在 64 位系统中会被表示为 `0xc000020001` |

通过上述知识，我们可以通过**排查指针类型的参数是否为 0x0** 来快速判断某个指针是否为 nil。

**注意：**上述 "**接口类型**" 如果第一字长非零，第二字长为 0x0，则该字段是 "**有类型的空指针**"。

**"有类型的空指针" 不等于 nil，不能被 `if $ == nil {...}` 捕获**，属于新手常见问题，具体 google 学习。

#### 排查示例

1. 以下错误栈，我们快速看到 `*Device` 是 `0x0`，表明 `*Device` 是个空指针。再根据调用栈向下看，`*Device` 是由 `*Log.writeField5` 调用的。

   因为这里是生成代码，**可以得出结论**，生成代码 `*Log` 结构体的第 5 个字段 `*Device` 没有赋值，造成空指针。具体在哪里没有赋值，基于栈向下找就可以，这里不再赘述。

   ```go
   : panic in processor: runtime error: invalid memory address or nil pointer dereference
   goroutine 498022546 [running]:
   .../xxx/x.(*RpcServer).processRequests.func1(0xc000424550)
   /.../xxx/x/kitex_server.go:227 +0xc8
   panic(0x2b97ca0, 0x5b05400)
   /usr/local/go/src/runtime/panic.go:522 +0x1b5
   .../thrift_gen/.../log.(*Device).writeField1(0x0, 0x36ce900, 0xc008478e00, 0x0, 0x0)
   /.../thrift_gen/.../log/ttypes.go:576 +0x18f
   .../thrift_gen/.../log.(*Device).Write(0x0, 0x36ce900, 0xc008478e00, 0x5000c, 0x0)
   /.../thrift_gen/.../log/ttypes.go:539 +0x197
   .../thrift_gen/.../log.(*Log).writeField5(0xc0060216c0, 0x36ce900, 0xc008478e00, 0x0, 0x0)
   /.../thrift_gen/.../log/ttypes.go:1254 +0x1a7
   ...
   ```

2. 以下错误栈：

   ```go
   KITE: processing request error=KE.UNREGISTERED/0 - ?/0: KITC: panic, runtime error: invalid memory address or nil pointer dereference
   goroutine 271 [running]:
   .../xxx/kitex.RPCTimeoutMW.func1.1.1(0x2dad3a0, 0xc0009c3260, 0xc000db81a0, 0x0, 0x0, 0xc0009c32c0)
   /.../xxx/kitex/middlewares.go:314 +0xcc
   panic(0x274e520, 0x4568230)
   /usr/local/go/src/runtime/panic.go:522 +0x1b5
   .../xxx/kitex.IOErrorHandlerMW.func1(0x2dad3a0, 0xc0009c3260, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0)
   /.../xxx/kitex/middlewares.go:260 +0x13e
   .../xxx/kitex.NewPoolMW.func1.1(0x2dad3a0, 0xc0009c3260, 0x0, 0x0, 0x1, 0xc0007fe5ed, 0x4, 0xc0007fe640)
   /.../xxx/kitex/middlewares.go:430 +0x41a
   .../xxx/kitex.NewInstanceBreakerMW.func3.1(0x2dad3a0, 0xc0009c3260, 0x0, 0x0, 0xc000087a40, 0xc0000bb350, 0x27, 0xc00049d950)
   /.../xxx/kitex/middlewares.go:522 +0x168
   .../xxx/kitex.NewLoadbalanceMW.func2.1(0x2dad3a0, 0xc0009c3260, 0x0, 0x0, 0x2, 0x29b9e8e, 0x7, 0x0)
   /.../xxx/kitex/middlewares.go:707 +0x389
   .../xxx/kitex.NewServiceDiscoverMW.func1.1(0x2dad3a0, 0xc0009c3260, 0x0, 0x0, 0xc000978024, 0x2, 0xc0009de750, 0xc0009ee758)
   /.../xxx/kitex/discoverer.go:237 +0x1a7
   .../xxx/kitex.NewIDCSelectorMW.func1.1(0x2dad3a0, 0xc0009c3260, 0x0, 0x0, 0xc000db81a0, 0x0, 0x0, 0xc0009c32c0)
   /.../xxx/kitex/middlewares.go:218 +0xfe
   .../xxx/kitex.RPCTimeoutMW.func1.1(0x2dad3a0, 0xc0009c3260, 0xc000db81a0, 0x0, 0x0, 0xc0009c32c0, 0xc0005352b0, 0xc000535530, 0xc000535540)
   /.../xxx/kitex/middlewares.go:324 +0xb1
   created by .../xxx/kitex.RPCTimeoutMW.func1
   /.../xxx/kitex/middlewares.go:309 +0x1d9
   , remote=10.14.55.44:62592
   ```

   1. 首先我们找到 .../runtime/panic.go 从这里开始看错误栈。

   2. 我们向下迅速发现一大堆 0x0，并且这些 0x0 貌似是一路传递过来的(如标红所示)，因此我们初步断定可能是传递了空指针参数。

   3. 接下来我们根据上文所述，找到代码位置并简单浏览代码。如下图所示，第 260 行方法，入参和返回值共 4 个 `interface{}`，根据上述知识，应该对应 8 个 `0x...`，我们看错误栈第 7 行，确实是 8 个值，其中第 3、4 个 `0x...` 正好对应 `request interface{}`，因此我们初步断定是传参 `request` 为 nil。

      ![image](/img/blog/Kitex_self_check/io_err_handler.png)

   4. 我们继续看栈，发现 `IOErrorHandlerMW` 的调用者，对应的 `0x0`, `0x0` 同样对应 `request`，因此可以断定，请求参数 `request` 传入的是 nil。

### 检查代码排查空指针

如果按照上一小节的方法排查，没有发现 `0x0` 的参数，则说明空指针不是在传入的参数上。

这时候我们通过排除法，把报错所在行的代码，排除使用的传入参数，剩下的参数中则存在 panic。

例如：

```go
KITEX: processing request error, remote=10.76.40.175:52880, err=panic: [happened in biz handler] runtime error: invalid memory address or nil pointer dereference
goroutine 114 [running]:
runtime/debug.Stack(0xbc3655, 0x1c, 0xc0003d3560)
        /usr/local/go/src/runtime/debug/stack.go:24 +0x9d
xxx/kitex/server.(*server).invokeHandleEndpoint.func1.1(0xc0003d38f8, 0xcb4340, 0xc000284af0, 0xcb2000, 0xc0000987e0)
        /home/tiger/go/pkg/mod/xxx/kitex@v1.1.10/server/server.go:196 +0x141
panic(0xaec120, 0x1172dd0)
        /usr/local/go/src/runtime/panic.go:969 +0x166
main.(*EchoServerImpl).Echo(0x11b54b0, 0xcb2000, 0xc0000987e0, 0xc000283d40, 0x11b54b0, 0xc0003aca28, 0xcaef01)
        /home/tiger/go/src/xxx/performancetest/handler.go:18 +0x6d
xxx/performancetest/kitex_gen/echo/echoserver.echoHandler(0xcb2000, 0xc0000987e0, 0xadc1c0, 0x11b54b0, 0xb7dd80, 0xc000286520, 0xb7dec0, 0xc000286528, 0xc0000986f0, 0xae9c60)
        /home/tiger/go/src/xxx/performancetest/kitex_gen/echo/echoserver/echoserver.go:37 +0xa4
```

如上 panic 栈没有找到 `0x0`，因此我们直接看 `handler.go:18` 相关代码

![image](/img/blog/Kitex_self_check/echo_server_2.png)

第 18 行使用了 `a` 和 `req` 两个参数，因为 `req`是传入参数，且不是 `0x0`，因此排除 nil 嫌疑，那么空指针一定是 `a`。

再通过浏览代码，我们得出结论，`a` 在获取时没有空指针判断，导致引入空指针 panic。

## Map 并发操作

Map 并发操作属于不可挽回的错误，因此系统会直接 crash，无法 recover。

这里没有什么快速定位方法，只能建议先找到报错的 Map，然后再去看这个 Map 在哪里有并发的操作，并加锁或重新设计逻辑，来解除并发问题。

## 业务逻辑导致框架 Panic

### 为什么业务逻辑会导致框架 Panic

部分 panic，确实是由框架中间件(MW) 抛出，但是绝大多数情况下并不是框架本身有 bug，而是框架接收了由业务传递来的异常值。

框架的中间件(MW) 包装在代码逻辑的最外层，业务代码的一些行为，如传入 `nil request` 或者返回 `nil response` ，会造成框架处理时发生 panic。

但是框架无法修复这类 panic，因为框架不是万能的，处理边界条件会浪费计·算资源，框架希望业务代码也是能够保证一定质量的，因此这类 panic 最终还是需要业务代码做调整。

### 怎么判断是否是业务逻辑造成框架 Panic

**如果错误栈里出现调用业务代码，请先排查是否是业务返回值造成的 panic** 

常见情况有：

1. 业务自定义中间件，修改传递参数，造成 panic
2. 业务返回自定义的 `response` 或者自定义的`error`
3. ...

## 特殊情况

### RPC 调用时并发/异步复用 request/response 导致并发读写进而导致 panic

- **典型的 panic 报错如：`runtime error: slice bounds out of range [12:28]`，这是因为数据被并发修改后本身不一致导致框架读写的时候越界了**
  - **例如原本有个 `slice` 长度为 5 传给了框架，因为业务逻辑并发复用赋值为一个长度为 8 的 `slice`，但是由于赋值非原子操作，框架刚好在只有长度被拷贝的时候进行了读写，就会出这种问题。**

- 框架在调用时可能会修改 `request` 里的数据，在调用完成前在其他 `goroutie` 使用同一个 `request`（包括其中的字段）会有并发读写的风险 
  - 框架的 RPC 超时设计采用经典的 `select-wait` 模式，当前 `goroutine` 会在特定超时时间内等待创建的另一个 `goroutine` 去执行序列化和网络传输的工作；如果后者没有在规定时间内返回，前者就会直接返回给调用者一个超时错误，而此时后者可能仍然在读写 `request`。

- 另外就是池化 `request`、`response` 或者直接创建多个 `goroutine` 对同一个对象的访问，都会有问题。

  - 下面是几个例子：

    ```go
    // example 1：复用同一个 request 或者 response 导致的并发读写
    var cli := ...
    var ctx := ...
    var req := ...
    for {
        resp, err := cli.InvokeAMethod(ctx, req)
        req.ID++ // 如果 err != nil，此处是有并发读写的风险
    }
    
    // example 2：池化 request 或者 response 导致的并发读写
    var pool sync.Pool = ...
    for {
        req := pool.Get().(*SomeRequest)
        cli.InvokeAMethod(ctx, req)
        pool.Put(req) // 此处放入的 request 可能仍然被框架引用着
    }
    
    // example 3：直接的并发读写
    var req := ...
    go func() {
        cli.InvokeAMethod(ctx, req)
    }()
    
    go func() {
        cli.InvokeAMethod(ctx, req) // 与前一个 goroutine 有数据竞争
    }()
    ```

- 常见的 panic 位置（包括但不限于）：
  - `Request` 类型的 `FastWrite` 或 `FastWriteNocopy` 方法
  - `Response` 类型的 `FastRead` 方法

- 如果服务端出现 `FastRead painc`，如果排除了外部的数据影响（例如 `bytediff` 或者其他代理类的流量重放、修改），那么一个可能的原因就是上游的数据有并发读写导致序列化后的数据错乱，影响服务端的反序列化。
  - `Response` 类型的 `FastWrite` 方法

### 异步使用 RPCInfo

将 `handler` 方法的 `context` 参数传递到 `handler` 外使用并尝试获取诸如 `RPCInfo` 这样的数据导致 panic。

## 已知升级框架版本可解决的 Panic

- （< `v0.4.1` 可能触发）**Server 启动异常时，shutdown 时出现 Panic** 

  **根因并不是框架 panic 导致的**，而是因为由于端口被占用等情况导致服务启动失败，被 shutdown 的时候引起了 kitex 的 panic ，进而有可能导致根因的日志被 panic 替代，所以看不出原因。修复 PR：[#488](https://xxx/pull/488)。

- （< `v0.2.0` 可能触发）**启用重试 && panic 栈中有 `fastRead`**

  可能是早期版本的bug，可以尝试升级看看是否能解决。
