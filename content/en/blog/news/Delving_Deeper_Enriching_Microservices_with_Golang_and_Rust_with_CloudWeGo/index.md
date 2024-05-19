---
date: 2024-02-21
title: "Delving Deeper: Enriching Microservices with Golang with CloudWeGo"
projects: ["CloudWeGo"]
linkTitle: "Delving Deeper: Enriching Microservices with Golang with CloudWeGo"
keywords:
  [
    "CloudWeGo",
    "middleware",
    "Kitex",
    "Netpoll",
    "Golang",
    "Volo",
    "rust",
    "microservice framework",
    "ByteDance Open Source",
    "ByteDance",
    "open source",
    "cloud native",
    "open source",
    "gRPC",
    "microservices",
    "rpc",
    "thrift",
  ]
description: "Delve into CloudWeGo's Kitex through practical examples, where high performance and extensibility redefine microservice excellence."
author: <a href="https://github.com/yy2so" target="_blank">Yacine Si Tayeb</a>
---

What if there existed an RPC framework that provided not only high performance and extensibility but also a robust suite of features and a thriving community support?

CloudWeGo, a high-performance extensible Golang and Rust RPC framework originally developed and open-sourced by [ByteDance](https://opensource.bytedance.com), has caught my eye as it fits the bill perfectly.

![Image](/img/blog/Delving_Deeper_Enriching_Microservices_with_Golang_and_Rust_with_CloudWeGo/1.jpeg)

## CloudWeGo VS Other RPC Frameworks

While [gRPC](https://grpc.io) and [Apache Thrift](https://thrift.apache.org) have served the microservice architecture well, [CloudWeGo](https://www.cloudwego.io)'s advanced features and performance metrics set it apart as a promising open source solution for the future.

Built for the modern development landscape by embracing both [Golang](https://go.dev) and [Rust](https://www.rust-lang.org), CloudWeGo delivers advanced features and excellent performance metrics. As proof of its performance, benchmark tests have shown that [Kitex surpasses gRPC by over 4 times in terms of QPS and latency, with a throughput increased by 51% - 70%](https://github.com/cloudwego/kitex-benchmark) in terms of QPS (Queries Per Second) and latency.

This equips developers with a tool that doesn't just meet but decidedly surpasses the performance requirements of modern microservices. Let's delve into some specific use cases to understand CloudWeGo's potential.

### Bookinfo: A Tale of Traffic Handling

Consider the case of Bookinfo, a sample application provided by [Istio](https://istio.io), rewritten using CloudWeGo's [Kitex](/docs/kitex/) for superior performance and extensibility.

This use case is illustrative of how traffic-heavy services can significantly benefit from CloudWeGo's performance promise. This integration also demonstrates how CloudWeGo stands above traditional Istio service mesh when it comes to traffic handling and performance.

![Image](/img/blog/Delving_Deeper_Enriching_Microservices_with_Golang_and_Rust_with_CloudWeGo/2.jpeg)

With Kitex and [Hertz](/docs/hertz/) handling traffic redirection, the Bookinfo project can manage high traffic volumes efficiently, ensuring swift responses and a better user experience.

```go
import (
  "github.com/cloudwego/kitex/server"
)

func main() {
  svr := echo.NewServer(new(EchoImpl), server.WithName("echo"))
  listener, _ := net.Listen("tcp", ":8888")
  svr.Serve(listener)
}
```

The above code snippet is a simplified example of how the Bookinfo project can be rewritten using Kitex for better performance.

### Easy Note: The Magic of Simplicity

CloudWeGo's commitment to simplifying complex tasks shines in its application to the Easy Note project. It leverages CloudWeGo to implement a full-process traffic lane. The note-taking platform needs to be responsive and efficient, a need fulfilled by CloudWeGo's high-performance networking library, [Netpoll](/docs/netpoll/).

![Image](/img/blog/Delving_Deeper_Enriching_Microservices_with_Golang_and_Rust_with_CloudWeGo/3.jpeg)

The integration of CloudWeGo has elevated the Easy Note application to compete effectively with other note-taking platforms, proving how simplicity can indeed lead to power.

```go
import (
  "github.com/cloudwego/kitex/server"
)

type RPCService struct{}

func (s *RPCService) Handle(ctx context.Context, req *Request) (*Response, error) {
  resp := &Response{Message: "Echo " + req.Message}
  return resp, nil
}

func main() {
  rpcHandler := &RPCService{}
  svr := server.NewServer(rpcHandler)
  listener, _ := net.Listen("tcp", ":8888")
  svr.Serve(listener)
}
```

The snippet above gives a glimpse of how CloudWeGo helps to enhance the efficiency of the Easy Note application.

### Book Shop: E-Commerce Made Easy

In the bustling e-commerce landscape, Book Shop stands as a testament to CloudWeGo's capacity for seamless integration. Integrating middleware like [Elasticsearch](https://www.elastic.co/elasticsearch) and [Redis](https://redis.io) into a Kitex project to build a solid e-commerce system that rivals more complex platforms.

![Image](/img/blog/Delving_Deeper_Enriching_Microservices_with_Golang_and_Rust_with_CloudWeGo/4.jpeg)

CloudWeGo's ability to effectively integrate with popular technologies like Elasticsearch and Redis ensures that businesses need not compromise on choosing an open-source RPC framework.

```go
import (
  "github.com/cloudwego/kitex/server"
)

type ItemService struct {}

func (s *ItemService) AddItem(ctx context.Context, item *Item) error {
  // Add to Elasticsearch
  // Add to Redis
  // Return error if any
  return nil
}

func main() {
  itemHandler := &ItemService{}
  svr := server.NewServer(itemHandler)
  listener, _ := net.Listen("tcp", ":8888")
  svr.Serve(listener)
}
```

The above snippet is a basic representation of how the Book Shop e-commerce system operates with CloudWeGo, Elasticsearch, and Redis.

### FreeCar: Driving Innovation

The FreeCar project is an excellent illustration of how CloudWeGo can revamp the operations in a time-sharing car rental system, posing a strong alternative to existing ride-hailing applications.

![Image](/img/blog/Delving_Deeper_Enriching_Microservices_with_Golang_and_Rust_with_CloudWeGo/5.jpeg)

This real-world implementation demonstrates how CloudWeGo's robust features can optimize operations, fostering efficiency and scalability in industries beyond tech.

```go
import (
  "github.com/cloudwego/kitex/server"
)

type CarService struct {}

func (s *CarService) BookRide(ctx context.Context, rideRequest *RideRequest) (*RideConfirmation, error) {
  // Business logic to handle ride booking
  // Return confirmation or error
  return nil, nil
}

func main() {
  rideHandler := &CarService{}
  svr := server.NewServer(rideHandler)
  listener, _ := net.Listen("tcp", ":8888")
  svr.Serve(listener)
}
```

The above snippet is a simplified representation of how FreeCar utilizes CloudWeGo.

## What Draws Me to CloudWeGo?

As I venture further into the landscape of alternative RPC frameworks, and explore the CloudWeGo project, several factors stand out:

- **Performance**: In the world of microservices, performance could mean the difference between success and failure. CloudWeGo shines when it comes to performance, with QPS and latency scores that leave other RPC frameworks trailing.
- **Extensibility**: As a developer, what you'll appreciate most about Kitex is its promise of extensibility, allowing projects to swiftly adapt to growing demands and complexities.
- **Robustness**: The rich feature set of CloudWeGo, including support for multiple message protocols, transport protocols, load balancing, circuit breakers, and rate limiting, offers an all-inclusive solution for designing and managing microservices.
- **Community Support**: The fact that CloudWeGo is backed by ByteDance assures me of strong community support. The wealth of resources and discussions available can solve common issues and support continuous learning.
- **Real-world Applications**: Practical applications in diverse projects demonstrate CloudWeGo’s versatility and scalability, affirming my trust in its effectiveness.

# Embracing the Future of Microservices

With each use case, CloudWeGo's potential becomes increasingly clear. Developers can now build high-performing, extensible, and robust applications, harnessing the true essence of microservices - no matter if they prefer working with Golang or Rust.

If you're considering a new tool for your microservice architecture, especially if you are interested in Rust, [give CloudWeGo a try](/docs/). The future of microservices awaits you.
