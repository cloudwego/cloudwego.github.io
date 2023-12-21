---
title: "Features"
linkTitle: "Features"
weight: 2
description: >
---

## 📧 Token management

**Feature**

The platform provides repo token management function. After users add tokens to the platform, the platform uses
this to implement identity verification and authorization mechanisms for the repo API when subsequent users add IDL.

### Apply token

#### GitLab

**Personal Access Token**

1. Login GitLab and go to token apply address (replace **gitlab_domain**)

   `https://{gitlab_domain}/-/profile/personal_access_tokens`

2. Click `Add new token`

   ![GitLab Add Token](/img/docs/cwgo_platform_token_gitlab_personal_addtokken.png)

3. Input token info and create

   ![GitLab Create Token](/img/docs/cwgo_platform_token_gitlab_personal_createtokken.png)

4. Click red area to copy token value

   ![GitLab Copy Token](/img/docs/cwgo_platform_token_gitlab_personal_copytokken.png)

**Group Access Token**

1. Login GitLab and go to token apply address (replace **domain**，**group**)

   `https://{domain}/groups/{group}/-/settings/access_tokens`

2. Click `Add new token`

   ![GitLab Add Token](/img/docs/cwgo_platform_token_gitlab_group_addtokken.png)

3. Input token info and create

   Role: maintainer

   Scopes: api

   ![GitLab Create Token](/img/docs/cwgo_platform_token_gitlab_group_createtokken.png)

4. Click red area to copy token value

   ![GitLab Copy Token](/img/docs/cwgo_platform_token_gitlab_group_copytokken.png)

#### GitHub

> Only supports personal repo management, does not support organization repo management

1. Login GitHub and enter settings page (Settings)

   ![GitHub Settings](/img/docs/cwgo_platform_token_github_personal_settings.png)

2. Find `Developer settings` at the bottom left corner

   ![GitHub Developer Settings](/img/docs/cwgo_platform_token_github_personal_developersettings.png)

3. Find `Tokens`
   ![GitHub Token](/img/docs/cwgo_platform_token_github_personal_token.png)

4. Click Generate new token(classic)

   ![GitHub Add Token](/img/docs/cwgo_platform_token_github_personal_addtoken.png)

5. Set Token info. (must select `repo` scope)

   ![GitHub Create Token](/img/docs/cwgo_platform_token_github_personal_createtoken.png)

6. Click red area to copy token value

   ![GitHub Copy Token](/img/docs/cwgo_platform_token_github_personal_copytoken.png)

### Add Token

1. Switch to **Token Management** Page, and click **Add Token**

   ![Add Token](/img/docs/cwgo_platform_token_add1.png)

2. Input token info and click `Add`

   ![Add Token](/img/docs/cwgo_platform_token_add2.png)

### 📦 IDL Repo Info Management

1. Add IDL Repo

   ![IDL Repo Info Management](/img/docs/cwgo_platform_idl_repo.png)

   Click `Add Repo`

   Ps: This repo stores IDL files

   ![IDL Repo Info Management](/img/docs/cwgo_platform_idl_repo_add.png)

   Among them are repo URL, branch (default to main branch), and repo type (default to GitLab).

   The URL of the repo is the URL address of the git repo, such as:

   GitLab: https://gitlab.com/{owner}/{repoName}

   GitHub: https://github.com/{owner}/{repoName}

2. Add Main IDL File

   ![Add Main IDL File](/img/docs/cwgo_platform_idl_add1.png)

   click `Add IDL`

   ![Add Main IDL File](/img/docs/cwgo_platform_idl_add2.png)

   The main IDL path is the URL address of the main IDL in the git repository, such as:

   GitLab: https://gitlab.com/{owner}/{repoName}/-/blob/main/path/to/idl/xxx.thrift?ref_type=heads

   GitHub: https://github.com/{owner}/{repoName}/blob/main/path/to/idl/xxx.thrift

   The service name is the service name that you want platform to generate for you.

### 📋 IDL Info Sync

![IDL Info Sync](/img/docs/cwgo_platform_idl.png)

After adding the main IDL path, you can manage your IDL info on the `IDL Info Sync` page

![IDL Info Sync](/img/docs/cwgo_platform_idl1.png)

Move to "View Import IDLs" to view other IDL files associated with the main IDL.

The platform will regularly check whether the IDL information in the repository has changed. If there is a change, it
will automatically synchronize and update the code originally in the code repository.

You can also click the `force sync IDL` button to skip waiting for immediate synchronization.

**Attention**

> - After adding the main idl, do not move the position of the main idl in the future, otherwise synchronization errors
    will occur
>
> - The "." and "/" in the service name will be automatically replaced with "_"
>
> - Please refer to the precautions
    for [protobug IDL precautions](https://www.cloudwego.io/zh/docs/kitex/tutorials/code-gen/code_generation/#%E4%BD%BF%E7%94%A8-protobuf-idl-%E7%9A%84%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)

### ⌨ Service Code Repo

View the generated code repository

![Service Code Repo](/img/docs/cwgo_platform_service_repo.png)

To view the generated code repository, you can click to `add dependencies`, `view the import path`, and `jump to
commit` from the generated code repository.

![Service Code Repo](/img/docs/cwgo_platform_service_repo1.png)
