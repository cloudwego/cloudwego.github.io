---
title: "kitexcall: the CLI tool for sending RPC call in JSON format"
date: 2024-05-27
weight: 1
description: >
---

**kitexcall**(https://github.com/kitex-contrib/kitexcall)  is a command-line tool (CLI) for sending JSON generic requests using Kitex. It supports IDL in both Thrift and Protobuf formats, offers various client options, and is compatible with multiple transport protocols. Future versions will also support GRPC.

## Features

- **Supports Thrift/Protobuf:** It supports IDL in Thrift/Protobuf formats.
- **Supports Multiple Transport Protocols:** It supports transport protocols like Buffered, TTHeader, Framed, and TTHeaderFramed, with plans to support GRPC (Protobuf and Thrift Streaming) in the future.
- **Supports Common Client Options:** It allows specify common client options, such as client.WithHostPorts, etc.
- **Supports manual data input from the command line and local files:** Request data can be read from command line arguments or local files.
- **Supports Metadata Passing:** It supports sending transient keys (WithValue) and persistent keys (WithPersistentValue), and also supports receiving backward metadata (Backward) returned by the server.
- **Supports Receiving Business Custom Exceptions:** It can receive business custom exception error codes, error messages, and additional information.
- **Supports Multiple Output Formats:** By default, it outputs a human-friendly readable format, and plans to support parseable formats for better integration with other automation tools.

## Installation

```bash
go install github.com/kitex-contrib/kitexcall@latest
```

## Usage

### Basic Usage

When using the kitexcall tool, you need to specify several required arguments, including the path to the IDL file, the method name, and the data to be sent. Example:

- IDL file：

```thrift
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

- Creating a file input.json specifying JSON format request data:

```json
{
    "message": "hello"
}
```

- Server:

```go
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

- Directly specifying request data:

```bash
kitexcall -idl-path echo.thrift -m echo -d '{"message": "hello"}' -e 127.0.0.1:9999
```
Output:
```
[Status]: Success
{
    "message": "hello"
}
```

- Or reading request data from a file:

```bash
kitexcall -idl-path echo.thrift -m echo -e 127.0.0.1:9999 -f input.json
```
Output:
```
[Status]: Success
{
    "message": "hello"
}
```

### Command Line Options

- `-help` or `-h`: Outputs the usage instructions.
- `-type` or `-t`: Specifies the IDL type: thrift or protobuf. It supports inference based on the IDL file type. The default is thrift..
- `-idl-path` or `-p`: Specifies the path to the IDL file.
- `-include-path`: Add a search path for the IDL. Multiple paths can be added and will be searched in the order they are added.
- `-method` or `-m`: Required, specifies the method name in the format IDLServiceName/MethodName or just MethodName. When the server side has MultiService mode enabled, IDLServiceName must be specified, and the transport protocol must be TTHeader or TTHeaderFramed.
- `-file` or `-f`: Specifies the input file path, which must be in JSON format.
- `-data` or `-d`: Specifies the data to be sent, in JSON string format.
- `-endpoint` or `-e`: Specifies the server address, multiple can be specified.
- `-transport`: Specifies the transport protocol type. It can be TTHeader, Framed, or TTHeaderFramed. If not specified, the default is Buffered.
- `-biz-error`: Enables the client to receive business errors returned by the server.
- `-meta`: Specifies one-way metadata passed to the server. Multiple can be specified, in the format key=value.
- `-meta-persistent`: Specifies persistent metadata passed to the server. Multiple can be specified, in the format key=value.
- `-meta-backward`: Enables receiving backward metadata (Backward) returned by the server.
- `-q`: Only output JSON response, no other information.
- `-verbose` or `-v`: Enables verbose mode for more detailed output information.

### Detailed Description

#### IDL Type

Use the `-type` or `-t` flag to specify the IDL type. Supported types are thrift and protobuf, with a default of thrift.

```bash
kitexcall -t thrift
```

#### IDL Path

Use the `-idl-path` or `-p` flag to specify the path to the IDL file.

```bash
kitexcall -idl-path /path/to/idl/file.thrift
```

#### Method to Call (Required)

Use the `-method` or `-m` flag to specify the method name. The format can be IDLServiceName/MethodName or just MethodName. When the server side has MultiService mode enabled, IDLServiceName must be specified, and the transport protocol must be TTHeader or TTHeaderFramed.

```bash
kitexcall -m GenericService/ExampleMethod
kitexcall -m ExampleMethod
```

#### Request Data

Use the `-data` or `-d` flag to specify the data to be sent, which should be a JSON formatted string. Alternatively, use the `-file` or `-f` flag to specify the path to a JSON file containing the data.

Assuming we want to send the data `{"message": "hello"}`, we can specify the data like this:

```bash
kitexcall -m ExampleMethod -d '{"message": "hello"}'
```

Or, we can save the data in a JSON file, such as input.json, and then specify the file path:

```bash
kitexcall -m ExampleMethod -f input.json
```

#### Server Address

Use the `-endpoint` or `-e` flag to specify one or more server addresses.

Assuming we have two server addresses, 127.0.0.1:9919 and 127.0.0.1:9920, we can specify the server addresses like this:

```bash
kitexcall -m ExampleMethod -e 127.0.0.1:9919 -e 127.0.0.1:9920
```

#### Metadata

- Transient keys (WithValue): Use the `-meta` flag to specify, multiple can be specified, in the format key=value.
- Persistent keys (WithPersistentValue): Use the `-meta-persistent` flag to specify. Multiple can be specified, in the format key=value.
- Backward metadata (Backward): Enable the `-meta-backward` option to support receiving backward metadata (Backward) returned by the server.

Assuming we want to pass Transient  metadata `temp=temp-value` and persistent metadata `logid=12345` to the server and receive backward metadata, we can specify it like this:

```bash
kitexcall -m ExampleMethod -meta temp=temp-value -meta-persistent logid=12345 -meta-backward
```

#### Business Exceptions

If the server returns a business exception, you can enable the client to receive business custom exception error codes, error messages, and additional information through the `-biz-error` flag.

Assuming the server returns a business error status code 404 and message `not found`, we can enable business error handling like this:

```bash
kitexcall -m ExampleMethod -biz-error
```

#### Enable Verbose Mode

Use the `-verbose` or `-v` flag to enable verbose mode, providing more detailed output information.
