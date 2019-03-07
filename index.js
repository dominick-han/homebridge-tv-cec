const events = require('events');
const { spawn } = require('child_process');
const cec_client = spawn('cec-client', ['-d', '8']);

const tvEvent = new events.EventEmitter();
cec_client.stdout.on('data', function (data) {
	let traffic = data.toString();
	if (traffic.indexOf('<< 10:47:43:45:43') !== -1) {
		cec_client.stdin.write('tx 10:47:52:50:69\n'); // Set OSD String to 'RPi'
	}
	if (traffic.indexOf('>> 0f:36') !== -1) {
		tvEvent.emit('PowerOff');
	}
	if (traffic.indexOf('>> 01:90:00') !== -1) {
		tvEvent.emit('PowerOn');
	}
});

module.exports = homebridge => {
	const {Service, Characteristic } = homebridge.hap;

	class TV {
		constructor(log, config) {
			this.log = log;
			this.config = config;
			this.service = new Service.Television()
				.setCharacteristic(Characteristic.ConfiguredName, this.config.name);
			this.informationService = new Service.AccessoryInformation();
			this.service.getCharacteristic(Characteristic.Active)
				.on('get', this.getPowerStatus.bind(this))
				.on('set', this.setPowerStatus.bind(this))
		}

		getServices () {
			return [this.informationService, this.service];
		}

		getPowerStatus (callback) {
			cec_client.stdin.write('tx 10:8f\n'); // 'pow 0'
			let activated = false;
			let handler = () => {
				activated = true;
				callback(null, true);
				this.log.info('TV is on');
			};
			tvEvent.prependOnceListener('PowerOn', handler);
			setTimeout(() => {
				tvEvent.removeListener('PowerOn', handler);
				if (!activated) {
					callback(null, false);
					this.log.info('TV is off');
				}
			}, 500);
		}

		setPowerStatus (value, callback) {
			let activated = false;
			let handler = () => {
				activated = true;
				callback(null);
				this.log.info(`Turning TV ${value ? 'On' : 'Off'}`);
			};

			// Send on or off signal
			cec_client.stdin.write(value ? 'tx 10:04\n' : 'tx 10:36\n');

			tvEvent.prependOnceListener(value ? 'PowerOn' : 'PowerOff', handler);
			setTimeout(() => {
				tvEvent.removeListener(value ? 'PowerOn' : 'PowerOff', handler);
				if (!activated) {
					callback('TV not responding');
					this.log.info('TV not responding');
				}
			}, 20000);
		}
	}
	homebridge.registerAccessory('homebridge-tv-cec', 'TV-CEC', TV);
};
