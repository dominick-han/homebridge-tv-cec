let Service, Characteristic;

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
		callback(null, true);
	},

	setState: function(on, callback) {
		this.log(`setState(${on})`);
		callback();
	}
};
