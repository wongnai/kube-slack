const config = require('config');
const Slack = require('node-slack');

class SlackNotifier {
	constructor() {
		try {
			this.slack = new Slack(config.get('slack_url'));
		} catch (e) {
			console.error('Could not initialize Slack', e);
			this.slack = null;
		}
	}

	notify(item) {
		if (!this.slack) {
			return;
		}

		let channel = item.channel;
		delete item.channel;

		return this.slack
			.send({
				text: item.text || 'Kubernetes Notification:',
				attachments: [item],
				channel: channel,
			})
			.then(
				() => {
					console.log('Slack message sent');
				},
				e => {
					console.error(e);
				}
			);
	}
}

module.exports = SlackNotifier;
