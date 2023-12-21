---
title: "功能"
linkTitle: "功能"
weight: 2
description: >
---

## 📧 令牌管理

**功能介绍**

平台提供仓库令牌管理功能，用户在平台添加令牌后，平台在后续用户添加 idl 仓库时以此来实现对仓库 api 的身份验证和授权机制。

### 令牌申请

#### GitLab

**个人令牌**

1. 登录 GitLab 进入申请令牌地址（替换掉 **gitlab_domain**)

   `https://{gitlab_domain}/-/profile/personal_access_tokens`

2. 点击 `Add new token`

   ![GitLab 添加令牌](/img/docs/cwgo_platform_token_gitlab_personal_addtokken.png)

3. 填写令牌信息，创建令牌

   ![GitLab 创建令牌](/img/docs/cwgo_platform_token_gitlab_personal_createtokken.png)

4. 点击红框复制令牌

   ![GitLab 复制令牌](/img/docs/cwgo_platform_token_gitlab_personal_copytokken.png)

**群组令牌**

1. 登录 GitLab 进入申请令牌地址（替换掉 **domain**，**group**）

   `https://{domain}/groups/{group}/-/settings/access_tokens`

2. 点击`Add new token`

   ![GitLab 添加令牌](/img/docs/cwgo_platform_token_gitlab_group_addtokken.png)

3. 填写令牌信息，创建令牌

   Role: maintainer

   Scopes: api

   ![GitLab 创建令牌](/img/docs/cwgo_platform_token_gitlab_group_createtokken.png)

4. 点击红框复制令牌

   ![GitLab 复制令牌](/img/docs/cwgo_platform_token_gitlab_group_copytokken.png)

#### GitHub

> 仅支持个人仓库管理，不支持组织仓库管理功能

1. 登录 GitHub 进入设置(Settings)

   ![GitHub 设置](/img/docs/cwgo_platform_token_github_personal_settings.png)

2. 找到左侧最下的 Developer settings

   ![GitHub 开发者设置](/img/docs/cwgo_platform_token_github_personal_developersettings.png)

3. 找到 Tokens
   ![GitHub Token](/img/docs/cwgo_platform_token_github_personal_token.png)

4. 点击 Generate new token(classic)

   ![GitHub 添加令牌](/img/docs/cwgo_platform_token_github_personal_addtoken.png)

5. 设置备注，过期时间，权限。注意：一定要选择第一个 "repo" 选项

   ![GitHub 创建令牌](/img/docs/cwgo_platform_token_github_personal_createtoken.png)
6. 点击红框处复制

   ![GitHub 复制令牌](/img/docs/cwgo_platform_token_github_personal_copytoken.png)

### 添加令牌

1. 切换到 **令牌管理** 页面，点击 **添加令牌**

   ![添加令牌](/img/docs/cwgo_platform_token_add1.png)

2. 输入令牌相关信息，点击添加按钮即可

   ![添加令牌](/img/docs/cwgo_platform_token_add2.png)

### 📦 IDL仓库信息管理

1. 添加 IDL 仓库

   ![IDL 仓库信息管理页面](/img/docs/cwgo_platform_idl_repo.png)

   这是 IDL 仓库管理的页面, 点击添加仓库。

   注意：此仓库是存放 IDL 文件的 git 仓库

   ![IDL 仓库信息管理页面](/img/docs/cwgo_platform_idl_repo_add.png)

   其中有仓库URL, 分支(默认为 main 分支), 仓库类型(默认为 GitLab)。

   仓库的 URL 就是在 git 仓库的 URL 地址, 形似:

   GitLab: https://gitlab.com/{owner}/{repoName}

   GitHub: https://github.com/{owner}/{repoName}

2. 添加主 IDL 文件

   ![添加 IDL 文件](/img/docs/cwgo_platform_idl_add1.png)

   点击添加 IDL 信息按钮。

   ![添加 IDL 文件](/img/docs/cwgo_platform_idl_add2.png)

   主 IDL 路径就是主 IDL 在 git 仓库的URL地址, 形似：

   GitLab: https://gitlab.com/{owner}/{repoName}/-/blob/main/path/to/idl/xxx.thrift?ref_type=heads

   GitHub: https://github.com/{owner}/{repoName}/blob/main/path/to/idl/xxx.thrift

   服务名则为您希望 cwgo 为您生成的服务名称。

### 📋 IDL 信息同步

![IDL 信息同步界面](/img/docs/cwgo_platform_idl.png)

在添加了主 IDL 路径之后, 即可在 IDL 信息同步页面管理您的 IDL 信息。

![IDL 信息同步界面](/img/docs/cwgo_platform_idl1.png)

将鼠标移至"查看 import idls" 可查看主 IDL 所关联的其他 IDL 文件。

平台会定时检测仓库的 IDL 信息是否发生变化, 若发生了变化则会自动进行同步, 并更新原本在代码仓库中的代码。

也可以点击强制同步 IDL 按钮跳过等待立即进行同步。

**注意事项**

> - 添加主idl后后续不要移动主idl位置，否则会同步出错
>
> - 服务名中的 "."， "/" 会被自动替换成 "_"
>
> - 使用 protobuf IDL
    的注意事项，请参考 [protobug IDL 注意事项](https://www.cloudwego.io/zh/docs/kitex/tutorials/code-gen/code_generation/#%E4%BD%BF%E7%94%A8-protobuf-idl-%E7%9A%84%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)

### ⌨ 服务代码产物仓库查询

查看生成的代码仓库

![服务代码产物仓库查询界面](/img/docs/cwgo_platform_service_repo.png)

您可以从生成的代码仓库一条中一键复制添加依赖, 查看 import 路径, 跳转commit。

![服务代码产物仓库查询界面](/img/docs/cwgo_platform_service_repo1.png)
