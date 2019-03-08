const events = require('events');
const { spawn } = require('child_process');
const cecClient = spawn('cec-client', [ '-d', '8' ]);
const tvEvent = new events.EventEmitter();

module.exports = homebridge => {
	const { Service, Characteristic } = homebridge.hap;

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

			cecClient.stdout.on('data', data => {
				const traffic = data.toString();
				if (traffic.indexOf('<< 10:47:43:45:43') !== -1) {
					cecClient.stdin.write('tx 10:47:52:50:69\n'); // Set OSD String to 'RPi'
				}
				if (traffic.indexOf('>> 0f:36') !== -1) {
					tvEvent.emit('POWER_OFF');
				}
				if (traffic.indexOf('>> 01:90:00') !== -1) {
					tvEvent.emit('POWER_ON');
				}
				const match = />> (0f:80:\d0:00|0f:86):(\d)0:00/.exec(traffic);
				if (match) {
					tvEvent.emit('INPUT_SWITCHED', match[2]);
				}
			});

			let justSwitched = false;

			tvEvent.on('POWER_ON', () => {
				if (!justSwitched) {
					this.log.debug('CEC: Power on');
					this.tvService.getCharacteristic(Characteristic.Active).updateValue(true);
					justSwitched = true;
					setTimeout(() => {
						justSwitched = false;
					}, 5000);
				}
			});

			tvEvent.on('POWER_OFF', () => {
				if (!justSwitched) {
					this.log.debug('CEC: Power off');
					this.tvService.getCharacteristic(Characteristic.Active).updateValue(false);
					justSwitched = true;
					setTimeout(() => {
						justSwitched = false;
					}, 5000);
				}
			});

			tvEvent.on('INPUT_SWITCHED', port => {
				this.log.debug(`CEC: Input switched to HDMI${port}`);
				this.tvService.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(parseInt(port));
			});
		}

		getServices() {
			return [ this.informationService, this.tvService, this.input1, this.input2 ];
		}

		getPowerStatus(callback) {
			this.log.info(`Checking TV power status`);
			cecClient.stdin.write('tx 10:8f\n'); // 'pow 0'
			const handler = () => {
				handler.activated = true;
				callback(null, true);
				this.log.info('TV is on');
			};
			tvEvent.once('POWER_ON', handler);
			setTimeout(() => {
				tvEvent.removeListener('POWER_ON', handler);
				if (!handler.activated) {
					callback(null, false);
					this.log.info('TV is off');
				}
			}, 1000);
		}

		setPowerStatus(value, callback) {
			this.log.info(`Turning TV ${value ? 'on' : 'fff'}`);
			if (value === this.tvService.getCharacteristic(Characteristic.Active).value) {
				callback();
				this.log.info(`TV is already ${value ? 'on' : 'off'}`);
				return;
			}
			const handler = () => {
				handler.activated = true;
				callback();
				this.log.info(`TV is turned ${value ? 'on' : 'off'}`);
			};
			tvEvent.once(value ? 'POWER_ON' : 'POWER_OFF', handler);
			setTimeout(() => {
				tvEvent.removeListener(value ? 'POWER_ON' : 'POWER_OFF', handler);
				if (!handler.activated) {
					callback(`TV is not turning ${value ? 'on' : 'off'}`);
					this.log.info(`TV is not turning ${value ? 'on' : 'off'}`);
				}
			}, 30000);
			// Send on or off signal
			cecClient.stdin.write(value ? 'tx 10:04\n' : 'tx 10:36\n');
		}

		setInput(value, callback) {
			this.log.info(`Switching to HDMI${value}`);
			if (!this.tvService.getCharacteristic(Characteristic.Active).value) {
				this.log.info(`TV is off; Retrying to switch input after TV turns on`);
				tvEvent.once('POWER_ON', () => { this.setInput(value, callback); });
				return;
			}
			const handler = () => {
				handler.activated = true;
				callback();
				this.log.info(`TV is switched to HDMI${value}`);
			};
			tvEvent.once('INPUT_SWITCHED', handler);
			setTimeout(() => {
				tvEvent.removeListener('INPUT_SWITCHED', handler);
				if (!handler.activated) {
					callback(`TV is not switching to HDMI${value}`);
					this.log.info(`TV is not switching to HDMI${value}`);
				}
			}, 30000);
			cecClient.stdin.write(`tx 1f:82:${value}0:00\n`);
			cecClient.stdin.write(`is\n`);
		}
	}
	homebridge.registerAccessory('homebridge-tv-cec', 'TV-CEC', TV);
};
