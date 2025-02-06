---
title: "Log"
linkTitle: "Log"
weight: 4
keywords: ["Log"]
description: "Third party extensions for logging provided by Hertz."
---

Currently, hlog supports the extended use of zap, logrus, zerolog, and slog, and Hertz provides the `SetLogger` interface for injecting user-defined logger implementations.

## Prints the log and specifies the field of the log

Taking zerolog as an example, such a function is implemented in zerolog:

```go
package main

import (
    "bytes"
    "github.com/cloudwego/hertz/pkg/common/json"
    hertzZerolog "github.com/hertz-contrib/logger/zerolog"
)

func main() {
    b := &bytes.Buffer{}
    l := hertzZerolog.New(hertzZerolog.WithField("service", "logging"))
    l.SetOutput(b)

    l.Info("foobar")

    type Log struct {
        Level   string `json:"level"`
        Service string `json:"service"`
        Message string `json:"message"`
    }

    log := &Log{}

    err := json.Unmarshal(b.Bytes(), log)//log.service=="logging"
}
```

However, such functions are not directly implemented in zap and logrus, and the original option needs to be added manually

Take zap as an example:

```go
package main

import (
	"bytes"
	"github.com/cloudwego/hertz/pkg/common/json"
	hertzzap "github.com/hertz-contrib/logger/zap"
	"go.uber.org/zap"
)

func main() {
	b := &bytes.Buffer{}
	l := hertzzap.NewLogger(hertzzap.WithZapOptions(zap.Fields(zap.String("service", "logging"))))
	l.SetOutput(b)

	l.Info("foobar")

	type Log struct {
		Level   string `json:"level"`
		Service string `json:"service"`
		Message string `json:"message"`
	}

	log := &Log{}

	err := json.Unmarshal(b.Bytes(), log) //log.service=="logging"
}
```
