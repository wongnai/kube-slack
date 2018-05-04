const bunyan = require('bunyan');

module.exports = bunyan.createLogger({
	name: 'kube-slack',
	serializers: bunyan.stdSerializers,
});
