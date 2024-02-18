---
title: "Error Handle Best Practice"
linkTitle: "Error Handle Best Practice"
weight: 1
date: 2024-02-18
description: >

---

## Concept Explanation

### RPC Exception

An RPC exception refers to an error that occurs in the RPC (Remote Procedure Call) link, such as a timeout or a lack of downstream instances. These exceptions are typically thrown by the framework and return corresponding RPC error codes. RPC exceptions should not include errors thrown within the business handler, as they are not RPC-related exceptions but rather exceptions specific to the business logic. Therefore, Kitex provides business exceptions for users to set.

### Business Exception

A business exception is used to encapsulate any exception encountered during handling within a handler. Without using a business exception, such exceptions may be recognized as RPC exceptions, potentially triggering RPC error alerts. Business exceptions allow users to pass more detailed error information and can be considered as part of the business logic, such as validating the legitimacy of a user ID. The fields for passing business exceptions are separate from error codes, so users do not need to consider conflicts between status codes.

## How to Use Business Exceptions

To pass business exceptions, you can utilize the business exception functionality provided by Kitex starting from version 1.12.2. Please refer to the Kitex Business Exception Documentation.

### Other Ways to Pass Business Exceptions

Users can also define exceptions in the IDL (Interface Definition Language) and return Thrift exceptions. You can check if a custom exception is present by asserting `e, ok := err.(*xxx.YourException)`.

## Kitex Internal Errors (RPC Exceptions)

Kitex defines errors related to RPC in the following package directory:

`kitex/pkg/kerrors`:

- Defines errors that Kitex core depends on and supports `errors.Is` and `errors.Unwrap`.
- Defines basic error types that can be enriched with detailed causes using `WithCause`.

### Checking if it's a Kitex Internal Error

You can directly check if it's a Kitex internal error using the `kerrors` package's `IsKitexError` function:

```go
import "github.com/cloudwego/kitex/pkg/kerrors"
...
isKitexErr := kerrors.IsKitexError(kerrors.ErrInternalException) // returns true
```

### Checking Specific Error Types

You can use `errors.Is` to check specific error types. For detailed errors, you can check them using the detailed error type. For example:

```go
import "errors"
import "github.com/cloudwego/kitex/client"
import "github.com/cloudwego/kitex/pkg/kerrors"
...
_, err := echo.NewClient("echo", client.WithResolver(nil)) // returns kerrors.ErrNoResolver
...
isKitexErr := errors.Is(err, kerrors.ErrNoResolver) // returns true
```

You can also check based on basic error types, such as:

```go
import "errors"
import "github.com/cloudwego/kitex/client"
import "github.com/cloudwego/kitex/pkg/kerrors"
...
_, err := echo.NewClient("echo", client.WithResolver(nil)) // returns kerrors.ErrNoResolver
...
isKitexErr := errors.Is(err, kerrors.ErrInternalException) // returns true
```

In particular, timeout errors can be checked using the `kerrors` package's `IsTimeoutError` function.

### Getting Detailed Error Information

All specific error types in `kerrors` are of type `DetailedError`. Therefore, you can use `errors.As` to obtain the actual `DetailedError`. For example:

```go
import "errors"
import "github.com/cloudwego/kitex/client"
import "github.com/cloudwego/kitex/pkg/kerrors"
...
_, err := echo.NewClient("echo", client.WithResolver(nil)) // returns kerrors.ErrNoResolver
...
var de *kerrors.DetailedError
ok := errors.As(err, &de) // returns true
if de.ErrorType() == kerrors.ErrInternalException {} // returns true
```

`DetailedError` provides the following methods to obtain more detailed information:

1. `ErrorType() error`: Returns the basic error type.
2. `Stack() string`: Returns the stack trace information (currently only available for `ErrPanic`).

## Error Codes

> **Note: The following error codes correspond to scenarios of RPC request failures.**

Error codes are customizable, and different companies usually have their own practices for error codes. Here, we will only introduce the native error codes in Thrift.

### Thrift Error Codes

This category corresponds to the `Application Exception` errors native to the Thrift framework. These errors will be wrapped by the Kitex framework as `Remote or network error`.

Regarding the error codes reported by the caller:

- < v1.8.0: The caller reports error code 119.
- \>=v1.8.0: Report the corresponding error code below.

(This change was made to unify the handling of error codes returned by the server. It was indeed unreasonable to have some error codes passed through by the server that needed to be recognized by the client, and using 119 universally addressed this inconsistency.)

| **Error Code** | **Name**                    | **Meaning**                      |
| :------------- | :-------------------------- | :------------------------------- |
| 0              | UnknownApllicationException | Unknown error                    |
| 1              | UnknownMethod               | Unknown method                   |
| 2              | InvalidMessageTypeException | Invalid message type             |
| 3              | WrongMethodName             | Incorrect method name            |
| 4              | BadSequenceID               | Incorrect packet sequence number |
| 5              | MissingResult               | Missing result                   |
| 6              | InternalError               | Internal error                   |
| 7              | ProtocolError               | Protocol error                   |