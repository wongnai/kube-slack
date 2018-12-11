/* eslint-env node */

import * as config from 'config';
import FloodFilter from './floodFilter';
import logger from './logger';
import { Monitor, Notifier, MonitorFactory, NotifyMessage } from './types';
import monitors from './monitors';
import notifiers from './notify';

class KubeMonitoring {
	monitors: Monitor[];
	floodFilter = new FloodFilter();
	notifiers: Notifier[];

	constructor() {
		this.monitors = monitors.map((item: MonitorFactory) => {
			return item();
		});
		this.floodFilter.expire = parseInt(config.get('flood_expire'), 10);

		this.notifiers = notifiers.map((Item: Notifier) => {
			return new Item();
		});
	}

	start() {
		let callback = (item: NotifyMessage) => {
			if (!this.floodFilter.isAccepted(item._key)) {
				return;
			}

			delete item._key;

			for (let notifier of this.notifiers) {
				notifier.notify(item);
			}
		};

		for (let item of this.monitors) {
			item.on('message', callback);
		}

		return this;
	}
}

new KubeMonitoring().start();

logger.info('Kubernetes monitors started');
