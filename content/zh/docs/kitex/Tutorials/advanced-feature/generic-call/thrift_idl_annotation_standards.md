---
title: "Thrift-HTTP 映射的 IDL 规范"
date: 2022-05-21
author: 王景佩
weight: 3
description: >
---


| 日期 | 版本 | 作者 | 变更内容 |
| ---------- | ----- | ----- | ------------------------------- |
| 2022-05-22 | v1.0  | 王景佩 | 第一版 Thrift-HTTP 映射的 IDL 规范 |

本规范是 `Thrift` 与 `HTTP` 接口映射的 IDL 定义标准，包括服务、接口以及请求 `request`、`response` 参数定义规范和错误码定义规范。Kitex 部分实现了该规范，注解说明有标注支持情况。

## 规范说明

（1）本规范采用注解方式来描述接口信息，包括接口的 `method`, `path` 以及接口请求参数，返回参数位置（如 `header`，`cookie` )、名称等信息

（2）本规范所述注解采用 `api.{key}={value}` 的形式，其中`key`通常用于指定该字段出现的位置如（`header`，`cookie`，`query`，`body` 等), `value` 用于指定该字段在对应位置的实际名称, 一些功能性注解（如`api.none`, `api.js_conv`, `api.http_code`) 除外

（3）本规范中定义的IDL注解如 `api.get`, `api.header` 等，只支持小写，不支持大写或者大小写混用如`api.GET`, `api.Header`

## 文件整体规范

- 一个服务 service 对应一个 thrift 主文件，主文件里的 `method` 都是针对当前服务对应接口，主文件可以引用其它 thrift 文件定义
- 每个 `Method` 原则上对应一个 `Request` 和 `Response` 定义
- 原则上不建议 `Request` 复用，可以复用 `Response`
  
## Request 规范 

### 约束

1. 接口请求字段需要使用注解关联到 HTTP 的某类参数和参数名称。如果无注解，`GET` 方法接口关联`query` 参数, `POST` 方法关联 `body` 参数, 字段名对应参数key
2. 如果 HTTP 请求是采用 `GET` 方式的，那么 `request` 定义中出现的 `api.body` 注解无效，只有`api.query`, `api.path`, `api.cookie` 有效。
3. 如果 HTTP 请求是采用 `POST` 方式且序列化方式是 `form` 的，那么 `request` 的字段不能有复杂结构如`map`，`object`，否则该字段无效。Kitex 目前暂未支持 `form` 格式，只支持 `json` 格式。

### 注解说明

| 注解 | 说明 | 字段约束 | Kitex 支持情况 |
| --- | ---- | ------ | ------------ |
| `api.query` | `api.query` 对应 HTTP 请求的 url query 参数  | 只支持基本类型(`object`, `map` 以外）和逗号分隔的 `list`  | 支持 |
| `api.path` | `api.path` 对应 HTTP 请求的 url path 参数 | 支持基本类型 | 支持 |
| `api.header` | `api.header` 对应 HTTP 请求的 header 参数 | 只支持基本类型和逗号分隔的`list` | 支持 |
| `api.cookie` | `api.cookie` 对应 HTTP 的 cookie 参数 | 支持基本类型 | 支持 |
| `api.body` | `api.body` 对应 HTTP 的 body 参数<br>支持 body 为 `json` 和 `form` 两种格式 |在未指定接口序列化方式下默认`json`格式，也可以在`method`注解中使用`api.serializer`来指定`json/form` | 支持，但目前仅支持 `JSON` 格式 |
| `api.raw_body` | `api.raw_body` HTTP 原始 body，少数接口 body 加密了，可以拿到原始的 body（二进制数组) | |  支持 |
| `api.vd` | 参数校验，使用了[HTTPs://github.com/bytedance/go-tagexpr/tree/master/validator](HTTPs://github.com/bytedance/go-tagexpr/tree/master/validator)库，检验表达式语法参见包内readme文件 | | 暂未支持 |
| `api.js_conv` | `api.js_conv` 标识该字段传入参数需要进行 string to int64 转换，来解决前端 js 不支持 int64 的场景 |value通常写true，其它情况与不写该注解等价 | 支持 |
| `api.raw_uri` | `api.raw_uri` 用于 HTTP to RPC 协议转换，RPC 服务获取 HTTP接口对应的原始 uri | 只支持 `string` 类型 | 暂未支持 |

### 举例

```thrift
struct Item{
    1: optional i64 id(go.tag = 'json:"id"') // 对于嵌套结构体，如果要设置序列化key,使用gotag 如 `json:"id"`
    2: optional string text
}
typedef string JsonDict
struct BizRequest {
    1: optional i64 v_int64(api.query = 'v_int64') // 对应HTTP query中的v_int64, 且值范围为(0,200)
    2: optional string text(api.body = 'text') // 对应序列化key = text
    3: optional i32 token(api.header = 'token') // 对应HTTP header中的token
    4: optional JsonDict json_header(api.header = 'json_header')
    5: optional Item some(api.body = 'some') // 对应一级key = some
    6: optional list<ReqItem> req_items(api.query = 'req_items')
    // api.query仅支持逗号相隔的list,其他复杂类型不支持
    7: optional i32 api_version(api.path = 'action') // 对应uri的path参数
    8: optional i64 uid(api.path = 'biz') // 对应uri的path参数
    9: optional list<i64> cids(api.query = 'cids')
    // 对应query里面逗号隔开的数字, 如 cids=1,2,3,4仅支持list<i64>、list<i32>
    10: optional list<string> vids(api.query = 'vids')
}
```

## Response 规范 

### 约束

- `header` 不支持除逗号相隔并且 `value` 为基本类型的 `list` 以外的复杂类型
- 直接按照业务自己定义的 `response。默认` `json` 序列化到 `body`，`key`为字段名，注解可为空

### 注解说明 

| 注解 | 说明 | 字段约束 | Kitex 支持情况 |
| --- | ---- | ------ | ------------- |
| `api.header` |`api.header` 设置HTTP 请求回复中的header | 只支持基本类型和逗号分隔的`list` | 支持 |
| `api.http_code` | `api.http_code` 对应HTTP 回复中的status code，200/500等 |value通常写`true`，其它情况与不写该注解等价 | 支持 |
| `api.body` | `api.body` 对应HTTP 回复中的body参数 | | 支持 |
| `api.none` | 标识该字段在 `response`中将会被忽略|value通常写`true`，其它情况与不写该注解等价| 支持 |
| `api.js_conv` | 兼容js int64问题，`response`时需要将int64表示为string|value通常写`true`，其它情况与不写该注解等价| 支持 |
| `api.raw_body` | `api.raw_body` 设置该字段`content`作为HTTP response的完整body | | 支持 |
| `api.cookie` | `api.cookie` 设置HTTP 回复中的cookie （`string`类型，后端自行拼接） | | 支持 | 

### 举例

```thrift
// 最终将把BizResponse json序列化之后作为给客户端的返包
struct RspItem{
    1: optional i64 item_id // 默认被以字段名作key序列化，等价于使用gotag `json:"item_id"`
    2: optional string text
}
struct BizResponse {
    1: optional string T  (api.header= 'T') 
    // 该字段将填入给客户端返回的header中
    2: optional map<i64, RspItem> rsp_items  (api.body='rsp_items')
    // 一级key = 'rsp_items'
    3: optional i32 v_enum  (api.none = 'true') // 该注解value通常写true，其它情况与不写该注解等价
    4: optional list<RspItem> rsp_item_list  (api.body = 'rsp_item_list')
    // 业务自己指定了HTTPCode,  如果没有指定, baseResp.StatusCode=0 -> HTTPCode=200,  其他 HTTPCode=500  
    5: optional i32 http_code  (api.http_code = 'true')    //对应 response HTTP Code
    6: optional list<i64> item_count (api.header = 'item_count') // 当设置header时以逗号相隔的列表
    7: optional string token (api.cookie = 'token') // 对应 response Cookie 字段
}
```

## Method 规范 

### 约束

- 如果是`GET`请求，`api.serializer`定义的序列化方式是无效的
- 每个URI对应IDL的一个`method`，通过注解关联，注解不可为空

### 注解说明 

| 注解 | 类型 | 说明 | 举例 | Kitex 支持情况 |
| --- | ---- | --- | --- | ------------- |
| `api.get` | `string` | `get`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | 例如  `api.get = '/life/client/favorite/collect'` |  支持 |
| `api.post` | `string` | `post`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | 例如 `api.post='/life/client/favorite/collect'` |  支持 |
| `api.put` | `string` | `put`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | 例如 <br>`api.put='/life/client/favorite/collect'` | 支持 |
| `api.delete` | `string` | `delete`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | `api.delete='/life/client/favorite/collect'` | 支持 |
| `api.patch` | `string` | `delete`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | `api.patch='/life/client/favorite/collect'` | 支持 |
| `api.serializer` | `string` | 客户端请求体序列化方式 | 如`form`, `json`, `thrift`, `pb`等 | 暂未支持 |

### 举例

```thrift
service BizService{
    // 例子1： get请求
    BizResponse BizMethod1(1: biz.BizRequest req)(
        api.get = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true',
        api.category = 'demo'
    )

    // 例子2:   post请求
    BizResponse BizMethod2(1: biz.BizRequest req)(
        api.post = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true', 
        api.serializer = 'form'
    )

    // 例子3:   delete请求
    BizResponse BizMethod3(1: biz.BizRequest req)(
        api.post = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true', 
        api.serializer = 'json'
    )
}
```
