const EventEmitter = require('events');
const config = require('config');
const kube = require('../kube');

class PodStatus extends EventEmitter{
	constructor(){
		super();
		this.blacklistReason = ['ContainerCreating', 'PodInitializing'];
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

			// Ignore pod if the annotation is set and evaluates to true
			if(item.pod.metadata.annotations && item.pod.metadata.annotations['kube-slack/ignore-pod']){
				continue;
			}

			if(!item.state.waiting){
				continue;
			}
			if(this.blacklistReason.includes(item.state.waiting.reason)){
				continue;
			}

			let key = item.pod.metadata.name;

			if(item.pod.metadata.ownerReferences && item.pod.metadata.ownerReferences.length > 0){
				key = item.pod.metadata.ownerReferences[0].name;
			}

			this.emit('message', {
				fallback: `Container ${item.pod.metadata.namespace}/${item.pod.metadata.name}/${item.name} entered status ${item.state.waiting.reason} (${item.state.waiting.message})`,
				color: 'danger',
				title: `${item.pod.metadata.namespace}/${item.pod.metadata.name}/${item.name}`,
				text: `Container entered status *${item.state.waiting.reason}*\n\`\`\`${item.state.waiting.message}\`\`\``,
				mrkdwn_in: ['text'],
				_key: key,
			});
		}
	}
}

module.exports = () => new PodStatus().start();
