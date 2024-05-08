---
title: "DB"
linkTitle: "DB"
weight: 5
description: >
---

cwgo 集成了 gorm/gen 用于帮助用户生成 Model 代码以及基础的 CURD 代码。

## 基础命令

使用 `cwgo model -h` 查看使用详情

```sh
NAME:
   cwgo model - generate DB model

                Examples:
                  # Generate DB model code
                  cwgo  model --db_type mysql --dsn "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local"


USAGE:
   cwgo model [command options] [arguments...]

OPTIONS:
   --dsn value                        Specify the database source name. (https://gorm.io/docs/connecting_to_the_database.html)
   --db_type value                    Specify database type. (mysql or sqlserver or sqlite or postgres) (default: mysql)
   --out_dir value                    Specify output directory (default: biz/dao/query)
   --out_file value                   Specify output filename (default: gen.go)
   --tables value [ --tables value ]  Specify databases tables
   --exclude_tables value [ --exclude_tables value ]  Specify exclude tables
   --unittest                         Specify generate unit test (default: false)
   --only_model                       Specify only generate model code (default: false)
   --model_pkg value                  Specify model package name
   --nullable                         Specify generate with pointer when field is nullable (default: false)
   --signable                         Specify detect integer field\'s unsigned type, adjust generated data type (default: false)
   --type_tag                         Specify generate field with gorm column type tag (default: false)
   --index_tag                        Specify generate field with gorm index tag (default: false)
   --sql_dir value                    Specify a sql file or directory(Note: The 'dsn' parameter is invalid when using this parameter)
   --help, -h                         show help (default: false)
```

> 会忽略 sqlite 数据库所有 **sqlite 开头**的表，比如 sqlite_sequence、sqlite_master

## 详细参数

```console
   --dsn value                        指定数据库DSN
   --db_type value                    指定数据库类型(mysql or sqlserver or sqlite or postgres) (默认 mysql)
   --out_dir value                    指定输出目录路径，默认为 biz/dao/query
   --out_file value                   指定输出文件名，默认为 gen.go
   --tables value                     指定数据库表，默认为全表
   --exclude_tables value [ --exclude_tables value ]  指定排除的表，默认为空
   --unittest                         指定是否生成单测，默认为 false
   --only_model                       指定是否生成仅 model，默认为 false
   --model_pkg value                  指定 model 的包名
   --nullable                         指定生成字段是否为指针当字段为 nullable，默认为 false
   --signable                         指定字段是否检测整型列 unsigned 类型来调整生成相应的数据类型，默认为 false
   --type_tag                         指定字段是否生成 gorm 的 type tag，默认为 false
   --index_tag                        指定字段是否生成 gorm 的 index tag，默认为 false
   --sql_dir value                    指定一个sql文件或者目录(注意：当使用此参数时，--dsn参数失效)
```

## 用法示例

```sh
cwgo  model --db_type mysql --dsn "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local"
```
