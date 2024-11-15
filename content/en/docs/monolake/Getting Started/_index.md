---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
keywords: ["Monolake", "Rust", "Proxy", "Getting Started"]
description: "This page provides a quick start guide for setting up and running Monolake proxy"
---

## Prerequisites

- **Linux Kernel Support**: io_uring requires  linux kernel support. Generally, kernel versions 5.1 and above provide the necessary support. Ensure that your target system has an appropriate kernel version installed. Monolake will fall back to epoll on Mac OS.
- **Rust nightly**: See the "Rust installation section" below

## Quick Start

This chapter will get you started with Monolake proxy using a simple example config.

### Rust installation 

To download and install Rust, and set `rustup` to nightly, you can follow these instructions:

1. Download and install Rust by running the following command in your terminal:

   ```markup
   $ curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

   This command will download the Rust installation script and initiate the installation process.

3. Close the terminal and open a new terminal window to ensure the changes take effect.

4. Set `rustup` to nightly by running the following command:

   ```markup
   $ rustup default nightly
   ```

   This command sets the default Rust toolchain to the nightly version.

5. Verify the installation and check the Rust version by running:

   ```markup
   $ rustc --version
   ```

   This command will display the installed Rust version, which should now be set to nightly.

### Build Monolake 

1. Clone the monolake repository `git clone https://github.com/cloudwego/monolake.git`.
2. Build the binary:

   ```markup
   $ cargo build --release 
   ```
3. Generate the certificates for the example: 
   ```markup
   $ sh examples/gen_cert.sh 
   ```
### Run the example
 1. Start the proxy
   ```markup
   $ ./target/release/monolake -c examples/config.toml
   ```
 2. Send a request to the HTTP proxy.

  ```markup
   $ curl  -vvv http://127.0.0.1:8080/ 
  ```
 4. Send a request to the HTTPS proxy.

  ```markup
   $ curl --resolve gateway.monolake.rs:8081:127.0.0.1 --cacert examples/certs/rootCA.crt -vvv https://gateway.monolake.rs:8081/ 
  ```
 