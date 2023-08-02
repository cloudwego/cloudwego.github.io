---
title: "DB"
linkTitle: "DB"
weight: 4
description: >
---

cwgo integrates gorm/gen to help users generate Model code and basic CURD code.

## Basic commands

Use `cwgo model -h` to view usage details

```sh
NAME:
    cwgo model-generate DB model

                 Examples:
                   # Generate DB model code
                   cwgo model --db_type mysql --dsn "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local"


USAGE:
    cwgo model [command options] [arguments...]

OPTIONS:
    --dsn value Specify the database source name. (https://gorm.io/docs/connecting_to_the_database.html)
    --db_type value Specify database type. (mysql or sqlserver or sqlite or postgres) (default: mysql)
    --out_dir value Specify output directory (default: biz/dao/query)
    --out_file value Specify output filename (default: gen.go)
    --tables value [ --tables value ] Specify databases tables
    --unittest Specify generate unit test (default: false)
    --only_model Specify only generate model code (default: false)
    --model_pkg value Specify model package name
    --nullable Specify generate with pointer when field is nullable (default: false)
    --signable Specify detect integer field\'s unsigned type, adjust generated data type (default: false)
    --type_tag Specify generate field with gorm column type tag (default: false)
    --index_tag Specify generate field with gorm index tag (default: false)
    --help, -h show help (default: false)
```

## Specification

```console
    --dsn value specify database DSN
    --db_type value specifies the database type (mysql or sqlserver or sqlite or postgres) (default mysql)
    --out_dir value specifies the output directory path, the default is biz/dao/query
    --out_file value specify the output file name, the default is gen.go
    --tables value specifies the database table, the default is the full table
    --unittest specifies whether to generate unit tests, the default is false
    --only_model specifies whether to generate only model, default is false
    --model_pkg value specifies the package name of the model
    --nullable specifies whether the generated field is a pointer when the field is nullable, the default is false
    --signable specifies detect integer field\'s unsigned type, adjust generated data type, the default is false
    --type_tag specifies whether to generate gorm's type tag for the specified field, the default is false
    --index_tag specifies whether to generate gorm's index tag for the specified field, the default is false
```

## Example

```sh
cwgo model --db_type mysql --dsn "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local"
```
