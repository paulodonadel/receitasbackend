const axios = require('axios');
const WhatsappSession = require('../models/whatsappSession.model');

/**
 * Normalizes a phone number to E.164 format with Brazilian prefix (55).
 * Strips all non-digit characters, adds '55' prefix if not present.
 * @param {string} phone
 * @returns {string} E.164 phone like "5553999999999"
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return '55' + digits;
};

/**
 * Sends a plain text message via WhatsApp Cloud API.
 * @param {string} to - Phone number (will be normalized)
 * @param {string} text - Message text
 */
const sendText = async (to, text) => {
  try {
    const phone = normalizePhone(to);
    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('[WhatsApp] sendText error:', err?.response?.data || err.message);
  }
};

/**
 * Sends an interactive list message.
 * @param {string} to
 * @param {string} headerText
 * @param {string} bodyText
 * @param {string} footerText
 * @param {string} buttonLabel
 * @param {Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>} sections
 */
const sendInteractiveList = async (to, headerText, bodyText, footerText, buttonLabel, sections) => {
  try {
    const phone = normalizePhone(to);
    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: headerText },
          body: { text: bodyText },
          footer: { text: footerText },
          action: {
            button: buttonLabel,
            sections
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('[WhatsApp] sendInteractiveList error:', err?.response?.data || err.message);
  }
};

/**
 * Sends an interactive buttons message (up to 3 buttons).
 * @param {string} to
 * @param {string} bodyText
 * @param {Array<{id: string, title: string}>} buttons
 */
const sendInteractiveButtons = async (to, bodyText, buttons) => {
  try {
    const phone = normalizePhone(to);
    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.slice(0, 3).map((btn) => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title }
            }))
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    console.error('[WhatsApp] sendInteractiveButtons error:', err?.response?.data || err.message);
  }
};

/**
 * Checks whether the 24-hour WhatsApp messaging window is active for a phone number.
 * @param {string} phone
 * @returns {Promise<boolean>}
 */
const isWindowActive = async (phone) => {
  try {
    const normalized = normalizePhone(phone);
    const session = await WhatsappSession.findOne({ phone: normalized }).lean();
    if (!session || !session.windowExpiresAt) return false;
    return new Date(session.windowExpiresAt) > new Date();
  } catch (err) {
    console.error('[WhatsApp] isWindowActive error:', err.message);
    return false;
  }
};

/**
 * Returns window info for a phone number.
 * @param {string} phone
 * @returns {Promise<{active: boolean, expiresAt: Date|null, phone: string}>}
 */
const getWindowInfo = async (phone) => {
  try {
    const normalized = normalizePhone(phone);
    const session = await WhatsappSession.findOne({ phone: normalized }).lean();
    const now = new Date();
    const active = session && session.windowExpiresAt ? new Date(session.windowExpiresAt) > now : false;
    return {
      active,
      expiresAt: session?.windowExpiresAt || null,
      phone: normalized
    };
  } catch (err) {
    console.error('[WhatsApp] getWindowInfo error:', err.message);
    return { active: false, expiresAt: null, phone: normalizePhone(phone) };
  }
};

module.exports = {
  normalizePhone,
  sendText,
  sendInteractiveList,
  sendInteractiveButtons,
  isWindowActive,
  getWindowInfo
};
