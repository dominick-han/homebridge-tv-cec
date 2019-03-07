const events = require('events');
const { spawn } = require('child_process');
const cec_client = spawn('cec-client', ['-d', '8']);
const tvEvent = new events.EventEmitter();

module.exports = homebridge => {
	const {Service, Characteristic } = homebridge.hap;

	class TV {
		constructor(log, config) {
			this.log = log;
			this.config = config;
			this.tvService = new Service.Television(this.config.name, 'television');
			this.tvService
				.setCharacteristic(Characteristic.ConfiguredName, this.config.name);
			this.tvService.getCharacteristic(Characteristic.Active)
				.on('get', this.getPowerStatus.bind(this))
				.on('set', this.setPowerStatus.bind(this));
			this.tvService
				.getCharacteristic(Characteristic.ActiveIdentifier)
				// .on('get', this.getInput.bind(this))
				.on('set', this.setInput.bind(this));


			this.input1 = new Service.InputSource('Apple TV', 'inputSource3');
			this.input1
				.setCharacteristic(Characteristic.Identifier, 3)
				.setCharacteristic(Characteristic.ConfiguredName, 'Apple TV')
				.setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
				.setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.APPLICATION);
			this.tvService.addLinkedService(this.input1);


			this.input2 = new Service.InputSource('Raspberry Pi', 'inputSource4');
			this.input2
				.setCharacteristic(Characteristic.Identifier, 4)
				.setCharacteristic(Characteristic.ConfiguredName, 'Raspberry Pi')
				.setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
				.setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.APPLICATION);
			this.tvService.addLinkedService(this.input2);


			this.informationService = new Service.AccessoryInformation();


			cec_client.stdout.on('data', data => {
				const traffic = data.toString();
				console.log(traffic);
				if (traffic.indexOf('<< 10:47:43:45:43') !== -1) {
					cec_client.stdin.write('tx 10:47:52:50:69\n'); // Set OSD String to 'RPi'
				}
				if (traffic.indexOf('>> 0f:36') !== -1) {
					tvEvent.emit('POWER_OFF');
				}
				if (traffic.indexOf('>> 01:90:00') !== -1) {
					tvEvent.emit('POWER_ON');
				}
				const match = />> \df:82:(\d)0:00/.exec(traffic);
				if (match) {
					this.log.info(`Input is switched to ${match[1]}`);
					this.tvService.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(parseInt(match[1]));
				}
			});
		}

		getServices () {
			return [this.informationService, this.tvService, this.input1, this.input2];
		}

		getPowerStatus (callback) {
			this.log.info(`Checking TV power status`);
			cec_client.stdin.write('tx 10:8f\n'); // 'pow 0'
			let activated = false;
			let handler = () => {
				activated = true;
				callback(null, true);
				this.log.info('TV is on');
			};
			tvEvent.prependOnceListener('POWER_ON', handler);
			setTimeout(() => {
				tvEvent.removeListener('POWER_ON', handler);
				if (!activated) {
					callback(null, false);
					this.log.info('TV is off');
				}
			}, 1000);
		}

		setPowerStatus (value, callback) {
			this.log.info(`Turning TV ${value ? 'On' : 'Off'}`);
			let activated = false;
			let handler = () => {
				activated = true;
				callback();
				this.log.info(`TV is turned ${value ? 'On' : 'Off'}`);
			};

			// Send on or off signal
			cec_client.stdin.write(value ? 'tx 10:04\n' : 'tx 10:36\n');

			tvEvent.prependOnceListener(value ? 'POWER_ON' : 'POWER_OFF', handler);
			setTimeout(() => {
				tvEvent.removeListener(value ? 'POWER_ON' : 'POWER_OFF', handler);
				if (!activated) {
					callback('TV not responding');
					this.log.info('TV not responding');
				}
			}, 20000);
		}

		setInput (value, callback) {
			this.log.info(`Setting input: ${value}`);
			cec_client.stdin.write(`tx 1f:82:${value}0:00\n`);
			cec_client.stdin.write(`is\n`);
			callback();
		}
	}
	homebridge.registerAccessory('homebridge-tv-cec', 'TV-CEC', TV);
};
