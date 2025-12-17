// Netlify serverless function for image generation
// This keeps your API key secret on the server side

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const { prompt } = JSON.parse(event.body || '{}')

  if (!prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Prompt is required' }),
    }
  }

  // Set in Netlify dashboard under Site Settings > Environment Variables
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

  if (!REPLICATE_API_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API token not configured' }),
    }
  }

  try {
    // Your trained Meep model - just the version hash for /v1/predictions endpoint
    const VERSION = process.env.REPLICATE_MODEL_VERSION || 'c4275584556c9d301f9f389e720bff117a3013dbf7b73f565c6f7f4a1e4ccffa'

    // Create the prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: VERSION,
        input: {
          // Match caption format exactly
          prompt: `MEEP, pink and white cartoon character, ${prompt}`,
          num_outputs: 1,
          num_inference_steps: 35,
          guidance_scale: 3.5,
          lora_scale: 2.0,               // Higher for stronger character features
          go_fast: false,                // Better quality, slower
          output_format: 'webp',
          output_quality: 95,
        },
      }),
    })

    const prediction = await response.json()
    
    if (!response.ok) {
      console.error('Replicate API error:', prediction)
      throw new Error(`Failed to create prediction: ${JSON.stringify(prediction)}`)
    }

    // Poll for the result (Replicate is async)
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          },
        }
      )

      result = await pollResponse.json()
    }

    if (result.status === 'failed') {
      throw new Error('Image generation failed')
    }

    // Return the generated image URL
    return {
      statusCode: 200,
      body: JSON.stringify({ imageUrl: result.output[0] }),
    }

  } catch (error) {
    console.error('Generation error:', error.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to generate image' }),
    }
  }
}

