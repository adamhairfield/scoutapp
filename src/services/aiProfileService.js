// AI Profile Image Service - Background removal and AI background generation
class AIProfileService {
  constructor() {
    this.replicateToken = process.env.REPLICATE_API_TOKEN || ''; // Set in .env file
    this.baseUrl = 'https://api.replicate.com/v1';
    
    // Background removal model
    this.backgroundRemovalModel = "851-labs/background-remover";
    this.backgroundRemovalVersion = "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";
    
    // Background generation model (nano-banana)
    this.backgroundGenModel = "google/nano-banana";
    this.backgroundGenVersion = "f0a9d34b12ad1c1cd76269a844b218ff4e64e128ddaba93e15891f47368958a0";
    
    // Image upscaling model - Google upscaler
    this.upscaleModel = "google/maxim";
    this.upscaleVersion = "5a42d0e5e5e8e3e5e5e5e5e5e5e5e5e5e5e5e5e5";
  }

  /**
   * Remove background from an image
   */
  async removeBackground(imageUrl) {
    try {
      if (!this.replicateToken) {
        throw new Error('REPLICATE_API_TOKEN not set in environment variables');
      }

      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: this.backgroundRemovalVersion,
          input: {
            image: imageUrl,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Background removal failed: ${response.status}`);
      }

      const prediction = await response.json();
      return await this.pollForCompletion(prediction.id);
    } catch (error) {
      console.error('Error removing background:', error);
      throw error;
    }
  }

  /**
   * Generate AI background based on sport/theme
   */
  async generateBackground(sport, theme = 'action', aspectRatio = '1:1') {
    try {
      const prompt = this.generateBackgroundPrompt(sport, theme);
      
      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: this.backgroundGenVersion,
          input: {
            prompt: prompt,
            aspect_ratio: aspectRatio,
            num_outputs: 1,
            output_format: "jpg",
            output_quality: 90,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Background generation failed: ${response.status}`);
      }

      const prediction = await response.json();
      return await this.pollForCompletion(prediction.id);
    } catch (error) {
      console.error('Error generating background:', error);
      throw error;
    }
  }

  /**
   * Generate background prompt based on sport and theme
   */
  generateBackgroundPrompt(sport, theme) {
    const themePrompts = {
      action: `Dynamic ${sport} stadium background, action-packed atmosphere, vibrant colors, professional sports photography, blurred motion, high energy`,
      minimal: `Minimalist ${sport} background, clean design, simple geometric shapes, modern aesthetic, professional look`,
      gradient: `Abstract ${sport} themed gradient background, smooth color transitions, modern design, professional branding`,
      classic: `Classic ${sport} field background, traditional photography, professional lighting, timeless composition`,
    };

    return themePrompts[theme] || themePrompts.action;
  }

  /**
   * Composite person cutout onto AI background
   */
  async compositeImage(personImageUrl, backgroundImageUrl) {
    // This would require a compositing model or manual implementation
    // For now, return the person image with background removed
    return personImageUrl;
  }

  /**
   * Complete profile picture generation pipeline
   */
  async generateProfilePicture(originalImageUrl, sport, theme = 'action') {
    try {
      // Step 1: Remove background
      console.log('Removing background...');
      const noBgImage = await this.removeBackground(originalImageUrl);
      
      // Step 2: Generate AI background
      console.log('Generating AI background...');
      const aiBackground = await this.generateBackground(sport, theme);
      
      // Step 3: Composite (simplified - just return no-bg image for now)
      // In a full implementation, you'd composite these together
      console.log('Profile picture generated successfully');
      
      return {
        noBgImage,
        aiBackground,
        finalImage: noBgImage, // Would be composite in full implementation
      };
    } catch (error) {
      console.error('Error in profile picture pipeline:', error);
      throw error;
    }
  }

  /**
   * Poll for prediction completion
   */
  async pollForCompletion(predictionId, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${this.replicateToken}`,
        },
      });

      const prediction = await response.json();
      
      if (prediction.status === 'succeeded') {
        return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      } else if (prediction.status === 'failed') {
        throw new Error('Prediction failed');
      }
    }
    
    throw new Error('Prediction timed out');
  }

  /**
   * Generate multiple background variations
   */
  async generateBackgroundVariations(sport, count = 3) {
    const themes = ['action', 'minimal', 'gradient', 'classic'];
    const promises = [];
    
    for (let i = 0; i < Math.min(count, themes.length); i++) {
      promises.push(this.generateBackground(sport, themes[i]));
    }
    
    return await Promise.all(promises);
  }
}

export default new AIProfileService();
