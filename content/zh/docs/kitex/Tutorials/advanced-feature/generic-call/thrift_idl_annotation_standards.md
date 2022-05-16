
本规范是一系列与`thrift`结合的接口定义标准，包括服务、接口以及请求 `request`、`response` 参数定义规范和错误码定义规范。

## 规范说明

（1）本规范采用注解方式来描述接口信息，包括接口的 `method`, `path` 以及接口请求参数，返回参数位置（如 `header`，`cookie` )、名称等信息

（2）本规范所述注解采用 `api.{key}={value}` 的形式，其中`key`通常用于指定该字段出现的位置如（`header`，`cookie`，`query`，`body` 等), `value` 用于指定该字段在对应位置的实际名称, 一些功能性注解（如`api.none`, `api.js_conv`) 除外

（3）本规范中定义的IDL注解如 `api.get`, `api.header` 等，只支持小写，不支持大写或者大小写混用如`api.GET`, `api.Header`

## 文件整体规范

- 一个服务 service 对应一个 thrift 主文件，主文件里的 `method` 都是针对当前服务对应接口，主文件可以引用其它 thrift 文件定义
- 每个 `Method` 原则上对应一个 `Request` 和 `Response` 定义
- 原则上不建议 `Request` 复用，可以复用 `Response`
  
## Request 规范 

### 约束

1. 接口请求字段需要使用注解关联到 HTTP 的某类参数和参数名称。如果无注解，`GET` 方法接口关联`query` 参数, `POST` 方法关联 `body` 参数, 字段名对应参数key
2. 如果 HTTP 请求是采用 `GET` 方式的，那么 `request` 定义中出现的 `api.body` 注解无效，只有`api.query`, `api.path`, `api.cookie` 有效。
3. 如果 HTTP 请求是采用 `POST` 方式且序列化方式是 `form` 的，那么 `request` 的字段不能有复杂结构如`map`，`object`，否则该字段无效。

### 注解说明

| 注解 | 说明 | 字段约束 |
| --- | ---- | ------ |
| `api.query` | `api.query` 对应 HTTP 请求的 url query 参数  | 只支持基本类型(`object`, `map` 以外）和逗号分隔的 `list`  |
| `api.path` | `api.path` 对应 HTTP 请求的 url path 参数 | 支持基本类型 |
| `api.header` | `api.header` 对应 HTTP 请求的 header 参数 | 只支持基本类型和逗号分隔的`list` |
| `api.cookie` | `api.cookie` 对应 HTTP 的 cookie 参数 | 支持基本类型 |
| `api.body` | `api.body` 对应 HTTP 的 body 参数<br>支持 body 为 `json` 和 `form` 两种格式 |在未指定接口序列化方式下默认`json`格式，也可以在`method`注解中使用`api.serializer`来指定`json/form` |
| `api.raw_body` | `api.raw_body` HTTP 原始 body，少数接口 body 加密了，可以拿到原始的 body（二进制数组) | | 
| `api.vd` | 参数校验，使用了[HTTPs://github.com/bytedance/go-tagexpr/tree/master/validator](HTTPs://github.com/bytedance/go-tagexpr/tree/master/validator)库，检验表达式语法参见包内readme文件 | |
| `api.js_conv` | `api.js_conv` 标识该字段传入参数需要进行 string to int64 转换，来解决前端 js 不支持 int64 的场景 | |
| `api.raw_uri` | `api.raw_uri` 用于 HTTP to RPC 协议转换，RPC 服务获取 HTTP接口对应的原始 uri | 只支持 `string` 类型 |

### 举例

```thrift
struct Item{
    1: optional i64 id(go.tag = "json:\"id\"") // 对于嵌套结构体，如果要设置序列化key,使用gotag 如 `json:"id"`
    2: optional string text
}
typedef string JsonDict
struct BizRequest {
    1: optional i64 v_int64(api.query = 'v_int64', api.vd = "$>0&&$<200") // 对应HTTP query中的v_int64, 且值范围为(0,200)
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
    // 对应query里面逗号隔开的字符串 如  vids=a,b,c,d   仅支持 list<string>
    252: optional BizCommonParam biz_common_param // 业务公参，下文说明
    253: optional TTNetCommonParam ttnet_common_param // TTNET公共参数，下文说明
    254: optional AgwCommonParam agw_common_param // AGW loader通用参数，下文说明，仅在接入agw情况下使用
    255: optional base.Base Base 
}
```

## Response 规范 

### 约束

- `header` 不支持除逗号相隔并且 `value` 为基本类型的 `list` 以外的复杂类型
- 直接按照业务自己定义的 `reponse。默认` `json` 序列化到 `body`，`key`为字段名，注解可为空

### 注解说明 （Annotation description）

| 注解 | 说明 | 字段约束 |
| --- | ---- | ------ |
| `api.header` |`api.header` 设置HTTP 请求回复中的header | 只支持基本类型和逗号分隔的`list` |
| `api.http_code` | `api.HTTP_cod`e 对应HTTP 回复中的status code，200/500等 | |
| `api.body` | `api.body` 对应HTTP 回复中的body参数 | |
| `api.none` | 忽略标识该字段在 `resonse`中将会被忽略 | |
| `api.js_conv` | 兼容js int64问题，`response`时需要将int64表示为string | |
| `api.raw_body` | `api.raw_body` 设置该字段`content`作为HTTP response的完整body | |
| `api.cookie` | `api.cookie` 设置HTTP 回复中的cookie （`string`类型，后端自行拼接） | |

### 举例（example)

```thrift
// 最终将把BizResponse json序列化之后作为给客户端的返包
struct RspItem{
    1: optional i64 item_id // 默认被以字段名作key序列化，等价于使用gotag `json:"item_id"`
    2: optioanl string text
}
struct BizResponse {
    1: optional string T  (api.header= 'T') 
    // 该字段将填入给客户端返回的header中
    2: optional map<i64, RspItem> rsp_items  (api.body='rsp_items')
    // 一级key = 'rsp_items'
    3: optional i32 v_enum  (api.none = '') // 忽略当前参数
    4: optional list<RspItem> rsp_item_list  (api.body = 'rsp_item_list')
    5: optional i32 http_code  (api.http_code = '') 
    // 业务自己指定了HTTPCode,  如果没有指定, baseResp.StatuCode=0 -> HTTPCode=200,  其他 HTTPCode=500      
    6: optional list<i64> item_count (api.header = 'item_count') // 当设置header时以逗号相隔的列表
    255: optional base.BaseResp BaseResp,
}
```

## Method 规范 

### 约束

- 如果是`GET`请求，`api.serializer`定义的序列化方式是无效的
- 每个URI对应IDL的一个`method`，通过注解关联，注解不可为空

### 注解说明 

| 注解 | 类型 | 说明 | 举例 |
| --- | ---- | --- | --- |
| `api.get` | `string` | `get`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | 例如  `api.get = '/life/client/favorite/collect'`
| `api.post` | `string` | `post`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | 例如 `api.post='/life/client/favorite/collect'`
| `api.put` | `string` | `put`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | 例如 <br>`api.put='/life/client/favorite/collect'` |
| `api.delete` | `string` | `delete`请求，值为HTTP path，uri的语法与gin一致(参考 [httprouter](https://github.com/julienschmidt/httprouter)) | `api.delete='/life/client/favorite/collect'` |
| `api.serializer` | `string` | 客户端请求体序列化方式 | 如`form`, `json`, `thrift`, `pb`等 |
| `api.param` | `string` | 客户端请求是否需要带上公共参数 | `true` 或 `false` |
| `api.baseurl` | `string` | `ttnet`选路时使用的`baseurl` | 如[ib.snssdk.com](http://ib.snssdk.com/) |
| `api.gen_path` | `string` | 客户端生成代码使用的`path`（`get`、`post`、`put`、`delete`定义的`path`是网关配置使用的`path`）| 如`api.post='/v:version/modify'`，`version`变量在更新idl时可以固化，比如说固化为`3`， |
| `api.version` | `string` | 客户端生成代码是替换`path`中的`:version`变量,优先级低于`api.gen_path` | 如`api.post='/v:version/modify'`，`api.version='7'`，则生成代码中的`path`为`/v7/modify`。|
| `api.tag` | `string` | 客户端 rpc 增加标签，支持多个，逗号分隔（暂时只支持iOS）| 例:`api.tag="API,DATA"` |
| `api.category` | `string` | 接口分类，根据该分类自动生成到doc文档的目录里 | 只能写一个，不支持多个目录|

### 举例

```thrift
service BizService{
    // 例子1： get请求
    // api.category可以指定BAM 接口文档里边的分类目录
    BizResponse BizMethod1(1: biz.BizRequest req)(
        api.get = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true',
        api.category = `demo`
    )

    // 例子2:   post请求，form序列化
    BizResponse BizMethod2(1: biz.BizRequest req)(
        api.post = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true', 
        api.serializer = 'form'
    )

    // 例子3:   post请求，json序列化
    BizResponse BizMethod3(1: biz.BizRequest req)(
        api.post = '/life/client/:action/:biz', 
        api.baseurl = 'ib.snssdk.com', 
        api.param = 'true', 
        api.serializer = 'json'
    )
}
```

## 错误码定义规范

### 注解说明

我们使用枚举`value`的注解来定义`error`, `error` 通常用来作为接口的`response`返回， 包括`http_code`和`http_message`

`stable_code` 通常用于标识该接口错误码的稳定性，类似于`HTTP code `中的 `5xx` 与 `4xx`. 许多业务框架对于 HTTP 调用，统一使用 200 作为 HTTP code，这里建议统一使用 `stable_code` 来标识该接口错误码的稳定性

| 注解名称  | 类型  | 注解说明 | 举例  |
| ------------------------- | ---------- | ---------------- | ------------- |
| `api.http_code` | `string` | 生成`error`类型中对应的`http_code` | `api.http_code="200"` |
| `api.http_message` | `string` | 生成`error`类型中对应的提示信息 | `api.http_message="param error"` |
| `api.stable_code` | `string` | 该错误码稳定性 | `api.stable_code="0" `|

### 约束（restrict）

1. `api.http_code`  可以不写，`http code` 默认使用`200`
2. `api.http_message` 可以不写，默认使用枚举的`name`作为`error message`
3. `api.http_code`, `api.http_message` 至少写一个，否则错误码无法与普通枚举类型区分
4. 由于thrift 只支持`string`类型注解，`api.http_code` 类型是`string`

### 举例（example)

```thrift
//example 
enum BapiError {
    Success = 0 (
        api.http_code="200", 
        api.http_message="success"
    ); // 正常返回

    ParamError = 1 (
        api.http_code="400"，
        api.stable_code="1" 
    ); // 使用默认的 http_message 错误参数

    NoRetry = 2 (api.http_message="no retry" ); // 使用默认的 http_code 200
    
    InternalError = 3 ; //公共枚举, not error
}
```

## 扩展注解

为了支持`HTTP to RPC`接口协议转换，我们官方支持如下注解作为扩展注解
实际执行时可能会遇到各种业务场景，我们引入扩展注解解决部分特殊需求，如：需要将某个嵌套字段映射到请求或响应体的顶层。扩展注解有强烈的实验性质，不保证稳定性以及各脚手架实现的一致性，请业务方谨慎使用。

### 注解说明

| 注解 | 说明 | 字段约束 |
| --- | ---- | --- |
| `api_ext.headers` | 用于HTTP to RPC 协议转换，RPC 服务获取HTTP接口对应的`headers` 作为`map` | 字段只能为`map`类型 |
| `api_ext.marshal` | 该字段`value`为`json string`，用于标识动态内容的场景，可用于`request`和`response`中字段定义 | |
| `api_ext.as_root` | 将结构体类型字段打平至响应体顶层 | |

### 举例

```thrift
struct Item{
    // 对于嵌套结构体，如果要设置序列化key,使用gotag 如 `json:"id"`
    1: optional i64 id(go.tag = "json:\"id\"") 
    // 该字段为json string，对应的key为text2
    2: optional string text (api_ext.marshal = 'text2') 
}

typedef string JsonDict
struct BizRequest {
    1: optional i64 v_int64(
        api.query = 'v_int64', 
        api.vd = "$>0&&$<200"
    )// 对应HTTP query中的v_int64, 且值范围为(0,200)

    2: optional string name(api.body = 'name') // 对应序列化key = name

    3: optional i32 token(api.header = 'token') // 对应HTTP header中的token

    4: optional JsonDict json_header(api.header = 'json_header')

    5: optional Item item (api.body = item) // 对应序列化key = item

    6: optional map<string, string> rsp_headers (api_ext.headers='rsp_headers')

    7: optional string uri (api.raw_uri='uri') // 该字段用于获取HTTP uri，key为uri
}

// 最终将把BizResponse json序列化之后作为给客户端的返包
struct RspItem{
    1: optional i64 item_id //默认被以字段名作key序列化，等价于使用gotag `json:"item_id"`
    2: optioanl string text
}
struct BizResponse {
    1: optional map<string, string> rsp_headers (api_ext.headers='rsp_headers')
    2: optional string text (api_ext.marshal = 'text2') //该字段为json string，对应的key为text2 
}
```

## 多service规范（只支持RPC）

### 约束

通常情况下我们建议在同一 `service` 定义该服务相关接口和参数信息，如果业务需要在多个 `service` 中进行描述，我们支持按照如下方式使用

（1）如果需要跨文件引用`service`，可以在新的idl文件中`extends`需要的service

（2）可以在 IDL 主文件中定义多个`service`, 我们将会把这些 `service combine` 为一个整体 `service` 作为该服务的`service`

**注意 ：**

多`service`实际上是将所有 `service` 中的 `method` 进行聚合，所以在涉及到的所有`service`中，`method` 的命名不能冲突。

### 举例

### 跨文件 service 引用

如果service 分布在不同的 IDL 文件，可以尝试使用`extends`方法实现service 跨文件引用

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

在一个新的idl文件中extends需要的service，将这个idl文件作为主idl使用

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

### 多 service 聚合

**IDL**主文件中有多个service, 我们最终会整合为一个大的servcie, 里边包含所有方法

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

多个service会被聚合为一个

```thrift
service CombineService {
    Response Method0(1: Request req)
    Response Method1(1: Request req)
    Response Method2(1: Request req)
}
```
