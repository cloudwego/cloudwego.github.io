---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: Release Notes & Migration Guide'
weight: 8
---

# Version Management Guidelines

Go SDK projects typically follow [Semantic Versioning](https://semver.org/) (Semver) conventions. A Semver version number consists of three parts in the format:

> 💡
> v{MAJOR}.{MINOR}.{PATCH}

- **MAJOR**: Major version number, indicates significant updates or incompatible API changes.
- **MINOR**: Minor version number, indicates new features added while maintaining backward compatibility.
- **PATCH**: Patch number, indicates backward-compatible bug fixes.

Additionally, Semantic Versioning supports pre-release versions and metadata tags for marking **pre-release**, **experimental**, and other unofficial versions. The format is:

> 💡
> v{MAJOR}.{MINOR}.{PATCH}-{PRERELEASE}+{BUILD}

- **PRERELEASE**: Pre-release version identifier, such as `alpha`, `beta`, `rc` (Release Candidate).
- **BUILD**: Build metadata (optional), typically used to identify specific builds, such as CI build numbers.

**Eino follows the semantic versioning specification above and will have the following version types:**

<table>
<tr><td><strong>Version Type</strong></td><td><strong>Version Number Format</strong></td><td><strong>Version Description</strong></td><td><strong>Notes</strong></td></tr>
<tr><td><strong>Stable Release</strong></td><td>Format:<li>v{MAJOR}.{MINOR}.{PATCH}</li>Examples:<li>v0.1.1</li><li>v1.2.3</li></td><td><li>When releasing stable versions, ensure API stability and backward compatibility.</li><li>Strictly follow semantic versioning: only increment the MAJOR version for <strong>significant incompatible changes</strong>, increment MINOR for new features, and increment PATCH for bug fixes only.</li><li>Ensure comprehensive unit tests, integration tests, and performance tests before release.</li><li>Provide detailed Release Notes upon release, listing important changes, fixes, features, and migration guides (if any).</li></td><td></td></tr>
<tr><td><strong>Pre-release</strong><li>Alpha</li><li>Beta</li><li>RC (Release Candidate)</li></td><td>Format:<li>v{MAJOR}.{MINOR}.{PATCH}-{alpha/beta/rc}.{num}</li>Examples:<li>v0.1.1-beta.1</li><li>v1.2.3-rc.1</li><li>v1.2.3-rc.2</li></td><td><li><strong>Alpha</strong>: Internal test version, features may not be complete, may have many bugs, not recommended for production environments.</li><li><strong>Beta</strong>: Features are mostly complete but may still have bugs, suitable for public testing, not recommended for production environments.</li><li><strong>RC (Release Candidate)</strong>: Release candidate, features complete and generally stable, recommended for final comprehensive testing. If no critical bugs exist, the RC version will become the stable version. Generally, the last RC version will become the stable version.</li></td><td></td></tr>
<tr><td><strong>Canary/Experimental/Dev</strong></td><td>Format:<li>v{MAJOR}.{MINOR}.{PATCH}-{dev}.{num}</li>Examples:<li>v0.1.1-dev.1</li><li>v1.2.3-dev.2</li></td><td><li>Canary versions are highly unstable, typically used for testing early implementations of new features or architectures. These versions may contain experimental features that could be removed or significantly modified in the future.</li><li>Canary versions are generally developed on experimental branches</li></td><td>Generally not used internally at ByteDance, may be used in the open source community</td></tr>
</table>

# Common Understanding About V0, V1, Vn (n>1)

<table>
<tr><td>Title</td><td>Description</td><td>Notes</td></tr>
<tr><td>Instability Within V0 Major Versions</td><td><li><strong>v0.x.x</strong> indicates the library is still in an <strong>unstable state</strong>, may introduce <strong>incompatible changes</strong> during MINOR version iterations, API may change, no backward compatibility is guaranteed.</li><li>Users should expect API changes when using these versions</li><li>Version number increments will not strictly follow semantic versioning rules</li><li>The design goal of <strong>v0.x.x</strong> is <strong>rapid iteration</strong>, allowing developers to release library versions while the API is unstable and collect user feedback.</li></td><td></td></tr>
<tr><td>Stability Within V1, Vn (n>1) Major Versions</td><td><li><strong>v1.0.0</strong> indicates the library has reached a <strong>stable state</strong>, API design is mature, <strong>backward compatibility is guaranteed</strong>, meaning future <pre>v1.x.x</pre> versions will not introduce incompatible changes.</li><li>Strictly follows semantic versioning</li><li><strong>Incompatible API changes</strong> will require a <strong>MAJOR</strong> version increment to release. For example, the version would need to be bumped to <pre>v2.0.0</pre>.</li><li><strong>Backward compatible feature updates</strong> will be released through <strong>MINOR</strong> version increments, e.g., <pre>v1.1.0</pre>.</li><li><strong>Backward compatible bug fixes</strong> will be released through <strong>PATCH</strong> version increments, e.g., <pre>v1.0.1</pre>.</li></td><td></td></tr>
</table>

> 💡
> Currently, since Eino is being released for the first time, although Eino's API is initially stable, it has not been validated at large scale in production. The MAJOR version is temporarily set to V0. After validation by at least 50+ business lines, the version will be upgraded to V1.

# Release Notes Document Structure

- Each {MAJOR}.{MINOR} minor version has its own document
  - Naming format: "Eino: v1.2.* {title description}"
- The {MAJOR}.{MINOR} minor version records all ChangeLogs for that version
- In subdirectories of minor versions, detailed descriptions of each PATCH can optionally be placed

```
.
├── v1.0.*
│   └── bug_fix_1_x.txt
├── v0.2.*
├── v0.1.*
    ├── bug_fix_1_xxx.txt
    ├── bug_fix_2_xxxxx.txt
    └── bug_fix_3_xxxxxxx.txt
```
