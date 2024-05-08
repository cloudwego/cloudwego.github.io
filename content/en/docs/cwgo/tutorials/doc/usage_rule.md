---
title: "usage rule"
linkTitle: "usage rule"
weight: 2
description: >
---

## Thrift

### Supported data types

The set in mongodb corresponds to the struct in thrift.

The struct field supports all basic data types, container types (list, map, set), binary, enumeration types (both in file and out of file references are supported), struct types (both in file and out of file references are supported), and legal combinations of the above types in thrift.

### Supported naming conventions

Struct and various fields can be named using either the **Big Camel Naming Method** or the **Snake Naming Method**.

### Add Mongodb tag

Add tags using **annotations**.

format: `(go.tag="bson:\"{field_name}{,omitempty}(Choose whether to add as needed)\"")`

example: `(go.tag="bson:\"id,omitempty\"")` or `(go.tag="bson:\"id\"")`

### Add Mongodb curd function

Add functions using **annotations**.

format: `mongo.{Parse the function name used} = "{The actual function name used}({input params...}) (returns...)"`

example: `mongo.InsertOne = "InsertUser(ctx context.Context, user *user.User) (interface{}, error)"`

For specific rules, please refer to [usage rule](#usage-rule).

## Protobuf

### Supported data types

The set in mongodb corresponds to the message in protobuf.

The message field supports all basic data types in proto, keywords such as repeated, bytes, enumeration types (both in file and out of file references are supported), message types (both in file and out of file references are supported), and legal combinations of the above types.

### Supported naming conventions

Message and various fields can be named using either the **Big Camel Naming Method** or the **Snake Naming Method**.

### Add Mongodb tag

Add tags using **comments**.

format: `// go.tag=|bson:"{field_name}{,omitempty}(Choose whether to add as needed)"|`

example: `// go.tag=|bson:"id,omitempty"|` or `// go.tag=|bson:"id"|`

### Add Mongodb curd function

Add functions using **comments**.

format: `// mongo.{Parse the function name used} = |{The actual function name used}({input params...}) (returns...)|`

example: `// mongo.InsertOne = |InsertUser(ctx context.Context, user *user.User) (interface{}, error)|`

For specific rules, please refer to [usage rule](#usage-rule).

## Usage Rule

The function name adopts a **camel shaped naming**, with the **first letter capitalized**, and the first word must be one of the following:

- **Insert**
- **Find**
- **Update**
- **Delete**
- **Count**
- **Bulk**
- **Transaction**

Divide all operations into two categories: **acting on a single document** and **acting on multiple documents**. The specific judgment is determined by the combination of **passed in parameters** and **return values**.

### Insert

The `Insert` operation only has two options: **insert a single document** and **insert multiple documents**, which are determined by both the incoming parameters and the return value.

**Function Naming**: The first word is `Insert`, and the rest can be defined arbitrarily.

**Input Params**: Fix two,`(ctx(fix), structure pointer or structure pointer slice)`

**Returns**: Fix two, `(interface{} or []interface{}, error(fix))`

### Find

The `Find` operation includes two types: **single entity** and **multiple entities**, determined by the return value. The return value is a pointer slice, which is a single entity operation. Otherwise, it is a multiple entity operation.

**Function Naming**: The first word is `Find`, followed by the following rules: `Find{The field names you want to obtain, if not, obtain all of them}{Sort and page operations, if not, do not add}By{Query condition}/All(No Query Condition)`

**Input Params**: The first parameter is fixed as `ctx`, and the following parameters are passed in order based on the comparison conditions.

**Returns**: Fix two, `(structure pointer or structure pointer slice, error(fix))`

**Example**: `Find Name OrderbyNameSkipLimit By GenderEqualOrAgeGreaterThan`

- **Field Name**：Corresponding structural field names in go

  If there is a nested structure, the field name format is: {Field name of the child structure in the parent structure}{Specific field name in the child structure}. For example, if User nested Video and wants to find the Id field of the Video, it is: VideoId

- **Sorting and pagination operations**

| Format                                 | Description                                                                                                                                                                                                                                                                                                                                               | Example                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Orderby**{thrift field names 123...} | By default, it is for field ascending. If a field has a descending requirement, add Desc after the field (only applicable to a single field, if there is a requirement for multiple descending fields, Desc needs to be added after each field), for example, OrderbyName (ascending) AgeDesc (descending) **Entering parameters without passing values** | `FindUsernameOrderbyIdUsernameSkipLimitAll`(including two fields "Id" and "Username") |
| **Skip**                               | Skip number of documents **Enter an integer as an input parameter**                                                                                                                                                                                                                                                                                       | `FindUsernameOrderbyIdUsernameSkipLimitAll`(Skip document)                            |
| **Limit**                              | Limit the number of documents to be queried **Single entity operations are not supported, Enter an integer as an input parameter**                                                                                                                                                                                                                        | `FindUsernameOrderbyIdUsernameSkipLimitAll`(Limit the number of queried documents)    |

- **Query Condition**

  Start with `By` or `All`, followed `By` specific query conditions, and `All` does not need to be followed by conditions

  `By` must be followed by specific fields and comparison conditions. If necessary, use `And` or `Or` to identify the And Or condition and connect each field and comparison condition. When using the `And` or `Or` connector, if it is necessary to indicate query priority, use `Lb` or `Rb` to identify sub connection conditions. For example: `ByLbLbUsernameEqualOrUsernameEqualRbAndAgeGreaterThanRb` == `By((UsernameEqualOrUsernameEqual)AndAgeGreaterThan)`

- **Grammar Format**：`By{Field Name}{Query Condition}{And/Or}{Field Name}{Query Condition}`

- **Compare Condition**：

| **关键词**           | **Description**                                   | **Input param value**   |
| :------------------- | :------------------------------------------------ | :---------------------- |
| **Equal**            | Equal                                             | The value of this field |
| **NotEqual**         | NotEqual                                          | The value of this field |
| **LessThan**         | LessThan                                          | The value of this field |
| **LessThanEqual**    | LessThanEqual                                     | The value of this field |
| **GreaterThan**      | GreaterThan                                       | The value of this field |
| **GreaterThanEqual** | GreaterThanEqual                                  | The value of this field |
| **Between**          | [a,b]                                             | The value of this field |
| **NotBetween**       | <a && >b                                          | The value of this field |
| **In**               | Field value within the slice range                | slice                   |
| **NotIn**            | Field value is not within the slice range         | slice                   |
| **True**             | Is the field value true                           | -                       |
| **False**            | Is the field value false                          | -                       |
| **Exists**           | Specify the document in which the field exists    | -                       |
| **NotExists**        | Documents with specified fields that do not exist | -                       |

### Update

The `Update` operation includes two types: **single entity** and **multiple entities**, which are determined by the return value. The return value is bool, indicating whether the single entity operation is successful; The return value is int, which represents a multi entity operation and the number of successful updates.

The Update operation is divided into two types based on the perspective of updating objects:

- **Update the entire document**(No field added after Update, structure pointer needs to be passed in);

- **Update some fields**(Add a field name after Update and pass in the updated field value).

**Function Naming**:
The first word is Update, followed by the following rules:

`Update(Upsert){The name of the field to be updated, if not, it will be updated as the entire structure, and a structure pointer needs to be passed in}By{Query Condition}/All(No Query Condition)` The query conditions are the same as Find.

> The update operation currently only supports the use of $set.

**Input Params**: The first parameter is fixed as `ctx`, and the following parameters are passed in order based on the updated field name and comparison criteria.

**Returns**: Fix two, `(bool or int, error(fix))`

### Delete

The `Delete` operation includes two types: **single entity** and **multiple entities**, and the judgment method is the same as `Update`.

**Function Naming**:

`DeleteBy{Query Condition}/All(No Query Condition)` The query conditions are the same as Find

**Input Params**: The first parameter is fixed as `ctx`, and the following parameters can be passed in order based on the comparison conditions.

**Returns**: Fix two, `(bool or int, error(fix))`

### Count

Only multi entity operations.

**Function Naming**:

`CountBy{Query Condition}/All(No Query Condition)` The query conditions are the same as Find.

**Input Params**: The first parameter is fixed as `ctx`, and the following parameters can be passed in order based on the comparison conditions.

**Returns**: Fix `(int, error)`

### Bulk

`Bulk` supports `Insert`, `Update`, `Delete` Operation

> Among them, Insert only supports InsertOne, while the other two operations, One and Many are all supported.

> Insert fixed write InsertOne, Update, Delete needs to specify whether it is a single entity operation or a multi entity operation, with One or Many added after it,
> Example: UpdateOne UpdateMany

**Function Naming**:

`Bulk{Operation1, example InsertOne}{Operation2, example DeleteOneAll}`

**Input Params**: The first one is fixed as `ctx`, and the following parameters are passed in the order of the parameters passed in each operation.

**Returns**: Fix `(*mongo.BulkWriteResult, error)`

### Transaction

`Transaction` supports `Insert`, `Update`, `Delete`, `Bulk` operation, and support transaction operations for multiple collections.

> Insert, Update, and Delete all support One Many, and it is necessary to specify whether a single entity operation or a multi entity operation is required, such as InsertOne and InsertMany; The bulk operation needs to be marked with Lb and Rb to start and end, for example: `BulkLbInsertOneUpdateManyByIdEqualRb`.

If using operations from other sets, you need to add the Collection keyword and the parameter's camel hump naming capitalization before the Insert, Update, Delete, and Bulk operations, and pass in the corresponding collection parameters after the client in sequence (parameter naming requirements: camel hump naming, lowercase first letter)

For example: `CollectionUserCollectionInsertMany`, input param: `userCollection *mongo.Collection`; If the operation of this collection is used, there is no need to add Collection and related parameters.

**Function Naming**:

`Transaction{Operation1, example CollectionUserCollectionInsertMany}{Operation2, example UpdateOneByAgeEqual}`

**Input Params**: The first block is fixed as `ctx`, the second block is fixed as `client`, and the third block is fixed as other sets used. The following parameters are passed in the order in which they are passed in for each operation.

**Returns**: Fix `error`

## Keywords

> When naming structure fields, do not include the following keywords:

- **Insert**
- **Find**
- **Update**
- **Delete**
- **Count**
- **Bulk**
- **Transaction**
- **Collection**
- **Lb**
- **Rb**
- **One**
- **Many**
- **By**
- **All**
- **Orderby**
- **Skip**
- **Limit**
- **Equal**
- **NotEqual**
- **LessThan**
- **LessThanEqual**
- **GreaterThan**
- **GreaterThanEqual**
- **Between**
- **NotBetween**
- **In**
- **NotIn**
- **True**
- **False**
- **Exists**
- **NotExists**

## Update

When there is an update to a field or function, the behavior of the tool is to compare the function name read in the annotation with the function name generated in the code file. If there is an annotation in the code file that is not present, append it after the file, and leave the rest unchanged.
