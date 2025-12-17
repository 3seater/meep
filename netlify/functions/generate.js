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
    // Your trained Meep model
    const MODEL_VERSION = process.env.REPLICATE_MODEL_VERSION || '3seater/meep:b0104cf3d9662362279490abd5c8d0ea43ad3523ea5de483f523ad24c7135751'

    // Create the prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          // The prompt template - always includes your trained trigger word MEEP
          prompt: `MEEP ${prompt}`,
          num_outputs: 1,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          output_format: 'png',
        },
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create prediction')
    }

    const prediction = await response.json()

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
    console.error('Generation error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate image' }),
    }
  }
}

