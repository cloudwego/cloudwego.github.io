---
title: "Volo 0.5.4 版本发布"
linkTitle: "Release v0.5.4"
projects: ["Volo"]
date: 2023-08-28
description: >
---

Volo 0.5.4 版本中，除了常规 bugfix 之外，还有一些新的 feature 引入。

## Thrift 协议支持 Unknown Fields

### Motivation

保留 Thrift 解码中未被识别的字段，使用场景比如代理使用IDL的子集解析完整数据，其中未识别的数据将保留成为未识别字段，并透传到下游，可以减少本服务不必要的 IDL 更新或者只解析关心的子集部分。

### Solution

1. 在解码 read 步骤时，对于未识别的字段递归进行skip得到长度后，将对应长度的一段 bytes 直接存入生成的 \_unknown_fields 结构中，省去具体类型的反序列化开销（在 volo 实现中这一块默认是 zerocopy 的实现）。如果是提前把已知字段读完，会直接把剩余 bytes 全存起来，从而不再需要递归解析长度，性能更优。

2. 在编码 write 步骤时，直接将 \_unknown_fields 整块 bytes 写入，省去序列化的开销（在 volo 实现中这一块是 zerocopy 的实现）。

```thrift
struct Test {
    1: required Hello hello,
}

union Hello {
    1: string a,
    2: binary b,
}
```

Pilota 生成代码

```rust
// Generated code
pub struct Test {
    pub hello: Hello,
    pub _unknown_fields: ::pilota::LinkedBytes,
}

pub Enum Hello {
    A(::pilota::FastStr),
    B(::pilota::Bytes),
    _UnknownFields(::pilota::LinkedBytes),
}
```

### How To

在 volo.yml 中对要生成 \_unknown_fields 的 thrift 文件进行配置。

```yaml
entries:
  thrift:
    protocol: thrift
    filename: volo_gen.rs
    idls:
      - source: local
        path: path/to/idl/*.thrift
        keep_unknown_fields: true
```

## Thrift Binary Fast Skip

### Motivation

优化提升 Skip 逻辑的性能，在代理和 Unknown Fields 等场景下 Skip 是关键路径。

### Solution

1. Thrift Binary Protocol Scalar Types 是定长编码，比如 i32 编码 4 Bytes ，那么 map/list/set 和定长类型组成的这些复合类型（Compound Types）就可以特殊处理，比如 list<i32>，按之前的 Skip 算法是 O(n) 操作循环 Skip，可以提前计算总长度直接跳过，算法复杂度变成了 O(1)；

2. 使用循环替换递归；

   1. PS1: 递归一定能改成循环，但循环替换递归未必有性能收益；

   2. PS2：复杂的递归调用改循环还是需要设计一个栈来存储中间状态，栈设计的好坏直接影响性能收益；

cargo bench 性能对比：

```
cargo bench result(the old version is baseline):
 Thrift Binary Skip Bench/binary_unsafe skip list<i32>
                        time:   [32.492 ns 32.665 ns 32.859 ns]
                        change: [-93.907% -93.787% -93.682%] (p = 0.00 < 0.05)
                        Performance has improved.
Found 7 outliers among 100 measurements (7.00%)
  4 (4.00%) high mild
  3 (3.00%) high severe

Thrift Binary Skip Bench/binary_unsafe skip struct
                        time:   [342.44 ns 346.33 ns 350.27 ns]
                        change: [-6.1207% -4.4530% -2.6464%] (p = 0.00 < 0.05)
                        Performance has improved.
Found 10 outliers among 100 measurements (10.00%)
  5 (5.00%) high mild
  5 (5.00%) high severe
```

## Hot Restart

### Motivation

支持hot restart升级对于维护系统可用性、最大限度地减少停机时间以及在升级过程中提供无缝的用户体验至关重要。在字节主要在sidecar热升级使用。

### Solution

热重启的关键是如何使两个不同的进程共享同一个 TCP / UNIX Domain Socket。如果是新旧进程是父子进程关系，由于 fork 创建子进程会拷贝文件描述符表，那父进程可以简单的通过Env环境变量告知子进程监听的Listener Fd，子进程直接通过fd创建socket即可，这个代表是Nginx。我们遇到的场景或者说考虑更通用的场景，一般也有两种解法：

1. 通过SO_REUSEADDR 和 SO_REUSEPORT

   1. 如果只需要监听 TCP / UDP 端口，可以直接在监听时开启 SO_REUSEADDR 与 SO_REUSRPORT。当两个 进程同时监听在一个地址上时，内核会自动在两个主进程之间做 round-robin。

2. 通过SCM_RIGHTS

   1. UNIX/LINUX环境下，我们可以使用 UNIX Domain Socket 和 SCM_RIGHTS 机制在应用程序之间传递文件描述符；

通过UDS除了通用性更佳外，还有一个好处是可以发送更多信息，丰富扩展功能（比如通知旧进程关闭的时机，比如链接热迁移等等），开源使用SCM_RIGHTS 方案的代表有Envoy、Mosn，我们这次也采用这个方案。一些关键步骤如下：

1.  要使用热重启，需要初始化热重启机制。

2.  该进程首先尝试连接到 parent_sock。如果连接失败，则说明该进程是原来的父进程。这种情况下，进程应该绑定 parent_sock 和 parent_handle，等待子进程发送消息。

3.  如果子进程成功连接到 parent_sock，它将使用 dup_parent_listener_sock 复制文件描述符。

4.  一旦所有监听器套接字都被复制，子进程就会向父进程发送终止父进程请求，父进程收到请求后启动终止信号（kill sigterm）并走gracefully exit流程完全退出进程。

### How To

在 Server 启动（run）前初始化 hotrestart 即可，code example：

```rust
#[volo::main]
async fn main() {
    let addr: SocketAddr = "[::]:8080".parse().unwrap();

    // hotrestart initialize
    volo::hotrestart::DEFAULT_HOT_RESTART
        .initialize(Path::new("/tmp"), 1)
        .await
        .unwrap();

    volo_gen::nthrift::test::idl::LearnServiceServer::new(S)
        .byted()
        .run(addr)
        .await
        .unwrap();
}
```

注意事项：

1. volo热升级不仅仅支持Volo-Thrift 使用，也支持Volo-gRPC使用，未来基于volo的Server理论上都可以支持；

2. initialize 方法两个参数：

   1. sock_dir_path: 存储 hot_restart 使用的UDS监听地址父目录，一般由托管进程分配地址，注意隔离性（尤其是物理机等非隔离环境下运行使用）；

   2. server_listener_num: 总共server监听数量，指启动的基于volo的server listener数量，一般服务只有一个server，比如Volo-Thrift Server，设置1即可；

## 完整 Release Note

完整的 Release Note 可以参考：[Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.5.0...volo-0.5.4)
