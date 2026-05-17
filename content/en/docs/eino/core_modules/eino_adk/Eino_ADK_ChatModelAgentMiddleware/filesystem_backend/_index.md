---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: FileSystem Backend
weight: 1
---

> 💡Package: [github.com/cloudwego/eino/adk/filesystem](https://github.com/cloudwego/eino/tree/main/adk/filesystem)

## Background and Purpose

AI Agents need to interact with file systems (read, search, edit, execute commands), but access methods vary significantly across different runtime environments: local disk, remote sandboxes, in-memory simulation, object storage, etc. If file operation logic is implemented separately for each environment, it couples Middleware/Agent code to the underlying storage.

The `filesystem.Backend` interface solves this problem — serving as a **unified file system operation protocol**:

1. **Decouples storage from business logic** — Middleware depends only on the interface, not the underlying implementation
2. **Pluggable replacement** — Switch Backend to run in different environments without modifying business code
3. **Easy to test** — Built-in `InMemoryBackend` requires no real disk I/O
4. **Forward compatible** — All methods use struct parameters; new fields don't break existing implementations

## Backend Interface

```go
type Backend interface {
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
    GrepRaw(ctx context.Context, req *GrepRequest) ([]GrepMatch, error)
    GlobInfo(ctx context.Context, req *GlobInfoRequest) ([]FileInfo, error)
    Write(ctx context.Context, req *WriteRequest) error
    Edit(ctx context.Context, req *EditRequest) error
}
```

<table>
<tr><td>Method</td><td>Function</td><td>Returns</td></tr>
<tr><td><pre>LsInfo</pre></td><td>List files and directories at the specified path</td><td><pre>[]FileInfo</pre></td></tr>
<tr><td><pre>Read</pre></td><td>Read file content, supports line-based pagination (offset + limit)</td><td><pre>*FileContent</pre></td></tr>
<tr><td><pre>GrepRaw</pre></td><td>Search for content matching a pattern in files</td><td><pre>[]GrepMatch</pre></td></tr>
<tr><td><pre>GlobInfo</pre></td><td>Find matching files based on a glob pattern</td><td><pre>[]FileInfo</pre></td></tr>
<tr><td><pre>Write</pre></td><td>Write to or create a file</td><td><pre>error</pre></td></tr>
<tr><td><pre>Edit</pre></td><td>Replace string content in a file</td><td><pre>error</pre></td></tr>
</table>

## Extension Interfaces

### Shell / StreamingShell

Backends can optionally implement command execution capabilities. When a Backend also implements `Shell` or `StreamingShell`, the Filesystem Middleware will additionally register an `execute` tool. These two are **mutually exclusive** and cannot be configured simultaneously.

```go
type Shell interface {
    Execute(ctx context.Context, input *ExecuteRequest) (result *ExecuteResponse, err error)
}

type StreamingShell interface {
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (result *schema.StreamReader[*ExecuteResponse], err error)
}
```

### MultiModalReader

An optional extension interface that supports multi-modal file reading (images, PDFs, etc.), returning structured `MultiFileContent`.

```go
type MultiModalReader interface {
    MultiModalRead(ctx context.Context, req *MultiModalReadRequest) (*MultiFileContent, error)
}
```

When the Backend implements this interface and the Middleware has `UseMultiModalRead = true` configured, the `read_file` tool will use multi-modal reading.

## Core Data Types

### Request Types

<table>
<tr><td>Type</td><td>Fields</td><td>Description</td></tr>
<tr><td><pre>LsInfoRequest</pre></td><td><pre>Path string</pre></td><td>Directory path to list</td></tr>
<tr><td><pre>ReadRequest</pre></td><td><pre>FilePath string</pre><pre>Offset int</pre><pre>Limit int</pre></td><td>File path; starting line number (1-based, <1 treated as 1); maximum lines to read (0=all)</td></tr>
<tr><td><pre>MultiModalReadRequest</pre></td><td>Embeds <pre>ReadRequest</pre><pre>Pages string</pre></td><td>Inherits all ReadRequest fields; Pages specifies PDF page range (e.g., "1-5", "3")</td></tr>
<tr><td><pre>GrepRequest</pre></td><td><pre>Pattern string</pre><pre>Path string</pre><pre>Glob string</pre><pre>FileType string</pre><pre>CaseInsensitive bool</pre><pre>EnableMultiline bool</pre><pre>AfterLines int</pre><pre>BeforeLines int</pre></td><td>Regex search pattern (ripgrep syntax); search directory; glob file filter; file type filter (e.g., "go", "py"); case insensitive; enable multiline matching; show N lines after match; show N lines before match</td></tr>
<tr><td><pre>GlobInfoRequest</pre></td><td><pre>Pattern string</pre><pre>Path string</pre></td><td>Glob expression (supports <pre>*</pre>, <pre>**</pre>, <pre>?</pre>, <pre>[abc]</pre>); search starting directory</td></tr>
<tr><td><pre>WriteRequest</pre></td><td><pre>FilePath string</pre><pre>Content string</pre></td><td>Target file path; content to write</td></tr>
<tr><td><pre>EditRequest</pre></td><td><pre>FilePath string</pre><pre>OldString string</pre><pre>NewString string</pre><pre>ReplaceAll bool</pre></td><td>File path; exact string to replace (non-empty); replacement string; when false, requires OldString to appear only once in the file</td></tr>
<tr><td><pre>ExecuteRequest</pre></td><td><pre>Command string</pre><pre>RunInBackendGround bool</pre></td><td>Command string to execute; whether to run in background</td></tr>
</table>

### Response Types

<table>
<tr><td>Type</td><td>Fields</td><td>Description</td></tr>
<tr><td><pre>FileInfo</pre></td><td><pre>Path string</pre><pre>IsDir bool</pre><pre>Size int64</pre><pre>ModifiedAt string</pre></td><td>File/directory path; whether it is a directory; file size (bytes); last modification time (ISO 8601 format)</td></tr>
<tr><td><pre>FileContent</pre></td><td><pre>Content string</pre></td><td>Plain text content of the file</td></tr>
<tr><td><pre>MultiFileContent</pre></td><td><pre>*FileContent</pre><pre>Parts []FileContentPart</pre></td><td>Embeds FileContent; multi-modal output parts. Parts and FileContent are mutually exclusive: when Parts is non-empty, FileContent is ignored</td></tr>
<tr><td><pre>FileContentPart</pre></td><td><pre>Type FileContentPartType</pre><pre>MIMEType string</pre><pre>Data []byte</pre></td><td>Content type (<pre>"image"</pre> or <pre>"pdf"</pre>); MIME type (e.g., "image/png"); raw binary data</td></tr>
<tr><td><pre>GrepMatch</pre></td><td><pre>Content string</pre><pre>Path string</pre><pre>Line int</pre></td><td>Matched line content; file path; 1-based line number</td></tr>
<tr><td><pre>ExecuteResponse</pre></td><td><pre>Output string</pre><pre>ExitCode *int</pre><pre>Truncated bool</pre></td><td>Command output; exit code (pointer, may be nil); whether output was truncated</td></tr>
</table>

### Constants

```go
type FileContentPartType string

const (
    FileContentPartTypeImage FileContentPartType = "image"
    FileContentPartTypePDF   FileContentPartType = "pdf"
)
```

## Built-in Implementation: InMemoryBackend

`InMemoryBackend` stores files in an in-memory map, primarily used for:

- **Unit testing** — Test Agent/Middleware file operation logic without a real file system
- **Lightweight scenarios** — Temporary file operations that don't require persistence
- **Tool result offloading** — The Filesystem Middleware's large tool result offloading feature uses InMemoryBackend by default

### Constructor

```go
func NewInMemoryBackend() *InMemoryBackend
```

Zero-parameter constructor that returns an empty in-memory file system.

### Usage Example

```go
backend := filesystem.NewInMemoryBackend()
ctx := context.Background()

// Write
_ = backend.Write(ctx, &filesystem.WriteRequest{
    FilePath: "/example/test.txt",
    Content:  "Hello, World!\nLine 2\nLine 3",
})

// Read (paginated)
content, _ := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/example/test.txt",
    Offset:   1,
    Limit:    10,
})

// List directory
files, _ := backend.LsInfo(ctx, &filesystem.LsInfoRequest{Path: "/example"})

// Search (regex)
matches, _ := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Pattern:         "Hello",
    Path:            "/example",
    CaseInsensitive: true,
})

// Edit
_ = backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/example/test.txt",
    OldString:  "Hello",
    NewString:  "Hi",
    ReplaceAll: false,
})
```

### Implementation Characteristics

- **Thread-safe** — Based on `sync.RWMutex`, read operations use read locks, write operations use write locks
- **GrepRaw parallel processing** — Launches up to 10 workers for parallel matching during multi-file searches
- **Regex support** — Supports full regex, case-insensitive (`(?i)` prefix), and multiline mode
- **Context lines** — GrepRaw supports BeforeLines/AfterLines to show context around matches
- **Glob matching** — Uses the `doublestar` library for `**` recursive matching
- **FileType mapping** — Built-in mapping table of 70+ file types to extensions (go, py, ts, rust, etc.)
- **Does not implement Shell** — InMemoryBackend does not implement the Shell/StreamingShell interface

## External Implementations

The following Backend implementations are located in the [eino-ext](https://github.com/cloudwego/eino-ext) repository:

- **Local Backend** (`github.com/cloudwego/eino-ext/adk/backend/local`) — Local file system implementation that directly operates on the local disk
- **Ark Agentkit Sandbox** (`github.com/cloudwego/eino-ext/adk/backend/agentkit`) — Volcengine Agentkit remote sandbox implementation

### Implementation Comparison

<table>
<tr><td>Feature</td><td>InMemory</td><td>Local</td><td>Agentkit Sandbox</td></tr>
<tr><td>Execution model</td><td>In-memory</td><td>Local direct</td><td>Remote sandbox</td></tr>
<tr><td>Network dependency</td><td>None</td><td>None</td><td>Required</td></tr>
<tr><td>Configuration complexity</td><td>Zero config</td><td>Zero config</td><td>Requires credentials</td></tr>
<tr><td>Persistence</td><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Shell support</td><td>No</td><td>Shell + StreamingShell</td><td>Shell</td></tr>
<tr><td>MultiModalReader</td><td>No</td><td>Depends on implementation</td><td>Depends on implementation</td></tr>
<tr><td>Use case</td><td>Testing / temporary storage</td><td>Development / local environment</td><td>Multi-tenant / production</td></tr>
</table>

## Custom Implementation

Implement the `Backend` interface to integrate with custom storage. For command execution, additionally implement `Shell` or `StreamingShell`; for multi-modal reading, implement `MultiModalReader`.

```go
type MyBackend struct { /* ... */ }

func (b *MyBackend) LsInfo(ctx context.Context, req *filesystem.LsInfoRequest) ([]filesystem.FileInfo, error) {
    // Custom implementation
}

func (b *MyBackend) Read(ctx context.Context, req *filesystem.ReadRequest) (*filesystem.FileContent, error) {
    // Custom implementation
}

func (b *MyBackend) GrepRaw(ctx context.Context, req *filesystem.GrepRequest) ([]filesystem.GrepMatch, error) {
    // Custom implementation
}

func (b *MyBackend) GlobInfo(ctx context.Context, req *filesystem.GlobInfoRequest) ([]filesystem.FileInfo, error) {
    // Custom implementation
}

func (b *MyBackend) Write(ctx context.Context, req *filesystem.WriteRequest) error {
    // Custom implementation
}

func (b *MyBackend) Edit(ctx context.Context, req *filesystem.EditRequest) error {
    // Custom implementation
}

// Optional: implement Shell
func (b *MyBackend) Execute(ctx context.Context, input *filesystem.ExecuteRequest) (*filesystem.ExecuteResponse, error) {
    // Custom implementation
}

// Optional: implement MultiModalReader
func (b *MyBackend) MultiModalRead(ctx context.Context, req *filesystem.MultiModalReadRequest) (*filesystem.MultiFileContent, error) {
    // Custom implementation
}
```
