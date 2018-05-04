const EventEmitter = require('events');
const config = require('config');
const kube = require('../kube');

class PodStatus extends EventEmitter {
	constructor() {
		super();
		this.blacklistReason = ['ContainerCreating', 'PodInitializing'];
		this.clusterName = config.get('cluster_name');
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
			let messageProps = {};
			let annotations = item.pod.metadata.annotations;
			if (annotations) {
				// Ignore pod if the annotation is set and evaluates to true
				if (annotations['kube-slack/ignore-pod']) {
					continue;
				}

				if (annotations['kube-slack/slack-channel']) {
					messageProps['channel'] = annotations['kube-slack/slack-channel'];
				}
			}

			if (!item.state.waiting) {
				continue;
			}
			if (this.blacklistReason.includes(item.state.waiting.reason)) {
				continue;
			}

			let key = item.pod.metadata.name;

			if (
				item.pod.metadata.ownerReferences &&
				item.pod.metadata.ownerReferences.length > 0
			) {
				key = item.pod.metadata.ownerReferences[0].name;
			}

			const clusterInfo = this.clusterName ? ` in ${this.clusterName}` : '';
			const containerTitle = `${item.pod.metadata.namespace}/${
				item.pod.metadata.name
			}/${item.name}${clusterInfo}`;

			this.emit('message', {
				fallback: `Container ${containerTitle} entered status ${
					item.state.waiting.reason
				} (${item.state.waiting.message})`,
				color: 'danger',
				title: containerTitle,
				text: `Container entered status *${item.state.waiting.reason}*\n\`\`\`${
					item.state.waiting.message
				}\`\`\``,
				mrkdwn_in: ['text'],
				_key: key,
				...messageProps,
			});
		}
	}
}

module.exports = () => new PodStatus().start();
