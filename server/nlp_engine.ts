import { GoogleGenAI } from '@google/genai';
import { FAQ } from '../src/types';

// Stop words list for cleaning
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've",
  "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
  'she', "she's", 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these',
  'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'as',
  'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in',
  'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', "should've", 'now'
]);

// Clean lemmatization approximation
export function lemmatizeWord(word: string): string {
  let w = word.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (w.length <= 2) return w;

  // Suffix analysis & replacements
  if (w.endsWith('ies')) {
    w = w.slice(0, -3) + 'y';
  } else if (w.endsWith('es') && !w.endsWith('aes') && !w.endsWith('ees') && !w.endsWith('oes')) {
    w = w.slice(0, -1);
  } else if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && !w.endsWith('as')) {
    w = w.slice(0, -1);
  }

  if (w.endsWith('ing')) {
    w = w.slice(0, -3);
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) {
      w = w + 'e';
    }
  } else if (w.endsWith('ed')) {
    w = w.slice(0, -2);
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) {
      w = w + 'e';
    }
  } else if (w.endsWith('ly')) {
    w = w.slice(0, -2);
  }

  return w;
}

// Full Preprocessing
export function preprocessText(text: string): string[] {
  if (!text) return [];
  
  // Lowercasing and cleaning whitespace/punctuation
  const cleanedText = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\"]/g, ' ')
    .replace(/\s+/g, ' ');

  // Tokenization
  const tokens = cleanedText.split(' ').filter(t => t.trim().length > 0);

  // Stop-word removal and Lemmatization
  return tokens
    .filter(token => !STOP_WORDS.has(token))
    .map(token => lemmatizeWord(token))
    .filter(token => token.length > 0);
}

// In-memory embeddings cache to avoid redundant API fees and guarantee latency < 10ms for repeated tokens
const EMBEDDINGS_CACHE = new Map<string, number[]>();

export class NLPEngine {
  private ai: GoogleGenAI | null = null;
  private isGeminiEnabled = false;

  constructor() {
    this.initializeGemini();
  }

  private initializeGemini() {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      try {
        this.ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        this.isGeminiEnabled = true;
        console.log('Gemini model initialized successfully for NLP matching and Fallbacks.');
      } catch (err) {
        console.error('Failed to initialize Google GenAI SDK', err);
      }
    } else {
      console.warn('GEMINI_API_KEY is not defined, matching engine will rely on local TF-IDF Cosine Similarity.');
    }
  }

  // --- LOCAL MATCHING METHOD: TF-IDF + COSINE SIMILARITY ---
  public matchLocalTFIDF(query: string, faqs: FAQ[]): { faq: FAQ; score: number } | null {
    if (faqs.length === 0) return null;

    const queryTokens = preprocessText(query);
    if (queryTokens.length === 0) return null;

    // Build Corpus of FAQs
    const faqCorpusTokens = faqs.map(faq => preprocessText(`${faq.question} ${faq.answer} ${faq.category}`));
    
    // Create Vocabulary representing unique terms
    const vocabularySet = new Set<string>();
    faqCorpusTokens.forEach(tokens => tokens.forEach(tok => vocabularySet.add(tok)));
    queryTokens.forEach(tok => vocabularySet.add(tok));
    const vocabulary = Array.from(vocabularySet);

    if (vocabulary.length === 0) return null;

    // Calculate Document Frequency (DF) & Inverse Document Frequency (IDF)
    const idf: Record<string, number> = {};
    vocabulary.forEach(term => {
      let docFreq = 0;
      faqCorpusTokens.forEach(tokens => {
        if (tokens.includes(term)) docFreq++;
      });
      // Smoothing
      idf[term] = Math.log(1 + (faqCorpusTokens.length / (docFreq + 1))) + 1;
    });

    // Translate documents and query to vectors
    const vectorify = (tokens: string[]): number[] => {
      const vector = new Array(vocabulary.length).fill(0);
      const tf: Record<string, number> = {};
      tokens.forEach(t => {
        tf[t] = (tf[t] || 0) + 1;
      });

      vocabulary.forEach((term, idx) => {
        if (tf[term]) {
          // Logarithmic normalized TF scaling
          vector[idx] = (1 + Math.log(tf[term])) * idf[term];
        }
      });
      return vector;
    };

    const faqVectors = faqCorpusTokens.map(tokens => vectorify(tokens));
    const queryVector = vectorify(queryTokens);

    // Calculate Cosine Similarity against each FAQ
    const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    let bestScore = 0;
    let bestMatch: FAQ | null = null;

    faqs.forEach((faq, index) => {
      const score = cosineSimilarity(queryVector, faqVectors[index]);
      
      // Fine-grained scoring adjustment for exact matches on query words
      const questionTokens = preprocessText(faq.question);
      let matchCount = 0;
      queryTokens.forEach(qtok => {
        if (questionTokens.includes(qtok)) matchCount++;
      });
      
      const multiplier = 1 + (matchCount / queryTokens.length) * 0.35; // Boost score if exact words align
      const adjustedScore = Math.min(score * multiplier, 1.0);

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMatch = faq;
      }
    });

    if (bestMatch && bestScore > 0) {
      return { faq: bestMatch, score: bestScore };
    }

    return null;
  }

  // --- PREMIUM MATCHING METHOD: GEMINI CONTENT EMBEDDINGS ---
  public async getEmbedding(text: string): Promise<number[] | null> {
    if (!this.isGeminiEnabled || !this.ai) return null;

    const trimmed = text.trim();
    if (EMBEDDINGS_CACHE.has(trimmed)) {
      return EMBEDDINGS_CACHE.get(trimmed)!;
    }

    try {
      const res = await this.ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: trimmed
      });

      const resObj = res as any;
      const embeddingValues = resObj.embedding?.values || resObj.embeddings?.values || (resObj.embedding && resObj.embedding.values);
      if (embeddingValues) {
        EMBEDDINGS_CACHE.set(trimmed, embeddingValues);
        return embeddingValues;
      }
    } catch (e) {
      console.error('Error fetching embeddings from Gemini API', e);
    }
    return null;
  }

  public async matchSemantic(query: string, faqs: FAQ[]): Promise<{ faq: FAQ; score: number } | null> {
    if (faqs.length === 0) return null;

    const queryEmbedding = await this.getEmbedding(query);
    if (!queryEmbedding) {
      // Local fallback if embedding model times-out or is configured without credentials
      return this.matchLocalTFIDF(query, faqs);
    }

    let bestScore = 0;
    let bestMatch: FAQ | null = null;

    for (const faq of faqs) {
      const faqEmbedding = await this.getEmbedding(`${faq.question} ${faq.answer}`);
      if (!faqEmbedding) continue;

      // Cosine similarity
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < queryEmbedding.length; i++) {
        dotProduct += queryEmbedding[i] * faqEmbedding[i];
        normA += queryEmbedding[i] * queryEmbedding[i];
        normB += faqEmbedding[i] * faqEmbedding[i];
      }
      
      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      const adjustedScore = Math.max(0, Math.min(similarity, 1.0)); // bound scores gracefully

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMatch = faq;
      }
    }

    if (bestMatch && bestScore > 0) {
      // Offset / normalize embedding thresholds
      // Embedding cosine similarity is generally compressed (0.6 - 0.9). Let's map it nicely.
      let normalizedScore = bestScore;
      if (bestScore > 0.4) {
        normalizedScore = 0.5 + (bestScore - 0.4) * (0.5 / 0.5);
        normalizedScore = Math.min(Math.max(normalizedScore, 0.45), 0.99);
      }
      return { faq: bestMatch, score: normalizedScore };
    }

    return null;
  }

  // --- HYBRID DECISION MATCHING SYSTEM ---
  public async matchFAQ(query: string, faqs: FAQ[]): Promise<{ faq: FAQ | null; score: number; method: 'local' | 'semantic' }> {
    if (this.isGeminiEnabled) {
      const semanticMatch = await this.matchSemantic(query, faqs);
      if (semanticMatch) {
        return { faq: semanticMatch.faq, score: semanticMatch.score, method: 'semantic' };
      }
    }

    const localMatch = this.matchLocalTFIDF(query, faqs);
    if (localMatch) {
      return { faq: localMatch.faq, score: localMatch.score, method: 'local' };
    }

    return { faq: null, score: 0, method: 'local' };
  }

  // --- BONUS AI FALLBACK GENERATOR ---
  public async generateAIFallback(query: string, faqContexts: FAQ[]): Promise<string> {
    if (!this.isGeminiEnabled || !this.ai) {
      return "Sorry, I couldn't find a suitable answer on file. Please contact support at support@example.com.";
    }

    try {
      const contextText = faqContexts
        .map(f => `Category: ${f.category}\nQ: ${f.question}\nA: ${f.answer}`)
        .join('\n\n');

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `You are an FAQ AI chatbot helper. The user asked an out-of-scope question or one that didn't perfectly match our existing database.

Here are the closely related FAQs for context to guide your response styling and knowledge boundary:
${contextText}

Question asked by user:
"${query}"

Instructions:
1. Try to answer the user's question politely and intelligently, based on the context of our platform FAQs when possible.
2. If the user's question is completely unrelated to our platform, helpfully answer it but remind them that for specific operational concerns, they can reach customer support at support@example.com.
3. Be concise (under 3 sentences). Keep a friendly, professional tone. Avoid HTML tags, output clean text or basic markdown.`,
      });

      return response.text || "Sorry, I couldn't find a suitable answer. Please contact support.";
    } catch (err) {
      console.error('Fallback AI generation errored', err);
      return "Sorry, I couldn't find a suitable answer. Please contact support.";
    }
  }
}
