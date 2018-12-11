import * as bunyan from 'bunyan';

export default bunyan.createLogger({
	name: 'kube-slack',
	serializers: bunyan.stdSerializers,
});
