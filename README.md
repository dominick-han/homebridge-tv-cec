# homebridge-hdmi-cec
<a href="https://image.ibb.co/jpS9Sc/IMG_6428_1.png"><img src="https://image.ibb.co/hTUHDH/Screenshot.png" align="right" alt="Demo Screenshot" width="200px"></a>

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

## Configurations
### Platform
Field           | Required?    | Description
----------------|--------------|-------------
**platform**    | **Required** | Must be "CEC" (all UPPERCASE).
**sources**     |  Required for source-switching  | A JSON array, containing objects specified from below.
  name          |  *Optional*  | Name displayed in Home app.
  manufacturer  |  *Optional*  | Manufacturer displayed in Home app.
  model         |  *Optional*  | Model displayed in Home app.
  serial        |  *Optional*  | Serial# displayed in Home app.

### "sources" entry
Field           | Required?    | Description
----------------|--------------|-------------
**name**        | **Required** | Name displayed in Home app.
**address**     | **Required** | Physical address as specified in HDMI-CEC standard.
  manufacturer  |  *Optional*  | Manufacturer displayed in Home app.
  model         |  *Optional*  | Model displayed in Home app.
  serial        |  *Optional*  | Serial# displayed in Home app.
