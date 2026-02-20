# 🎨 MultiAIModel Frontend

Frontend application for **MultiAIModel** - a multi-modal AI platform that integrates multiple AI providers into a unified wallet-based experience.

Built as a modern Single Page Application (SPA) using React and TypeScript, this frontend connects to the FastAPI backend via REST APIs and WebSockets.

---

## 🚀 Tech Stack

* **React 19**
* **TypeScript**
* **Vite**
* **Tailwind CSS 4**
* **React Router v7**
* **Axios** (API communication)
* **SWR** (data fetching & caching)
* **Recharts** (admin analytics)
* **React Markdown + KaTeX** (chat rendering, code snippet formatting)

---

## 📂 Project Structure

```
src/
├── api/          # Axios client & interceptors
├── components/   # Reusable UI components
├── context/      # Global state (Auth, Chat Reset)
├── layouts/      # Dashboard layout structure
├── pages/        # Application pages (Chat, Media, Billing, Admin)
└── App.tsx       # Routing configuration
```

---

## ⚙️ Environment Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/AbirHasanPiash/multimodal-ai-frontend
cd multiaimodel-frontend
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Configure Environment Variables

Create a `.env` file:

```env
VITE_API_URL=
```

---

## ▶️ Run Development Server

```bash
npm run dev
```

Application runs at:

```
http://localhost:5173
```

---

## 🔐 Core Features

* Secure authentication (JWT + Google OAuth)
* Real-time AI chat via WebSockets
* Image, TTS, and Avatar generation
* Wallet & credit tracking
* Stripe-based billing integration
* Admin dashboard (stats, users, packages)
* Responsive layout (desktop & mobile)

---

## 🏗 Build for Production

```bash
npm run build
```

Production files will be generated in the `dist/` folder.

---

## 🔗 Backend Dependency

This frontend requires the MultiAIModel backend API to be running.

Ensure:

* Correct `VITE_API_URL`
* CORS configured on backend
* WebSocket endpoint accessible

---
