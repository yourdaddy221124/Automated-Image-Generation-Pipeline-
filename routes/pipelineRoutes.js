import express from 'express';
import { optimizePrompt } from '../services/promptOptimizer.js';
import { generateImage } from '../services/imageGenerator.js';
import { dispatchAsset, validateRecipient, dispatchFallbackNotification } from '../services/deliveryEngine.js';

const router = express.Router();

// In-memory execution telemetry log store (capped at 50 entries)
const executionHistory = [];

function recordLog(logEntry) {
  executionHistory.unshift(logEntry);
  if (executionHistory.length > 50) {
    executionHistory.pop();
  }
}

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Topic-to-Image Generation & Dispatch Pipeline',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/history
 */
router.get('/history', (req, res) => {
  res.json({
    count: executionHistory.length,
    history: executionHistory
  });
});

/**
 * POST /api/optimize-prompt
 * Standalone prompt refinement endpoint
 */
router.post('/optimize-prompt', async (req, res) => {
  try {
    const { topic, style_preset = 'Photorealistic', aspect_ratio = '1:1' } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Field "topic" is required.' });
    }

    const result = await optimizePrompt(topic, style_preset, aspect_ratio);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/generate-image
 * Standalone image generation endpoint
 */
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, aspect_ratio = '1:1' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Field "prompt" is required.' });
    }

    const imageResult = await generateImage(prompt, aspect_ratio);
    // Don't send heavy raw Buffer in JSON, send base64 data URL
    const { imageBuffer, ...responsePayload } = imageResult;
    res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dispatch
 * Standalone dispatch endpoint
 */
router.post('/dispatch', async (req, res) => {
  try {
    const { channel, recipient, promptData, imageData } = req.body;
    if (!channel || !recipient || !promptData || !imageData) {
      return res.status(400).json({ error: 'Missing required payload parameters: channel, recipient, promptData, imageData.' });
    }

    const dispatchResult = await dispatchAsset(channel, recipient, promptData, imageData);
    res.json(dispatchResult);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/generate-and-dispatch
 * Primary end-to-end webhook/pipeline trigger endpoint
 */
router.post('/generate-and-dispatch', async (req, res) => {
  const startTime = Date.now();
  const { topic, style_preset = 'Photorealistic', aspect_ratio = '1:1', delivery } = req.body;

  // Input Validation
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'Field "topic" is required and must be a non-empty string.'
    });
  }

  if (!delivery || !delivery.channel || !delivery.recipient) {
    return res.status(400).json({
      error: 'Invalid input',
      details: 'Object "delivery" with "channel" (email|telegram) and "recipient" is required.'
    });
  }

  const { channel, recipient } = delivery;

  // Validate recipient syntax early
  try {
    validateRecipient(channel, recipient);
  } catch (valErr) {
    return res.status(400).json({
      error: 'Validation Error',
      details: valErr.message
    });
  }

  const logId = `exec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  try {
    // Step 1: Prompt Refinement
    console.log(`[Pipeline] (${logId}) Optimizing prompt for topic: "${topic}"...`);
    const promptData = await optimizePrompt(topic, style_preset, aspect_ratio);

    // Step 2: Image Generation
    console.log(`[Pipeline] (${logId}) Generating visual asset with provider: ${promptData.engine}...`);
    const imageData = await generateImage(promptData.expandedPrompt, aspect_ratio);

    // Step 3: Dual Dispatch Subsystem
    console.log(`[Pipeline] (${logId}) Dispatching visual asset to ${channel}: ${recipient}...`);
    const dispatchResult = await dispatchAsset(channel, recipient, promptData, imageData);

    const totalTimeMs = Date.now() - startTime;

    const logEntry = {
      id: logId,
      timestamp: new Date().toISOString(),
      topic,
      stylePreset: style_preset,
      aspectRatio: aspect_ratio,
      channel,
      recipient,
      promptData,
      imageDimensions: imageData.dimensions,
      imageProvider: imageData.provider,
      generationTimeMs: imageData.generationTimeMs,
      totalExecutionTimeMs: totalTimeMs,
      dispatchResult,
      status: 'SUCCESS'
    };

    recordLog(logEntry);

    return res.json({
      success: true,
      message: `Visual asset successfully generated and dispatched to ${channel}.`,
      telemetry: {
        executionId: logId,
        totalTimeMs,
        generationTimeMs: imageData.generationTimeMs,
        imageDimensions: imageData.dimensions,
        provider: imageData.provider
      },
      data: {
        prompt: promptData,
        imagePreviewUrl: imageData.imageUrl,
        base64Preview: imageData.base64,
        delivery: dispatchResult
      }
    });

  } catch (err) {
    console.error(`[Pipeline Error] (${logId}):`, err.message);

    // Attempt fallback notification dispatch if possible
    await dispatchFallbackNotification(channel, recipient, err.message);

    const errorLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      topic,
      channel,
      recipient,
      error: err.message,
      status: 'FAILED'
    };
    recordLog(errorLog);

    return res.status(500).json({
      success: false,
      error: 'Pipeline Execution Error',
      message: err.message,
      executionId: logId
    });
  }
});

export default router;
