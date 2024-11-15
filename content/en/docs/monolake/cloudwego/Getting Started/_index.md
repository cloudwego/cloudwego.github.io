---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 2
keywords: ["Monolake", "Rust", "Proxy", "Getting Started"]
description: "This page provides a quick start guide for setting up and running Monolake"
---

## Prerequisites

- **Linux Kernel Support**: IO-uring requires a Linux kernel version that includes IO-uring support. Generally, kernel versions 5.1 and above provide the necessary support. Ensure that your target system has an appropriate kernel version installed. Monolake will fall back to epoll on Mac OS.
- **Rust nightly**: See the "Rust installation section" below

## Quick Start

This chapter will get you started with Monolake using a simple example config 

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

### Setup an HTTP upstream server 

1. **Install Nginx**: Install Nginx using the package manager of your Linux distribution.

2. **Start Nginx**: Start Nginx using the following command:

   ```shell
   sudo service nginx start
   ```

3. **Configure Port**: Open the Nginx configuration file using a text editor:

   ```shell
   sudo nano /etc/nginx/nginx.conf
   ```

   Inside the file, locate the `http` block and add or modify the `listen` directive to use port 9080:

   ```nginx
   http {
       ...
       server {
           listen 9080;
           ...
       }
       ...
   }
   ```

   Save the changes and exit the text editor.

4. **Restart Nginx**: Restart Nginx for the changes to take effect:

   ```shell
   sudo service nginx restart
   ```

### Build Monolake 

1. Clone the monolake repository `git clone https://github.com/cloudwego/monolake.git`.
2. Build the binary:

   ```markup
   $ cargo build --release 
   ```
3. Generate the certificates 
   ```markup
   $ sh examples/gen_cert.sh 
   ```
### Run the example
 1. Make sure your endpoints are up and certificates are generated  
 2. Start the proxy

   ```markup
   $ ./target/release/monolake -c examples/config.toml
   ```
 3. Send a request to the socket based listener on server_basic.

  ```markup
   $ curl   -vvv http://127.0.0.1:9081/ 
  ```
 4. Send a request to the server_tls.

  ```markup
   $ curl --resolve gateway.monolake.rs:8081:127.0.0.1 --cacert examples/certs/rootCA.crt -vvv https://gateway.monolake.rs:8081/ 
  ```
 
### Detail configuration

Please check [Configuration](_config.md) for more details.
