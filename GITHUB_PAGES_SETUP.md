# GitHub Pages Setup Instructions

This project is now configured to deploy to GitHub Pages automatically!

## What was configured:

1. **Vite Configuration** (`vite.config.ts`)
   - Added `base: '/Voltage-Analyzer-Pro/'` to handle the repository path correctly

2. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
   - Automatically builds and deploys the app when you push to the `main` branch
   - Uses Node.js 20 and npm for building

3. **Dependencies Updated** (`package.json`)
   - Updated `@google/genai` to version `^1.34.0` (the previous version didn't exist)
   - Added missing dependencies: `html2canvas`, `jspdf`, and `@types/node`

4. **Build Configuration**
   - Added `.nojekyll` file in the `public` directory to prevent Jekyll processing
   - Added `.gitignore` to exclude `node_modules` and build artifacts

## Next Steps (Manual Configuration Required):

After merging this PR to the `main` branch, you need to enable GitHub Pages in your repository settings:

1. Go to your repository on GitHub: https://github.com/Sazonow/Voltage-Analyzer-Pro
2. Click on **Settings** tab
3. In the left sidebar, click on **Pages**
4. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
5. Save the settings

That's it! After the first push to `main`, GitHub Actions will automatically build and deploy your app.

## Accessing Your Deployed App

Once deployed, your app will be available at:
**https://sazonow.github.io/Voltage-Analyzer-Pro/**

## Development

To run the app locally:
```bash
npm install
npm run dev
```

To build for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Notes

- The GitHub Actions workflow will run automatically on every push to the `main` branch
- You can also manually trigger the deployment from the Actions tab by clicking "Run workflow"
- Make sure to set up your Gemini API key if you want to use the AI features
