import { useState } from 'react'
import './MemeGenerator.css'

// Netlify function endpoint
const API_ENDPOINT = '/.netlify/functions/generate'

function MemeGenerator() {
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    setError(null)
    setGeneratedImage(null)

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate image')
      }

      const data = await response.json()
      setGeneratedImage(data.imageUrl)
    } catch (err) {
      setError('Failed to generate image. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleGenerate()
    }
  }

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a')
      link.href = generatedImage
      link.download = `meep-${Date.now()}.png`
      link.click()
    }
  }

  return (
    <div className="meme-generator">
      <div className="logo-section">
        <img src="/images/meep head.png" alt="Meep" className="meep-logo" />
        <h1 className="title">$MEEP</h1>
        <p className="subtitle">meme generator</p>
      </div>

      <div className="generator-container">
        <div className="input-wrapper">
          <span className="input-prefix">I want to see meep</span>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="riding a rollercoaster..."
            className="prompt-input"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="generate-button"
        >
          {isLoading ? (
            <span className="loading-text">
              <span className="spinner"></span>
              Generating...
            </span>
          ) : (
            'Generate'
          )}
        </button>
      </div>

      <div className="output-container">
        {isLoading && (
          <div className="loading-state">
            <div className="loading-animation">
              <img src="/images/meep head.png" alt="Loading" className="loading-meep" />
            </div>
            <p>Creating your meep...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>{error}</p>
          </div>
        )}

        {generatedImage && !isLoading && (
          <div className="result-container">
            <img
              src={generatedImage}
              alt="Generated Meep"
              className="generated-image"
            />
            <button onClick={handleDownload} className="download-button">
              Download
            </button>
          </div>
        )}

        {!generatedImage && !isLoading && !error && (
          <div className="placeholder-state">
            <p>Your generated meep will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default MemeGenerator

