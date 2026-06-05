# Guardian AI - Intelligent FAQ Chatbot Suite

An intelligent, secure, production-ready full-stack FAQ Chatbot application built using **React.js + Tailwind CSS** on the frontend, and **Express + TypeScript** on the backend. This platform uses clean NLP techniques featuring suffix normalization, custom TF-IDF keyword vectorization, and a robust fallback integration powered by the **Google Gemini API**.

---

## 🚀 Core Architectural Features

### 1. NLP Semantic & Statistical Matching
- **TF-IDF Keyword Vectorization & Cosine Similarity**: Custom pure TypeScript mathematical analyzer that tokenizes, cleans, removes stop words, and normalizes queries locally with sub-500ms latency.
- **Suffix Normalization Lemmatizer**: Custom suffix-trim rules (plural/singular reductions, continuous action forms alignment) that bypass binary package dependency compilation issues.
- **Gemini Embeddings Integration**: Standardizes search queries into semantic vector embeddings (`gemini-embedding-2-preview`) to capture intent matching.

### 2. Full FAQ CRUD & Drag-and-Drop Mass CSV Import
- Admins can query, add, edit inline, or securely delete indices.
- Support for **bulk CSV imports** via manual text dump or drag-and-drop file readers in the browser.
- Instant **CSV Export** downloading the database records as a standalone spreadsheet with escaped quote formatting.

### 3. Comprehensive Analytics & Query Audits
- Monitors metrics (Total FAQs, Queries, Avg AI Confidence, LLM Fallbacks).
- Visual timeline graphs of query frequency, matching-bracket distributions, and categories share.

### 4. Interactive Live Test Bed Panel
- Run mock test cases checking NLP normalization, HTML sanitizers, CRUD DB operations, and hashing algorithms in real-time inside the browser.

### 5. Multi-Layer Security Guardrails
- **Input Sanitization**: Strip nested `<script>`, `javascript:`, inline event handlers, and escape malicious payload strings to block HTML Injection and Prompt Hijacking.
- **Rate-Limiter Throttle**: Custom IP-based token sliding-window allowing 100 requests / hour per user.
- **Secure Headers (Talisman Specs)**: Customized injection of:
  - `X-Frame-Options: SAMEORIGIN` (Clickjacking guard)
  - `X-XSS-Protection: 1; mode=block`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy` (Strict domain rules)
- **SQLi Shielding**: Structure document parameters inside parameterized repository modules to prevent execution breakouts.
- **Administrative JWT Token sessions**: Bcrypt password hashing context verifying secure routes with 8-hour expirations.

---

## 🛠️ Setup & Local Deployment

### Prerequisites
- Node.js (v18 or higher recommended)
- npm package manager

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repository_url>
cd faq-chatbot

# Install packages
npm install
```

### 2. Environment Variables Configuration
Create a `.env` configuration file in the project root directory:
```env
# Google Gemini API Key - Set to run advanced semantic embeddings & fallbacks
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"

# JWT token cryptographic secret signature
JWT_SECRET="YOUR_ULTRA_SECURE_RANDOM_SECRET_KEY"
```

### 3. Boot Development Server (Express + Vite)
```bash
npm run dev
# Express microservice boots on http://localhost:3000
```

### 4. Build Production Bundle
```bash
# Compile and bundle TS server and React assets atomically
npm run build

# Launch compiled release standalone server
npm start
```

---

## 🔑 Administrative Access (Seeded)
To access the metrics panel or perform CRUD database operations, navigate to the **Admin FAQ Portal** tab and input:
- **Username**: `admin`
- **Password**: `adminpassword`
