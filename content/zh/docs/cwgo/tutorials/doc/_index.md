---
title: "Doc"
linkTitle: "Doc"
weight: 5
description: >
---

cwgo 支持通过idl结构体生成文档行数据库的 Model 代码以及基础的 CURD 代码。

## 基础命令

使用 `cwgo doc -h` 查看使用详情

```sh
NAME:
   cwgo doc - generate doc model

              Examples:
                # Generate doc model code
                cwgo doc --name mongodb --idl {{path/to/IDL_file.thrift}}


USAGE:
   cwgo doc [command options] [arguments...]

OPTIONS:
   --idl value [ --idl value ]                                                  Specify the IDL file path. (.thrift or .proto)
   --module value, --mod value                                                  Specify the Go module name to generate go.mod.
   --out_dir value                                                              Specify output directory, default is current dir.
   --model_dir value                                                            Specify model output directory, default is biz/doc/model.
   --dao_dir value                                                              Specify dao output directory, default is biz/doc/dao.
   --name value                                                                 Specify specific doc name, default is mongodb.
   --proto_search_path value, -I value [ --proto_search_path value, -I value ]  Add an IDL search path for includes.
   --thriftgo value, -t value [ --thriftgo value, -t value ]                    Specify arguments for the thriftgo. ({flag}={value})
   --protoc value, -p value [ --protoc value, -p value ]                        Specify arguments for the protoc. ({flag}={value})
   --verbose                                                                    Turn on verbose mode, default is false. (default: false)
   --help, -h                                                                   show help (default: false)
```

## 详细参数

```console
    --idl                       指定生成代码所需使用的 主idl 路径
    --out_dir                   指定代码输出目录, 默认为命令执行目录
    --model_dir                 指定 thriftgo 或 protoc 生成的 model 代码目录, 默认为 biz/doc/model
    --dao_dir                   指定生成的 doc curd 代码目录, 默认为 biz/doc/dao
    --name                      指定生成代码的文档型数据库名称, 默认为 mongodb, 目前仅支持 mongodb
    --proto_search_path / -I    指定 idl 搜索目录, idl type 为 proto 时使用
    --thriftgo / -t             透传给 thriftgo 的参数
    --protoc / -p               透传给 protoc 的参数
    --verbose                   默认为 false, 指定为 true 后会输出更详细的日志内容
    --help / -h                 帮助命令
```

## 用法示例

### Thrift

#### 生成命令

```sh
cwgo doc \
  --idl user.thrift \
  --module {your module name}
```

#### 示例 idl 文件

**user.thrift**

```thrift
namespace go user

include "video.thrift"

struct User {
    1: i64 Id (go.tag="bson:\"id,omitempty\"")
    2: string Username (go.tag="bson:\"username\"")
    3: i32 Age (go.tag="bson:\"age\"")
    4: string City (go.tag="bson:\"city\"")
    5: bool Banned (go.tag="bson:\"banned\"")
    6: UserContact Contact (go.tag="bson:\"contact\"")
    7: list<YDType> Yd (go.tag="bson:\"yd\"");
}
(
mongo.InsertOne = "InsertOne(ctx context.Context, user *user.User) (interface{}, error)"
mongo.InsertMany = "InsertMany(ctx context.Context, user []*user.User) ([]interface{}, error)"
mongo.FindUsernameOrderbyIdSkipLimitAll = "FindUsernames(ctx context.Context, skip, limit int64) ([]*user.User, error)"
mongo.FindByLbLbUsernameEqualOrUsernameEqualRbAndAgeGreaterThanRb = "FindByUsernameAge(ctx context.Context, name1, name2 string, age int32) (*user.User, error)"
mongo.UpdateContactByIdEqual = "UpdateContact(ctx context.Context, contact *user.UserContact, id int64) (bool, error)"
mongo.DeleteByYdEqual = "DeleteById(ctx context.Context, yd []user.YDType) (int, error)"
mongo.CountByAgeBetween = "CountByAge(ctx context.Context, age1, age2 int32) (int, error)"
mongo.BulkInsertOneUpdateManyByIdEqual = "BulkOp(ctx context.Context, userInsert *user.User, userUpdate *user.User, id int64) (*mongo.BulkWriteResult, error)"
mongo.TransactionBulkLbInsertOneUpdateManyByIdEqualRbCollectionVideoCollectionInsertManyVideos =
"TransactionOp(ctx context.Context, client *mongo.Client, videoCollection *mongo.Collection, userInsert *user.User, userUpdate *user.User, id int64, videos []*video.Video) error"
)

struct UserContact {
    1: string Phone (go.tag="bson:\"phone\"")
    2: string Email (go.tag="bson:\"email\"")
}

enum YDType {
  INVALID = 0;
  DOWN = -1;
  UP = 1;
}
```

**video.thrift**

```thrift
namespace go video

struct Video {
    1: i64 Id (go.tag="bson:\"id,omitempty\"")
    2: binary Data (go.tag="bson:\"data,omitempty\"")
}
(
mongo.InsertVideo = "InsertVideo(ctx context.Context, video *video.Video) (interface{}, error)"
)
```

### Proto

#### 生成命令

```sh
cwgo doc \
  -idl user.proto \
  --proto_search_path . \
  --module {your module name}
```

#### 示例 idl 文件

**user.proto**

```protobuf
syntax = "proto3";

package user;

import "idl/video.proto";

option go_package = "idl/user";

/*
mongo.InsertOne = |InsertOne(ctx context.Context, user *user.User) (interface{}, error)|
mongo.InsertMany = |InsertMany(ctx context.Context, user []*user.User) ([]interface{}, error)|
mongo.FindUsernameOrderbyIdSkipLimitAll = |FindUsernames(ctx context.Context, skip, limit int64) ([]*user.User, error)|
mongo.FindByLbLbUsernameEqualOrUsernameEqualRbAndAgeGreaterThanRb = |FindByUsernameAge(ctx context.Context, name1, name2 string, age int32) (*user.User, error)|
mongo.UpdateContactByIdEqual = |UpdateContact(ctx context.Context, contact *user.UserContact, id int64) (bool, error)|
mongo.DeleteByYdEqual = |DeleteById(ctx context.Context, yd []user.YDType) (int, error)|
mongo.CountByAgeBetween = |CountByAge(ctx context.Context, age1, age2 int32) (int, error)|
mongo.BulkInsertOneUpdateManyByIdEqual = |BulkOp(ctx context.Context, userInsert *user.User, userUpdate *user.User, id int64) (*mongo.BulkWriteResult, error)|
mongo.TransactionBulkLbInsertOneUpdateManyByIdEqualRbCollectionVideoCollectionInsertManyVideos =
|TransactionOp(ctx context.Context, client *mongo.Client, videoCollection *mongo.Collection, userInsert *user.User, userUpdate *user.User, id int64, videos []*video.Video) error|
 */
message User {
  int64 Id = 1; // go.tag=|bson:"id,omitempty"|
  string username = 2; // go.tag=|bson:"username"|
  int32 Age = 3; // go.tag=|bson:"age"|
  string City = 4; // go.tag=|bson:"city"|
  bool Banned = 5; // go.tag=|bson:"banned"|
  UserContact Contact = 6; // go.tag=|bson:"contact"|
  video.Video Videos = 7; // go.tag=|bson:"videos"|
  repeated YDType yd = 8; // go.tag=|bson:"yd"|
}

message UserContact {
  string Phone = 1; // go.tag=|bson:"phone"|
  string Email = 2; // go.tag=|bson:"email"|
}

enum YDType {
  INVALID = 0;
  DOWN = -1;
  UP = 1;
}
```

**video.proto**

```protobuf
syntax = "proto3";

package video;

option go_package = "idl/video";

// mongo.InsertVideo = |InsertVideo(ctx context.Context, video *video.Video) (interface{}, error)|
message Video {
  int64 Id = 1; // go.tag=|bson:"id,omitempty"|
  bytes Data = 2; // go.tag=|bson:"data,omitempty"|
}
```



```sh
cwgo  model --db_type mysql --dsn "gorm:gorm@tcp(localhost:9910)/gorm?charset=utf8&parseTime=True&loc=Local"
```

### 生成内容

![image](/img/docs/cwgo_doc_generate_file.png)

> biz/doc/dao/{struct name} mongodb curd 代码
> 
> - {struct name}_repo.go 函数接口文件
> - {struct name}_repo_mongo.go 具体 curd 代码
>
> biz/doc/model/{struct name}/{struct name}.go thriftgo 或 protoc 生成的代码。

## Idl 便携规则

### Thrift

#### 支持的数据类型

mongodb 中的集合与 thrift 中的 struct 对应。
struct 字段支持 thrift 中的所有基本数据类型、容器类型（list、map、set）、binary、枚举类型（文件内引用和文件外引用均支持）、struct 类型（文件内引用和文件外引用均支持）及上述类型的合法组合。

#### 支持的命名方式

struct 和各字段采用**大驼峰命名方式**或**蛇形命名方式**皆可。

#### Mongodb tag 添加

采用注解方式添加 tag。

格式：`(go.tag="bson:\"{field_name}{,omitempty}(按需选择是否添加)\"")`

例如 `(go.tag="bson:\"id,omitempty\"")` 或 `(go.tag="bson:\"id\"")`

#### Mongodb curd 函数添加

采用注释方式添加函数。

格式：`// mongo.{解析所用函数名} = |{实际使用的函数名}({入参...}) (返回值...)|`

例如 `// mongo.InsertOne = |InsertOne(ctx context.Context, user *user.User) (interface{}, error)|`

具体规则请参考[函数定义规则](#函数定义规则)。

#### 函数定义规则

函数名采用**驼峰式命名**，**首字母大写**，且第一个单词必须是如下之一：
- **Insert**
- **Find**
- **Update**
- **Delete**
- **Count**
- **Bulk**
- **Aggregate** （目前未支持）
- **Transaction**

把所有的操作总体分为两类：**作用于单个文档**，**作用于多个文档**，具体判定由**传入参数**和**返回值**共同决定。

### Insert

`Insert` 操作只有**插入单个文档**和**插入多个文档**两种，由传入参数和返回值共同判定。

**函数命名**：首单词为 `Insert` 即可，后面的可任意定义。

**入参**：固定两个，`(ctx(固定)，结构体指针或结构体指针切片)`

**返回值**：固定两个，`(interface{}或[]interface{}, error(固定))`

### Find

`Find` 操作包括**单实体**和**多实体**两种，由返回值决定，返回值为指针切片，即为单实体操作，否则为多实体操作。

**函数命名**：首单词为 `Find`，后面的遵循如下规则：`Find{想展示的字段名，若没有则全部展示}{排序分页等操作，若没有则不加}By{查询条件}/All(无查询条件)`

**入参**：第一个固定为 `ctx`，后面的参数参考比较条件按顺序传入。

**返回值**：固定两个，`(结构体指针或结构体指针切片, error(固定))`。

**例**：`Find Name OrderbyNameSkipLimit By GenderEqualOrAgeGreaterThan`

- **字段名**：go 中对应的结构体名称

- **排序分页等操作**（入参中无需传值）

  | 格式                           | 描述 | 入参值说明 | 示例                                                                |
  |------------------------------|----|-------|-------------------------------------------------------------------|
  | **Orderby**{thrift字段名123...} | 默认针对字段升序，若某个字段有降序的需求，在字段后加 Desc(只作用于单个字段，若有多个降序字段的需求，需要在每一个字段后面都跟 Desc)，例 OrderbyName(升)AgeDesc(降) | 入参不传值 | `FindUsernameOrderbyIdUsernameSkipLimitAll`（含两个字段"id","Username"） |
  | **Skip** | 跳过文档数量 | 入参为 `skip` | `FindUsernameOrderbyIdUsernameSkipLimitAll`（跳过文档） |
  | **Limit** | 限制查询文档数量 **单实体操作不支持** | 入参为 `limit` | `FindUsernameOrderbyIdUsernameSkipLimitAll`（限制查询文档数量）

- **查询条件**

  以 `By` 或 `All` 开头, `By` 后面要跟具体的查询条件, `All` 后面不用跟条件

  `By` 后面必须要跟具体的字段以及比较条件，若有需要，以 `And` 或 `Or` 标识与或条件并连接各个字段及比较条件，在使用 `And` 或 `Or` 连接词时，若需要指示查询优先级，则以 `Lb`、`Rb` 标识子连接条件，例如：`ByLbLbUsernameEqualOrUsernameEqualRbAndAgeGreaterThanRb` == `By((UsernameEqualOrUsernameEqual)AndAgeGreaterThan)`

- **语法格式**：`By{字段名}{比较条件}{And/Or}{字段名}{比较条件}`

- **比较条件**：

  | **关键词** | **含义** | **入参值** |
  |-----------|---------|------------|
   | **Equal** | 等于 | 该字段值 |
    | **NotEqual** | 不等于 | 该字段值 |
    | **LessThan** | 小于 | 该字段值 |
    | **LessThanEqual** | 小于等于 | 该字段值 |
    | **GreaterThan** | 大于 | 该字段值 |
    | **GreaterThanEqual** | 大于等于 | 该字段值 |
    | **Between** | [a,b] | 左右端点值 |
    | **NotBetween** | <a && >b | 左右端点值 |
    | **In** | 字段值在切片范围内 | 切片 |
    | **NotIn** | 字段值不在切片范围内 | 切片 |
    | **True** | 字段值是否为 true | - |
    | **False** | 字段值是否为 false | - |
    | **Exists** | 指定字段存在的文档 ｜ - ｜
    ｜ **NotExists** | 指定字段不存在的文档 | - |

### Update

`Update` 操作包括**单实体**和**多实体**两种，由返回值决定，返回值为bool，即为单实体操作，表示单次更新操作是否成功；返回值为 int，为多实体操作，表示成功更新的个数。

Update 操作以更新对象的角度分为两种：

- **更新整个文档**（Update 后面不加字段，需传入结构体指针）；

- **更新部分字段**（Update 后面加字段名，需传入更新后的字段值）。

**函数命名**：
首单词为 Update，后面的遵循如下规则：

`Update(Upsert){要更新的字段名，若没有则按整个结构体更新，需传入结构体指针}By{查询条件}/All(无查询条件)` 查询条件与 Find 相同。

> 更新操作目前仅支持使用 $set。

**入参**：第一个固定为 `ctx`，后面的参数按照更新的字段名和比较条件**按顺序**传入。

**返回值**：固定两个，`(bool 或 int, error(固定))`

### Delete

`Delete` 操作包括**单实体**和**多实体**两种，判定方式与 `Update` 相同。

**函数命名**：

`DeleteBy{查询条件}/All(无查询条件)` 查询条件与 `Find` 相同

**入参**：第一个固定为 `ctx`，后面的参数参考比较条件**按顺序**传入即可。

**返回值**：固定两个，`(bool 或 int, error(固定))`

### Count

只有多实体操作。

**函数命名**：

`CountBy{查询条件}/All(无查询条件)` 查询条件与 `Find` 相同

**入参**：第一个固定为 `ctx`，后面的参数参考比较条件**按顺序**传入即可。

**返回值**：固定为 `(int, error)`

### Bulk

`Bulk` 操作支持 `Insert`, `Update`, `Delete` 操作

> 其中，Insert 仅支持 InsertOne，其他两种操作 one 和 many 都支持。

> Insert 固定写 InsertOne，Update, Delete 需指定是单实体操作还是多实体操作，需要在后面加 One 或 Many，
> 如 UpdateOne UpdateMany

**函数命名**：

`Bulk{操作1, 如 Insert}{操作2, 如 DeleteOneAll}`

**入参**：第一个固定为 `ctx`，后面的参数按各个操作传入参数的**顺序传入**。

**返回值**：固定为 `(*mongo.BulkWriteResult, error)`

### Aggregate （目前未支持）

**函数命名**：Aggregate{操作1}{操作2}

可能有关键词嵌套关键词的场景，如分组下面继续分组，需要在每个关键词后面加一个数字标识关键词处于第几层级， 例如：Aggregate Project1NameAge Group1NameGroup2AgeSumAge3，Limit Skip 等需要带数字的关键词中间以 Separator 分隔，如 Limit2Separator5，2为层级，5为限制的个数

支持如下几种：

| **关键词** | **用法** | **入参值** |
|------------|---|----|
| Project | Project {层级}{字段名123...}，后面跟的字段名为想展示的字段，不用 Project 则全部展示 | - |
| Limit | Limit{层级}Separator5 | - |
| Skip | Skip{层级}Separator5 | - |
| Sort | Orderby{层级}{字段名123...}，默认针对字段升序，若某个字段有降序的需求，在字段后加 Desc，例 Orderby1Name(升)Age(降) | - |
| Match | Match{层级}{查询条件}  | 入参值参考查询条件的规则 |
| Group | Group{层级}{分组字段名，不加认为整个文档为一组}{操作符123...} | - |
| Distinct | Distinct{层级}{字段名123...} | - |
| Regex | Regex{层级}{字段名123...}{模糊匹配值123...} | 模糊匹配值 |

Group 支持的常规操作符：avg first last max min sum，上面的几种也可按需作为 group  操作符使用。

### Transaction

`Transaction` 支持 `Insert`, `Update`, `Delete`, `Bulk` 操作，并且支持针对多个集合的事务操作。

> Insert, Update, Delete 均支持 One Many，需指定单实体操作还是多实体操作，如 InsertOne，InsertMany;Bulk 操作需要以 Lb 和 Rb 来标志开始和结束，例如：`BulkLbInsertOneUpdateManyByIdEqualRb`。

若**使用其他集合**的操作，需在 Insert, Update, Delete，Bulk 操作前面加上 Collection 关键字以及参数的驼峰命名首字母大写方式，并在 client 后面依次传入相应的 collection 参数（参数命名要求：驼峰命名方式，首字母小写）

例：`CollectionUserCollectionInsertMany`, 传入参数：`userCollection *mongo.Collection`；若使用的是本集合的操作，则无需加 Collection 及相关参数。

**函数命名**：

`Transaction{操作1, 如 CollectionUserCollectionInsertMany}{操作2, 如 UpdateOneByAgeEqual}`

**入参**：第一个固定为 `ctx`，第二个固定为 `client`，第三块固定为使用的其他集合，后面的参数按各个操作传入参数的顺序传入。

**返回值**：固定为 `error`

## 更新

字段有更新或函数有更新时，工具的行为是：将读到的注解中的函数名与生成的代码文件中的函数名做对比，代码文件中有注解没有的在文件后 append，其余不动。
