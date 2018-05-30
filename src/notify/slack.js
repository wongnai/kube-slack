const config = require('config');
const Slack = require('node-slack');
const logger = require('../logger');

class SlackNotifier {
	constructor() {
		let opts = {};

		if (config.has('slack_proxy')) {
			opts.proxy = config.get('slack_proxy');
		}

		try {
			this.slack = new Slack(config.get('slack_url'), opts);
		} catch (err) {
			logger.error({ err }, 'Could not initialize Slack');
			this.slack = null;
		}
	}

	notify(item) {
		if (!this.slack) {
			return;
		}

		let channel = item.channel || config.get('slack_channel');
		delete item.channel;

		return this.slack
			.send({
				text: item.text || 'Kubernetes Notification:',
				attachments: [item],
				channel: channel,
			})
			.then(
				() => {
					logger.info('Slack message sent');
				},
				err => {
					logger.error({ err }, 'Could not send notification to Slack');
				}
			);
	}
}

module.exports = SlackNotifier;
