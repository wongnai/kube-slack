# kube-slack

kube-slack is a monitoring service for Kubernetes. When a pod has failed,
it will publish a message in Slack channel.

![Screenshot](http://i.imgur.com/em62l25.png)

## Installation

1. Create an incoming webhook:
   1. In the Slack interface, click on the gears button (Channel Settings) near the search box.
   2. Select "Add an app or integration"
   3. Search for "Incoming WebHooks"
   4. Click on "Add configuration"
   5. Select the channel you want the bot to post to and submit.
   6. You can customize the icon and name if you want.
   7. Take note of the "Webhook URL". This will be something like https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
2. Load this ReplicationController into your Kubernetes. Make sure you set `SLACK_URL` to the Webhook URL.

```yml
apiVersion: v1
kind: ReplicationController
metadata:
  name: kube-slack
spec:
  replicas: 1
  template:
    metadata:
      name: kube-slack
      labels:
        app: kube-slack
    spec:
      containers:
      - name: kube-slack
        image: willwill/kube-slack:v2.0.0
        env:
        - name: SLACK_URL
          value: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

3. To test, try creating a failing pod. The bot should announce in the channel after 15s with the status `ErrImagePull`. Example of failing image:

```yml
apiVersion: v1
kind: Pod
metadata:
  name: kube-slack-test
spec:
  containers:
  - image: willwill/inexisting
    name: kube-slack-test
```



Additionally, the following environment variables can be used:

- `TICK_RATE`: How often to update in milliseconds. (Default to 15000 or 15s)
- `NAMESPACE`: What namespace to watch (default to default namespace). To watch multiple namespaces, launch with `--all-namespaces` argument.
- `LOGGING_URL`: Add link to view logs. Can use the following variables in the URL:
  - `%CONTAINER%`: Container name
  - `%POD%`: Pod name
  - `%STATUS%`: Current status

## Changelog

All versions are available as tags in Docker Hub.

- v2.1.0: Added `--all-namespaces` argument (#8, thanks to @dylannlaw)
- v2.0.0: Replaced `KIBANA_URL` with `LOGGING_URL`. Use `LOGGING_URL=https://example.com/app/kibana#/discover?_g=()&_a=(columns:!(log,stream),index:'logstash-*',interval:auto,query:(query_string:(analyze_wildcard:!t,query:'kubernetes.pod:%20%POD%%20%26%26%20kubernetes.container_name:%20%CONTAINER%')),sort:!('@timestamp',desc))` for Kibana.
- v1.1.0: Optimized Dockerfile
- v1.0.0: Initial release

## License

[MIT License](LICENSE)
