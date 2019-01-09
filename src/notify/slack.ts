import * as config from 'config';
import * as Slack from 'node-slack';
import logger from '../logger';
import { NotifyMessage } from '../types';

export default class SlackNotifier {
	slack: Slack | null;

	constructor() {
		let opts: Partial<Slack.Option> = {};

		if (config.has('slack_proxy')) {
			opts.proxy = config.get('slack_proxy');
		}

		try {
			this.slack = new Slack(config.get('slack_url'), opts as Slack.Option);
		} catch (err) {
			logger.error({ err }, 'Could not initialize Slack');
			this.slack = null;
		}
	}

	notify(item: NotifyMessage) {
		if (!this.slack) {
			return;
		}

		let channel = item.channel || config.get('slack_channel');
		delete item.channel;

		return this.slack
			.send({
				text: item.text || 'Kubernetes Notification:',
				attachments: [item],
				channel,
			})
			.then(
				() => {
					logger.info('Slack message sent');
				},
				(err: any) => {
					logger.error({ err }, 'Could not send notification to Slack');
				}
			);
	}
}
