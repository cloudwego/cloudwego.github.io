---
title: "Volo Release 0.10.0"
linkTitle: "Release v0.10.0"
projects: ["Volo"]
date: 2024-04-08
description: >
---

In Volo 0.10.0, we mainly focused on extensibility and ease of use.

## Break Change

### Error Handling Refactored

Existing error types had issues such as unclear semantics, lack of maintainability and extensibility, and misuse. In the new version, we refactored the entire error handling, greatly enhancing the clarity and maintainability of error handling, and reducing misuse through the type system.

#### Migration Guide

##### Server Handler Migration

1. If previously using `anyhow::Result`, change `anyhow::Result` to `volo_thrift::ServerResult`:

```rust
async fn example(&self, req: XReq) -> volo_thrift::ServerResult<XResp>
```

2. If previously using Result<XResp, anyhow::Error>, replace anyhow::Error with volo_thrift::ServerError:

```rust
async fn example(&self, req: XReq) -> Result<XResp, volo_thrift::ServerError>
```

3. If you were using `Exception`, change the return type from `Result<XResp, volo_thrift::UserException<XException>>` to `Result<volo_thrift::MaybeException<XResp, XException>, volo_thrift::ServerError>`. At the same time, places that return `Err(UserError::UserException(exception))` should be changed to use `Ok(MaybeException::Exception(exception))`:

```rust
async fn example(&self, req: XReq) -> Result<volo_thrift::MaybeException<XResp, XException>, volo_thrift::ServerError> {
    ...
    Ok(volo_thrift::MaybeException::Exception(exception))
}
```

4. If an error occurs when returning `anyhow::Error` after these changes, you can manually add a `.into()`:

```rust
return Err(anyhow::anyhow!(xxx).into())
```

5. If an error occurs at the `?` error return spot after these changes, you can try converting it to `anyhow::Error` before returning:

```rust
let x = xxx().map_err(|e|anyhow::anyhow!(e))?;
```

##### Service Middleware Migration

For middleware that is not aware of user errors, this change should not cause a breaking change. If you are aware of user errors, then just change the original `volo_thrift::Error` to `volo_thrift::ServerError/ClientError`.

##### Client Migration

The error part of the client has changed from `ResponseError` to `ClientError`. Just follow the compiler error message prompts to match the new error variant.

### IDL Management File volo.yml Format Refactored

The structure of the new yml configuration is clearer, easier to maintain, and mainly solves the issue that the old version could not support cross-repository referencing with git. The specific functions and configuration parameters can be seen [here](https://www.cloudwego.io/docs/volo/guide/config). In addition, for the volo-cli command-line tool, we have renamed the previous idl command to repo.

#### Migration Guide

Install the volo-cli v0.10.0 version and execute the volo migrate command in the volo.yml directory for automatic migration.

### Change in Default Generated Enum Type

In the newly generated code, the default generated Enum type has been changed to a newtype wrapping i32, in order to better support forward compatibility of modifications in the enumeration values of the IDL enum field.

#### Migration Guide

Just modify the enumeration name in the enum field to the corresponding generated name, such as `Foo::Bar` -> `Foo::BAR`.

## Complete Release Note

For the complete Release Note, please refer to: [Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.9.0...volo-0.10.0)
