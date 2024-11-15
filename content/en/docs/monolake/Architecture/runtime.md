---
title: "Runtime"
linkTitle: "Runtime"
weight: 1
description: "Deep dive into Monolake's io_uring-based runtime and performance characteristics compared to traditional event-based runtimes"
---

## Runtime

In asynchronous Rust programs, a runtime serves as the backbone for executing asynchronous tasks. It manages the scheduling, execution, and polling of these tasks while handling I/O operations efficiently. A well-designed runtime is crucial for achieving optimal performance, particularly in I/O-bound workloads.

Monoio is a new, pure io-uring-based Rust asynchronous runtime that has been specifically designed to maximize efficiency and performance for I/O-bound tasks. By leveraging the advanced capabilities of io-uring directly, Monoio stands apart from other runtimes like Tokio-uring, which may operate on top of additional runtime layers. This direct integration with io-uring allows Monoio to take full advantage of the kernel's asynchronous I/O capabilities, resulting in improved performance metrics and reduced latency.

## Thread-Per-Core Model

One of the defining characteristics of Monoio is its thread-per-core architecture. Each core of the CPU runs a dedicated thread, allowing the runtime to avoid the complexities associated with shared data across multiple threads. This design choice means that users do not need to worry about whether their tasks implement Send or Sync, as data does not escape the thread at await points. This significantly simplifies concurrent programming. In contrast, Tokio utilizes a multi-threaded work-stealing scheduler. In this model, tasks can be migrated between threads, introducing complexities related to synchronization and data sharing. For example, a task scheduled in Tokio might be executed on any available thread, leading to potential context switching overhead. 

## Event Notification vs. Completion-Based Runtimes

When working with asynchronous I/O in Rust, understanding the underlying mechanisms of different runtimes is crucial. Two prominent approaches are the io-uring-based runtimes(Monolake) and the traditional event notification based runtimes (Tokio, async-std) which use mechanisms like kequeue and epoll. The fundamental difference between these two models lies in how they manage resource ownership and I/O operations.

io_uring operates on a submission-based model, where the ownership of resources (such as buffers) is transferred to the kernel upon submission of an I/O request. This model allows for high performance and reduced context switching, as the kernel can process the requests asynchronously. When an I/O operation is completed, the ownership of the buffers is returned to the caller. This ownership transfer leads to several implications:

1. **Ownership Semantics**: In io-uring, since the kernel takes ownership of the buffers during the operation, it allows for more efficient memory management. The caller does not need to manage the lifecycle of the buffers while the operation is in progress.

2. **Concurrency Model**: The submission-based model allows for a more straightforward handling of concurrency, as multiple I/O operations can be submitted without waiting for each to complete. This can lead to improved throughput, especially in I/O-bound applications.

In contrast, Tokio employs systems like kequeue and epoll. In this model, the application maintains ownership of the buffers throughout the lifetime of the I/O operation. Instead of transferring ownership, Tokio merely borrows the buffers, which has several implications:

1. **Buffer Management**: Since Tokio borrows buffers, the application is responsible for managing their lifecycle. This can introduce complexity, especially when dealing with concurrent I/O operations, as developers must ensure that buffers are not inadvertently reused while still in use.

2. **Polling Mechanism**: The polling model in Tokio requires the application to actively wait for events, which can result in increased context switches and potentially less efficient use of system resources compared to the submission-based model of io-uring.

## Async IO Trait divergence

Due to these fundamental differences in how I/O operations are managed, the async I/O traits for Tokio and Monoio diverge significantly. Tokio’s APIs are built around the concepts of futures and asynchronous borrowing, while the io-uring APIs in Monoio follow a submission and completion model that emphasizes ownership transfer. In Tokio’s read/write traits, buffers are borrowed or mutably borrowed. In contrast, Monoio’s async traits involve transferring ownership of the buffers, which are returned to the caller upon completion of the operation.
To achieve this high level of efficiency, Monoio utilizes certain unstable Rust features and introduces a new I/O abstraction that is not compatible with Tokio's async I/O traits, which are the de facto standard in Rust. This new abstraction is represented through the AsyncReadRent and AsyncWriteRent traits:

<div class="code-compare">
  <div class="code-block">
    <h4>Native traits</h4>
{{< highlight rust >}}
pub trait AsyncWriteRent {
    // Required methods
    fn write<T: IoBuf>(
        &mut self,
        buf: T
    ) -> impl Future<Output = BufResult<usize, T>>;
    fn writev<T: IoVecBuf>(
        &mut self,
        buf_vec: T
    ) -> impl Future<Output = BufResult<usize, T>>;
    fn flush(&mut self) -> impl Future<Output = Result<()>>;
    fn shutdown(&mut self) -> impl Future<Output = Result<()>>;
}
pub trait AsyncReadRent {
    // Required methods
    fn read<T: IoBufMut>(
        &mut self,
        buf: T
    ) -> impl Future<Output = BufResult<usize, T>>;
    fn readv<T: IoVecBufMut>(
        &mut self,
        buf: T
    ) -> impl Future<Output = BufResult<usize, T>>;
}
{{< /highlight >}}
  </div>
  <div class="code-block">
    <h4>Tokio traits</h4>
{{< highlight rust >}}
pub trait AsyncRead {
    // Required method
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>
    ) -> Poll<Result<()>>;
}
pub trait AsyncWrite {
    // Required methods
    fn poll_write(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8]
    ) -> Poll<Result<usize, Error>>;
    fn poll_flush(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>
    ) -> Poll<Result<(), Error>>;
    fn poll_shutdown(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>
    ) -> Poll<Result<(), Error>>;
}
{{< /highlight >}}
  </div>
</div>

<style>
.code-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.code-block {
  min-width: 0;
}

.code-block h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}
</style>