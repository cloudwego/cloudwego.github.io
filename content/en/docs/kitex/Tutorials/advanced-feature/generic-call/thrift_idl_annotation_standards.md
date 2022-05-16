---
title: "CloudWeGo Thrift IDL Annotation Standards"
date: 2022-05-16
weight: 3
description: >
---

## CloudWeGo Thrift IDL Annotation Standards

This document is a series of API definition standards associated with `thrift` IDL. It contains definition standards of service, endpoint, `request` and `response` parameters.

## Specification

（1）The standards use annotations to describe API details such as API `method`, `path`, `position` and name of `request` and `response` parameters and so on

（2）The annotations mentioned above are in the form of `api.{key}={value}`, the key is usually used to specify the position occured of the parameter, such as `header`，`cookie`，`query`，`body` and so on. The `value` is used to specify the actual name of fields, some functional annotations like `api.none`, `api.js_conv` are exceptions

（3）The annotations mentioned above must be in lower-case, uppercase or mixed case letters are not supported. for example `api.get`, `api.header` and so on.

## standards for whole file

- A service corresponds to only one thrift main file. The methods in the main file are for the corresponding API of the current service. The main IDL file can refer to other thrift file definitions
- In principle, each method corresponds to one `request` and one `response` definition
- In principle, `response` can be reused, while `request` reuse is not recommended
  
## standards for request

### restrict

1. We should specify the name and type of associated HTTP API parameters, such as header, cookie and name   by annotations. If not specified, the GET method  corresponds to query parameters, while the POST method corresponds to body parameters automatically. The field name is used as parameter key
2. If the HTTP request uses GET method, `api.body` annotation occurred in request definitions is  invalid. Only annotations such as `api.query`, `api.path` or `api.cookie` are supported
3. If one HTTP request uses POST method and the serialization strategy is `form`, the request field type like `object` and `map` is not supported

### Annotation description

| annotation | description | field restrict |
| --- | ---- | ------ |
| `api.query` | ` api.query `corresponds url query parameter for HTTP request | Only basic types (except for `object`, `map` ） and `list` split by , are supported |
| `api.path` | `api.query` corresponds url path parameter for HTTP request | Only basic types are supported |
| `api.header` | `api.header` corresponds header parameter for HTTP request | Only basic type and list split by , are supported |
| `api.cookie` | `api. cookie `corresponds cookie parameter for HTTP request | Only basic types are supported |
|` api.body` | `api.body `corresponds body parameter for HTTP request<br>Both serialization type like  `json` and `form` in body are supported | `Json` is supported by default . The `api.serializer` annotation for `method` can sepify serialization `json or form` |
| `api.raw_body` | `api.raw_body` corresponds raw body for HTTP request, we can get raw binary body | | 
| `api.vd` | Parameter valid, we can refer [HTTPs://github.com/bytedance/go-tagexpr/tree/master/validator](HTTPs://github.com/bytedance/go-tagexpr/tree/master/validator) for details | |
| `api.js_conv` | `api.js_conv` indicates the field should be string while the definition is in64, since int64 is not supported by typescript | |
| `api.raw_uri` | `api.raw_uri` is used for protocol exchange from HTTP to RPC, the RPC service can get the raw uri by the field | Only `string` type is supported |

### example

```thrift
struct Item{
    // For nested structures, if you want to set the serialization key, use gotag, such as ` JSON: "Id"`
    1: optional i64 id(go.tag = "json:\"id\"")
    2: optional string text
}
typedef string JsonDict
struct BizRequest {
    // Corresponding to v_int64 in HTTP query, and the value range is (0, 200)
    1: optional i64 v_int64(api.query = 'v_int64', api.vd = "$>0&&$<200") 
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
    // Corresponding to the comma separated string in query, for example:  vids=a,b,c,d   Only supported list<string>
    252: optional BizCommonParam biz_common_param // Business public parameters, as described below
    253: optional TTNetCommonParam ttnet_common_param // TTNET public parameters, as described below
    254: optional AgwCommonParam agw_common_param // AGW loader General parameters，as described below，use only when accessing AGW
    255: optional base.Base Base 
}
```

## standards for response

### restrict

- Only basic type like int64, string, bool and list split by , are supported for header value
- Reponse is defined directly by the business itself. The default JSON is serialized to the body, the key is the field name, and the annotation can be empty

### Annotation description

| annotation | description | field restrict |
| --- | ---- | ------ |
| `api.header` | `api.header` corresponds `header` parameter for HTTP response | Only basic types and `list` split by , are supported |
| `api.http_code` | `api.HTTP_code` corresponds HTTP code for HTTP response，such as 200, 500 and so on | |
| `api.body` | `api.body` corresponds `body` parameter for HTTP response | |
| `api.none` | `api.body` indicates the field will be ignored for  HTTP `response` | |
| `api.js_conv` | `api.js_conv` indicates the field should be trans to `string` in response since it is int64 | |
| `api.raw_body` | `api.raw_body` indicates the field will be treated as raw body  for response | |
| `api.cookie` | `api.cookie` indicates the field will be treated as cookie  for  HTTP response | |

### example

```thrift
// Finally, BizResponse json will be serialized as a return package to the client
struct RspItem{
    1: optional i64 item_id // By default, it is serialized with the field name as key, which is equivalent to using gotag `json:"item_id"`
    2: optioanl string text
}
struct BizResponse {
    1: optional string T  (api.header= 'T') 
    // This field will be filled in the header returned to the client
    2: optional map<i64, RspItem> rsp_items  (api.body='rsp_items')
    // first level key = 'rsp_items'
    3: optional i32 v_enum  (api.none = '') // Ignore current parameter
    4: optional list<RspItem> rsp_item_list  (api.body = 'rsp_item_list')
    5: optional i32 http_code  (api.http_code = '') 
    // The business specifies the HTTPCode itself. If not specified, baseResp.StatuCode=0 -> HTTPCode=200,  other HTTPCode=500      
    6: optional list<i64> item_count (api.header = 'item_count') // Comma separated list when setting header
    255: optional base.BaseResp BaseResp,
}
```

## standards for Method

### restrict

- The serialization specified by the `api.serializer` is valid for GET request
- Each URI corresponds one `method` in IDL by annotation, the  annotation must be written

### Annotation description

| annotation | type | description | example |
| --- | ---- | --- | --- |
| `api.get` | `string` | `api.get` corresponds GET method, the value is the HTTP path, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | For example  `api.get = '/life/client/favorite/collect'`
| `api.post` | `string` | `api.post` corresponds POST method, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | For example `api.post='/life/client/favorite/collect'`
| `api.put` | `string` | `api.put` corresponds PUT method, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | For example <br>`api.put='/life/client/favorite/collect'` |
| `api.delete` | `string` | `api.delete` corresponds DELETE method, the uri syntex is in accord with gin( we can refer [httprouter](https://github.com/julienschmidt/httprouter) for detail) | `api.delete='/life/client/favorite/collect'` |
| `api.serializer` | `string` | Request serialization type of client request | Such as `form`, `json`, `thrift` or `pb` |
| `api.param` | `string` | `api.param` marks with common parameters or not | `True` or `false` |
| `api.baseurl` | `string` | Baseurl for ttnet | For example  [ib.snssdk.com](http://ib.snssdk.com/) |
| `api.gen_path` | `string` | The `api.gen_path`indicates the path in client codegen， while the path in `api.get`, `api.post` annotation value is used in gateway | Such as `api.post='/v:version/modify'`, the version variable can be solidified when updating IDL, for example, solidified to 3，<br>so `api.gen_path='/v3/modify'` |
| `api.version` | `string` | The client generated code is to replace the `:version` variable in the path, and the priority is lower than `api.gen_path` | Such as `api.post='/v:version/modify'`，`api.version='7'`，then the path in the generated code is `'/v7/modify'`。|
| `api.tag` | `string` | Client RPC adds tags, supports multiple, comma separated (only supports IOS for the time being)| For example: `api.tag="API,DATA"` |
| `api.category` | `string` | The method category, usually used in API doc | Only support one category|

### example

```thrift
service BizService{
    // Example 1: get request
    // api.category can specify the category directory in the BAM interface document
    BizResponse BizMethod1(1: biz.BizRequest req)(
        api.get = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true',
        api.category = `demo`
    )

    // Example 2:   post request，form serialize
    BizResponse BizMethod2(1: biz.BizRequest req)(
        api.post = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true', 
        api.serializer = 'form'
    )

    // Example 3:   post request，json serialize
    BizResponse BizMethod3(1: biz.BizRequest req)(
        api.post = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true', 
        api.serializer = 'json'
    )
}
```

## standards for Error

### Annotation description

We use enum value annotation to define error which is used for API response,  including `http_code` and `message`

`stable_code` is usually used to mark whether the error code is stable, which is similar to 5xx and 4xx for HTTP code . Many frameworks use 200 as HTTP code for HTTP calls in unison. We suggest using `stable_code` to indicate if the error code is stable or not

| annotation name | type | comment | example |
| ------------------------- | ---------- | ---------------- | ------------- |
| `api.http_code` | `string` | Generate the corresponding http_code in the error type | `api.http_code="200"` |
| `api.http_message` | `string` | Generate the corresponding prompt information in the error type | `api.http_message="param error"` |
| `api.stable_code` | `string` | The error code stable | `api.stable_code="0"` |

### restrict

1. `api.http_code` may be undefined,  200 was used by default for http_code
2. `api.http_message`  may be undefined, enum name was used for error message by default 
3. either `api.http_code` or `api.http_message` must be defined, or error can't be verifyed
4. while only `string` type is supported for thrift annotations, `api.http_code` type is `string`

### 举例（example)

```thrift
//example 
enum BapiError {
    Success = 0 (
        api.http_code="200", 
        api.http_message="success"
    ); // normal return

    ParamError = 1 (
        api.http_code="400"，
        api.stable_code="1" 
    ); // use default http_message ParamError

    NoRetry = 2 (api.http_message="no retry" ); // use default http_code 200
    
    InternalError = 3 ; // common enum, not error
}
```

## extension annotations

In order to support the exchange from HTTP to RPC, we support the following annotations as extension annotations

Various business scenarios may be encountered during actual implementation. We introduce extension annotations to solve some special requirements, such as the need to map a nested field to the top level of the request or response body. The extended annotation has a strong experimental nature and does not guarantee the stability and consistency of the realization of each scaffold. Please use it with caution.

### Annotation description

| annotation | description | field restrict |
| --- | ---- | --- |
| `api_ext.headers` | `api_ext.headers` is used for exchange from HTTP to RPC, the RPC service can get headers as map from HTTP service | Only map type is support |
| `api_ext.marshal` | The filed value is `json string`, it is used to mark some dynamic content for request and response field definations | |
| `api_ext.as_root` | The field will be moved to the top level for response | |

### example

```thrift
struct Item{
    // For nested structures, if you want to set the serialization key, use gotag, such as `json:"id"`
    1: optional i64 id(go.tag = "json:\"id\"") 
    // This field is JSON string, and the corresponding key is text2
    2: optional string text (api_ext.marshal = 'text2') 
}

typedef string JsonDict
struct BizRequest {
    1: optional i64 v_int64(
        api.query = 'v_int64', 
        api.vd = "$>0&&$<200"
    )// Corresponding to v_int64 in HTTP query, and the value range is (0,200)

    2: optional string name(api.body = 'name') // Corresponding serialization key = name

    3: optional i32 token(api.header = 'token') // Corresponding token in HTTP header

    4: optional JsonDict json_header(api.header = 'json_header')

    5: optional Item item (api.body = item) // Corresponding serialization key = item

    6: optional map<string, string> rsp_headers (api_ext.headers='rsp_headers')

    7: optional string uri (api.raw_uri='uri') // This field is used to obtain HTTP uri, and the key is uri
}

// Finally, BizResponse json will be serialized as a return package to the client
struct RspItem{
    1: optional i64 item_id // By default, it is serialized with the field name as key, which is equivalent to using gotag `json:"item_id"`
    2: optioanl string text
}
struct BizResponse {
    1: optional map<string, string> rsp_headers (api_ext.headers='rsp_headers')
    2: optional string text (api_ext.marshal = 'text2') // This field is JSON string, and the corresponding key is text2
}
```

## Muti-service Standards for RPC

### restrict

Usually we suggest defining all the corresponding methods in the same service definition for our service, if Muti-Service definitions are required. The following usages are supported

（1）If we need to refer to services in other IDL files, we can refer them needed by the 'extends' method

（2）The IDL main file contains more than one service . We will combine them into one which is used as the definition of our service

**Notice：**

Since muti-service methods include all methods in each service file, the method name must be unique.

### example

### Cross file service reference

If more than one IDL file defines a service, we can use refer to service needed by the 'extends' method in a new file and treat the file as main IDL file

```thrift
// idl/a.thrift
service Service0 {
    Response Method0(1: Request req)
}

// idl/b.thrift
service Service1 {
    Response Method1(1: Request req)
}

// idl/c.thrift
service Service2 {
    Response Method2(1: Request req)
}
```

We can use refer to service needed by the 'extends' method in a new file

```thrift
// idl/main.thrift
include "a.thrift"
include "b.thrift"
include "c.thrift"

service ServiceA extends a.Service0{
}

service ServiceB extends b.Service1{
}

service ServiceC extends c.Service2{
}
```

### Multi service aggregation

If the **IDL** main file contains more than one service, we will combine them into one called CombineService, which contains all methods

```thrift
service Service0 {
    Response Method0(1: Request req)
}

service Service1 {
    Response Method1(1: Request req)
}

service Service2 {
    Response Method2(1: Request req)
}
```

muti-service will be combine into one

```thrift
service CombineService {
    Response Method0(1: Request req)
    Response Method1(1: Request req)
    Response Method2(1: Request req)
}
```
