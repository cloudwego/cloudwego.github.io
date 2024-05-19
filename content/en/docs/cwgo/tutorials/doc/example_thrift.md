---
title: "thrift usage"
linkTitle: "thrift usage"
weight: 4
description: >
---

## Simple Example

### Create video.thrift

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

### Execute Command

```sh
cwgo doc --idl video.thrift --module {your module name}
```

### Generate Code

The directory structure for generating code refers to [layout](/docs/cwgo/tutorials/doc/layout/).

## Detailed Example

### Create user.thrift And video.thrift

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

### Execute Command

```sh
cwgo doc --idl user.thrift --module {your module name}
```

### Generate Code

The directory structure for generating code refers to [layout](/docs/cwgo/tutorials/doc/layout/).
