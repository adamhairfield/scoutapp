// React Native compatible AI Image Service
class AIImageService {
  constructor() {
    // Using Google's nano-banana model for better image generation
    this.model = "google/nano-banana";
    this.apiToken = process.env.REPLICATE_API_TOKEN || ''; // Set in .env file
    this.baseUrl = 'https://api.replicate.com/v1';
  }

  /**
   * Generate smart prompts based on group/team information
   */
  generatePrompt(groupName, sport, groupType, style = 'dynamic', customPrompt = '') {
    const isTeam = groupType === 'team';
    
    // If custom prompt is provided, use it as the primary prompt
    if (customPrompt && customPrompt.trim()) {
      return customPrompt;
    }

    const sportContext = sport ? `${sport} ` : '';
    const typeContext = isTeam ? 'team' : 'group';
    
    const stylePrompts = {
      dynamic: `Dynamic action shot of a ${sportContext}${typeContext}, professional sports photography, vibrant colors, motion blur, stadium atmosphere, dramatic lighting, high energy`,
      artistic: `Artistic illustration of a ${sportContext}${typeContext}, modern design, bold colors, abstract elements, creative composition, professional graphic design`,
      minimal: `Minimalist ${sportContext}${typeContext} design, clean lines, simple shapes, modern aesthetic, professional branding`,
      classic: `Classic ${sportContext}${typeContext} portrait, traditional photography, timeless composition, professional lighting, elegant style`,
    };

    return stylePrompts[style] || stylePrompts.dynamic;
  }

  /**
   * Generate an image using Replicate API
   */
  async generateImage(prompt, aspectRatio = '16:9') {
    try {
      if (!this.apiToken) {
        throw new Error('REPLICATE_API_TOKEN not set in environment variables');
      }

      const response = await fetch(`${this.baseUrl}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: "f0a9d34b12ad1c1cd76269a844b218ff4e64e128ddaba93e15891f47368958a0",
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
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const prediction = await response.json();
      
      // Poll for completion
      return await this.pollForCompletion(prediction.id);
    } catch (error) {
      console.error('Error generating image:', error);
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
          'Authorization': `Token ${this.apiToken}`,
        },
      });

      const prediction = await response.json();
      
      if (prediction.status === 'succeeded') {
        return prediction.output[0];
      } else if (prediction.status === 'failed') {
        throw new Error('Image generation failed');
      }
    }
    
    throw new Error('Image generation timed out');
  }

  /**
   * Generate a cover image for a group
   */
  async generateGroupCover(groupName, sport, groupType, style = 'dynamic', customPrompt = '') {
    const prompt = this.generatePrompt(groupName, sport, groupType, style, customPrompt);
    return await this.generateImage(prompt, '16:9');
  }

  /**
   * Generate multiple variations
   */
  async generateVariations(groupName, sport, groupType, count = 3) {
    const styles = ['dynamic', 'artistic', 'minimal', 'classic'];
    const promises = [];
    
    for (let i = 0; i < Math.min(count, styles.length); i++) {
      promises.push(this.generateGroupCover(groupName, sport, groupType, styles[i]));
    }
    
    return await Promise.all(promises);
  }
}

export default new AIImageService();
