const EventEmitter = require('events');
const config = require('config');
const kube = require('../kube');

class PodLongNotReady extends EventEmitter {
	constructor() {
		super();
		this.minimumTime = config.get('not_ready_min_time');
		this.alerted = {};
	}

	start() {
		setInterval(() => {
			this.check();
		}, config.get('interval'));

		// run an initial check right after the start instead of waiting for first interval to kick in.
		this.check();

		return this;
	}

	async check() {
		let pods = await kube.getWatchedPods();

		for (let pod of pods) {
			this.messageProps = {};
			let annotations = pod.metadata.annotations;
			if (annotations) {
				// Ignore pod if the annotation is set and evaluates to true
				if (annotations['kube-slack/ignore-pod']) {
					continue;
				}

				if (annotations['kube-slack/slack-channel']) {
					messageProps['channel'] = annotations['kube-slack/slack-channel'];
				}
			}

			if (!pod.status || !pod.status.conditions) {
				continue;
			}

			let readyStatus = pod.status.conditions.filter(
				item => item.type === 'Ready'
			);

			if (readyStatus.length === 0) {
				this.checkRecovery(pod, readyStatus);
				continue;
			}

			readyStatus = readyStatus[0];

			if (readyStatus.status === 'True') {
				this.checkRecovery(pod, readyStatus);
				continue;
			}

			if (readyStatus.reason === 'PodCompleted') {
				this.checkRecovery(pod, readyStatus);
				continue;
			}

			let notReadySince = new Date(readyStatus.lastTransitionTime).getTime();
			let notReadyDuration = new Date().getTime() - notReadySince;

			if (notReadyDuration < this.minimumTime) {
				continue;
			}

			let key = pod.metadata.name;

			if (
				pod.metadata.ownerReferences &&
				pod.metadata.ownerReferences.length > 0
			) {
				key = pod.metadata.ownerReferences[0].name;
			}

			this.messageProps._key = key;

			this.emit('message', {
				fallback: `Pod ${pod.metadata.namespace}/${
					pod.metadata.name
				} is not ready: ${readyStatus.reason} - ${readyStatus.message}`,
				color: 'danger',
				title: `${pod.metadata.namespace}/${
					pod.metadata.name
				}: ${readyStatus.reason || 'Pod not ready'}`,
				text: readyStatus.message || 'Pod not ready',
				...this.messageProps,
			});
			this.alerted[`${pod.metadata.namespace}/${pod.metadata.name}`] = pod;
		}
	}

	checkRecovery(item, readyStatus) {
		if (this.alerted[`${item.metadata.namespace}/${item.metadata.name}`]) {
			delete this.alerted[`${item.metadata.namespace}/${item.metadata.name}`];
			this.emit('message', {
				fallback: `Pod ${item.metadata.namespace}/${
					item.metadata.name
				} is ready: ${readyStatus.reason} - ${readyStatus.message}`,
				color: 'good',
				title: `${item.metadata.namespace}/${
					item.metadata.name
				}: ${readyStatus.reason || 'Pod is ready'}`,
				text: readyStatus.message || 'Pod is ready',
				...this.messageProps,
				_key: this.messageProps._key + 'recovery',
			});
		}
	}
}

module.exports = () => new PodLongNotReady().start();
