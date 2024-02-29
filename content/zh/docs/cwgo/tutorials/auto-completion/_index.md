---
title: "命令行自动补全"
linkTitle: "命令行自动补全"
weight: 7
description: >
---

cwgo 支持命令行自动补全功能。

## 如何启用自动补全功能

### 在 Bash 中支持

#### 临时支持 Bash 补全

```shell
mkdir autocomplete # You can choose any location you like
cwgo completion bash > ./autocomplete/bash_autocomplete
source ./autocomplete/bash_autocomplete
```

#### 永久支持 Bash 补全

```shell
sudo cp autocomplete/bash_autocomplete /etc/bash_completion.d/cwgo

source /etc/bash_completion.d/cwgo
```

### 在 Zsh 中支持

#### 临时支持 Zsh 补全

```shell
mkdir autocomplete # You can choose any location you like
cwgo completion zsh > ./autocomplete/zsh_autocomplete
source ./autocomplete/zsh_autocomplete
```

### 在 PowerShell 中支持

#### 临时支持 PowerShell 补全

```shell
mkdir autocomplete
cwgo completion powershell | Out-File autocomplete/cwgo.ps1
& autocomplete/cwgo.ps1
```

#### 永久支持 PowerShell 补全

我们打开 $profile。

在里面添加一行：

```shell
& path/to/autocomplete/cwgo.ps1
```

注意这里要正确配置 ps1 脚本的名字和路径，然后就可以进行永久的自动补全了。
