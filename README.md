# kube-slack

kube-slack is a monitoring service for Kubernetes. When a pod has failed,
it will publish a message in Slack channel.

![Screenshot](http://i.imgur.com/em62l25.png)

## Installation

A [Helm](https://helm.sh/) chart is available at [clearbit/charts](https://github.com/clearbit/charts/tree/master/stable/kube-slack)

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
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: kube-slack
  namespace: kube-system
spec:
  replicas: 1
  revisionHistoryLimit: 3
  template:
    metadata:
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ""
      name: kube-slack
      labels:
        app: kube-slack
    spec:
      containers:
      - name: kube-slack
        image: willwill/kube-slack:v3.1.0
        env:
        - name: SLACK_URL
          value: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
        resources:
          requests:
            memory: 30M
            cpu: 5m
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
      - key: CriticalAddonsOnly
        operator: Exists
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
- `FLOOD_EXPIRE`: Repeat notification after this many milliseconds has passed after status returned to normal. (Default to 60000 or 60s)
- `NOT_READY_MIN_TIME`: Time to wait after pod become not ready before notifying. (Default to 60000 or 60s)
- `KUBE_USE_KUBECONFIG`: Read Kubernetes credentials from active context in ~/.kube/config (default off)
- `KUBE_USE_CLUSTER`: Read Kubernetes credentials from pod (default on)
- `KUBE_NAMESPACE_ONLY`: Monitor current namespace only instead of whole cluster (default false)

## License

[MIT License](LICENSE)
