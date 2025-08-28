![Logo](admin/kisshome-defender.png)

# ioBroker KISSHome defender

![Number of Installations](http://iobroker.live/badges/kisshome-defender-installed.svg)
![Number of Installations](http://iobroker.live/badges/kisshome-defender-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.kisshome-defender.svg)](https://www.npmjs.com/package/iobroker.kisshome-defender)

![Test and Release](https://github.com/ioBroker/ioBroker.kisshome-defender/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/kisshome-defender/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.kisshome-defender.svg)](https://www.npmjs.com/package/iobroker.kisshome-defender)

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

This special adapter was developed for the KISSHome defender project. It is not intended for general use.

To use this adapter, you must first register on the [KISSHome defender](https://kisshome-defender.if-is.net) website and get the confirmation email.

To run this adapter, you need:

-   More than 3 smart home devices
-   Fritz!Box Router. Without `Fritz!Box`, the adapter will not work.
-   iobroker must run on debian/raspbian (or at least on linux, where the following commands are available: `which`, `rsync`)
-   Docker must be installed and enabled for the user `iobroker` to run the IDS container

### Enable Docker for user iobroker
By older Linux systems to install docker, you must do the following [steps](https://docs.docker.com/engine/install/debian/)

By new systems (Debian 12, Ubuntu 22.04 and newer) you can install docker by the following commands:
```bash
sudo apt update
sudo apt install -y docker-ce
sudo systemctl start docker
sudo systemctl enable docker  
sudo usermod -aG docker iobroker
```

Add command docker to the sudoers file:
```bash
sudo visudo /etc/sudoers.d/iobroker
```

Add the following line:
```text
iobroker ALL=(ALL) NOPASSWD: /usr/bin/docker
```

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

## Changelog
### 0.1.3 (2025-08-28)

-   (@GermanBluefox) Removed test cases

### 0.1.1 (2025-08-27)

-   (@GermanBluefox) Initial commit

## License

The MIT License (MIT)

Copyright (c) 2025 Denis Haev <dogafox@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
