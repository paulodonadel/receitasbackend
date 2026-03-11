const webpush = require('web-push');
const User = require('./models/user.model');

let isConfigured = false;

const configureWebPush = () => {
  if (isConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:suporte@clinipampa.com';

  if (!publicKey || !privateKey) {
    console.warn('Web Push desabilitado: VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY ausentes.');
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
  return true;
};

const sanitizeSubscription = (subscription) => {
  if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    }
  };
};

exports.isWebPushEnabled = () => configureWebPush();

exports.subscribeUser = async (userId, subscription) => {
  const safeSubscription = sanitizeSubscription(subscription);
  if (!safeSubscription) {
    throw new Error('Subscription inválida');
  }

  await User.updateOne(
    { _id: userId, 'webPushSubscriptions.endpoint': { $ne: safeSubscription.endpoint } },
    {
      $push: {
        webPushSubscriptions: {
          ...safeSubscription,
          createdAt: new Date()
        }
      }
    }
  );

  return safeSubscription;
};

exports.unsubscribeUser = async (userId, endpoint) => {
  if (!endpoint) {
    throw new Error('Endpoint é obrigatório para remover subscription');
  }

  await User.updateOne(
    { _id: userId },
    {
      $pull: {
        webPushSubscriptions: { endpoint }
      }
    }
  );
};

exports.sendToUser = async (userId, payload) => {
  if (!configureWebPush()) {
    return { sent: 0, removed: 0, skipped: true };
  }

  const user = await User.findById(userId).select('webPushSubscriptions');
  if (!user?.webPushSubscriptions?.length) {
    return { sent: 0, removed: 0, skipped: true };
  }

  const data = JSON.stringify(payload || {});
  let sent = 0;
  const invalidEndpoints = [];

  for (const subscription of user.webPushSubscriptions) {
    try {
      await webpush.sendNotification(subscription, data);
      sent += 1;
    } catch (error) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        invalidEndpoints.push(subscription.endpoint);
      } else {
        console.error('Erro ao enviar Web Push:', error.message);
      }
    }
  }

  if (invalidEndpoints.length > 0) {
    await User.updateOne(
      { _id: userId },
      {
        $pull: {
          webPushSubscriptions: { endpoint: { $in: invalidEndpoints } }
        }
      }
    );
  }

  return {
    sent,
    removed: invalidEndpoints.length,
    skipped: false
  };
};
