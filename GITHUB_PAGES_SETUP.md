# GitHub Pages Setup Instructions

## ⚠️ ВАЖНО: Что нужно сделать для работы сайта

Этот проект настроен для автоматического развертывания на GitHub Pages, но требует **3 простых шага**:

### Шаг 1: Слейте этот PR в main ветку ✅
1. На странице PR нажмите зеленую кнопку **"Merge pull request"**
2. Подтвердите слияние

### Шаг 2: Включите GitHub Pages ⚙️
1. Перейдите в **Settings** → **Pages**: https://github.com/Sazonow/Voltage-Analyzer-Pro/settings/pages
2. В разделе **"Build and deployment"**:
   - **Source**: Выберите **"GitHub Actions"** из выпадающего списка
   - НЕ выбирайте "Deploy from a branch"!
3. Сохраните

### Шаг 3: Подождите 2-3 минуты ⏱️
1. Перейдите в **Actions**: https://github.com/Sazonow/Voltage-Analyzer-Pro/actions
2. Увидите запущенный workflow "Deploy to GitHub Pages"
3. Дождитесь зеленой галочки ✅

### Готово! 🎉
Ваш сайт будет доступен по адресу:
**https://sazonow.github.io/Voltage-Analyzer-Pro/**

---

## Если что-то не работает

См. подробное руководство: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

Или запустите workflow вручную:
1. Actions → "Deploy to GitHub Pages" → "Run workflow"

---

## What was configured:

1. **Vite Configuration** (`vite.config.ts`)
   - Added `base: '/Voltage-Analyzer-Pro/'` to handle the repository path correctly

2. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
   - Automatically builds and deploys the app when you push to the `main` or `master` branch
   - Uses Node.js 20 and npm for building
   - Can be triggered manually from Actions tab

3. **Dependencies Updated** (`package.json`)
   - Updated `@google/genai` to version `^1.34.0` (the previous version didn't exist)
   - Added missing dependencies: `html2canvas`, `jspdf`, and `@types/node`

4. **Build Configuration**
   - Added `.nojekyll` file in the `public` directory to prevent Jekyll processing
   - Added `.gitignore` to exclude `node_modules` and build artifacts

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

## Manual Deployment (Alternative)

If automatic deployment doesn't work, you can deploy manually:

```bash
npm install
npm run build
npm install -g gh-pages
gh-pages -d dist
```

Then in Settings → Pages, select:
- Source: "Deploy from a branch"
- Branch: `gh-pages` / `root`
