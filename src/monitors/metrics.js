const EventEmitter = require('events');
const config = require('config');
const util = require('util');
const kube = require('../kube');

class PodMetrics extends EventEmitter {
	constructor() {
		super();
		this.minimumTime = config.get('not_ready_min_time');
		this.alerted = {};
	}

	start() {
		// run an initial check right after the start instead of waiting for first interval to kick in.
		if (config.get('metrics_cpu') || config.get('metrics_memory')) {
			this.check();

			setInterval(() => {
				this.check();
			}, config.get('interval'));
		}

		return this;
	}

	async check() {
		let pods = await kube.getWatchedPods();

		//console.log(util.inspect(await kube.getPodMetrics(), false, null, true))

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

			let metrics = await kube.getPodMetrics(pod);
			if (!metrics.body.containers || metrics.body.containers.length == 0) {
				continue;
			}
			let podUsage = metrics.body.containers[0].usage;
			let podLimits =
				pod.spec.containers[0].resources.limits ||
				pod.spec.containers[0].resources.requests;

			if (
				podUsage &&
				podLimits &&
				podLimits.cpu &&
				podLimits.memory &&
				podUsage.cpu &&
				podUsage.memory
			) {
				podUsage.cpu = podUsage.cpu.includes('m')
					? parseInt(podUsage.cpu) / 1000
					: podUsage.cpu.includes('n')
						? parseInt(podUsage.cpu) / 1000000000
						: podUsage.cpu;
				podLimits.cpu = podLimits.cpu.includes('m')
					? parseInt(podLimits.cpu) / 1000
					: podLimits.cpu.includes('n')
						? parseInt(podLimits.cpu) / 1000000000
						: podLimits.cpu;
				podUsage.memory = podUsage.memory.includes('Gi')
					? parseInt(podUsage.memory) * 1024
					: podUsage.memory.includes('Ki')
						? parseInt(podUsage.memory) / 1024
						: parseInt(podUsage.memory);
				podLimits.memory = podLimits.memory.includes('Gi')
					? parseInt(podLimits.memory) * 1024
					: podLimits.memory.includes('Ki')
						? parseInt(podLimits.memory) / 1024
						: parseInt(podLimits.memory);
				let percentDifference = {
					cpu: podUsage.cpu / podLimits.cpu,
					memory: podUsage.memory / podLimits.memory,
				};

				let percentageAlarm = config.get('metrics_alert')
					? config.get('metrics_alert') / 100
					: 0.8;
				if (
					config.get('metrics_cpu') &&
					percentDifference.cpu > percentageAlarm
				) {
					this.emit('message', {
						fallback: `Container ${pod.metadata.namespace}/${
							pod.metadata.name
						} has high CPU utilization`,
						color: 'danger',
						title: `${pod.metadata.namespace}/${pod.metadata.name}`,
						text: `Container CPU above ${percentageAlarm *
							100}% threshold: *${Math.round(podUsage.cpu * 100) / 100} / ${
							podLimits.cpu
						}*`,
						mrkdwn_in: ['text'],
						...this.messageProps,
					});
					this.alerted[
						`${pod.metadata.namespace}-${pod.metadata.name.replace(
							/-([a-z1-9]{10})-([a-z1-9]{5})/,
							''
						)}-cpu`
					] = pod;
				} else if (
					config.get('metrics_cpu') &&
					this.alerted[
						`${pod.metadata.namespace}-${pod.metadata.name.replace(
							/-([a-z1-9]{10})-([a-z1-9]{5})/,
							''
						)}-cpu`
					]
				) {
					this.emit('message', {
						fallback: `Container ${pod.metadata.namespace}/${
							pod.metadata.name
						} has normal CPU utilization`,
						color: 'good',
						title: `${pod.metadata.namespace}/${pod.metadata.name}`,
						text: `Container CPU at safe value *${Math.round(
							podUsage.cpu * 100
						) / 100} / ${podLimits.cpu}*`,
						mrkdwn_in: ['text'],
						...this.messageProps,
					});
				}

				if (
					config.get('metrics_memory') &&
					percentDifference.memory > percentageAlarm
				) {
					this.emit('message', {
						fallback: `Container ${pod.metadata.namespace}/${
							pod.metadata.name
						} has high RAM utilization`,
						color: 'danger',
						title: `${pod.metadata.namespace}/${pod.metadata.name}`,
						text: `Container RAM usage above ${percentageAlarm *
							100}% threshold: *${Math.round(podUsage.memory)}Mi / ${
							podLimits.memory
						}Mi*`,
						mrkdwn_in: ['text'],
						...this.messageProps,
					});
					this.alerted[
						`${pod.metadata.namespace}-${pod.metadata.name.replace(
							/-([a-z1-9]{10})-([a-z1-9]{5})/,
							''
						)}-memory`
					] = pod;
				} else if (
					config.get('metrics_memory') &&
					this.alerted[
						`${pod.metadata.namespace}-${pod.metadata.name.replace(
							/-([a-z1-9]{10})-([a-z1-9]{5})/,
							''
						)}-memory`
					]
				) {
					this.emit('message', {
						fallback: `Container ${pod.metadata.namespace}/${
							pod.metadata.name
						} has normal RAM utilization`,
						color: 'good',
						title: `${pod.metadata.namespace}/${pod.metadata.name}`,
						text: `Container RAM at safe value *${Math.round(
							podUsage.memory
						)}Mi / ${podLimits.memory}Mi*`,
						mrkdwn_in: ['text'],
						...this.messageProps,
					});
				}
			}
		}
	}
}

module.exports = () => new PodMetrics().start();
