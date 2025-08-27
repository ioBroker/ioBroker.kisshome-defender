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
- [X] Aggregate the line chart per day and not per measurement and add as Day-volume tab to chart (Tagesvollumen)
- [X] Error in the questionnaire form: Radio buttons are not displayed correctly
- [X] Solid delimiter in questionnaire form: "delimiter": "solid"
- [X] Send questionnaire does not work in the widget
- [X] Status tab as in the: https://github.com/ioBroker/ioBroker.kisshome-defender/issues/16
- [X] Show device names in day-volume drop-down menu
- [?] Add description about training to the admin settings GUI
- [X] Polling of the model status for every device on the admin device list. For every device show the status of the model in percent?
- [X] Show hint in the admin settings GUI, that the docker saves the data in the `<IOBROKER-PATH>/iobroker-data/kisshome-defender` folder
- [X] Question: the given random function for analysis time returns array... (take the first element)
- [X] sudo docker run --rm -d --security-opt apparmor=unconfined -v /var/log/shared:/shared:Z -p 5000:5000 kisshome/ids:stable
## Detection list
- [X] Change the background color of the positive "info" to green in the table with all devices (Detections)
- [X] Change the icons of one Analysis from "info"/"warning"/"alert" to "ok"(✓)/"alert"(⚠)
- [X] Find the highest score in suricata list and compare it with ML score (take the highest) to show it in the table.
- [X] Combine description of alert from ML and all Suricata alerts into one description field.#
- [X] The table must have always same widths of columns. Make ellipsis of the text and show tooltip with full text on hover for description.
- [X] Show new detection on the top of the list
- [X] Status tab and detection tab: "In the last 7 days anomalie activities detected: 100 (new 10)" and reset the new counter after the dialog opened
- [X] Sort detections by higher score and by zero by name or mac address (if no name)
- [X] vis-1 widget is in english
- [X] Detect theme change
- [X] New detections in admin do not work
- [X] clear the last seen after the dialog with detections is opened
- [X] Training status: percent and potential error
- 
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
