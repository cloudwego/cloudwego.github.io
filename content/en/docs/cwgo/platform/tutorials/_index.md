---
title: "Tutorials"
linkTitle: "Tutorials"
weight: 3
description: >
---

## Prerequisite

> Dependent service components

### Mysql

> Used to store information that needs to be persisted on the platform

**Create Tables**

Execute all sql files in `cwgo/platform/manifest/sql`

**Redis**

> Used to store agent service registration information

Support **standalone** and **cluster** Mode

## Config

> The startup of Api and Agent services requires configuration files. Please edit the configuration files to add service
> information, database, and other information.

### Config File Name

After configuring the file, it needs to be named in the form of `config-{MODE}.yaml`, where MODE is the running
mode (depending on the command line parameter `'`server_mode`'`)

If the running mode is `dev`, the configuration file should be
named ` config-dev.yaml '`

### Config File Path

### Example

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

### Global Config

| Config                     | Description                     | Notes                                                        | Option(format)                                               | Default(effects) | Example               |
| -------------------------- | ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ---------------- | --------------------- |
| `app`                      |                                 |                                                              |                                                              |                  |                       |
| `timezone`                 | service time zone               | if time zone is incorrect, it may cause `create_time` and `update_time` field does not match the local time. | empty，`Asia/Shanghai`，`UTC`                                | local time zone  |                       |
| `proxyUrl`                 | proxy address                   | if server cannot access to github.com, then set the proxy url | url format                                                   | disable proxy    | http://127.0.0.1:7890 |
| `syncAgentServiceInterval` | sync **agent service** interval | it is recommend to set to 3s-1m                              | the string can be parse by time.ParseDuration()              |                  | 3s                    |
| `syncIdlInterval`          | sync **IDL** internal           | it is recommend to set to > 30s.<br />It is recommended to adjust this parameter with the parameters **agent service replica num** and `agent.workerNum` | 1. the string can be parse by time.ParseDuration()<br />2. 0 (disable synchronization) |                  | 3m                    |

### Api Service Config

| Config | Description         | Notes | Option(format) | Default(effects) | Example |
| ------ | ------------------- | ----- | -------------- | ---------------- | ------- |
| `api`  |                     |       |                |                  |         |
| `host` | listening ip addres |       | ip address     | 0.0.0.0          |         |
| `port` | listening port      |       | 0-65535        | 8089             |         |

### Agent Config

| Config      | Description                        | Notes                                                        | Option(format) | Default(effects) | Example |
| ----------- | ---------------------------------- | ------------------------------------------------------------ | -------------- | ---------------- | ------- |
| `agent`     |                                    |                                                              |                |                  |         |
| `addr`      | listening address                  |                                                              |                | 0.0.0.0:11010    |         |
| `workerNum` | worker num that process sync tasks | The more Wokers there are, the higher the concurrency of the agent service executing sync tasks (generating service code) |                | 3                |         |

### Registry Config

| Config             | Description                  | Notes | Option(format)                                               | Default(effects) | Example                        |
| ------------------ | ---------------------------- | ----- | ------------------------------------------------------------ | ---------------- | ------------------------------ |
| `registry`         |                              |       |                                                              |                  |                                |
| `builtin.address`* | api service external address |       | If **api service** and **agent service**  are deployed in the container network, the IP address can be filled in as the domain name of the container where the **api service** is located | cannot be empty  | localhost:8089， cwgo-api:8089 |

### Database Config

| Config        | Description  | Notes | Option(format)               | Default(effects) | Example |
| ------------- | ------------ | ----- | ---------------------------- | ---------------- | ------- |
| `store`       |              |       |                              |                  |         |
| `mysql`*      | mysql config |       |                              | cannot be empty  |         |
| `redis`*      | redis config |       |                              | cannot be empty  |         |
| `redis.type`* | redis mode   |       | *`standalone`**/**`cluster`* | cannot be empty  |         |

### Logger Config

| Config         | Description          | Notes                                                        | Option(format)                                               | Default(effects)      | Example |
| -------------- | -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | --------------------- | ------- |
| `logger`       |                      |                                                              |                                                              |                       |         |
| `savePath`     | log save path        |                                                              | log file directory path                                      | `log`                 |         |
| `encoderType`  | logger encoder type  | please refer to *https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#Encoder* | *`console`**/**`json`*                                       | `console`             |         |
| `encodeLevel`  | logger encode level  | please refer to *https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#LevelEncoder* | *`LowercaseLevelEncoder`**/**`LowercaseColorLevelEncoder`**/**`CapitalLevelEncoder`**/**`CapitalColorLevelEncoder`* | `CapitalLevelEncoder` |         |
| `encodeCaller` | logger encode caller | please refer to *https://pkg.go.dev/go.uber.org/zap@v1.26.0/zapcore#CallerEncoder* | *`ShortCallerEncoder`**/**`FullCallerEncoder`*               | `FullCallerEncoder`   |         |

## Cli Params Intro

### Cli

```bash
$ ./cwgo-platform
Usage:
  cwgo-platform [command]

Examples:
cwgo-platform command [command options]

Available Commands:
  agent       agent service
  api         api service
  help        Help about any command

Flags:
  -h, --help      help for cwgo-platform
      --version   version for cwgo-platform

Use "cwgo-platform [command] --help" for more information about a command.
```

### General parameters

- `--server_mode`

  **Desc**：Server operation mode (currently only related to log level, dev: debug level, pro: info level)

​    **Option**：`dev` / `pro`

- `--config_path`

  **Desc**：Config file directory path

### api command

- `--static_file_path`

  **Desc**：Static file directory path

### agent command

empty

## Deployment

### Deploying from source code

**Environment**

Need `git`，`nodejs`，`pnpm`，`golang>=1.20`，`gcc`

**Pull Project**

Execute  `git clone ``https://github.com/cloudwego/cwgo.git` to clone project files

**Build Web Files**

1. Execute `pnp``m i && pnpm run build` to get static files in **dist** directory
2. copy **dist** directory to `cwgo/platform/server` 

**Build Server**

```Shell
# Switch to the specified directory
cd cwgo/platform/server

# Compile
go build -ldflags="-s -w" -o cwgo-platform cmd/command.go

# install protoc
wget https://github.com/protocolbuffers/protobuf/releases/download/v25.1/protoc-25.1-linux-x86_64.zip \
&& unzip protoc-25.1-linux-x86_64.zip \
&& cp bin/protoc /usr/local/bin/protoc \
&& mkdir -p /usr/local/include/google \
&& cp -r include/google /usr/local/include/google

# install go tools
go install github.com/cloudwego/cwgo@latest \
&& go install github.com/cloudwego/thriftgo@latest

# run api service
nohup ./cwgo-platform api \
  --server_mode dev
  --config_path ../manifest/config
  --static_file_path ./dist &
# run agent service
nohup ./cwgo-platform agent \
  --server_mode dev \
  --config_path ../manifest/config &
```

### docker

**Environment**

Need `docker`，`docker-compose`

**Pull Project**

Execute `git clone https://github.com/cloudwego/cwgo.git` to clone project files

**Deploy**

```Shell
# Switch to the specified directory
cd cwgo/platform

# Execute docker-compose.yml
docker-compose -f manifest/deploy/docker/docker-compose.yml up -d
```

## Reverse Proxy

The program defaults to listening on port **8089**. If modification is required, please modify `api.port` to in the configuration file.

### Nginx

Add in server field

```Nginx
location / {
  proxy_redirect off;
  proxy_pass http://127.0.0.1:8089; # Replace here with the external access IP and port of the api service
}
```

### Traefik

Add labels in `docker-compose.yml`

```Dockerfile
labels:
  - traefik.enable=true
  - traefik.docker.network=traefik # Docker network where the traifik service is located
  - traefik.http.routers.cwgo.rule=Host(`cwgo.example.com`) # The domain name used by the platform service
  - traefik.http.routers.cwgo.tls.certResolver=le # If traefik has CertResolver, it can be replaced here
  - traefik.http.services.cwgo.loadbalancer.server.port=8089 # api service listening port
```
