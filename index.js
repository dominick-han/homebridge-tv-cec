let Service, Characteristic;
const { spawn } = require('child_process');
const cec_client = spawn('cec-client', ['-d', '8']);
let cec_output = [], on = false;

cec_client.stdout.on('data', function(data) {
	data = data.toString();
	if (data.indexOf('>> 01:46') !== -1) {
		cec_client.stdin.write('tx 10:47:52:50:69'); // Set OSD String to 'RPi'
		console.log("TV ON");
		on = true;
	} else if (data.indexOf('>> 0f:36') !== -1) {
		console.log("TV OFF");
		on = false;
	}
	cec_output.push(data);
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

		this.switchService = new Service.Switch(this.config.name);
		this.switchService
			.getCharacteristic(Characteristic.On)
			.on('get', this.getState.bind(this))
			.on('set', this.setState.bind(this));
		this.log(`Initialized ${this.config.name || 'TV'}`);

		return [this.informationService, this.switchService];
	},

	getState: function(callback) {
		this.log('getState()');
		cec_output = [];
		cec_client.stdin.write('tx 10:8f'); // 'pow 0'
		setTimeout(function () {
			let success = false;
			for (let i in cec_output) {
				if (cec_output[i].indexOf('>> 01:90:00') !== -1) {
					success = true;
				}
			}
			on = success;
			callback(null, on);
		}, 300);
	},

	setState: async function(state, callback) {
		this.log(`setState(${on})`);
		if (state) {
			cec_client.stdin.write('tx 10:04'); // 'pow 0'
		} else {
			cec_client.stdin.write('tx 10:36'); // 'pow 0'
		}
		while (on !== state) {
		}
		callback();
	}
};
