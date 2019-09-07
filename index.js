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

			this.inputs = Object.entries(this.config.devices).map(([port, name]) => {
				const input = new Service.InputSource(name, `inputSource${port}`);
				input
					.setCharacteristic(Characteristic.Identifier, port)
					.setCharacteristic(Characteristic.ConfiguredName, name)
					.setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
					.setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.APPLICATION);
				this.tvService.addLinkedService(input);
				return input;
			});
			

            this.tvSpeakerService = new Service.TelevisionSpeaker(this.config.name + ' Volume')
			this.tvSpeakerService.setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
			this.tvSpeakerService.setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.ABSOLUTE)
			
			this.tvSpeakerService.getCharacteristic(Characteristic.VolumeSelector) //increase/decrease volume
			.on('set', this.setVolumeSelector.bind(this));

			// this.tvSpeakerService
			// 	.getCharacteristic(Characteristic.Mute)
			// 	.on('get', this.getMuteState.bind(this))
			// 	.on('set', this.setMuteState.bind(this));
            this.tvService.addLinkedService(this.tvSpeakerService);

			this.informationService = new Service.AccessoryInformation()
				.setCharacteristic(Characteristic.Manufacturer, this.config.manufacturer || 'N/A')
				.setCharacteristic(Characteristic.Model, this.config.model || 'TV')
			        .setCharacteristic(Characteristic.SerialNumber, this.config.serial || 'N/A');

			cecClient.stdout.on('data', data => {
				const traffic = data.toString();
				console.log(traffic);
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
					this.log.debug('CEC: Power on');
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


			tvEvent.on('VOLUME_UP', () => {
				if (!justSwitched) {
					this.log.debug('CEC: Volume up');
					this.tvService.getCharacteristic(Characteristic.Volume).updateValue(true);
					justSwitched = true;
					setTimeout(() => {
						justSwitched = false;
					}, 5000);
				}
			});

			tvEvent.on('VOLUME_DOWN', () => {
				if (!justSwitched) {
					this.log.debug('CEC: Volume down');
					this.tvService.getCharacteristic(Characteristic.Volume).updateValue(false);
					justSwitched = true;
					setTimeout(() => {
						justSwitched = false;
					}, 5000);
				}
			});


		}

		getServices() {
			return [ this.informationService, this.tvSpeakerService, this.tvService,  ...this.inputs ];
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
			this.log.info(`Turning TV ${value ? 'on' : 'off'}`);
			if (value === this.tvService.getCharacteristic(Characteristic.Active).value) {
				callback();
				this.log.info(`TV is already ${value ? 'on' : 'off'}`);
				return;
			}

			// const handler = () => {
			// 	handler.activated = true;
			// 	callback();
			// 	this.log.info(`TV is turned ${value ? 'on' : 'off'}`);
			// };						
			// tvEvent.once(value ? 'POWER_ON' : 'POWER_OFF', handler);
			// setTimeout(() => {
			// 	tvEvent.removeListener(value ? 'POWER_ON' : 'POWER_OFF', handler);
			// 	if (!handler.activated) {
			// 		callback(`TV is not turning ${value ? 'on' : 'off'}`);
			// 		this.log.info(`TV is not turning ${value ? 'on' : 'off'}`);
			// 	}
			// }, 30000);
		
			// Send on or off signal
			cecClient.stdin.write(value ? 'tx 10:04\n' : 'tx 10:36\n');
			callback();
		}

		setVolumeSelector(key, callback) {
			this.log.info(`Setting TV volume ${key ? 'up' : 'down'}`);
		
			// Send volume increase or decrease  signal
			switch (key) {
				case Characteristic.VolumeSelector.INCREMENT: //Volume up
				    this.log.info(`TV volume increasing`);
					cecClient.stdin.write('volup 0\n')
					break;
				case Characteristic.VolumeSelector.DECREMENT: //Volume down
					this.log.info(`TV volume decreasing`);
					cecClient.stdin.write('voldown 0\n')
					break;
			}
			callback();
		}

		// setMuteState(state, callback) {
		// 	this.log.info(`Setting TV volume ${state ? 'muted' : 'unmuted'}`);
        //TODO
		// 	callback();
		// }

		setInput(value, callback) {
			this.log.info(`Switching to HDMI${value}`);
			if (!this.tvService.getCharacteristic(Characteristic.Active).value) {
				this.log.info(`TV is off; Retrying to switch input after TV turns on`);
				tvEvent.once('POWER_ON', () => { this.setInput(value, callback); });
				return;
			}
			//const handler = () => {
			// 	handler.activated = true;
			// 	callback();
			// 	this.log.info(`TV is switched to HDMI${value}`);
			// };
			// tvEvent.once('INPUT_SWITCHED', handler);
			// setTimeout(() => {
			// 	tvEvent.removeListener('INPUT_SWITCHED', handler);
			// 	if (!handler.activated) {
			// 		callback(`TV is not switching to HDMI${value}`);
			// 		this.log.info(`TV is not switching to HDMI${value}`);
			// 	}
			// }, 30000);
			cecClient.stdin.write(`tx 1f:82:${value}0:00\n`);
			cecClient.stdin.write(`is\n`);
			callback();
				this.log.info(`Sent CEC command to switch to HDMI${value}`);
		}
	}
	homebridge.registerAccessory('homebridge-tv-cec', 'TV-CEC', TV);
};
