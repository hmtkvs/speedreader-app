import axios from 'axios';
import { ErrorHandler } from './errorHandler';
import { RateLimiter } from './rateLimiter';
import { mockTranslations } from './translationMocks';

const errorHandler = ErrorHandler.getInstance();
const rateLimiter = RateLimiter.getInstance({
  maxRequests: 100,
  windowMs: 900000 // 15 minutes
});

interface Translation {
  text: string;
  example: string;
  language: string;
}

export class TranslationService {
  private static instance: TranslationService;
  private token: string;

  private constructor() {
    // Only require token in production
    this.token = import.meta.env.VITE_DEEPINFRA_TOKEN || '';
  }

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  async translate(word: string, targetLanguage: string = 'ES'): Promise<Translation | null> {
    try {
      // Check rate limit
      const canMakeRequest = await rateLimiter.tryRequest('translation');
      const useAPI = canMakeRequest && this.token;

      if (useAPI) {
        const prompt = `
        Translate the word "${word}" to ${targetLanguage} and provide an example sentence.
        Format the response exactly like this:
        translation: [translated word]
        example: [example sentence in target language]
      `;

        const response = await axios.post(
          'https://api.deepinfra.com/v1/openai/chat/completions',
          {
            model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
            messages: [
              {
                role: 'system',
                content: 'You are a professional translator. Provide accurate translations and natural example sentences.'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          {
            responseType: 'json',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            }
          }
        );

        const content = response.data.choices[0].message.content;
        const translationMatch = content.match(/translation: (.*)/);
        const exampleMatch = content.match(/example: (.*)/);

        if (translationMatch && exampleMatch) {
          return {
            text: translationMatch[1].trim(),
            example: exampleMatch[1].trim(),
            language: targetLanguage
          };
        }

        throw new Error('Invalid API response format');
      } else {
        // Use mock data
        const mockTranslation = mockTranslations[word.toLowerCase()];
        if (mockTranslation) {
          return {
            text: mockTranslation.text,
            example: mockTranslation.example,
            language: targetLanguage
          };
        }
        
        // If word not found in mocks, generate a simple mock translation
        return {
          text: `${word} (translated)`,
          example: `Here's an example using "${word}" in a sentence.`,
          language: targetLanguage
        };
      }
    } catch (error) {
      errorHandler.handleError(error as Error, {
        context: 'TranslationService.translate',
        word,
        targetLanguage
      });
      return null;
    }
  }
}