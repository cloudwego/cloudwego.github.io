---
title: "Error Handle"
date: 2022-05-23
weight: 6
description: >

---

## Error type

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

## Relevant interfaces

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
```

## ErrorChain

In addition to the conventions for error definition, the framework also provides ErrorChain capability. As the name implies, it is easy for the business to bind all errors encountered on a request processing to the error chain, which can facilitate the subsequent (usually in the middleware) unified processing of all errors.
The corresponding API is: `RequestContext.Error(err)`, and calling this API will tie the err to the corresponding request context.

Method to get all the errors that have been bound by the request context: `RequestContext.Errors` (ErrorChain). ErrorChain currently provides the following API:

```text
ByType：Return the corresponding sub-error chain by error type
Errors：Converting error chains to standard error arrays
JSON：Convert all errors to json objects
Last： Return the last or latest error
String：Show all errors in readable text
```
