# homebridge-hdmi-cec
<img src="https://i.ibb.co/cY93vLB/D2-EA2-A26-71-F4-432-C-965-C-907-CDD409-B68.jpg" align="right" alt="Demo Screenshot" width="200px">

[![NPM Version](https://img.shields.io/npm/v/homebridge-tv-cec.svg)](https://www.npmjs.com/package/homebridge-tv-cec)  
Homebridge support for TV power on/off, source selection, using HDMI-CEC
### Prerequisite
CEC-Enabled device. Raspberry Pi (tested working) or Pulse-Eight's [USB - CEC Adapter](https://www.pulse-eight.com/p/104/usb-hdmi-cec-adapter)

## Installation
1. Install [homebridge](https://www.npmjs.com/package/homebridge)
2. Install this plugin using: `sudo npm install -g homebridge-tv-cec`
3. Install `cec-utils` if `cec-client` command is not present: `sudo apt-get install cec-utils`  
*Note: On Raspberry Pi's OSMC image, `cec-cilent` is present at `/usr/osmc/bin/cec-client-4.0.2`, need to run `sudo ln -s /usr/osmc/bin/cec-client-4.0.2 /usr/bin/cec-client` to link it to default `$PATH`*  
4. Add `TV-CEC` accessory to your configuration file (See below for examples)  
*Note: You might have to disable Kodi's (if installed) build in CEC functionality as it will interfere with this plugin*

### Config
```json
  "accessories": [
    {
      "accessory": "TV-CEC",
      "name": "TV",
      "devices": {
        "1": "Apple TV",
        "2": "Nintendo Switch",
        "3": "RetroPie",
        "4": "Raspberry Pi"
      }
    }
  ]
``
