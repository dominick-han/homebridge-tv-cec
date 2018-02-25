let Service, Characteristic;
const events = require('events');
const { spawn } = require('child_process');
const cec_client = spawn('cec-client', ['-d', '8']);
let Log, powerSwitch = null;
let justTurnedOff = false, justTurnedOn = false;
let tvEvent = new events.EventEmitter();
let nullFunction = function() {};

tvEvent.on("PowerOn", function() {
	Log.debug("Power Status: on");
	powerSwitch.getCharacteristic(Characteristic.On).updateValue(true);
	justTurnedOn = true;
	setTimeout(function() {justTurnedOn = false;}, 1000);
});

tvEvent.on("PowerOff", function() {
	Log.debug("Power Status: off");
	powerSwitch.getCharacteristic(Characteristic.On).updateValue(false);
	justTurnedOff = true;
	setTimeout(function() {justTurnedOff = false;}, 2000);
});

cec_client.stdout.on('data', function(data) {
	let traffic = data.toString();
	Log.debug(traffic);
	if (traffic.indexOf('<< 10:47:43:45:43') !== -1) {
		cec_client.stdin.write('tx 10:47:52:50:69\n'); // Set OSD String to 'RPi'
	}
	if (traffic.indexOf('>> 0f:36') !== -1) {
		tvEvent.emit('PowerOff');
	}
	if (traffic.indexOf('>> 01:90:00') !== -1) {
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
		Log(`Initialized Power Switch`);

		return [this.informationService, powerSwitch];
	},

	getState: function(callback) {
		Log.debug("Power.getState()");
		if (justTurnedOn) {
			callback(null, true);
		} else if (justTurnedOff) {
			callback(null, false);
		} else {
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
		}
	},

	setState: function(state, callback) {
		Log.debug(`Power.setState(${state})`);
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
			}, 15000);
		}
	}
};
