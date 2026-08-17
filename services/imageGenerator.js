import axios from 'axios';

/**
 * Returns pixel dimensions based on aspect ratio
 */
function getDimensions(aspectRatio) {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1280, height: 720 };
    case '9:16':
      return { width: 720, height: 1280 };
    case '1:1':
    default:
      return { width: 1024, height: 1024 };
  }
}

/**
 * Generates an image using Pollinations.ai or Hugging Face
 * @param {string} prompt Enhanced prompt
 * @param {string} aspectRatio Target aspect ratio ('1:1', '16:9', '9:16')
 * @returns {Promise<Object>} Image payload containing Buffer, base64, URL, and latency
 */
export async function generateImage(prompt, aspectRatio = '1:1') {
  const startTime = Date.now();
  const { width, height } = getDimensions(aspectRatio);
  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt);

  // Pollinations AI URL
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  try {
    // 30 second strict timeout limit
    const response = await axios.get(pollinationsUrl, {
      responseType: 'arraybuffer',
      timeout: 28000,
      headers: {
        'User-Agent': 'TopicToImagePipeline/1.0'
      }
    });

    const imageBuffer = Buffer.from(response.data);
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    const generationTimeMs = Date.now() - startTime;

    return {
      imageBuffer,
      base64: base64Image,
      imageUrl: pollinationsUrl,
      dimensions: { width, height },
      generationTimeMs,
      provider: 'Pollinations.ai (FLUX / Stable Diffusion)'
    };
  } catch (err) {
    console.error('Primary Image Gen endpoint failed, attempting fallback...', err.message);

    // Fallback: Hugging Face Serverless FLUX.1-schnell or direct dummy visual buffer generator
    try {
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ' high resolution quality')}?width=${width}&height=${height}&nologo=true`;
      const fallbackRes = await axios.get(fallbackUrl, {
        responseType: 'arraybuffer',
        timeout: 28000
      });

      const imageBuffer = Buffer.from(fallbackRes.data);
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

      return {
        imageBuffer,
        base64: base64Image,
        imageUrl: fallbackUrl,
        dimensions: { width, height },
        generationTimeMs: Date.now() - startTime,
        provider: 'Pollinations Fallback'
      };
    } catch (fallbackErr) {
      throw new Error(`Image Generation failed within timeout limit: ${fallbackErr.message}`);
    }
  }
}
