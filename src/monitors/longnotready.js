const EventEmitter = require('events');
const config = require('config');
const kube = require('../kube');

class PodLongNotReady extends EventEmitter{
	constructor(){
		super();
		this.minimumTime = config.get('not_ready_min_time');
	}

	start(){
		setInterval(() => {
			this.check();
		}, config.get('interval'));

		return this;
	}

	async check(){
		let pods = await kube.getPods();

		for(let pod of pods){
			if(!pod.status || !pod.status.conditions){
				continue;
			}

			let readyStatus = pod.status.conditions.filter((item) => item.type === 'Ready');
			
			if(readyStatus.length === 0){
				continue;
			}

			readyStatus = readyStatus[0];

			if(readyStatus.status === 'True'){
				continue;
			}

			let notReadySince = new Date(readyStatus.lastTransitionTime).getTime();
			let notReadyDuration = new Date().getTime() - notReadySince;

			if(notReadyDuration < this.minimumTime){
				continue;
			}

			this.emit('message', {
				fallback: `Pod ${pod.metadata.namespace}/${pod.metadata.name} is not ready: ${readyStatus.reason} - ${readyStatus.message}`,
				color: 'danger',
				title: `${pod.metadata.namespace}/${pod.metadata.name}: ${readyStatus.reason}`,
				text: readyStatus.message,
				_key: pod.metadata.name,
			});
		}
	}
}

module.exports = () => new PodLongNotReady().start();
