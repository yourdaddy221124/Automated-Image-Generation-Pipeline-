import { optimizePrompt } from './services/promptOptimizer.js';
import { generateImage } from './services/imageGenerator.js';
import { validateRecipient, dispatchAsset } from './services/deliveryEngine.js';

async function runPipelineTests() {
  console.log('=======================================================');
  console.log('🧪 Running Suite of Automated Pipeline Tests');
  console.log('=======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS]: ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL]: ${message}`);
      failed++;
    }
  }

  // Test 1: Input Recipient Validation
  console.log('--- Test 1: Input Validation & Sanitization ---');
  try {
    const validEmail = validateRecipient('email', 'test@example.com');
    assert(validEmail === 'test@example.com', 'Valid email recipient parsed successfully');

    const validChatId = validateRecipient('telegram', '123456789');
    assert(validChatId === '123456789', 'Numeric Telegram chat ID parsed successfully');

    const validUsername = validateRecipient('telegram', '@my_channel');
    assert(validUsername === '@my_channel', 'Telegram username starting with @ parsed successfully');
  } catch (err) {
    assert(false, `Unexpected validation failure: ${err.message}`);
  }

  try {
    validateRecipient('email', 'invalid-email-string');
    assert(false, 'Should have rejected invalid email syntax');
  } catch (err) {
    assert(true, 'Successfully rejected invalid email syntax');
  }

  // Test 2: Prompt Optimization Engine
  console.log('\n--- Test 2: Prompt Enhancement Engine ---');
  try {
    const topic = 'Cyberpunk cafe in neon Tokyo during rain';
    const optRes = await optimizePrompt(topic, 'Cinematic', '16:9');
    assert(optRes.rawTopic === topic, 'Raw topic preserved');
    assert(optRes.expandedPrompt.includes('Cinematic') || optRes.expandedPrompt.includes('cinematic'), 'Expanded prompt includes style parameters');
    assert(optRes.aspectRatio === '16:9', 'Aspect ratio preserved');
    assert(typeof optRes.negativePrompt === 'string', 'Negative prompt guardrail present');
  } catch (err) {
    assert(false, `Prompt optimization error: ${err.message}`);
  }

  // Test 3: Safety Guardrails Filter
  console.log('\n--- Test 3: Content Safety & Guardrails ---');
  try {
    await optimizePrompt('explicit nsfw topic', 'Photorealistic', '1:1');
    assert(false, 'Should have rejected disallowed keyword');
  } catch (err) {
    assert(err.message.includes('safety filters'), 'Successfully blocked content violating safety filters');
  }

  // Test 4: Image Synthesis Engine
  console.log('\n--- Test 4: AI Image Generation Engine (30s timeout limit) ---');
  try {
    const prompt = 'Ultra-realistic photograph of a serene Japanese garden at dawn, 8k resolution';
    const imgData = await generateImage(prompt, '1:1');
    assert(Buffer.isBuffer(imgData.imageBuffer), 'Image buffer returned');
    assert(imgData.imageBuffer.length > 1000, `Buffer received valid binary data (${imgData.imageBuffer.length} bytes)`);
    assert(imgData.base64.startsWith('data:image/png;base64,'), 'Base64 data URL generated');
    assert(imgData.dimensions.width === 1024 && imgData.dimensions.height === 1024, 'Dimensions 1024x1024 verified for 1:1');
    assert(imgData.generationTimeMs < 30000, `Generation completed within timeout (${(imgData.generationTimeMs / 1000).toFixed(2)}s)`);
  } catch (err) {
    assert(false, `Image generation error: ${err.message}`);
  }

  // Test 5: Delivery Subsystems (Simulated Sandbox Dispatch)
  console.log('\n--- Test 5: Dual Dispatch Subsystems (Email & Telegram) ---');
  try {
    const mockPrompt = { rawTopic: 'Test Topic', stylePreset: 'Cinematic', aspectRatio: '16:9' };
    const mockImage = {
      imageBuffer: Buffer.from('fake-image-bytes'),
      base64: 'data:image/png;base64,ZmFrZQ==',
      imageUrl: 'https://example.com/image.png',
      dimensions: { width: 1280, height: 720 },
      generationTimeMs: 1500
    };

    const emailDispatch = await dispatchAsset('email', 'test@example.com', mockPrompt, mockImage);
    assert(emailDispatch.channel === 'email', 'Email dispatch channel confirmed');
    assert(emailDispatch.status === 'simulated_success' || emailDispatch.status === 'delivered', 'Email dispatch completed');

    const telegramDispatch = await dispatchAsset('telegram', '123456789', mockPrompt, mockImage);
    assert(telegramDispatch.channel === 'telegram', 'Telegram dispatch channel confirmed');
    assert(telegramDispatch.status === 'simulated_success' || telegramDispatch.status === 'delivered', 'Telegram dispatch completed');
  } catch (err) {
    assert(false, `Delivery dispatch error: ${err.message}`);
  }

  console.log('\n=======================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPipelineTests();
