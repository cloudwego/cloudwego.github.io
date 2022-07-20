---
title: "服务端 启动/退出 前后定制业务逻辑"
date: 2022-06-09
weight: 5
description: >
---

Kitex 提供了全局的 Hook 注入能力，用于在服务端**触发启动后**和**退出前**注入自己的处理逻辑。

同时，你也可以修改启动 main 方法在服务**启动前**和**退出后**（监听端口关闭）定制一些业务逻辑。

## 服务启动后和退出前

由于服务端启动后和退出前都在框架内部处理，用户如果想定制业务逻辑需要通过 Hook 注入。

### 注入触发启动后的 StartHook

触发 Server 启动后，框架会执行 StartHooks，然后进行服务注册。注意，由于 Server 启动是异步执行，所以该 Hook 的执行不保证在 Server 完全就绪后。

- 使用方式

  ```go
  import "github.com/cloudwego/kitex/server"

  server.RegisterStartHooks(yourStartHook)
  // 支持注入多个 Hook
  // server.RegisterStartHooks(hook)
  ```



### 注入退出前的 ShutdownHook

接收到退出信号后或用户主动通过Stop退出时，框架会先执行 ShutdownHooks，然后执行服务注销（从注册中心注销）和服务的Shutdown。

- 使用方式

  ```go
  import "github.com/cloudwego/kitex/server"

  server.RegisterShutdownHook(yourShundownHook)
  // support inject multiple Hooks
  // server.RegisterShutdownHook(hook)
  ```


## 服务启动前和退出后

服务启动前和退出后的定制逻辑会更简单些，可以完全由用户自行控制，只需在框架生成的 main.go 中 Run() 方法执行前后添加你的逻辑即可。

注意：Run() 后面是在 Server 完成退出后才会执行，如果希望在 Server 退出前执行你的逻辑应该使用ShutdownHook。

如下是框架生成的 main 方法示例，注释的位置写入你的逻辑：

```go
func main() {
	svr := greetservice.NewServer(new(GreetServiceImpl))

  // yourLogicBeforeServerRun()

	err := svr.Run()

  // yourLogicAfterServerRun()

	if err != nil {
		log.Println(err.Error())
	}
}

```






