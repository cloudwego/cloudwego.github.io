---
title: "Error Handle"
date: 2023-04-18
weight: 10
description: >

---

## Error

The Error struct in Hertz:

```go
type Error struct {
   Err  error
   Type ErrorType
   Meta interface{}
}
```

 `Err` is standard error, `Type` is the type of error, `Meta` is the metadata.

### Error Type

In order to handle errors more efficiently, Hertz has predefined the following error types:

```go
// Error in binding process 
ErrorTypeBind ErrorType = 1 << iota
// Error in rendering process
ErrorTypeRender
// Hertz private errors that business need not be aware
ErrorTypePrivate
// Hertz public errors that require external perception as opposed to Private
ErrorTypePublic
// Other Error
ErrorTypeAny
```

It is recommended to define the corresponding errors according to the error type.

### Custom Error

Using the following functions:

```go
// shortcut for creating a public *Error from string
func NewPublic(err string) *Error {
   return New(errors.New(err), ErrorTypePublic, nil)
}

// shortcut for creating a private *Error from string
func NewPrivate(err string) *Error {
   return New(errors.New(err), ErrorTypePrivate, nil)
}

func New(err error, t ErrorType, meta interface{}) *Error {
   return &Error{
      Err:  err,
      Type: t,
      Meta: meta,
   }
}

func Newf(t ErrorType, meta interface{}, format string, v ...interface{}) *Error {
	return New(fmt.Errorf(format, v...), t, meta)
}

func NewPublicf(format string, v ...interface{}) *Error {
	return New(fmt.Errorf(format, v...), ErrorTypePublic, nil)
}

func NewPrivatef(format string, v ...interface{}) *Error {
	return New(fmt.Errorf(format, v...), ErrorTypePrivate, nil)
}
```

### Relevant functions

| signature                        | description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| SetType(flags ErrorType) *Error  | set the `ErrorType` to the given `flags`                    |
| Error() string                   | implement the `error` interface                             |
| Unwrap() error                   | throw an error                                              |
| SetMeta(data interface{}) *Error | set the `Meta` to the given `data`                          |
| IsType(flags ErrorType) bool     | determine whether the `ErrorType` matches the given `flags` |
| JSON() interface{}               | convert the error to a `json` object                        |

## ErrorChain

In addition to the conventions for error definition, the framework also provides ErrorChain capability. As the name implies, it is easy for the business to bind all errors encountered on a request processing to the error chain, which can facilitate the subsequent (usually in the middleware) unified processing of all errors.

### Relevant functions

| signature                        | description                                                  |
| -------------------------------- | ------------------------------------------------------------ |
| String() string                  | return a human-readable text for displaying all errors       |
| Errors() []string                | convert the `ErrorChain` to an array of standard errors      |
| ByType(typ ErrorType) ErrorChain | return the corresponding sub-`ErrorChain` for the given error type |
| Last() *Error                    | return the last error                                        |
| JSON() interface{}               | convert all errors to a `json` object                        |

### How To Use

The corresponding API is: `RequestContext.Error(err)`, and calling this API will tie the err to the corresponding request context.

Method to get all the errors that have been bound by the request context: `RequestContext.Errors`.

```go
// go run this code and use your browser to access localhost:80880/error
package main

import (
	"context"
	"errors"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

func main() {
	h := server.New(server.WithHostPorts(":8080"))

	h.GET("/error", handle1, handle2, handle3)

	h.Spin()
}

func handle1(_ context.Context, c *app.RequestContext) {
	_ = c.Error(errors.New("first err"))
}

func handle2(_ context.Context, c *app.RequestContext) {
	_ = c.Error(errors.New("second err"))
}

func handle3(_ context.Context, c *app.RequestContext) {
    c.JSON(consts.StatusOK, c.Errors.Errors())
}
```
