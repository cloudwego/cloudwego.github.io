---
title: "指南"
linkTitle: "指南"
weight: 3
description: >
---

## 前提条件

> 一站式 RPC/HTTP 调用平台服务依赖的服务组件

### Mysql

> 用于存储平台需要持久化的信息

**创建表**

在数据库中执行 `cwgo/platform/manifest/sql` 下的所有 sql 文件

**Redis**

> 用于存储agent服务注册信息

支持 **standalone** 和 **cluster** 模式

## 配置文件

> **Api 服务** 和 **Agent 服务** 启动需要配置文件，请编辑配置文件以添加服务信息、数据库及其他信息。

### 配置文件命名

配置完文件后需要将文件命名成：`config-{MODE}.yaml` 的形式，其中 MODE 为运行模式(MODE 取决于命令行参数 `server_mode`)

如运行模式为 dev，则配置文件应命名为 `config-dev.yaml`

### 配置文件路径

### 示例

```yaml
app:
    timezone: 'Asia/Shanghai' # project timezone ( set to local zone if empty)
    proxyUrl: '' # proxy url for http client use
    syncAgentServiceInterval: 10s # time interval that sync agent service in registry
    syncIdlInterval: 5m # time interval that sync all idl and generate code if idl updated (0: sync disabled)

api:
    host: '0.0.0.0' # api service listening host
    port: 8089 # api service listening port

agent:
    addr: '0.0.0.0:11010' # agent service listening address
    workerNum: 1 # worker num that process sync tasks

registry:
    builtin:
        address: 'localhost:8089' # please set to api service's external address

store:
    mysql:
        addr: '127.0.0.1' # database addr
        port: '3306' # database port
        db: 'cwgo' # mysql database name
        username: 'root' # mysql username
        password: 'password' # mysql password
        charset: 'utf8mb4' # mysql database charset
    redis:
        type: 'standalone' # standalone/cluster
        standalone:
            addr: '127.0.0.1:6379' # redis address
            username: '' # redis username
            password: 'password' # redis password
            db: 1 # redis db num
        cluster:
            masterNum: 3 # redis cluster's master node num
            addrs: # addrs's len should be same with masterNum
                -   ip: '127.0.0.1' # master node ip
                    port: '6391' # master node port
                -   ip: '127.0.0.1'
                    port: '6392'
                -   ip: '127.0.0.1'
                    port: '6393'
            username: '' # redis username
            password: 'password' # redis password

logger:
    savePath: 'log'
    # https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#Encoder
    # console/json
    encoderType: 'console'
    # https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#LevelEncoder
    # LowercaseLevelEncoder/LowercaseColorLevelEncoder/CapitalLevelEncoder/CapitalColorLevelEncoder
    encodeLevel: 'CapitalLevelEncoder'
    # https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#CallerEncoder
    # ShortCallerEncoder/FullCallerEncoder
    encodeCaller: 'FullCallerEncoder'
```

### 服务全局配置

| 参数                         | 描述                     | 备注                                                               | 可选值(格式)                                                    | 默认值(效果) | 示例值                   |
|----------------------------|------------------------|------------------------------------------------------------------|------------------------------------------------------------|---------|-----------------------|
| `app`                      |                        |                                                                  |                                                            |         |                       |
| `timezone`                 | 服务时区                   | 如设置错误可能导致数据库中 `create_time` 和 `update_time` 字段与本地时间不匹配           | 空值，`Asia/Shanghai`，`UTC`                                   | 本地时区    |                       |
| `proxyUrl`                 | 代理地址                   | 如部署服务器访问 github.com 不通，可配置代理地址                                   | url 格式                                                     | 不开启代理   | http://127.0.0.1:7890 |
| `syncAgentServiceInterval` | 同步 **agent 服务** 时间间隔   | 设置成 3s-1m 为佳                                                     | 能被 time.ParseDuration() 解析的字符串                             |         | 3s                    |
| `syncIdlInterval`          | 同步 **idl** **文件** 时间间隔 | 时间间隔 > 30s 为佳 本参数最好搭配参数 **agent 服务副本数量**  及 `agent.workerNum`作调整 | 1. 能被 time.ParseDuration() 解析的字符串<br />2. 0 (表示不同步 idl 文件) |         | 3m                    |

### Api 服务配置

| 参数     | 描述       | 备注 | 可选值(格式) | 默认值(效果) | 示例值 |
|--------|----------|----|---------|---------|-----|
| `api`  |          |    |         |         |     |
| `host` | 监听 ip 地址 |    | ip 地址   | 0.0.0.0 |     |
| `port` | 监听端口     |    | 0-65535 | 8089    |     |

### Agent 服务配置

| 参数          | 描述             | 备注                                      | 可选值(格式) | 默认值(效果)       | 示例值 |
|-------------|----------------|-----------------------------------------|---------|---------------|-----|
| `agent`     |                |                                         |         |               |     |
| `addr`      | 监听地址           |                                         |         | 0.0.0.0:11010 |     |
| `workerNum` | 同步任务 worker 个数 | Worker 个数越多，agent 服务执行同步任务(生成服务代码)并发数越高 |         | 3             |     |

### Registry 配置

| 参数                 | 描述           | 备注 | 可选值(格式)                                                            | 默认值(效果) | 示例值                           |
|--------------------|--------------|----|--------------------------------------------------------------------|---------|-------------------------------|
| `registry`         |              |    |                                                                    |         |                               |
| `builtin.address`* | api 服务外部访问地址 |    | 如果  **api 服务** 和 **agent 服务** 部署在容器网络中，这里ip地址可填为 **api 服务** 所在容器域名 | 不能为空    | localhost:8089， cwgo-api:8089 |

### 数据库配置

| 参数            | 描述       | 备注 | 可选值(格式)                      | 默认值(效果) | 示例值 |
|---------------|----------|----|------------------------------|---------|-----|
| `store`       |          |    |                              |         |     |
| `mysql`*      | mysql 配置 |    |                              | 不能为空    |     |
| `redis`*      | redis 配置 |    |                              | 不能为空    |     |
| `redis.type`* | redis 类型 |    | *`standalone`**/**`cluster`* | 不能为空    |     |

### 日志配置

| 参数             | 描述        | 备注                                                                      | 可选值(格式)                                                                                                             | 默认值(效果)               | 示例值 |
|----------------|-----------|-------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|-----------------------|-----|
| `logger`       |           |                                                                         |                                                                                                                     |                       |     |
| `savePath`     | 日志保存目录    |                                                                         | 日志文件目录路径                                                                                                            | `log`                 |     |
| `encoderType`  | 日志编码形式    | 详细请参考*https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#Encoder*       | *`console`**/**`json`*                                                                                              | `console`             |     |
| `encodeLevel`  | 日志等级编码器   | 详细请参考*https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#LevelEncoder*  | *`LowercaseLevelEncoder`**/**`LowercaseColorLevelEncoder`**/**`CapitalLevelEncoder`**/**`CapitalColorLevelEncoder`* | `CapitalLevelEncoder` |     |
| `encodeCaller` | 日志函数调用打印器 | 详细请参考*https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#CallerEncoder* | *`ShortCallerEncoder`**/**`FullCallerEncoder`*                                                                      | `FullCallerEncoder`   |     |

## 命令行参数说明

### 命令说明

```bash
$ ./cwgo-platform
Usage:
  cwgo-platform [command]

Examples:
cwgo-platform command [command options]

Available Commands:
  agent       agent 服务
  api         api 服务
  help        Help about any command

Flags:
  -h, --help      help for cwgo-platform
      --version   version for cwgo-platform

Use "cwgo-platform [command] --help" for more information about a command.
```

### 通用参数

- `--server_mode`

  **说明**：服务器运行模式（目前只与日志等级相关，dev：debug 等级，pro：info 等级）

​    **选项**：`dev` / `pro`

- `--config_path`

  **说明**：配置文件路径

### api 命令

- `--static_file_path`

  **说明**：前端静态文件路径

### agent 命令

无

## 部署

### 从源码手动构建部署

**环境准备**

需要有`git`，`nodejs`，`pnpm`，`golang>=1.20`，`gcc` 环境

**拉取项目文件**

使用 `git clone ``https://github.com/cloudwego/cwgo.git`克隆项目文件

**构建前端**

1. 执行 `pnp``m i && pnpm run build` 得到 dist 目录下的目标文件
2. 将 dist 目录拷贝至 `cwgo/platform/server` 下

**构建后端**

```Shell
# 切换到指定目录下
cd cwgo/platform/server

# 编译后端文件
go build -ldflags="-s -w" -o cwgo-platform cmd/command.go

# 安装 protoc
wget https://github.com/protocolbuffers/protobuf/releases/download/v25.1/protoc-25.1-linux-x86_64.zip \
&& unzip protoc-25.1-linux-x86_64.zip \
&& cp bin/protoc /usr/local/bin/protoc \
&& mkdir -p /usr/local/include/google \
&& cp -r include/google /usr/local/include/google

# 安装 go 工具
go install github.com/cloudwego/cwgo@latest \
&& go install github.com/cloudwego/thriftgo@latest

# 启动 api 服务
nohup ./cwgo-platform api \
  --server_mode dev
  --config_path ../manifest/config
  --static_file_path ./dist &
# 启动 agent 服务
nohup ./cwgo-platform agent \
  --server_mode dev \
  --config_path ../manifest/config &
```

### docker 部署

**环境准备**

需要有 `docker`，`docker-compose` 环境

**拉取项目文件**

使用 `git clone https://github.com/cloudwego/cwgo.git`克隆项目文件

**部署**

```Shell
# 切换到指定目录下
cd cwgo/platform

# 运行 docker-compose.yml
docker-compose -f manifest/deploy/docker/docker-compose.yml up -d
```

## 反向代理

程序默认监听 8089 端口。如需修改，请在配置文件中 `api.port` 修改 api 服务监听的端口号。

### Nginx

在网站配置文件的 server 字段中添加

```Nginx
location / {
  proxy_redirect off;
  proxy_pass http://127.0.0.1:8089; # 这里替换为 api 服务的外部访问ip及端口
}
```

### Traefik

在 `docker-compose.yml` 中添加 labels

```Dockerfile
labels:
  - traefik.enable=true
  - traefik.docker.network=traefik # traefik 服务所处的 docker network
  - traefik.http.routers.cwgo.rule=Host(`cwgo.example.com`) # 平台服务所代理的域名
  - traefik.http.routers.cwgo.tls.certResolver=le # 若 traefik 设置了 certResolver 可在这里替换
  - traefik.http.services.cwgo.loadbalancer.server.port=8089 # api 服务监听端口
```
