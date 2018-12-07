const fs = require('fs');
const config = require('config');
const Api = require('kubernetes-client');
const assert = require('assert');
const logger = require('./logger');
require('core-js/features/array/flat');

class Kubernetes {
	constructor() {
		this.kube = new Api.Core(this.getConfig());
		this.metrics = new Api.Client({ config: this.getConfig() });
		this.metricsEnabled = true;
		this.metricsLoaded = false;

		let namespaces_only = config.get('namespaces_only');
		if (namespaces_only) {
			if (!Array.isArray(namespaces_only)) {
				namespaces_only = namespaces_only
					.split(',')
					.map(namespace => namespace.trim());
			}
			logger.info(
				`Watching pods the following namespaces: ${namespaces_only.join(',')} .`
			);
		} else {
			logger.info(
				`KUBE_NAMESPACE_ONLY not set. Watching pods in ALL namespaces.`
			);
		}
		this.namespaces_only = namespaces_only;
	}

	getConfig() {
		let cfg = config.get('kube');
		if (cfg.kubeconfig) {
			return Api.config.fromKubeconfig();
		} else if (cfg.inCluster) {
			return Api.config.getInCluster();
		}

		// these keys are path to file
		let fileKey = ['ca', 'cert', 'key'];
		for (let key of fileKey) {
			if (cfg[key]) {
				cfg[key] = fs.readFileSync(cfg[key]);
			}
		}

		return cfg;
	}

	getMetricsConfig() {
		let cfg = this.getConfig();
		cfg.version = 'metrics.k8s.io/v1beta1';
		return cfg;
	}

	async getAllPodsInCluster() {
		return this.kube.pods.get().then(list => list.items);
	}

	async getPodMetrics(pod) {
		if (!this.metricsLoaded) {
			try {
				await this.metrics.loadSpec();
				this.metricsLoaded = true;
			} catch (e) {
				this.metricsEnabled = false;
				return e;
			}
		}

		if (this.metrics.apis['metrics.k8s.io']) {
			return this.metrics.apis['metrics.k8s.io'].v1beta1
				.namespaces(pod.metadata.namespace)
				.pods(pod.metadata.name)
				.get();
		} else {
			this.metricsEnabled = false;
			return null;
		}
	}

	async getPodsInNamespace(namespace) {
		try {
			const podsListResult = await this.kube.namespaces(namespace).pods.get();
			return podsListResult.items;
		} catch (e) {
			logger.info(
				e,
				`Error while attempting to retrieve pods in namespace: ${namespace}. Does the namespace exist and did you set the correct permissions?`
			);

			throw e;
		}
	}

	async getPodsInWatchedNamespaces() {
		// arrOfArrOfPods: Array<Error|Array<Pod>>
		const arrOfArrOfPods = await Promise.all(
			this.namespaces_only.map(
				namespace => this.getPodsInNamespace(namespace).catch(e => e) // catch errors and simply return the Error object - we don't want the whole watch cycle to stop just because one of the namespaces couldn't watched.
			)
		);

		return arrOfArrOfPods
			.filter(podArrOrError => !(podArrOrError instanceof Error)) // filter out error from namespaces which failed get watched, the error has been already logged. TODO: notify on slack when a namespace could not be watched successfully.
			.flat();
	}

	getWatchedPods() {
		return this.namespaces_only
			? this.getPodsInWatchedNamespaces()
			: this.getAllPodsInCluster();
	}

	async getContainerStatuses() {
		let pods = await this.getWatchedPods();
		let out = [];
		for (let item of pods) {
			if (!item.status.containerStatuses) {
				continue;
			}
			for (let container of item.status.containerStatuses) {
				container.pod = item;
				out.push(container);
			}
		}
		return out;
	}
}

module.exports = new Kubernetes();
