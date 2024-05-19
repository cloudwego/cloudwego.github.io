---
title: "commands"
linkTitle: "commands"
weight: 1
description: >
---

## Basic Commands

Use `cwgo api-list -h` to view usage details:

```sh
NAME:
   cwgo api-list - analyze router codes by golang asy

                   Examples:
                     cwgo api --project_path ./


USAGE:
   cwgo api-list [command options] [arguments...]

OPTIONS:
   --project_path value              Specify the project path.
   --hertz_repo_url value, -r value  Specify the url of the hertz repository you want (default: github.com/cloudwego/hertz)
   --help, -h                        show help (default: false)
```

## Specification

- **project_path**: Specify the project root path(where `go.mod` located)

- **hertz_repo_url**: Specify the url of the hertz repository you want, default: `github.com/cloudwego/hertz`

## Outputs

The routes are output in json format, in a recursive search order (starting from `main.go`).

### Params

- **file_path**: Absolute path to the file where the routing code resides
- **start_line**: The Start line of the route registration function code
- **end_line**: The end line of the route registration function code
- **method**: Handler method
- **route_path**: route path

### Example

```json
[
  {
    "file_path": "/Users/bytedance/Projects/Personal/Golang/hz-example-thrift/biz/router/hello/example/hello.go",
    "start_line": 20,
    "end_line": 20,
    "method": "GET",
    "route_path": "/hello"
  },
  {
    "file_path": "/Users/bytedance/Projects/Personal/Golang/hz-example-thrift/router.go",
    "start_line": 12,
    "end_line": 12,
    "method": "GET",
    "route_path": "/ping"
  }
]
```
