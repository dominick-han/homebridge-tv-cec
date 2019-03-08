# homebridge-tv-cec

[![NPM Version](https://img.shields.io/npm/v/homebridge-tv-cec.svg)](https://www.npmjs.com/package/homebridge-tv-cec)  
Homebridge support for TV power on/off, source selection, using HDMI-CEC

Now with iOS 12.2 HomeKit TV Accessory

Full supports scene/automation to turn on TV and switch to specific input

### Prerequisite
CEC-Enabled device. Raspberry Pi (tested working) or Pulse-Eight's [USB - CEC Adapter](https://www.pulse-eight.com/p/104/usb-hdmi-cec-adapter)

## Installation
1. Install [homebridge](https://www.npmjs.com/package/homebridge)
2. Install this plugin using: `sudo npm install -g homebridge-tv-cec`
3. Install `cec-utils` if `cec-client` command is not present: `sudo apt-get install cec-utils`  
* On Raspberry Pi's OSMC image, `cec-cilent` is present at `/usr/osmc/bin/cec-client-4.0.2`, need to run `sudo ln -s /usr/osmc/bin/cec-client-4.0.2 /usr/bin/cec-client` to link it to default `$PATH`*  
4. Add `TV-CEC` accessory to your configuration file (See below for examples)  
*You might have to disable Kodi's (if installed) build in CEC functionality as it will interfere with this plugin*

### Config
*Under "devices", the key is the port number (HDMI3) and value is the input name shown on HomeKit*
```json
"accessories":[
  {
    "accessory": "TV-CEC",
    "name": "TV",
    "devices": {
      "3": "Apple TV",
      "4": "Raspberry Pi"
    }
  }
]
```
