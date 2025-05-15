const winston = require('winston');
const { Loggly } = require('winston-loggly-bulk');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' }),
    new Loggly({
      token: process.env.LOGGLY_TOKEN,
      subdomain: process.env.LOGGLY_SUBDOMAIN,
      tags: ["NodeJS"],
      json: true
    })
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