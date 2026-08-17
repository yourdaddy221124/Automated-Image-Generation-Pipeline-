import nodemailer from 'nodemailer';
import axios from 'axios';
import FormData from 'form-data';

/**
 * Validate recipient based on channel type
 */
export function validateRecipient(channel, recipient) {
  if (!recipient || typeof recipient !== 'string') {
    throw new Error('Recipient must be a non-empty string.');
  }

  const trimmed = recipient.trim();

  if (channel === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error(`Invalid email address format: "${recipient}"`);
    }
  } else if (channel === 'telegram') {
    // Telegram Chat ID (numeric like 123456789 or -10012345) or Username starting with @
    const isNumeric = /^-?\d+$/.test(trimmed);
    const isUsername = /^@[a-zA-Z0-9_]{5,32}$/.test(trimmed);
    if (!isNumeric && !isUsername) {
      throw new Error(`Invalid Telegram Chat ID or Username format: "${recipient}". Must be numeric (e.g. 123456789) or start with @ (e.g. @my_channel).`);
    }
  } else {
    throw new Error(`Unsupported delivery channel: "${channel}". Supported options are "email" or "telegram".`);
  }

  return trimmed;
}

/**
 * Executes a function with exponential backoff retries (up to maxAttempts)
 */
async function retryWithBackoff(fn, maxAttempts = 3, initialDelayMs = 1000) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      attempt++;
      return await fn();
    } catch (err) {
      if (attempt >= maxAttempts) {
        throw new Error(`Failed after ${maxAttempts} attempts. Last error: ${err.message}`);
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Delivery Engine] Retry attempt ${attempt}/${maxAttempts} after ${delay}ms error:`, err.message);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Dispatches HTML email with embedded image preview and PNG attachment
 */
async function sendEmailDelivery(recipient, promptData, imageData) {
  const { rawTopic, stylePreset, aspectRatio } = promptData;
  const { imageBuffer, base64, dimensions, generationTimeMs } = imageData;

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
      .card { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; color: #ffffff; letter-spacing: 0.5px; }
      .content { padding: 24px; }
      .image-preview { width: 100%; border-radius: 12px; margin-top: 16px; border: 1px solid #475569; display: block; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; font-size: 14px; }
      .meta-item { background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155; }
      .meta-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      .meta-value { color: #38bdf8; font-weight: 600; margin-top: 4px; }
      .footer { text-align: center; padding: 16px; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>🎨 Visual Asset Generated</h1>
      </div>
      <div class="content">
        <p style="font-size: 16px; margin-top: 0;">Here is your requested high-resolution AI image!</p>
        <img class="image-preview" src="cid:generated_image" alt="${rawTopic}" />
        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Topic</div>
            <div class="meta-value">${rawTopic}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Style Preset</div>
            <div class="meta-value">${stylePreset}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Dimensions</div>
            <div class="meta-value">${dimensions.width}x${dimensions.height} (${aspectRatio})</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Generation Latency</div>
            <div class="meta-value">${(generationTimeMs / 1000).toFixed(2)}s</div>
          </div>
        </div>
      </div>
      <div class="footer">
        Automated Topic-to-Image Generation & Dispatch Pipeline • Powered by AI
      </div>
    </div>
  </body>
  </html>
  `;

  // Simulated mode if no real credentials configured
  if (!smtpUser || !smtpPass) {
    return {
      status: 'simulated_success',
      channel: 'email',
      recipient,
      message: 'SMTP credentials not configured. Executed in Simulated Sandbox Mode.',
      details: {
        subject: `🎨 Generated Asset: ${rawTopic}`,
        previewHtml: htmlBody,
        attachmentName: `asset_${Date.now()}.png`
      }
    };
  }

  // Real SMTP Dispatch via Nodemailer
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: smtpUser, pass: smtpPass }
  });

  const mailOptions = {
    from: process.env.SENDER_EMAIL || smtpUser,
    to: recipient,
    subject: `🎨 Visual Asset: ${rawTopic}`,
    html: htmlBody,
    attachments: [
      {
        filename: `asset_${Date.now()}.png`,
        content: imageBuffer,
        cid: 'generated_image'
      }
    ]
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    status: 'delivered',
    channel: 'email',
    recipient,
    messageId: info.messageId,
    details: info
  };
}

/**
 * Dispatches Photo preview and Document via Telegram Bot API
 */
async function sendTelegramDelivery(recipient, promptData, imageData) {
  const { rawTopic, stylePreset, aspectRatio } = promptData;
  const { imageBuffer, imageUrl, dimensions, generationTimeMs } = imageData;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const caption = `🎨 *Generated Visual Asset*\n\n` +
    `*Topic:* ${rawTopic}\n` +
    `*Style Preset:* ${stylePreset}\n` +
    `*Aspect Ratio:* ${aspectRatio} (${dimensions.width}x${dimensions.height})\n` +
    `*Latency:* ${(generationTimeMs / 1000).toFixed(2)}s\n\n` +
    `_Delivered via Topic-to-Image Automation Pipeline_`;

  // Simulated Sandbox Mode if bot token is omitted
  if (!botToken) {
    return {
      status: 'simulated_success',
      channel: 'telegram',
      recipient,
      message: 'Telegram Bot Token not configured. Executed in Simulated Sandbox Mode.',
      details: {
        chat_id: recipient,
        caption,
        photo_url: imageUrl,
        parse_mode: 'Markdown'
      }
    };
  }

  // Real Telegram Bot API Dispatch using multipart form-data
  const sendPhotoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  const form = new FormData();
  form.append('chat_id', recipient);
  form.append('photo', imageBuffer, { filename: `photo_${Date.now()}.png`, contentType: 'image/png' });
  form.append('caption', caption);
  form.append('parse_mode', 'Markdown');

  const photoRes = await axios.post(sendPhotoUrl, form, {
    headers: form.getHeaders(),
    timeout: 15000
  });

  // Send uncompressed document as high-resolution attachment
  try {
    const sendDocUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;
    const docForm = new FormData();
    docForm.append('chat_id', recipient);
    docForm.append('document', imageBuffer, { filename: `asset_${Date.now()}.png`, contentType: 'image/png' });
    docForm.append('caption', `📁 *High-Resolution Uncompressed Download*`);
    docForm.append('parse_mode', 'Markdown');

    await axios.post(sendDocUrl, docForm, {
      headers: docForm.getHeaders(),
      timeout: 15000
    });
  } catch (docErr) {
    console.warn('Telegram uncompressed document send failed (photo preview succeeded):', docErr.message);
  }

  return {
    status: 'delivered',
    channel: 'telegram',
    recipient,
    messageId: photoRes.data?.result?.message_id,
    details: photoRes.data
  };
}

/**
 * Public Dispatch Manager handling channel selection and exponential backoff retry
 */
export async function dispatchAsset(channel, recipient, promptData, imageData) {
  const cleanRecipient = validateRecipient(channel, recipient);

  return await retryWithBackoff(async () => {
    if (channel === 'email') {
      return await sendEmailDelivery(cleanRecipient, promptData, imageData);
    } else if (channel === 'telegram') {
      return await sendTelegramDelivery(cleanRecipient, promptData, imageData);
    }
  }, 3, 1000);
}

/**
 * Fallback notification dispatcher when pipeline generation fails
 */
export async function dispatchFallbackNotification(channel, recipient, errorReason) {
  const cleanRecipient = validateRecipient(channel, recipient);
  const fallbackMessage = `⚠️ *Pipeline Generation Notice*\n\nYour image request could not be completed.\n*Reason:* ${errorReason}\n\nPlease try again with a different prompt or parameters.`;

  try {
    if (channel === 'telegram' && process.env.TELEGRAM_BOT_TOKEN) {
      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: cleanRecipient,
        text: fallbackMessage,
        parse_mode: 'Markdown'
      });
    }
  } catch (err) {
    console.error('Failed to dispatch fallback notification:', err.message);
  }
}
