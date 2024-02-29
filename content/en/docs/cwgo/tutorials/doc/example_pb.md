---
title: "protobuf usage"
linkTitle: "protobuf usage"
weight: 5
description: >
---

## Simple Example

### Create video.proto

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

### Execute Command

```sh
cwgo doc -idl video.proto --proto_search_path . --module {your module name}
```

### Generate Code

The directory structure for generating code refers to [layout](/docs/cwgo/tutorials/doc/layout/).

## Detailed Example

### Create user.proto and video.proto

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

### Execute Command

```sh
cwgo doc -idl user.proto --proto_search_path . --module {your module name}
```

### Generate Code

The directory structure for generating code refers to [layout](/docs/cwgo/tutorials/doc/layout/).
