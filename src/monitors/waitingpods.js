const EventEmitter = require('events');
const config = require('config');
const kube = require('../kube');

class PodStatus extends EventEmitter{
	constructor(){
		super();
		this.blacklistReason = ['ContainerCreating'];
	}

	start(){
		setInterval(() => {
			this.check();
		}, config.get('interval'));

		return this;
	}

	async check(){
		let containers = await kube.getContainerStatuses();

		for(let item of containers){
			if(!item.state.waiting){
				continue;
			}
			if(this.blacklistReason.includes(item.state.waiting.reason)){
				continue;
			}

			this.emit('message', {
				fallback: `Container ${item.name} of pod ${item.pod.metadata.name} entered status ${item.state.waiting.reason} (${item.state.waiting.message})`,
				color: 'danger',
				title: `${item.pod.metadata.name}/${item.name}`,
				text: `Container entered status *${item.state.waiting.reason}*\n\`\`\`${item.state.waiting.message}\`\`\``,
				mrkdwn_in: ['text'],
				_key: `${item.pod.metadata.name}/${item.name}`,
			});
		}
	}
}

module.exports = () => new PodStatus().start();