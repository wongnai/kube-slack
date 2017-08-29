/* eslint-env node */

let config = require('config');
let Slack = require('node-slack');
let FloodFilter = require('./floodFilter');

class KubeMonitoring {
	constructor(){
		this.monitors = require('./monitors').map((item) => {
			return item();
		});
		this.floodFilter = new FloodFilter();
		this.floodFilter.expire = config.get('flood_expire');

		this.slack = new Slack(config.get('slack_url'));
	}

	start(){
		let callback = (item) => {
			if(!this.floodFilter.isAccepted(item._key)){
				return;
			}

			delete item._key;
			console.log(item);

			this.slack.send({
				text: item.text,
				attachments: [item],
			}).then(() => {
				console.log('Message sent');
			}, (e) => {
				console.error(e);
			});
		};

		for(let item of this.monitors){
			item.on('message', callback);
		}

		return this;
	}
}

new KubeMonitoring().start();
