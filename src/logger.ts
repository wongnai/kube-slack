import * as winston from 'winston';

export default winston.createLogger({
	transports: [new winston.transports.Console()],
	format: winston.format.cli(),
});
