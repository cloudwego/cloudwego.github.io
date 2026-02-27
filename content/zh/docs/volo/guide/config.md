---
title: "volo.yml 配置文件格式"
linkTitle: "volo.yml 配置文件格式"
weight: 5
description: >
---

## 功能

1. 多个生产文件：支持不同协议和仓库版本冲突隔离
2. 单文件去重：支持单个生成文件中的重复结构消除
3. 灵活的生成代码配置：keep_unknown_fields、touch list、custom config、special_namings 等
4. 跨库引用：在 repos 列表中给出跨仓库引用的仓库信息，即可支持跨库引用

## yaml 格式

```YAML
entries:
  {entry_name}: # entry_name = "default" by default
    filename: {filename} # filename = "volo_gen.rs" by default
    protocol: thrift | protobuf
    repos: # exist if non-local
        {repo}: # repo = extract the name from url by default
          url: {git} # url = repo git url
          ref: {ref} # ref = "HEAD" by default
          lock: {commit hash} # lock is the last commit hash
    services:
    - idl:
        source: git | local
        repo: {repo} # required for git source
        path: {path} # git path must be relative to the repo root dir
        includes: {includes list} # required for protobuf
      codegen_option:
        touch: [] #
        keep_unknown_fields: false # A->B->C, B could use this to transfer the unknown fields which is needed by A and C.
        config: {custom config}
    touch_all: false
    dedups: [] # remove the repeated structure generation in one entry
    special_namings: []
```

volo.yml 文件示例

```YAML
entries:
  proto:
    filename: proto_gen.rs
    protocol: protobuf
    repos:
      protobuf:
        url: https://github.com/protocolbuffers/protobuf.git
        ref: HEAD
        lock: 704d0454ddc58da683e8cec22896ff3498089549
    services:
    - idl:
        source: local
        path: ../proto/echo.proto
        includes:
        - ../proto
    - idl:
        source: local
        path: ../proto/streaming.proto
        includes:
        - ../proto
    - idl:
        source: local
        path: ../proto/hello.proto
        includes:
        - ../proto
    - idl:
        source: git
        repo: protobuf
        path: examples/addressbook.proto
        includes:
        - examples
  thrift:
    filename: thrift_gen.rs
    protocol: thrift
    repos:
      thrift:
        url: https://github.com/apache/thrift.git
        ref: HEAD
        lock: 9bd1f1bee7bf59080492bbd3213ca1fed57ab4d6
    services:
    - idl:
        source: local
        path: ../thrift_idl/hello.thrift
    - idl:
        source: local
        path: ../thrift_idl/echo.thrift
    - idl:
        source: local
        path: ../thrift_idl/echo_unknown.thrift
      codegen_option:
        keep_unknown_fields: true
    - idl:
        source: git
        repo: thrift
        path: test/Service.thrift
```

### volo-cli

1. init

   1. ```bash
      $ volo init --help
      init your thrift or grpc project

      Usage: volo init [OPTIONS] <NAME> <IDL>

      Arguments:
        <NAME>  The name of project
        <IDL>   Specify the path for idl.
                If -g or --git is specified, then this should be the path in the specified git repo.
                Example: 	-g not specified:	./idl/server.thrift
                		-g specified:		/path/to/idl/server.thrift

      Options:
            --repo <REPO>          Specify the git repo name for repo.
                                   Example: cloudwego_volo
        -v, --verbose...           Turn on the verbose mode.
        -g, --git <GIT>            Specify the git repo for idl.
                                   Should be in the format of "git@domain:path/repo.git".
                                   Example: git@github.com:cloudwego/volo.git
        -r, --ref <REF>            Specify the git repo ref(branch) for idl.
                                   Example: main / $TAG
        -i, --includes <INCLUDES>  Specify the include dirs for idl.
                                   If -g or --git is specified, then this should be the path in the specified git repo.
        -h, --help                 Print help
        -V, --version              Print version
      ```

   2. 在项目根目录下使用 volo init 命令，会自动创建 server 代码模版和生成代码

2. idl

   1. ```bash
      $ volo idl --help
      manage your idl

      Usage: volo idl [OPTIONS] <COMMAND>

      Commands:
        add
        help  Print this message or the help of the given subcommand(s)

      Options:
        -v, --verbose...               Turn on the verbose mode.
        -n, --entry-name <ENTRY_NAME>  The entry name, defaults to 'default'. [default: default]
        -h, --help                     Print help
        -V, --version                  Print version
      ```

   2. idl add

      1. ```bash
         $ volo idl add --help
         Usage: volo idl add [OPTIONS] <IDL>

         Arguments:
           <IDL>  Specify the path for idl.
                  If -g or --git is specified, then this should be the path in the specified git repo.
                  Example: 	-g not specified:	./idl/client.thrift
                  		-g specified:		/path/to/idl/client.thrift

         Options:
               --repo <REPO>              Specify the git repo name for repo.
                                          Example: cloudwego_volo
           -v, --verbose...               Turn on the verbose mode.
           -g, --git <GIT>                Specify the git repo for idl.
                                          Should be in the format of "git@domain:path/repo.git".
                                          Example: git@github.com:cloudwego/volo.git
           -n, --entry-name <ENTRY_NAME>  The entry name, defaults to 'default'. [default: default]
           -r, --ref <REF>                Specify the git repo ref(branch) for idl.
                                          Example: main / $TAG
           -i, --includes <INCLUDES>      Specify the include dirs for idl.
                                          If -g or --git is specified, then this should be the path in the specified git repo.
           -f, --filename <FILENAME>      Specify the output filename, defaults to 'volo_gen.rs'. [default: volo_gen.rs]
           -h, --help                     Print help
           -V, --version                  Print version
         ```

   3. [deprecated] idl update -> repo update

3. repo

   1. ```bash
      $ volo repo --help
      manage your repo

      Usage: volo repo [OPTIONS] <COMMAND>

      Commands:
        update  update your repo by repo name, split by ','
        add
        help    Print this message or the help of the given subcommand(s)

      Options:
        -v, --verbose...               Turn on the verbose mode.
        -n, --entry-name <ENTRY_NAME>  The entry name, defaults to 'default'. [default: default]
        -h, --help                     Print help
        -V, --version                  Print version
      ```

   2. repo add

      1. ```bash
         $ volo repo add --help
         Usage: volo repo add [OPTIONS] --git <GIT>

         Options:
               --repo <REPO>              Specify the git repo name for repo.
                                          Example: cloudwego_volo
           -v, --verbose...               Turn on the verbose mode.
           -g, --git <GIT>                Specify the git repo for idl.
                                          Should be in the format of "git@domain:path/repo.git".
                                          Example: git@github.com:cloudwego/volo.git
           -n, --entry-name <ENTRY_NAME>  The entry name, defaults to 'default'. [default: default]
           -r, --ref <REF>                Specify the git repo ref(branch) for idl.
                                          Example: main / $TAG
           -h, --help                     Print help
           -V, --version                  Print version
         ```

   3. repo update

      1. ```bash
         $ volo repo update --help
         update your repo by repo name, split by ','

         Usage: volo repo update [OPTIONS] [REPOS]...

         Arguments:
           [REPOS]...

         Options:
           -v, --verbose...               Turn on the verbose mode.
           -n, --entry-name <ENTRY_NAME>  The entry name, defaults to 'default'. [default: default]
           -h, --help                     Print help
           -V, --version                  Print version
         ```
