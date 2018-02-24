let Service, Characteristic;
const { spawn } = require('child_process');
const cec_client = spawn('cec-client', ['-d', '8']);
let cec_callback = null, powerSwitch = null;

cec_client.stdout.on('data', function(data) {
	data = data.toString();
	if (data.indexOf('<< 10:47') !== -1) {
		powerSwitch.setCharacteristic(Characteristic.On, true);
		cec_client.stdin.write('tx 10:47:52:50:69'); // Set OSD String to 'RPi'
	} else if (data.indexOf('>> 0f:36') !== -1 || data.indexOf('>> 01:90:00') !== -1) {
		if (cec_callback) {
			let callback = cec_callback;
			cec_callback = null;
			callback();
		}
	}
});

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerPlatform('homebridge-hdmi-cec', 'CEC', CECPlatform);
};

function CECPlatform(log, config) {
	this.log = log;
	this.config = config;
}

CECPlatform.prototype = {
	accessories: function(callback) {
		callback([new TVPower(this.log, this.config)]);
	}
};

function TVPower(log, config) {
	config.name = config.name || 'TV';
	this.log = log;
	this.config = config;
	this.name = config.name;
}

TVPower.prototype = {
	getServices: function() {
		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Manufacturer, this.config.manufacturer || 'Dominick Han')
			.setCharacteristic(Characteristic.Model, this.config.model || 'TV')
			.setCharacteristic(Characteristic.SerialNumber, this.config.serial || 'N/A');

		powerSwitch = new Service.Switch(this.config.name);
		powerSwitch
			.getCharacteristic(Characteristic.On)
			.on('get', this.getState.bind(this))
			.on('set', this.setState.bind(this));
		this.log(`Initialized ${this.config.name || 'TV'}`);

		return [this.informationService, powerSwitch];
	},

	getState: function(callback) {
		cec_client.stdin.write('tx 10:8f'); // 'pow 0'
		cec_callback = function () {
			callback(null, true);
		};
		setTimeout(function () {
			if (cec_callback !== null) {
				cec_callback = null;
				callback(null, false);
			}
		}, 300);
	},

	setState: function(state, callback) {
		if (state === powerSwitch.getCharacteristic(Characteristic.On)) {
			callback();
		} else {
			if (state) {
				cec_client.stdin.write('tx 10:04'); // 'on 0'
			} else {
				cec_client.stdin.write('tx 10:36'); // 'standby 0'
			}
			cec_callback = function () {
				powerSwitch.setCharacteristic(Characteristic.On, state);
				callback();
			};
		}
	}
};
