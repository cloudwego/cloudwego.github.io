---
title: "进阶教程"
linkTitle: "进阶教程"
weight: 4
date: 2024-01-18
keywords: ["Kitex", "Golang", "Go", "进阶教程"]
description: "Kitex 进阶教程"
---

开始此章节前，确保你已经了解**前置知识**并完成了**环境准备**。

本文中，我们将会模拟一个简单的电商场景，包括商品服务、库存服务与 API 服务，商品服用调用库存服务查询库存，API 服务调用商品服务查询商品信息，对前端或用户暴露 HTTP 接口供查询商品信息。

## 创建项目目录

创建一个目录用于存放后续代码，创建后进入该目录

```shell
mkdir example_shop

cd example_shop
```

## 编写 IDL

按照开发流程，我们首先需要编写 IDL，这里以 thrift IDL 为例子。

创建 `idl` 目录用于存放项目 `idl` 文件

```shell
mkdir idl

cd idl
```

一般不同的服务都会使用不同的 IDL，所以我们这里创建 `item.thrift` 与 `stock.thrift` 分别定义商品服务与库存服务的接口，同时创建 `base.thrift` 定义公共数据结构。

`base.thrift`

```thrift
namespace go example.shop.base

struct BaseResp {
    1: string code
    2: string msg
}
```

`item.thrift`

```thrift
namespace go example.shop.item

include "base.thrift"

struct Item {
    1: i64 id
    2: string title
    3: string description
    4: i64 stock
}

struct GetItemReq {
    1: required i64 id
}

struct GetItemResp {
    1: Item item

    255: base.BaseResp baseResp
}

service ItemService{
    GetItemResp GetItem(1: GetItemReq req)
}
```

`stock.thrift`

```thrift
namespace go example.shop.stock

include "base.thrift"

struct GetItemStockReq {
    1: required i64 item_id
}

struct GetItemStockResp {
    1: i64 stock

    255: base.BaseResp BaseResp
}

service GetItemStock {
    GetItemStockResp GetItemStock(1:GetItemStockReq req)
}
```

## 代码生成

有了 IDL 以后我们便可以通过 kitex 工具生成项目代码了，我们在先回到项目的根目录即 `example_shop`。因为我们有两个 IDL 定义了服务，所以执行两次 kitex 命令：

```shell
kitex -module example_shop idl/item.thrift

kitex -module example_shop idl/stock.thrift
```

生成的代码分两部分，一部分是结构体的编解码序列化代码，由 IDL 编译器生成；另一部分由 kitex 工具在前者产物上叠加，生成用于创建和发起 RPC 调用的桩代码。它们默认都在 `kitex_gen` 目录下。

上面生成的代码并不能直接运行，需要自己完成 `NewClient` 和 `NewServer` 的构建。kitex 命令行工具提供了 `-service` 参数能直接生成带有脚手架的代码，接下来让我们为商品服务和库存服务分别生成脚手架。

首先为两个 RPC 服务分别单独创建目录。

```shell
mkdir -p rpc/item rpc/stock
```

再分别进入各自的目录中，执行如下命令生成代码：

```shell
// item 目录下执行
kitex -module example_shop -service example.shop.item -use example_shop/kitex_gen ../../idl/item.thrift

// stock 目录下执行
kitex -module example_shop -service example.shop.stock -use example_shop/kitex_gen ../../idl/stock.thrift
```

kitex 默认会将代码生成到执行命令的目录下，kitex 的命令中：

- `-module ` 参数表明生成代码的 `go mod` 中的 `module name`，在本例中为 `example_shop`
- `-service` 参数表明我们要生成脚手架代码，后面紧跟的 `example.shop.item` 或 `example.shop.stock` 为该服务的名字。
- `-use` 参数表示让 kitex 不生成 `kitex_gen` 目录，而使用该选项给出的 `import path`。在本例中因为第一次已经生成 `kitex_gen` 目录了，后面都可以复用。
- 最后一个参数则为该服务的 IDL 文件

生成代码后的项目结构如下：

```
.
├── go.mod // go module 文件
├── go.sum
├── idl   // 示例 idl 存放的目录
│   ├── base.thrift
│   ├── item.thrift
│   └── stock.thrift
├── kitex_gen
│   └── example
│       └── shop
│           ├── base
│           │   ├── base.go // 根据 IDL 生成的编解码文件，由 IDL 编译器生成
│           │   ├── k-base.go // kitex 专用的一些拓展内容
│           │   └── k-consts.go
│           ├── item
│           │   ├── item.go // 根据 IDL 生成的编解码文件，由 IDL 编译器生成
│           │   ├── itemservice // kitex 封装代码主要在这里
│           │   │   ├── client.go
│           │   │   ├── invoker.go
│           │   │   ├── itemservice.go
│           │   │   └── server.go
│           │   ├── k-consts.go
│           │   └── k-item.go // kitex 专用的一些拓展内容
│           └── stock
│               ├── k-consts.go
│               ├── k-stock.go // kitex 专用的一些拓展内容
│               ├── stock.go // 根据 IDL 生成的编解码文件，由 IDL 编译器生成
│               └── stockservice // kitex 封装代码主要在这里
│                   ├── client.go
│                   ├── invoker.go
│                   ├── server.go
│                   └── stockservice.go
└── rpc
    ├── item
    │   ├── build.sh   // 用来编译的脚本，一般情况下不需要更改
    │   ├── handler.go // 服务端的业务逻辑都放在这里，这也是我们需要更改和编写的文件
    │   ├── kitex_info.yaml
    │   ├── main.go
    │   └── script
    │       └── bootstrap.sh
    └── stock
        ├── build.sh 	 // 用来编译项目的脚本，一般情况下不需要更改
        ├── handler.go // 服务端的业务逻辑都放在这里，这也是我们需要更改和编写的文件
        ├── kitex_info.yaml
        ├── main.go    // 服务启动函数，一般在这里做一些资源初始化的工作，可以更改
        └── script
            └── bootstrap.sh
```

## 拉取依赖

完成代码生成后，我们回到项目根目录，即 `example_shop`。 使用 `go mod tidy` 命令拉取项目依赖

如果遇到类似如下两种报错：

```
github.com/apache/thrift/lib/go/thrift: ambiguous import: found package github.com/apache/thrift/lib/go/thrift in multiple modules

github.com/cloudwego/kitex@v0.X.X/pkg/utils/thrift.go: not enough arguments in call to t.tProt.WriteMessageBegin
```

先执行一遍下述命令，再继续操作：

```
go mod edit -droprequire=github.com/apache/thrift/lib/go/thrift
go mod edit -replace=github.com/apache/thrift=github.com/apache/thrift@v0.13.0
```

这是因为 thrift 官方在 0.14 版本对 thrift 接口做了 breaking change，导致生成代码不兼容。

若想要升级 kitex 版本，执行 `go get -v github.com/cloudwego/kitex@latest` 即可：

## 编写商品服务逻辑

我们需要编写的服务端逻辑都在 `handler.go` 这个文件中，目前我们有两个服务，对应了两个 `handler.go`，他们的结构都是类似的，我们先看看商品服务的服务端逻辑 `rpc/item/handler.go`

```go
package main

import (
	"context"
	item "example_shop/kitex_gen/example/shop/item"
)

// ItemServiceImpl implements the last service interface defined in the IDL.
type ItemServiceImpl struct{}

// GetItem implements the ItemServiceImpl interface.
func (s *ItemServiceImpl) GetItem(ctx context.Context, req *item.GetItemReq) (resp *item.GetItemResp, err error) {
	// TODO: Your code here...
	return
}

```

这里的 `GetItem` 函数就对应了我们之前在 `item.thrift` IDL 中定义的 `GetItem` 方法。

现在让我们修改一下服务端逻辑，本项目仅仅演示使用方法，重点不在于业务逻辑，故简单处理后返回。

```go
package main

import (
	"context"
	item "example_shop/kitex_gen/example/shop/item"
)

// ItemServiceImpl implements the last service interface defined in the IDL.
type ItemServiceImpl struct{}

// GetItem implements the ItemServiceImpl interface.
func (s *ItemServiceImpl) GetItem(ctx context.Context, req *item.GetItemReq) (resp *item.GetItemResp, err error) {
	resp = item.NewGetItemResp()
	resp.Item = item.NewItem()
	resp.Item.Id = req.GetId()
	resp.Item.Title = "Kitex"
	resp.Item.Description = "Kitex is an excellent framework!"
	return
}
```

除了 `handler.go` 外，我们还需关心 `main.go` 文件，我可以看看 `main.go` 中做了什么事情：

```go
package main

import (
    item "example_shop/kitex_gen/example/shop/item/itemservice"
    "log"
)

func main() {
    svr := item.NewServer(new(ItemServiceImpl))

    err := svr.Run()

    if err != nil {
       log.Println(err.Error())
    }
}
```

`main.go` 中的代码很简单，即使用 kitex 生成的代码创建一个 `server` 服务端，并调用其 `Run` 方法开始运行。通常使用 `main.go` 进行一些项目初始化，如加载配置等。

## 运行商品服务

至此，我们便可以开始运行商品服务了，kitex 也为我们生成了编译脚本，即 `build.sh`：

```shell
#!/usr/bin/env bash
RUN_NAME="example.shop.item"

mkdir -p output/bin
cp script/* output/
chmod +x output/bootstrap.sh

if [ "$IS_SYSTEM_TEST_ENV" != "1" ]; then
    go build -o output/bin/${RUN_NAME}
else
    go test -c -covermode=set -o output/bin/${RUN_NAME} -coverpkg=./...
fi
```

在 `build.sh` 主要做了以下事情：

1. 定义了一个变量 `RUN_NAME`，用于指定生成的可执行文件的名称，值为我们在 IDL 中指定的 `namespace`。本例中为 `example.shop.item`
2. 创建 `output` 目录，此后的编译出的二进制文件放在 `output/bin` 下。同时将 `script` 目录下的项目启动脚本复制进去
3. 根据环境变量 `IS_SYSTEM_TEST_ENV` 的值判断生成普通可执行文件或测试可执行文件。值为 1 则代表使用 `go test -c` 生成测试文件，否则正常使用 `go build` 命令编译。

直接执行 `sh build.sh` 即可编译项目。

编译成功后，生成 `output` 目录：

```
output
├── bin // 存放二进制可执行文件
│   └── example.shop.item 
└── bootstrap.sh // 运行文件的脚本
```

执行 `sh output/bootstrap.sh` 即可启动编译后的二进制文件。

输出类似以下命令，代表运行成功：

```
2024/01/19 22:12:18.758245 server.go:83: [Info] KITEX: server listen at addr=[::]:8888
```

在上面的日志输出中，`addr=[::]:8888` 代表我们的服务运行在本地的 8888 端口，此参数可以在创建 `server` 时传入 `option` 配置来修改，更多服务端配置见 [Server Option](https://www.cloudwego.io/zh/docs/kitex/tutorials/options/server_options/)。

## 运行 API 服务

有了商品服务后，接下来就让我们编写 API 服务用于调用刚刚运行起来的商品服务，并对外暴露 HTTP 接口。

首先，同样的，我们回到项目根目录先创建一个目录用于存放我们的代码：

```shell
mkdir api
```

进入目录：

```shell
cd api
```

然后创建一个 `main.go` 文件，就可以开始编写代码了。

### 创建 client

在生成的代码中，`kitex_gen` 目录下，Kitex 已经为我们封装了创建客户端的代码，我们只需要使用即可

```go
import (
	"example_shop/kitex_gen/example/shop/item/itemservice"
	"github.com/cloudwego/kitex/client"
	...
)
...
c, err := itemservice.NewClient("example.shop.item", client.WithHostPorts("0.0.0.0:8888"))
if err != nil {
	log.Fatal(err)
}
```

上述代码中，`item.NewClient` 用于创建 `client`，其第一个参数为调用的 *服务名*，第二个参数为 *options*，用于传入可选参数， 此处的 `client.WithHostPorts` 用于指定服务端的地址，我们可以在运行商品服务时发现其监听在本地的 8888 端口，所以我们指定 8888 端口。更多参数可参考 [Client Option](https://www.cloudwego.cn/zh/docs/kitex/tutorials/options/client_options/) 一节。

### 调用服务

接下来让我们编写用于发起调用的代码：

```go
import "example_shop/kitex_gen/example/shop/item"
...
req := &api.Request{Message: "my request"}
resp, err := c.GetItem(context.Background(), req, callopt.WithRPCTimeout(3*time.Second))
if err != nil {
  log.Fatal(err)
}
```

上述代码中，我们首先创建了一个请求 `req` , 然后通过 `c.GetItem` 发起了调用。

其第一个参数为 `context.Context`，通过通常用其传递信息或者控制本次调用的一些行为，你可以在后续章节中找到如何使用它。

其第二个参数为本次调用的请求参数。

其第三个参数为本次调用的 `options` ，Kitex 提供了一种 `callopt` 机制，顾名思义——调用参数 ，有别于创建 client 时传入的参数，这里传入的参数仅对此次生效。 此处的 `callopt.WithRPCTimeout` 用于指定此次调用的超时（通常不需要指定，此处仅作演示之用）同样的，你可以在[基本特性](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature)一节中找到更多的参数。

### 暴露 HTTP 接口

你可以使用 `net/http` 或其他框架来对外提供 HTTP 接口，此处使用 `net/http` 做一个简单演示

完整代码如下：

```go
package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"example_shop/kitex_gen/example/shop/item"
	"example_shop/kitex_gen/example/shop/item/itemservice"
	
	"github.com/cloudwego/kitex/client"
	"github.com/cloudwego/kitex/client/callopt"
)

func main() {
	http.HandleFunc("/api/item", Handler)
	http.ListenAndServe("localhost:8889", nil)
}

func Handler(rw http.ResponseWriter, r *http.Request) {
	c, err := itemservice.NewClient("example.shop.item", client.WithHostPorts("0.0.0.0:8888"))
	if err != nil {
		log.Fatal(err)
	}
	req := item.NewGetItemReq()
	req.Id = 1024
	resp, err := c.GetItem(context.Background(), req, callopt.WithRPCTimeout(3*time.Second))
	if err != nil {
		log.Fatal(err)
	}
	rw.Write([]byte(resp.String()))
}
```

注意：此代码中每次 HTTP 请求都会创建一个 RPC 客户端，开销较大，故仅作演示，不可用于**生产环境**。

接下来另启一个终端，执行 `go run .` 命令即可启动 API 服务，监听 8889 端口，请求 `localhost:8889/api/item` 即可发起 RPC 调用商品服务提供的 `GetItem` 接口，并获取到响应结果。

### 测试接口

打开游览器访问 `localhost:8889/api/item`，看到如下信息，代表请求成功。

```
GetItemResp({Item:Item({Id:1024 Title:Kitex Description:Kitex is an excellent framework! Stock:0}) BaseResp:BaseResp({Code: Msg:})})
```

## 运行库存服务

在上面的示例中，我们已经完成了一次 RPC 调用，但在更常见的场景下，一次 RPC 调用远不能实现业务需求，故我们再添加库存服务，模拟更常见的场景。

库存服务的代码我们已经生成，只需要补充业务逻辑即可，与商品服务类似，业务代码位于 `rpc/stock/handler.go`，我们补充以下逻辑：

```go
package main

import (
    "context"
  
    stock "example_shop/kitex_gen/example/shop/stock"
)

// StockServiceImpl implements the last service interface defined in the IDL.
type StockServiceImpl struct{}

// GetItemStock implements the StockServiceImpl interface.
func (s *StockServiceImpl) GetItemStock(ctx context.Context, req *stock.GetItemStockReq) (resp *stock.GetItemStockResp, err error) {
    resp = stock.NewGetItemStockResp()
    resp.Stock = req.GetItemId()
    return
}
```

 由于之前的商品服务和 API 服务分别占用了 8888 和 8889 端口，在故我们在库存服务的 `main.go` 中修改监听的端口：

```go
package main

import (
    "log"
    "net"

    stock "example_shop/kitex_gen/example/shop/stock/stockservice"

    "github.com/cloudwego/kitex/server"
)

func main() {
    addr, _ := net.ResolveTCPAddr("tcp", "127.0.0.1:8890")
    svr := stock.NewServer(new(StockServiceImpl), server.WithServiceAddr(addr))

    err := svr.Run()

    if err != nil {
       log.Println(err.Error())
    }
}
```

你可以在 [Option](https://www.cloudwego.cn/zh/docs/kitex/tutorials/options/) 中查看更多参数说明

接下来另启终端使用 `go run .` 运行库存服务，看到以下输出代表运行成功：

```
2024/01/21 00:09:47.076192 server.go:83: [Info] KITEX: server listen at addr=127.0.0.1:8890
```

## 补充商品服务

我们已经成功运行了库存服务，接下来我们补充商品服务，实现对库存服务的调用，与 API 服务类似，我们只需要创建客户端后构造参数发起调用即可，在 `rpc/item/handler.go` 中我们补充以下方法：

```go
package main

import (
    "context"
    "example_shop/kitex_gen/example/shop/stock"
    "log"

    item "example_shop/kitex_gen/example/shop/item"
    "example_shop/kitex_gen/example/shop/stock/stockservice"

    "github.com/cloudwego/kitex/client"
)

// ItemServiceImpl implements the last service interface defined in the IDL.
type ItemServiceImpl struct{}

func NewStockClient(addr string) (stockservice.Client, error) {
    return stockservice.NewClient("example.shop.stock", client.WithHostPorts(addr))
}

// GetItem implements the ItemServiceImpl interface.
func (s *ItemServiceImpl) GetItem(ctx context.Context, req *item.GetItemReq) (resp *item.GetItemResp, err error) {
    resp = item.NewGetItemResp()
    resp.Item = item.NewItem()
    resp.Item.Id = req.GetId()
    resp.Item.Title = "Kitex"
    resp.Item.Description = "Kitex is an excellent framework!"

    stockCli, err := NewStockClient("0.0.0.0:8890")
    if err != nil {
       log.Fatal(err)
    }
    stockReq := stock.NewGetItemStockReq()
    stockReq.ItemId = req.GetId()
    stockResp, err := stockCli.GetItemStock(context.Background(), stockReq)
    if err != nil {
       log.Println(err)
       stockResp.Stock = 0
    }
    resp.Item.Stock = stockResp.GetStock()
    return
}
```

由于库存服务跑在 8890 端口，所以我们指定 8890 端口创建客户端。

至此，商品服务代码编写完整，参照上文重新编译启动商品服务，看到如下输出代表运行成功：

```
2024/01/21 00:18:29.522546 server.go:83: [Info] KITEX: server listen at addr=[::]:8888
```

## 测试接口

打开游览器访问 `localhost:8889/api/item`，看到如下信息，代表请求成功。

```
GetItemResp({Item:Item({Id:1024 Title:Kitex Description:Kitex is an excellent framework! Stock:1024}) BaseResp:BaseResp({Code: Msg:})})
```

可以看到 `Stock: 1024`，代表我们的商品服务成功请求了库存服务并响应 API 服务，至此，我们的任务全部完成了。

## 总结

本节中，我们使用 Kitex 完成了 RPC 服务端与客户端的开发，实现了 RPC 调用，开发流程总结如下：

- 服务端编写 IDL，使用 kitex 生成代码后填充服务业务逻辑即可运行
- 客户端使用与服务端相同的 IDL，使用 kitex 生成代码后，创建客户端示例，构造请求参数后即可发起调用

本例中，我们仅演示了 Kitex 最基本的使用方法，Kitex 还为我们提供了各种微服务治理特性，你可以在[指南](https://www.cloudwego.cn/zh/docs/kitex/tutorials/)中获取更多信息，或查看示例代码小节解锁更多高级用法。

