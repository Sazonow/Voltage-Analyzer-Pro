<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Voltage Analyzer Pro

A professional voltage analysis application with AI-powered insights.

🚀 **Live Demo:** [https://sazonow.github.io/Voltage-Analyzer-Pro/](https://sazonow.github.io/Voltage-Analyzer-Pro/)

View your app in AI Studio: https://ai.studio/apps/drive/1pMP33KwNToOtvDVCGIlw7OiURaA5vjqZ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

### 🚀 Quick Deploy (Immediate)

Run this command to deploy immediately:

```bash
npm run deploy
```

Or use the script:

```bash
./deploy.sh
```

Then configure GitHub Pages:
1. Go to [Settings → Pages](https://github.com/Sazonow/Voltage-Analyzer-Pro/settings/pages)
2. Set **Source** to "Deploy from a branch"
3. Select branch: **gh-pages** and folder: **/ (root)**

Your site will be live at: https://sazonow.github.io/Voltage-Analyzer-Pro/

### Automatic Deploy (via GitHub Actions)

This project is also configured to automatically deploy to GitHub Pages when you push to the `main` branch. The deployment workflow will:

1. Build the application using Vite
2. Deploy the built files to GitHub Pages

For automatic deployment, set **Source** to "GitHub Actions" in repository settings.
