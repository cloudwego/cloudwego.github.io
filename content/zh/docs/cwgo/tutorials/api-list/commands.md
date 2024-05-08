---
title: "命令梳理"
linkTitle: "命令梳理"
weight: 1
description: >
---

## 基础命令

使用 `cwgo api-list -h` 查看使用详情:

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

## 详细参数

- **project_path**: 需要解析的项目代码根目录(`go.mod`文件所在目录)

- **hertz_repo_url**: 指定 hertz 仓库, 默认为 `github.com/cloudwego/hertz`

## 输出参数

路由以 json 格式输出, 输出顺序为递归搜索顺序(从`main.go`开始)

### 参数说明

- **file_path**: 路由代码所在文件的绝对路径
- **start_line**: 路由注册函数代码的起始行
- **end_line**: 路由注册函数代码的结束行
- **method**: 路由注册方法
- **route_path**: 路由路径

### 输出示例

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
