---
title: "auto-completion"
linkTitle: "auto-completion"
weight: 7
description: >
---

cwgo supports automatic completion at the command line.

## How to enable auto-completion

### Supported in Bash

#### Temporary support for Bash completion

```shell
mkdir autocomplete # You can choose any location you like
cwgo completion bash > ./autocomplete/bash_autocomplete
source ./autocomplete/bash_autocomplete
```

#### Permanent support for Bash completion

```shell
sudo cp autocomplete/bash_autocomplete /etc/bash_completion.d/cwgo

source /etc/bash_completion.d/cwgo
```

### Supported in Zsh

#### Temporary support for Zsh completion

```shell
mkdir autocomplete # You can choose any location you like
cwgo completion zsh > ./autocomplete/zsh_autocomplete
source ./autocomplete/zsh_autocomplete
```

### Supported in PowerShell

#### Temporary support for PowerShell completion

```shell
mkdir autocomplete
cwgo completion powershell | Out-File autocomplete/cwgo.ps1
& autocomplete/cwgo.ps1
```

#### Permanent support for PowerShell completion

open the $profile.

Add a line inside:

```shell
& path/to/autocomplete/cwgo.ps1
```

Note that the name and path of the ps1 script must be correctly configured here, and then permanent auto-completion can be performed.
