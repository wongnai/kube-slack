/* eslint-env node */

let childProcess = require('child_process');
let Slack = require('node-slack');
let Promise = require('bluebird');
let mapReduce = require('./mapreduce');

Promise.promisifyAll(childProcess);

let expireCount = process.env.EXPIRE_TICK || 4;
let ticks = process.env.TICK_RATE || 15000;
let blacklistReason = ['ContainerCreating'];

function getPods(){
	let child;

	if (process.argv.indexOf('--all-namespaces') > -1) {
		child = childProcess.spawn('kubectl', ['get', 'pod', '--all-namespaces', '-o', 'json']);	
	} else {
		child = childProcess.spawn('kubectl', ['--namespace', process.env.NAMESPACE || 'default', 'get', 'pod', '-o', 'json']);	
	}
	let buffer = '';
	child.stdout.on('data', (txt) => buffer += txt);
	console.log(buffer);
	return new Promise((resolve, reject) => {
		child.stdout.on('end', () => {
			resolve(JSON.parse(buffer));
		});
	});
}

function toContainers(item, emit){
	if(!item.status.containerStatuses){
		return;
	}
	for(let container of item.status.containerStatuses){
		container.pod = item;
		emit(container);
	}
}

let floodStore = {};

function expireStore(){
	for(let item of Object.keys(floodStore)){
		floodStore[item]--;
		if(floodStore[item] <= 0){
			delete floodStore[item];
		}
	}
}

function floodFilter(item){
	let result = true;
	let key = `${item.name} ${item.pod.metadata.name}`;
	if(floodStore[key]){
		result = false;
	}
	floodStore[key] = expireCount;
	return result;
}

function main(){
	if(!process.env.SLACK_URL){
		console.error('SLACK_URL is not set');
		process.exit(1);
	}
	let slack = new Slack(process.env.SLACK_URL);

	getPods().then((pods) => {
		return mapReduce(pods.items, toContainers);
	}).then((items) => {
		console.log(items);
		return items.filter((item) => {
			return item.state.waiting;
		});
	}).then((items) => {
		return items.filter((item) => {
			return !blacklistReason.includes(item.state.waiting.reason);
		});
	}).then((items) => {
		expireStore();
		return items.filter(floodFilter);
	}).then((items) => {
		if(items.length === 0){
			return;
		}
		let attachments = [];
		for(let item of items){
			let logUrl = '';
			if(process.env.LOGGING_URL){
				logUrl = process.env.LOGGING_URL
					.replace(/%CONTAINER%/g, encodeURIComponent(item.name))
					.replace(/%POD%/g, encodeURIComponent(item.pod.metadata.name))
					.replace(/%STATUS%/g, encodeURIComponent(item.state.waiting.reason));
				logUrl = `(<${logUrl}|View logs>)`;
			}

			attachments.push({
				fallback: `Container ${item.name} of pod ${item.pod.metadata.name} entered status ${item.state.waiting.reason} (${item.state.waiting.message})`,
				color: 'danger',
				footer: item.state.waiting.message,
				title: item.pod.metadata.name,
				text: `*${item.name}* entered status *${item.state.waiting.reason}* ${logUrl}`,
				mrkdwn_in: ['text'],
			});
		}
		slack.send({
			text: 'The following container(s) entered waiting status',
			attachments: attachments,
		}).then(() => {
			console.log(`Sent ${attachments.length} status to slack`);
		}, (e) => {
			console.error(e);
		});
	});
}

main();
setInterval(main, ticks);
