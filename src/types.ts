import * as Api from 'kubernetes-client';
import { EventEmitter } from 'events';

export interface ConfigKube extends Api.ClusterConfiguration {
	inCluster: boolean;
	kubeconfig: boolean;
}

export interface KubernetesObject {
	apiVersion: string;
	kind: string;
	metadata: {
		name: string;
		namespace: string;
		selfLink: string;
		creationTimestamp: string;
	};
}

export interface KubernetesResponse<T> {
	body: T
}

export interface KubernetesList<T> extends KubernetesObject {
	items: T[];
}

export enum KubernetesTriStateBoolean {
	true = 'True',
	false = 'False',
	unknown = 'Unknown',
}

export enum KubernetesPodConditionType {
	scheduled = 'PodScheduled',
	ready = 'Ready',
	initialized = 'Initialized',
	unschedulable = 'Unschedulable',
	containersReady = 'ContainersReady',
}

export interface KubernetesPodCondition {
	lastProbeTime: null | string;
	lastTransitionTime: null | string;
	status: KubernetesTriStateBoolean;
	type: KubernetesPodConditionType;
	message?: string;
	reason?: string;
}

export interface KubernetesContainerState {
	running?: {
		startedAt: string;
	};
	waiting?: {
		message: string;
		reason: string;
	};
	terminated?: {
		containerID: string;
		exitCode: number;
		finishedAt: string;
		message?: string;
		reason: string;
		signal?: number;
		startedAt: string;
	};
}

export interface KubernetesContainerStatus {
	containerID: string;
	image: string;
	imageID: string;
	name: string;
	ready: boolean;
	restartCount: number;
	lastState: KubernetesContainerState;
	state: KubernetesContainerState;
}

export interface KubernetesContainer {
	args: string[];
	command: string[];
	env: Array<{ name: string; value?: string; valueFrom?: object }>;
	envFrom: object;
	image: string;
	imagePullPolicy: string;
	name: string;
	ports: Array<{
		containerPort: number;
		hostIP?: string;
		hostPort?: number;
		name?: string;
		protocol: string;
	}>;
	resources: {
		limits: { [type: string]: string };
		requests: { [type: string]: string };
	};
}

export interface KubernetesPod extends KubernetesObject {
	metadata: KubernetesObject['metadata'] & {
		annotations?: { [key: string]: string };
		labels: { [key: string]: string };
		uid: string;
		resourceVersion: string;
		ownerReferences: Array<{
			apiVersion: string;
			blockOwnerDeletion: boolean;
			controller: boolean;
			kind: string;
			name: string;
			uid: string;
		}>;
	};
	spec: {
		containers: KubernetesContainer[];
	};
	status: {
		conditions: KubernetesPodCondition[];
		containerStatuses: KubernetesContainerStatus[];
		hostIP: string;
		podIP: string;
		phase: string;
		reason: string;
	};
}

export type ContainerStatusWithPod = KubernetesContainerStatus & {
	pod: KubernetesPod;
};

export interface KubernetesPodMetrics extends KubernetesObject {
	timestamp: string;
	window: string;
	containers: Array<{
		name: string;
		usage: { [type: string]: string };
	}>;
}

export interface Monitor extends EventEmitter {} // tslint:disable-line

export type MonitorFactory = () => Monitor;

export interface NotifyMessage {
	_key: string;
	channel?: string;
	text?: string;
	fallback?: string;
	color?: string;
	pretext?: string;
	author?: {
		author_name: string;
		author_link?: string;
		author_icon?: string;
	};
	title?: string;
	title_link?: string;
	fields?: Array<{
		title: string;
		value: string;
		short?: boolean;
	}>;
	image_url?: string;
	thumb_url?: string;
	footer?: string;
	footer_icon?: string;
	ts?: number;
	actions?: Array<{
		type: string;
		text: string;
		url: string;
		style?: string;
	}>;
}

export interface Notifier {
	new(): Notifier
	notify(message: NotifyMessage): Promise<any>;
}
