# homebridge-hdmi-cec
[![NPM Version](https://img.shields.io/npm/v/homebridge-hdmi-cec.svg)](https://www.npmjs.com/package/homebridge-hdmi-cec)  
Homebridge support for TV power on/off, source selection, using HDMI-CEC

## Installation
1. Install [homebridge](https://github.com/nfarina/homebridge)
2. Install this plugin using: `sudo npm install -g homebridge-hdmi-cec`
3. Add `CEC` platform to your configuration file (See below for examples)

### Minimal config
```json
  "platforms":[
    {
      "platform": "CEC",
      "sources": [
        {
          "name": "Raspberry Pi",
          "address": "2.0.0.0"
        },
        {
          "name": "Apple TV",
          "address": "3.0.0.0"
        }
      ]
    }
```

### Full config (with optional parameters)
See [config-sample.json](config-sample.json)
