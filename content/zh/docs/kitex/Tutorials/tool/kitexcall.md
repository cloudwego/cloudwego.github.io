---
title: "kitexcall: 发送 JSON 格式 RPC 请求的 CLI 工具"
date: 2024-05-27
weight: 1
description: >
---

**kitexcall**(https://github.com/kitex-contrib/kitexcall) 是一个命令行工具（CLI），用于使用 Kitex 发送 JSON 通用请求。它支持Thrift和Protobuf格式的IDL及多种客户端选项，并兼容多种传输协议，未来还将支持GRPC。

## **功能特点**

- **支持 Thrift/Protobuf**：支持 Thrift/Protobuf 格式的 IDL。
- **支持多种传输协议**：支持 Buffered、TTHeader、Framed、TTHeaderFramed 传输协议，未来也计划支持 GRPC（Protobuf 及 Thrift Streaming）
- **支持常用客户端选项**：支持指定常用的客户端选项，例如 `client.WithHostPorts` 等。
- **支持手动从命令行和本地文件输入数据**：请求数据可以从命令行参数或本地文件读取。
- **支持元信息传递**：支持发送单跳透传（WithValue）和持续透传（WithPersistentValue）的元信息，并支持接收 server 返回的反向透传元信息（Backward）。
- **支持接收业务自定义异常**：接收业务自定义的异常错误码、错误信息及附加信息。
- **支持多种输出格式**：默认情况下输出人类友好的可读格式，计划支持可解析的格式，以便与其他自动化工具更好地集成。

## **安装**

```bash
go install github.com/kitex-contrib/kitexcall@latest
```

## **使用说明**

### 基本用法

使用 `kitexcall` 工具时，需要指定多个必选参数，包括 IDL 文件的路径、方法名以及要发送的数据。示例：

对应的 IDL 文件:

```python
// echo.thrift

namespace go api

struct Request {
        1: string message
}

struct Response {
        1: string message
}

service Echo {
    Response echo(1: Request req)
}
```

创建input.json文件指定json格式请求数据：

```python
{
    "message": "hello"
}
```

对应的 server:

```python
var _ api.Echo = &EchoImpl{}

// EchoImpl implements the last service interface defined in the IDL.
type EchoImpl struct{}

// Echo implements the Echo interface.
func (s *EchoImpl) Echo(ctx context.Context, req *api.Request) (resp *api.Response, err error) {
    klog.Info("echo called")
    return &api.Response{Message: req.Message}, nil
}

func main() {
    svr := echo.NewServer(new(EchoImpl))
    if err := svr.Run(); err != nil {
        log.Println("server stopped with error:", err)
    } else {
        log.Println("server stopped")
    }
}
```

- 直接指定请求数据：

```bash
kitexcall -idl-path echo.thrift -m echo -d '{"message": "hello"}' -e 127.0.0.1:9999
```
输出：
```
[Status]: Success
{
    "message": "hello"
}
```

- 从文件读入请求数据：

```bash
kitexcall -idl-path echo.thrift -m echo -d '{"message": "hello"}' -e 127.0.0.1:9999 -f input.json
```
输出：
```
[Status]: Success
{
    "message": "hello"
}
```

### 命令行选项

支持以下选项：

- `-help` 或 `-h`：输出使用说明。
- `-type` 或 `-t`：指定 IDL 类型：`thrift` 或 `protobuf`，支持通过 IDL 文件类型推测，默认是 `thrift`。
- `-idl-path` 或 `-p`：指定 IDL 文件的路径。
- `-method` 或 `-m`：必选，指定方法名，格式为 `IDLServiceName/MethodName` 或仅为 `MethodName`。当 server 端开启了 MultiService 模式时，必须指定 `IDLServiceName`，同时指定传输协议为 TTHeader 或 TTHeaderFramed 。
- `-file` 或 `-f`：指定输入文件路径，必须是 JSON 格式。
- `-data` 或 `-d`：指定要发送的数据，格式为 JSON 字符串。
- `-endpoint` 或 `-e`：指定服务器地址，可以指定多个。
- `-transport`：指定传输协议类型。可以是 `TTHeader`、`Framed` 或 `TTHeaderFramed`，如不指定则为默认的 `Buffered`。
- `-biz-error`：启用客户端接收 server 返回的业务错误。
- `-meta`：指定传递给 server 的单跳透传元信息。可以指定多个，格式为 key=value。
- `-meta-persistent`：指定传递给 server 的持续透传元信息。可以指定多个，格式为 key=value。
- `-meta-backward`：启用从服务器接收反向透传元信息。
- `-verbose` 或 `-v`：启用详细模式。

### 详细描述

#### IDL 类型

使用 `-type` 或 `-t` 标志指定 IDL 类型。支持的类型有 `thrift` 和 `protobuf`，默认为 `thrift`。

```python
kitexcall -t thrift
```

#### IDL 路径

使用 `-idl-path` 或 `-p` 标志指定 IDL 文件的路径。

```python
kitexcall -idl-path /path/to/idl/file.thrift
```

#### 要调用的方法（必选）

使用 `-method` 或 `-m` 标志指定方法名。格式可以是 `IDLServiceName/MethodName` 或仅为 `MethodName`。当服务器端开启了 MultiService 模式时，必须指定 `IDLServiceName`，同时指定传输协议为 `TTHeader` 或 `TTHeaderFramed`。

```python
kitexcall -m GenericService/ExampleMethod
kitexcall -m ExampleMethod
```

#### 请求数据

使用 `-data` 或 `-d` 标志指定要发送的数据，数据应为 JSON 格式的字符串。或者，使用 `-file` 或 `-f` 标志指定包含数据的 JSON 文件。

假设我们要发送的数据为 `{"message": "hello"}`，我们可以这样指定数据：

```bash
kitexcall -m ExampleMethod -d '{"message": "hello"}'
```

或者，我们可以将数据保存在 JSON 文件中，比如 `input.json`，然后指定文件路径：

```bash
kitexcall -m ExampleMethod -f input.json
```

#### 服务器地址

使用 `-endpoint` 或 `-e` 标志指定一个或多个 server 地址。

假设我们有两个 server 地址 `127.0.0.1:9919` 和 `127.0.0.1:9920`，我们可以这样指定 server 地址：

```bash
kitexcall -m ExampleMethod -e 127.0.0.1:9919 -e 127.0.0.1:9920
```

#### 元信息

- 单跳透传（WithValue）：使用 `-meta` 标志指定，可以指定多个，格式为 `key=value`。
- 持续透传（WithPersistentValue）：使用 `-meta-persistent` 标志指定。可以指定多个，格式为 `key=value`。
- 反向透传元信息（Backward）：启用 `-meta-backward` 选项支持接收 server 返回的反向透传元信息（Backward）。

假设想要传递单跳透传元信息 `temp=temp-value` 和持续透传元信息 `logid=12345` 给 server，并接收来自反向透传元信息，可以这样指定：

```bash
kitexcall -m ExampleMethod -meta temp=temp-value -meta-persistent logid=12345 -meta-backward
```

#### 业务异常

如果 server 返回业务异常，可以通过 `-biz-error` 标志启用客户端接收业务自定义的异常错误码、错误信息及附加信息。

假设服务器返回业务错误状态码 `404` 和消息 `not found`，我们可以这样启用业务错误处理：

```bash
kitexcall -m ExampleMethod -biz-error
```

#### 启用详细模式

使用 `-verbose` 或 `-v` 标志启用详细模式，以提供更详细的输出信息。
