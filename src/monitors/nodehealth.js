const EventEmitter = require('events');
const config = require('config');
const kube = require('../kube');

class PodStatus extends EventEmitter {
	constructor() {
		super();
		this.alerted = {};
	}

	start() {
		setInterval(() => {
			this.check();
		}, config.get('interval'));

		return this;
	}

	async check() {
		let nodes = await kube.getNodes();

		for (let item of nodes) {

			for (let status of item.status.conditions) {

				if((status.status == "False" && status.type !== "Ready") || (status.status !== "False" && status.type == "Ready")) {
					this.checkRecovery(item, status);
					continue
				}

				if(new Date(status.lastHeartbeatTime).getTime() > (new Date().getTime()) - config.get('interval') - 15000 ) {
					this.checkRecovery(item, status);
					continue
				}
				
				this.emit('message', {
					fallback: `Node ${item.metadata.name} condition ${status.type} entered status ${status.status} (${status.message})`,
					color: 'danger',
					title: `${status.type} on ${item.metadata.name} is ${status.status}`,
					text: `Node ${status.type} has reason *${status.reason}*\n\`\`\`${
						status.message
					}\`\`\`\nLast seen ${status.lastHeartbeatTime}\nLast transition ${status.lastTransitionTime}`,
					mrkdwn_in: ['text'],
					_key: item.metadata.name + status.type
				});
				this.alerted[item.metadata.name + status.type] = status;
			}
		}
	}

	checkRecovery(item, status) {
		if(this.alerted[item.metadata.name + status.type]) {
			delete this.alerted[item.metadata.name + status.type]
			this.emit('message', {
				fallback: `Node ${item.metadata.name} condition ${status.type} entered status ${status.status} (${status.message})`,
				color: 'good',
				title: `${status.type} on ${item.metadata.name} is ${status.status}`,
				text: `Node ${status.type} has reason *${status.reason}*\n\`\`\`${
					status.message
				}\`\`\`\nLast seen ${status.lastHeartbeatTime}\nLast transition ${status.lastTransitionTime}`,
				mrkdwn_in: ['text'],
				_key: item.metadata.name + status.type + "recovered"
			});
		}
	}
}

module.exports = () => new PodStatus().start();
