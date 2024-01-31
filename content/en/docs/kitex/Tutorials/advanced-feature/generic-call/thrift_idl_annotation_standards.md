---
title: "IDL Definition Specification for Mapping between Thrift and HTTP"
date: 2022-05-21
author: wangjingpei
weight: 3
description: >
---

| date | version | author | update content |
| --- | ---- | ------ | ------------ |
| 2022-05-22 | v1.0  | wangjingpei | first version of IDL Definition Specification for Mapping between Thrift and HTTP |

This specification is the IDL definition standard for mapping between Thrift and HTTP. It contains definition standards of service, endpoint, `request` and `response` parameters. Kitex partially implements the specification, and the parts of annotation description indicate if it is supported.

## Specification

（1）The standards use annotations to describe API details such as API `method`, `path`, `position` and name of `request` and `response` parameters and so on

（2）The annotations mentioned above are in the form of `api.{key}={value}`, the key is usually used to specify the position occurred of the parameter, such as `header`，`cookie`，`query`，`body` and so on. The `value` is used to specify the actual name of fields, some functional annotations like `api.none`, `api.js_conv`, `api.http_code` are exceptions

（3）The annotations mentioned above must be in lower-case, uppercase or mixed case letters are not supported. for example `api.get`, `api.header` and so on.

## Standards for Whole File

- A service corresponds to only one thrift main file. The methods in the main file are for the corresponding API of the current service. The main IDL file can refer to other thrift file definitions
- In principle, each method corresponds to one `request` and one `response` definition
- In principle, `response` can be reused, while `request` reuse is not recommended

## Standards for Request

#### Restrict

1. We should specify the name and type of associated HTTP API parameters, such as header, cookie and name   by annotations. If not specified, the GET method  corresponds to query parameters, while the POST method corresponds to body parameters automatically. The field name is used as parameter key
2. If the HTTP request uses GET method, `api.body` annotation occurred in request definitions is  invalid. Only annotations such as `api.query`, `api.path` or `api.cookie` are supported
3. If one HTTP request uses POST method and the serialization strategy is `form`, the request field type like `object` and `map` is not supported. But Kitex doesn't support form now, only `json` format.

#### Annotation Description

| annotation | description | field restrict | is KiteX supported |
| --- | ---- | ------ | ----- |
| `api.query` | ` api.query `corresponds url query parameter for HTTP request | Only basic types (except for `object`, `map` ） and `list` split by , are supported | ✅|
| `api.path` | `api.query` corresponds url path parameter for HTTP request | Only basic types are supported | ✅|
| `api.header` | `api.header` corresponds header parameter for HTTP request | Only basic type and list split by , are supported | ✅|
| `api.cookie` | `api. cookie `corresponds cookie parameter for HTTP request | Only basic types are supported | ✅|
|` api.body` | `api.body `corresponds body parameter for HTTP request<br>Both serialization type like  `json` and `form` in body are supported | `Json` is supported by default . The `api.serializer` annotation for `method` can sepify serialization `json or form` |  ✅, but only `json` format |
| `api.raw_body` | `api.raw_body` corresponds raw body for HTTP request, we can get raw binary body | | ✅|
| `api.vd` | Parameter valid, we can refer [HTTPs://github.com/bytedance/go-tagexpr/tree/master/validator](HTTPs://github.com/bytedance/go-tagexpr/tree/master/validator) for details | | ❌ |
| `api.js_conv` | `api.js_conv` indicates the field should be string while the definition is in64, since int64 is not supported by typescript |The annotation value should be `true`, if else will be treated as invalid | ✅|
| `api.raw_uri` | `api.raw_uri` is used for protocol exchange from HTTP to RPC, the RPC service can get the raw uri by the field | Only `string` type is supported | ❌ |

#### Example

```thrift
struct Item{
    // For nested structures, if you want to set the serialization key, use gotag, such as `json: "Id"`
    1: optional i64 id(go.tag = 'json:"id"')
    2: optional string text
}
typedef string JsonDict
struct BizRequest {
    // Corresponding to v_int64 in HTTP query, and the value range is (0, 200)
    1: optional i64 v_int64(api.query = 'v_int64')
    2: optional string text(api.body = 'text') // Corresponding serialization key = text
    3: optional i32 token(api.header = 'token') // Corresponding token in HTTP header
    4: optional JsonDict json_header(api.header = 'json_header')
    5: optional Item some(api.body = 'some') // Corresponding first level key = some
    6: optional list<ReqItem> req_items(api.query = 'req_items')
    // api.query Only list split by are supported,Other complex types are not supported
    7: optional i32 api_version(api.path = 'action') // Corresponding path in uri
    8: optional i64 uid(api.path = 'biz') // Corresponding path in uri
    9: optional list<i64> cids(api.query = 'cids')
    // Corresponding to comma separated numbers in query, for example: cids=1,2,3,4 Only supported list<i64>、list<i32>
    10: optional list<string> vids(api.query = 'vids')
}
```

## Standards for Response

#### Restrict

- Only basic type like `int64`, `string`, `bool` and `list` split by `,` are supported for header value
- Response is defined directly by the business itself. The default JSON is serialized to the body, the key is the field name, and the annotation can be empty

#### Annotation Description

| annotation | description | field restrict | is KiteX supported |
| --- | ---- | ------ | ----- |
| `api.header` | `api.header` corresponds `header` parameter for HTTP response | Only basic types and `list` split by , are supported | ✅|
| `api.http_code` | `api.http_code` corresponds HTTP code for HTTP response，such as 200, 500 and so on |The annotation value should be `true`, if else will be treated as invalid | ✅|
| `api.body` | `api.body` corresponds `body` parameter for HTTP response | | ✅|
| `api.none` | `api.body` indicates the field will be ignored for  HTTP `response` |The annotation value should be `true`, if else will be treated as invalid | ✅|
| `api.js_conv` | `api.js_conv` indicates the field should be trans to `string` in response since it is int64 |The annotation value should be `true`, if else will be treated as invalid| ✅|
| `api.raw_body` | `api.raw_body` indicates the field will be treated as raw body  for response | | ✅|
| `api.cookie` | `api.cookie` indicates the field will be treated as cookie  for  HTTP response | | ✅|

#### Example

```thrift
// Finally, BizResponse json will be serialized as a return package to the client
struct RspItem{
    1: optional i64 item_id // By default, it is serialized with the field name as key, which is equivalent to using gotag `json:"item_id"`
    2: optional string text
}
struct BizResponse {
    // This field will be filled in the header returned to the client
    1: optional string T  (api.header= 'T')
    // first level key = 'rsp_items'
    2: optional map<i64, RspItem> rsp_items  (api.body='rsp_items')
    3: optional i32 v_enum  (api.none = 'true') // Ignore current parameter
    4: optional list<RspItem> rsp_item_list  (api.body = 'rsp_item_list')
    // The business specifies the HTTP Code itself. If not specified, baseResp.StatusCode=0 -> HTTPCode=200,  other HTTPCode=500
    5: optional i32 http_code  (api.http_code = 'true')
    6: optional list<i64> item_count (api.header = 'item_count') // Comma separated list when setting header
    7: optional string token (api.cookie = 'token') // 对应 response Cookie 字段
}
```

## Standards for Method

#### Restrict

- The serialization specified by the `api.serializer` is valid for GET request
- Each URI corresponds one `method` in IDL by annotation, the  annotation must be written

#### Annotation Description

| annotation | type | description | example | is KiteX supported |
| --- | ---- | --- | --- | ------ |
| `api.get` | `string` | `api.get` corresponds GET method, the value is the HTTP path, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | `api.get = '/life/client/favorite/collect'` |  ✅|
| `api.post` | `string` | `api.post` corresponds POST method, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | `api.post='/life/client/favorite/collect'` |  ✅|
| `api.put` | `string` | `api.put` corresponds PUT method, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | `api.put='/life/client/favorite/collect'` | ✅|
| `api.delete` | `string` | `api.delete` corresponds DELETE method, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | `api.delete='/life/client/favorite/collect'` | ✅|
| `api.patch` | `string` | `api.delete` corresponds DELETE method, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | `api.patch='/life/client/favorite/collect'` | ✅|
| `api.serializer` | `string` | Request serialization type of client request | Such as `form`, `json`, `thrift` or `pb` | ❌ |

#### Example

```thrift
service BizService{
    // Example 1: get request
    BizResponse BizMethod1(1: biz.BizRequest req)(
        api.get = '/life/client/:action/:biz',
        api.baseurl = 'ib.snssdk.com',
        api.param = 'true',
        api.category = 'demo'
    )

    // Example 2:   post request
    BizResponse BizMethod2(1: biz.BizRequest req)(
        api.post = '/life/client/:action/:biz',
        api.baseurl = 'ib.snssdk.com',
        api.param = 'true',
        api.serializer = 'form'
    )

    // Example 3:   delete request
    BizResponse BizMethod3(1: biz.BizRequest req)(
        api.post = '/life/client/:action/:biz',
        api.baseurl = 'ib.snssdk.com',
        api.param = 'true',
        api.serializer = 'json'
    )
}
```
