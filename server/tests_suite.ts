import bcrypt from 'bcryptjs';
import { AppDatabase } from './db';
import { lemmatizeWord, preprocessText, NLPEngine } from './nlp_engine';
import { sanitizeInput } from './security';
import { TestResult } from '../src/types';

export function runAllTests(): TestResult[] {
  const results: TestResult[] = [];
  const db = AppDatabase.getInstance();
  const nlp = new NLPEngine();

  // Test 1: NLP Lemmatizer Accuracy
  try {
    const lemma1 = lemmatizeWord('passwords');
    const lemma2 = lemmatizeWord('billing');
    const lemma3 = lemmatizeWord('refunds');
    
    const passed = (lemma1 === 'password' && lemma2 === 'bill' && lemma3 === 'refund');
    results.push({
      name: 'NLP Lemmatizer Suffix Normalization Test',
      passed,
      details: passed 
        ? `Correctly reduced plural & continuous action words (passwords -> ${lemma1}, billing -> ${lemma2}, refunds -> ${lemma3})`
        : `Normalization failure. Got: passwords->${lemma1}, billing->${lemma2}, refunds->${lemma3}`
    });
  } catch (e: any) {
    results.push({ name: 'NLP Lemmatizer Suffix Normalization Test', passed: false, details: e.message });
  }

  // Test 2: Tokenization & Stop-Word Removal Unit Test
  try {
    const tokens = preprocessText("How can I find my active billing inputs?");
    // Expected words: ['find', 'activ', 'bill', 'input'] or similar
    const passed = tokens.includes('find') && tokens.includes('bill') && !tokens.includes('can') && !tokens.includes('my');
    results.push({
      name: 'NLP Tokenization and Stop-word Removal Test',
      passed,
      details: passed
        ? `Cleaned stop words and properly processed remaining: [${tokens.join(', ')}]`
        : `Tokenization failed or left behind stop words. Tokens: [${tokens.join(', ')}]`
    });
  } catch (e: any) {
    results.push({ name: 'NLP Tokenization and Stop-word Removal Test', passed: false, details: e.message });
  }

  // Test 3: SQL/Prompt Injection & HTML Sanitization Guard test
  try {
    const dirtyInput = "<script>alert('injection')</script><p>Clean Text</p>";
    const sanitized = sanitizeInput(dirtyInput);
    const passed = !sanitized.includes('<script>') && !sanitized.includes('</script>') && !sanitized.includes('<p>');
    results.push({
      name: 'Security Input Sanitization HTML Injection Guard Test',
      passed,
      details: passed
        ? `Successfully stripped script blocks and raw HTML wrapper tags. Output: "${sanitized}"`
        : `HTML tags were not correctly stripped. Output: "${sanitized}"`
    });
  } catch (e: any) {
    results.push({ name: 'Security Input Sanitization HTML Injection Guard Test', passed: false, details: e.message });
  }

  // Test 4: Database CRUD Simulation
  try {
    const tempFaq = db.addFAQ({
      question: 'Test Sandbox Question?',
      answer: 'This is a sandbox test answer.',
      category: 'Test'
    });
    
    const exists = db.getFAQs().find(f => f.id === tempFaq.id);
    const updateResult = db.updateFAQ(tempFaq.id, { answer: 'Modified Answer' });
    const deleteResult = db.deleteFAQ(tempFaq.id);
    
    const passed = !!exists && updateResult?.answer === 'Modified Answer' && deleteResult === true;
    results.push({
      name: 'Database Storage FAQ CRUD Pipeline Test',
      passed,
      details: passed
        ? 'Successfully certified FAQ create, retrieval, update check, and delete transitions.'
        : `CRUD transition failure. Created: ${!!exists}, Updated: ${updateResult?.answer}, Deleted: ${deleteResult}`
    });
  } catch (e: any) {
    results.push({ name: 'Database Storage FAQ CRUD Pipeline Test', passed: false, details: e.message });
  }

  // Test 5: Local TF-IDF Match Accuracy Test
  try {
    const dummyFAQList = [
      { id: 't1', question: 'How do I change my dashboard theme?', answer: 'Go to settings to toggle dark layout.', category: 'Tech', createdAt: '' },
      { id: 't2', question: 'How can I request a billing invoice?', answer: 'Check invoice charts under accounts tab.', category: 'Billing', createdAt: '' }
    ];

    const matchInfo = nlp.matchLocalTFIDF('dashboard theme', dummyFAQList);
    const passed = !!matchInfo && matchInfo.faq.id === 't1' && matchInfo.score > 0.5;
    
    results.push({
      name: 'NLP TF-IDF Vector Space Alignment Match Test',
      passed,
      details: passed
        ? `Successfully mapped user string 'dashboard theme' to Question #1 with confidence score: ${(matchInfo.score * 100).toFixed(1)}%`
        : `Cosine similarity classification misalignment.`
    });
  } catch (e: any) {
    results.push({ name: 'NLP TF-IDF Vector Space Alignment Match Test', passed: false, details: e.message });
  }

  // Test 6: Hashing Algorithm Integrity Test
  try {
    const plain = 'adminpassword';
    const hash = db.getUsers()[0].passwordHash;
    const passed = bcrypt.compareSync(plain, hash);
    results.push({
      name: 'Authentication Cryptographic Password Hash Integrity Test',
      passed,
      details: passed
        ? 'Verified database password hash parses robustly using secure Salt Rounds context.'
        : 'Failed to verify Admin credentials.'
    });
  } catch (e: any) {
    results.push({ name: 'Authentication Cryptographic Password Hash Integrity Test', passed: false, details: e.message });
  }

  return results;
}
