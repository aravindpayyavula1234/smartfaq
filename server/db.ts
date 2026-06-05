import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { FAQ, UserQueryLog } from '../src/types';

// Structured Database representation saved as JSON file
export interface DatabaseSchema {
  faqs: FAQ[];
  users: { id: string; username: string; passwordHash: string }[];
  queryLogs: UserQueryLog[];
  abuseLogs: { id: string; ip: string; message: string; timestamp: string }[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'database.json');

export class AppDatabase {
  private static instance: AppDatabase;
  private db: DatabaseSchema;

  private constructor() {
    this.db = this.loadDatabase();
  }

  public static getInstance(): AppDatabase {
    if (!AppDatabase.instance) {
      AppDatabase.instance = new AppDatabase();
    }
    return AppDatabase.instance;
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent) as DatabaseSchema;
        
        let modified = false;
        if (!parsed.users) {
          parsed.users = [];
          modified = true;
        }

        const hasAravind = parsed.users.some(u => u.username === 'aravindpayyavula1234');
        if (!hasAravind) {
          parsed.users.push({
            id: 'aravind_admin',
            username: 'aravindpayyavula1234',
            passwordHash: bcrypt.hashSync('aravind4500Y', 10)
          });
          modified = true;
        }

        const hasAdmin = parsed.users.some(u => u.username === 'admin');
        if (!hasAdmin) {
          parsed.users.push({
            id: 'admin_1',
            username: 'admin',
            passwordHash: bcrypt.hashSync('adminpassword', 10)
          });
          modified = true;
        }

        if (modified) {
          this.saveDatabaseDisk(parsed);
        }

        return parsed;
      }
    } catch (e) {
      console.error('Error reading database file, resetting to empty', e);
    }
    
    // Default initialization
    const defaultSchema: DatabaseSchema = {
      faqs: this.getInitialSeedFAQs(),
      users: [
        {
          id: 'admin_1',
          username: 'admin',
          passwordHash: bcrypt.hashSync('adminpassword', 10)
        },
        {
          id: 'aravind_admin',
          username: 'aravindpayyavula1234',
          passwordHash: bcrypt.hashSync('aravind4500Y', 10)
        }
      ],
      queryLogs: this.getInitialSeedQueryHistory(),
      abuseLogs: []
    };
    this.saveDatabaseDisk(defaultSchema);
    return defaultSchema;
  }

  private saveDatabaseDisk(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing database to disk', e);
    }
  }

  public save(): void {
    this.saveDatabaseDisk(this.db);
  }

  // --- FAQs Operations ---
  public getFAQs(): FAQ[] {
    return this.db.faqs;
  }

  public addFAQ(faq: Omit<FAQ, 'id' | 'createdAt'>): FAQ {
    const newFAQ: FAQ = {
      ...faq,
      id: `faq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    this.db.faqs.push(newFAQ);
    this.save();
    return newFAQ;
  }

  public updateFAQ(id: string, updatedFields: Partial<FAQ>): FAQ | null {
    const faqIndex = this.db.faqs.findIndex(f => f.id === id);
    if (faqIndex === -1) return null;

    const updatedFAQ = {
      ...this.db.faqs[faqIndex],
      ...updatedFields,
      id // Ensure index remains unmodified
    };
    this.db.faqs[faqIndex] = updatedFAQ;
    this.save();
    return updatedFAQ;
  }

  public deleteFAQ(id: string): boolean {
    const faqIndex = this.db.faqs.findIndex(f => f.id === id);
    if (faqIndex === -1) return false;
    this.db.faqs.splice(faqIndex, 1);
    this.save();
    return true;
  }

  // --- User / Admin Operations ---
  public getUsers() {
    return this.db.users;
  }

  // --- Logs & Analytics Operations ---
  public getQueryLogs(): UserQueryLog[] {
    return this.db.queryLogs;
  }

  public addQueryLog(log: Omit<UserQueryLog, 'id' | 'timestamp'>): UserQueryLog {
    const newLog: UserQueryLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    this.db.queryLogs.push(newLog);
    this.save();
    return newLog;
  }

  public logAbuse(ip: string, message: string): void {
    const abuseRecord = {
      id: `abuse_${Date.now()}`,
      ip,
      message,
      timestamp: new Date().toISOString()
    };
    this.db.abuseLogs.push(abuseRecord);
    this.save();
  }

  public getAbuseLogs() {
    return this.db.abuseLogs;
  }

  private getInitialSeedFAQs(): FAQ[] {
    return [
      {
        id: '1',
        question: 'How do I reset my account password?',
        answer: 'To reset your password, click on the "Forgot Password" link on the login page. Enter your registered email address, and we will send you a instructions link to create a new secure password. Check your spam folder if you do not receive it within 5 minutes.',
        category: 'Account & Security',
        createdAt: '2026-05-01T10:00:00Z'
      },
      {
        id: '2',
        question: 'What is your refund policy for premium subscriptions?',
        answer: 'We offer a full 14-day hassle-free money-back guarantee for all subscribers. If you are not satisfied with our services, you can request a cancellation and refund from your Account billing settings or contact billing-support@example.com for immediate assistance.',
        category: 'Billing & Subscriptions',
        createdAt: '2026-05-02T11:30:00Z'
      },
      {
        id: '3',
        question: 'Is my personal data encrypted and secure on this platform?',
        answer: 'Yes, your data is extremely secure. We use RSA 2048-bit end-to-end encryption in transit (HTTPS) and AES-256 encryption at rest. Regular security audits, penetration testing, and absolute compliance with General Data Protection Regulation (GDPR) standards protect your information.',
        category: 'Account & Security',
        createdAt: '2026-05-03T09:15:00Z'
      },
      {
        id: '4',
        question: 'How can I contact customer support?',
        answer: 'You can contact customer support through our 24/7 Live Chat available in the platform, by filing a support ticket under the "Help" menu, or by emailing our direct customer success office at support@example.com. Our typical email response time is under 2 hours.',
        category: 'General Inquiry',
        createdAt: '2026-05-04T14:20:00Z'
      },
      {
        id: '5',
        question: 'Where can I find my active billing invoices?',
        answer: 'All invoices can be inspected in your Admin Billing section. Simply toggle the left settings sidebar, click on "Billing & Subscription", and look under the "Invoices History" table block to view details or print as PDF.',
        category: 'Billing & Subscriptions',
        createdAt: '2026-05-05T08:00:00Z'
      },
      {
        id: '6',
        question: 'What integrations do you support?',
        answer: 'Our service integrates seamlessly with Slack, Google Workspace, Microsoft Teams, GitHub, Jira, and Discord. You can configure webhooks, set up OAuth credentials under Developer settings, and subscribe to standard alert pipelines instantly.',
        category: 'Features & Integrations',
        createdAt: '2026-05-06T12:00:00Z'
      },
      {
        id: '7',
        question: 'Does this platform have custom rate limiting boundaries for developers?',
        answer: 'By default, core developer APIs carry a throttle limit of 100 requests per hour per endpoint. You can request enterprise tokens or upgrade to dedicated developer nodes for high-throughput scaling matching your enterprise demands.',
        category: 'Technical & API',
        createdAt: '2026-05-07T15:45:00Z'
      }
    ];
  }

  private getInitialSeedQueryHistory(): UserQueryLog[] {
    const now = new Date();
    const daysAgo = (n: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return d.toISOString();
    };

    return [
      {
        id: 'log_seed_1',
        query: 'I lost my password',
        matchedFAQId: '1',
        matchedQuestion: 'How do I reset my account password?',
        confidence: 0.88,
        isFallback: false,
        timestamp: daysAgo(5),
        feedback: 'up'
      },
      {
        id: 'log_seed_2',
        query: 'how to update active billing',
        matchedFAQId: '5',
        matchedQuestion: 'Where can I find my active billing invoices?',
        confidence: 0.72,
        isFallback: false,
        timestamp: daysAgo(4),
        feedback: 'up'
      },
      {
        id: 'log_seed_3',
        query: 'how do i contact you people',
        matchedFAQId: '4',
        matchedQuestion: 'How can I contact customer support?',
        confidence: 0.94,
        isFallback: false,
        timestamp: daysAgo(3),
        feedback: 'up'
      },
      {
        id: 'log_seed_4',
        query: 'can i get my money back subscription refund limit?',
        matchedFAQId: '2',
        matchedQuestion: 'What is your refund policy for premium subscriptions?',
        confidence: 0.82,
        isFallback: false,
        timestamp: daysAgo(2),
        feedback: 'up'
      },
      {
        id: 'log_seed_5',
        query: 'tell me about extraterrestrial solar alignment',
        confidence: 0.12,
        isFallback: true,
        timestamp: daysAgo(1),
        feedback: 'down'
      },
      {
        id: 'log_seed_6',
        query: 'how is api security rate limit',
        matchedFAQId: '7',
        matchedQuestion: 'Does this platform have custom rate limiting boundaries for developers?',
        confidence: 0.76,
        isFallback: false,
        timestamp: now.toISOString(),
        feedback: 'up'
      }
    ];
  }
}
