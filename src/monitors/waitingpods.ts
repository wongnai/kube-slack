import * as EventEmitter from 'events';
import * as config from 'config';
import kube from '../kube';
import { NotifyMessage, ContainerStatusWithPod } from '../types';

class PodStatus extends EventEmitter {
	blacklistReason: string[];
	alerted: {[key: string]: ContainerStatusWithPod};

	constructor() {
		super();
		this.blacklistReason = ['ContainerCreating', 'PodInitializing'];
		this.alerted = {};
	}

	start() {
		setInterval(() => {
			this.check();
		}, config.get('interval'));

		return this;
	}

	async check() {
		let containers = await kube.getContainerStatuses();

		for (let item of containers) {
			let messageProps: Partial<NotifyMessage> = {};
			let annotations = item.pod.metadata.annotations;
			if (annotations) {
				// Ignore pod if the annotation is set and evaluates to true
				if (annotations['kube-slack/ignore-pod']) {
					continue;
				}

				if (annotations['kube-slack/slack-channel']) {
					messageProps['channel'] =
						annotations['kube-slack/slack-channel'];
				}
			}

			let key = item.pod.metadata.name;

			if (
				item.pod.metadata.ownerReferences &&
				item.pod.metadata.ownerReferences.length > 0
			) {
				key = item.pod.metadata.ownerReferences[0].name;
			}
			messageProps._key = key;

			if (!item.state.waiting) {
				this.checkRecovery(item, messageProps);
				continue;
			}
			if (this.blacklistReason.includes(item.state.waiting.reason)) {
				this.checkRecovery(item, messageProps);
				continue;
			}

			this.emit('message', {
				fallback: `Container ${item.pod.metadata.namespace}/${
					item.pod.metadata.name
				}/${item.name} entered status ${item.state.waiting.reason} (${
					item.state.waiting.message
				})`,
				color: 'danger',
				title: `${item.pod.metadata.namespace}/${item.pod.metadata.name}/${
					item.name
				}`,
				text: `Container entered status *${item.state.waiting.reason}*\n\`\`\`${
					item.state.waiting.message
				}\`\`\``,
				mrkdwn_in: ['text'],
				...messageProps,
			});
			this.alerted[item.name] = item;
		}
	}

	checkRecovery(item: ContainerStatusWithPod, messageProps: Partial<NotifyMessage>) {
		if (
			this.alerted[item.name] &&
			item.ready &&
			this.alerted[item.name].restartCount == item.restartCount
		) {
			delete this.alerted[item.name];
			this.emit('message', {
				fallback: `Container ${item.pod.metadata.namespace}/${
					item.pod.metadata.name
				}/${item.name} ready`,
				color: 'good',
				title: `${item.pod.metadata.namespace}/${item.pod.metadata.name}/${
					item.name
				}`,
				text: `Container entered status *${item.pod.status.phase}*\n${
					item.restartCount
				} restart${item.restartCount == 1 ? '' : 's'}`,
				mrkdwn_in: ['text'],
				...messageProps,
				_key: messageProps._key + 'recovery',
			});
		} else if (this.alerted[item.name]) {
			this.alerted[item.name] = item;
		}
	}
}

export default () => new PodStatus().start();
