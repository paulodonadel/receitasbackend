const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.Console()
  ]
});

module.exports = {
  logSecurityEvent: (eventType, details) => {
    logger.log('info', {
      message: `Security Event: ${eventType}`,
      type: eventType,
      ...details
    });
  }
};