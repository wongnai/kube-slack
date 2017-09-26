/* eslint-env node */

const config = require('config');
const FloodFilter = require('./floodFilter');

class KubeMonitoring {
	constructor(){
		this.monitors = require('./monitors').map((item) => {
			return item();
		});
		this.floodFilter = new FloodFilter();
		this.floodFilter.expire = config.get('flood_expire');

		this.notifiers = require('./notify').map((Item) => {
			return new Item();
		});;
	}

	start(){
		let callback = (item) => {
			if(!this.floodFilter.isAccepted(item._key)){
				return;
			}

			delete item._key;

			for(let notifier of this.notifiers){
				notifier.notify(item);
			}
		};

		for(let item of this.monitors){
			item.on('message', callback);
		}

		return this;
	}
}

new KubeMonitoring().start();
