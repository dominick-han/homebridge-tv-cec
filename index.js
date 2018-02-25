let Service, Characteristic;
const events = require('events');
const { spawn } = require('child_process');
const cec_client = spawn('cec-client', ['-d', '8']);
let Log, powerSwitch = null;
let justTurnedOff = false;
let tvEvent = new events.EventEmitter();
let nullFunction = function() {};

tvEvent.on("PowerOn", function() {
	Log("Power Status: on");
	powerSwitch.getCharacteristic(Characteristic.On).updateValue(true);
});

tvEvent.on("PowerOff", function() {
	Log("Power Status: off");
	powerSwitch.getCharacteristic(Characteristic.On).updateValue(false);
	justTurnedOff = true;
	setTimeout(function() {justTurnedOff = false;}, 2000);
});

cec_client.stdout.on('data', function(data) {
	data = data.toString();
	if (data.indexOf('<< 10:47:43:45:43') !== -1) {
		cec_client.stdin.write('tx 10:47:52:50:69\n'); // Set OSD String to 'RPi'
	}
	if (data.indexOf('>> 0f:36') !== -1) {
		tvEvent.emit('PowerOff');
	}
	if (data.indexOf('>> 01:90:00') !== -1) {
		if (!justTurnedOff) tvEvent.emit("PowerOn");
	}
});

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerPlatform('homebridge-hdmi-cec', 'CEC', CECPlatform);
};

function CECPlatform(log, config) {
	Log = log;
	this.config = config;
}

CECPlatform.prototype = {
	accessories: function(callback) {
		callback([new Power(this.config)]);
	}
};

function Power(config) {
	config.name = config.name || 'TV';
	this.config = config;
	this.name = config.name;
}

Power.prototype = {
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
		Log(`Initialized ${this.config.name || 'TV'}`);

		return [this.informationService, powerSwitch];
	},

	getState: function(callback) {
		Log("Power.getState()");
		cec_client.stdin.write('tx 10:8f\n'); // 'pow 0'
		let activated = false;
		let handler = function () {
			activated = true;
			callback(null, true);
		};
		tvEvent.prependOnceListener("PowerOn", handler);
		setTimeout(function () {
			tvEvent.removeListener("PowerOn", handler);
			if (!activated) {
				callback(null, false);
				tvEvent.emit("PowerOff");
			}
		}, 300);
	},

	setState: function(state, callback) {
		Log(`Power.setState(${state})`);
		if (state === powerSwitch.getCharacteristic(Characteristic.On).value) {
			callback();
			this.getState(nullFunction);
		} else {
			let activated = false;
			let handler = function () {
				activated = true;
				callback(null);
			};

			// Send on or off signal
			cec_client.stdin.write(state? 'tx 10:04\n' : 'tx 10:36\n');

			tvEvent.prependOnceListener(state ? "PowerOn" : "PowerOff", handler);
			setTimeout(function () {
				tvEvent.removeListener(state ? "PowerOn" : "PowerOff", handler);
				if (!activated) {
					callback("TV not responding");
				}
			}, state ? 15000 : 5000);
		}
	}
};
