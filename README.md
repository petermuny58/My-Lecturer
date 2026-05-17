# 🎓 My Lecturer

An AI-powered academic tutor designed to guide students with personalized support, slang confluences, and real-time interactive lectures.

---

## 🚀 Running the Project Locally

Follow these steps to set up and run the application on your local machine:

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher recommended) installed.

### 2. Installation
Clone the repository, navigate to the project directory, and install dependencies:
```bash
npm install
```

### 3. Configure Environment Variables
To keep your private API keys secure, they should **never** be committed to version control. 

1. Copy the environment template file:
   ```bash
   cp .env.example .env.local
   ```
2. Open the newly created `.env.local` file and replace the placeholder values with your actual API keys:
   - **Gemini API Key:** Get yours from [Google AI Studio](https://aistudio.google.com/).
   - **Google Books API Key:** Get yours from [Google Cloud Console](https://console.cloud.google.com/).

> [!IMPORTANT]
> The `.env.local` file is automatically ignored by Git (configured in `.gitignore`) to protect your credentials. Never remove `.env.local` from the ignore list.

### 4. Start Development Server
Launch the local dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

