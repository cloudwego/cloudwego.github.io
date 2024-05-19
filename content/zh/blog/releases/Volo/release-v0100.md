---
title: "Volo 0.10.0 版本发布"
linkTitle: "Release v0.10.0"
projects: ["Volo"]
date: 2024-04-08
description: >
---

Volo 0.10.0 版本中，我们更多的关注在了可扩展性和易用性上。

## Break Change

### 错误处理重构

原先的错误类型存在诸如语义不清晰、可维护性不强、可扩展性不强、容易误用等问题，因此在新版中，我们重构了整个错误处理部分，极大加强了错误处理部分的语义清晰度和可维护性，并通过类型系统降低误用概率。

#### 迁移指南

##### Server Handler 迁移

1. 如果原先使用 `anyhow::Result` 的，把 `anyhow:Result` 改为 `volo_thrift::ServerResult` 即可：

```rust
async fn example(&self, req: XReq) -> volo_thrift::ServerResult<XResp>
```

2. 如果原先使用 `Result<XResp, anyhow::Error>` 的，将 `anyhow::Error` 改为 `volo_thrift::ServerError` 即可：

```rust
async fn example(&self, req: XReq) -> Result<XResp, volo_thrift::ServerError>
```

3. 如果原先使用了 `Exception` 的用户，需要将返回类型从 `Result<XResp, volo_thrift::UserException<XException>>` 改为 `Result<volo_thrift::MaybeException<XResp, XException>, volo_thrift::ServerError>`，同时将原先返回 `Err(UserError::UserException(exception))` 的地方改为使用 `Ok(MaybeException::Exception(exception))` 即可：

```rust
async fn example(&self, req: XReq) -> Result<volo_thrift::MaybeException<XResp, XException>, volo_thrift::ServerError> {
    ...
    Ok(volo_thrift::MaybeException::Exception(exception))
}
```

4. 如果改完之后，在返回 `anyhow::Error` 时出现报错，可以手动加一个 `.into()`。

```rust
return Err(anyhow::anyhow!(xxx).into())
```

5. 如果改完之后，在 `?` 返回错误处出现报错，可以尝试先转换成 `anyhow::Error` 再返回。

```rust
let x = xxx().map_err(|e|anyhow::anyhow!(e))?;
```

##### Service 中间件迁移

对于不感知用户错误的中间件来说，本次修改应该不带来 break change；如果有需要感知用户错误，那么只需要把原来的 `volo_thrift::Error` 改为 `volo_thrift::ServerError/ClientError` 即可。

##### Client 迁移

client 部分的错误从原来的 `ResponseError` 改为了 `ClientError`，按编译器报错提示匹配新的错误 variant 即可。

### IDL 管理文件 volo.yml 格式重构

新版 yml 配置的结构更加清晰，且更易于维护，并主要解决了旧版中无法支持 git 跨仓库引用的问题，具体的功能和配置参数见 [config](https://www.cloudwego.io/zh/docs/volo/guide/config)。另外，对于 volo-cli 命令行工具，我们将之前的 idl 命令名字修改为了 repo。

#### 迁移指南

安装 volo-cli 0.10.0 版本，并在 volo.yml 目录下执行 volo migrate 命令即可自动迁移。

### 默认生成的 Enum 类型修改

在新版生成代码中，默认生成的 Enum 类型修改为了 i32 wrapper 的 newtype 类型，以便于更好的向前兼容 IDL enum 字段中枚举值的修改。

#### 迁移指南

将 enum 字段中枚举值名字修改为对应生成的名字即可，如 `Foo::Bar` -> `Foo::BAR`。

## 完整 Release Note

完整的 Release Note 可以参考：[Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.9.0...volo-0.10.0)
