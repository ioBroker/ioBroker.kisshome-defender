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

## De-installation

The public key required for the communication is stored in `0_userdata.0.kisshomeResearchPublicKey`.
After the adapter is uninstalled, the key must be deleted manually.

This was required to make it possible to uninstall and install the adapter again without any problems.

## Todo
- [X] Allow the placement of radio buttons text on the bottom of the buttons
- [X] Allow to use `{{email}}` pattern in the link
- [X] Send button does not work in the widget
- [X] Place on the settings tab the components on the top and not in the middle
- [X] Show delimiter on the questionnaire form between the components if defined
- [X] Allow layout as on picture: https://github.com/ioBroker/ioBroker.kisshome-defender/issues/14
- [X] MAC-Adresse => Device (in the widget). Place name on the first place and MAC on the second place
- [X] Erkennungen => Ergebnisse (in the widget)
- [X] Title for test result, instead of simple time => Test ergebnis vom 2025-01-01 12:00:00
- [X] Add "mobile": true/false to every UX event
- Add UX event when the Alarm/Warning is triggered with alarm UUID
- Send Alarm and warning via email
- Send push notification via iobroker.iot
- Send notification via admin
- [X] Show on the day time chart show Y axis with description (Data volume)
- [X] Show on the day time chart device selector as on the data volume chart
- [X] Show on the country chart device selector as on the data volume chart
- [X] Show version of IDS as a state
- In the case of 503 oder Exited state, restart the IDS (Show warning in log)
- [X] Hide all other statuses if instance is not running on the status. If instance is running do not show this point
- [X] If instance is not running, show the link to activate the instance
- [X] Add to status the information about connection to federated server
- [X] Update information on detections page by change from not alive to alive

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

## Changelog
### **WORK IN PROGRESS**

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
