---
title: "Extension of Service Registry"
date: 2021-08-26
weight: 3
description: >
---

Kitex supports user-defined registration module. Users can extend and integrate other registration centers by themselves. This extension is defined under pkg/registry.

## Extension API and Definition of Info Struct

- Extension API

```go
// Registry is extension interface of service registry.
type Registry interface {
	Register(info *Info) error
	Deregister(info *Info) error
}
```

- Definition of Info Struct
  Kitex defines some registration information. Users can also expand the registration information into tags as needed.

```go
// Info is used for registry.
// The fields are just suggested, which is used depends on design.
type Info struct {
	// ServiceName will be set in kitex by default
	ServiceName string
	// Addr will be set in kitex by default
	Addr net.Addr
	// PayloadCodec will be set in kitex by default, like thrift, protobuf
	PayloadCodec string

	Weight        int
	StartTime     time.Time
	WarmUp        time.Duration

	// extend other infos with Tags.
	Tags map[string]string
    
    // SkipListenAddr is used to prevent the listen addr from overriding the Addr(available from Kitex v0.10.0)
    SkipListenAddr bool
}
```

## Integrate into Kitex

Specify your own registration module and customized registration information through `option`. Note that registration requires service information, which is also specified through option.

- Specify Server Info

  option: `WithServerBasicInfo`

  ```go
  ebi := &rpcinfo.EndpointBasicInfo{
  		ServiceName: "yourServiceName",
  		Tags:        make(map[string]string),
  }
  ebi.Tags[idc] = "xxx"

  svr := xxxservice.NewServer(handler, server.WithServerBasicInfo(ebi))
  ```

- Specify Custom Registion module

  option: `WithRegistry`

  ```go
  svr := xxxservice.NewServer(handler, server.WithServerBasicInfo(ebi), server.WithRegistry(yourRegistry))
  ```

- Custom RegistryInfo

  Kitex sets ServiceName, Addr and PayloadCodec by default. If other registration information is required, you need to inject it by yourself. option: `WithRegistryInfo`.

  ```go
  svr := xxxservice.NewServer(handler, server.WithRegistry(yourRegistry), server.WithRegistryInfo(yourRegistryInfo))
  ```

- Allow custom registry to get the actual address for registering(available from Kitex v0.10.0)

  When the Client cannot access the Listen Address of the Server and needs to use a public IP address to access the Server, it can be set by specifying `Addr` and `SkipListenAddr` in RegistryInfo.
  ```go
  info := &registry.Info{
       Addr: YourServerAddress,
       SkipListenAddr: true,
       ...
  }
  svr := xxxservice.NewServer(handler, server.WithRegistry(yourRegistry), server.WithRegistryInfo(info))
  ```
