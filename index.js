let Service, Characteristic;
const { spawn } = require('child_process');
const cec_client = spawn('cec-client', ['-d', '8']);
let cec_output = [];

cec_client.stdout.on('data', function(data) {
	cec_output.push(data.toString());
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
	config.name = config.name || "TV";
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
		this.log("getState()");
		cec_output = [];
		cec_client.stdin.write("tx 10:8f");
		setTimeout(function () {
			let success = false;
			for (let i in cec_output) {
				if (cec_output[i].indexOf("01:90:00") !== -1) {
					success = true;
				}
			}
			callback(null, success);
		}, 300);
	},

	setState: function(on, callback) {
		this.log(`setState(${on})`);
		callback();
	}
};
