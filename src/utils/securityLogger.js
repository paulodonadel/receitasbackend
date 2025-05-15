const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console()
  ]
});

exports.logSecurityEvent = (eventType, details) => {
  logger.log({
    level: 'info',
    message: `Security Event: ${eventType}`,
    type: eventType,
    timestamp: new Date(),
    ...details
  });
};