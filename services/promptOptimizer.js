import axios from 'axios';

/**
 * Style Presets Map providing detailed artistic direction
 */
const STYLE_PROMPTS = {
  Photorealistic: {
    prefix: 'Ultra-realistic photograph of',
    suffix: 'hyperrealistic, 8k resolution, photorealistic details, dramatic lighting, shot on 35mm lens, f/1.8 aperture, professional color grading, studio quality, crisp focus',
    negative: 'cartoon, drawing, anime, low quality, 3d render, watermark, signature, noise, distortion'
  },
  Anime: {
    prefix: 'Vibrant anime illustration of',
    suffix: 'Makoto Shinkai style, crisp cell shading, luminous atmospheric lighting, masterpiece quality, detailed digital anime art, 4k resolution, beautiful composition',
    negative: 'photorealistic, low quality, 3d render, photo, noisy, ugly, pixelated, signature, text'
  },
  'Digital Art': {
    prefix: 'Concept digital art of',
    suffix: 'trending on ArtStation, dynamic composition, highly detailed digital painting, vibrant palette, Unreal Engine 5 render, epic scale, volumetric fog, dramatic shading',
    negative: 'blurry, photo, real life, low resolution, flat colors, watermark, text'
  },
  Minimalist: {
    prefix: 'Clean minimalist vector graphic of',
    suffix: 'simple geometric lines, elegant negative space, muted harmonious palette, modern aesthetic, high contrast, crisp vector artwork, flat design',
    negative: 'cluttered, noisy, realistic photo, complex textures, busy, distorted, text'
  },
  Cinematic: {
    prefix: 'Cinematic film still of',
    suffix: 'anamorphic lens flare, shallow depth of field, IMAX quality, cinematic atmosphere, movie lighting, volumetric light rays, highly detailed, dramatic mood',
    negative: 'amateur, low quality, snapshot, overexposed, watermark, text, grainy distortion'
  }
};

const DISALLOWED_KEYWORDS = [
  'nsfw', 'explicit', 'nude', 'gore', 'violence', 'blood', 'hate', 'racist'
];

/**
 * Filter input topic for disallowed keywords
 */
function sanitizeTopic(topic) {
  if (!topic || typeof topic !== 'string') {
    throw new Error('Invalid topic provided. Must be a non-empty string.');
  }

  const cleanTopic = topic.trim();
  const lower = cleanTopic.toLowerCase();

  for (const keyword of DISALLOWED_KEYWORDS) {
    if (lower.includes(keyword)) {
      throw new Error(`Topic contains content flagged by safety filters ("${keyword}").`);
    }
  }

  return cleanTopic;
}

/**
 * Optimizes user raw topic into detailed visual prompt using OpenRouter LLM, Gemini, or Rule Engine
 */
export async function optimizePrompt(topic, stylePreset = 'Photorealistic', aspectRatio = '1:1') {
  const sanitizedTopic = sanitizeTopic(topic);
  const styleConfig = STYLE_PROMPTS[stylePreset] || STYLE_PROMPTS.Photorealistic;

  // Aspect ratio composition hints
  let arHint = 'square 1:1 aspect ratio composition';
  if (aspectRatio === '16:9') arHint = 'wide panoramic 16:9 landscape aspect ratio composition';
  if (aspectRatio === '9:16') arHint = 'vertical portrait 9:16 mobile aspect ratio composition';

  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // Provider 1: OpenRouter LLM API Integration
  if (openrouterApiKey) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'google/gemini-2.5-flash',
          max_tokens: 350,
          messages: [
            {
              role: 'user',
              content: `You are an expert AI prompt engineer for image generation models (FLUX, Imagen 3, SDXL).
Expand this raw topic into a descriptive visual prompt.
Topic: "${sanitizedTopic}"
Style Preset: "${stylePreset}"
Aspect Ratio: "${aspectRatio}" (${arHint})

Instructions:
Output ONLY a valid JSON object with keys:
"expanded_prompt": (a 60-100 word descriptive visual prompt string incorporating style, lighting, composition)
"negative_prompt": (negative filter string)`
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'TopicToImagePipeline'
          },
          timeout: 7000
        }
      );

      const candidateText = response.data?.choices?.[0]?.message?.content;
      if (candidateText) {
        const cleanJsonText = candidateText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJsonText);
        return {
          rawTopic: sanitizedTopic,
          expandedPrompt: parsed.expanded_prompt,
          negativePrompt: parsed.negative_prompt || styleConfig.negative,
          stylePreset,
          aspectRatio,
          engine: 'OpenRouter AI (google/gemini-2.5-flash)'
        };
      }
    } catch (err) {
      console.warn('[Prompt Optimizer] OpenRouter API prompt expansion failed, falling back:', err.message);
    }
  }

  // Provider 2: Gemini Direct API Integration
  if (geminiApiKey) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `Expand topic "${sanitizedTopic}" with style "${stylePreset}" into JSON with keys expanded_prompt and negative_prompt.`
                }
              ]
            }
          ]
        },
        { timeout: 5000 }
      );

      const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        const cleanJsonText = candidateText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJsonText);
        return {
          rawTopic: sanitizedTopic,
          expandedPrompt: parsed.expanded_prompt,
          negativePrompt: parsed.negative_prompt || styleConfig.negative,
          stylePreset,
          aspectRatio,
          engine: 'Gemini 2.5 Flash API'
        };
      }
    } catch (err) {
      console.warn('[Prompt Optimizer] Gemini Direct API prompt expansion failed, using rule engine fallback:', err.message);
    }
  }

  // Provider 3: Built-in Rule Engine Fallback
  const expandedPrompt = `${styleConfig.prefix} ${sanitizedTopic}, ${arHint}, ${styleConfig.suffix}`;

  return {
    rawTopic: sanitizedTopic,
    expandedPrompt,
    negativePrompt: styleConfig.negative,
    stylePreset,
    aspectRatio,
    engine: 'Rule-based Prompt Engine'
  };
}
