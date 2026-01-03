# Решение проблем с GitHub Pages / Troubleshooting GitHub Pages

## Проблема: Сайт не работает / Site is not working

### Шаг 1: Проверьте, слит ли PR в main/master
The workflow only runs when code is merged to the `main` or `master` branch.

1. Откройте: https://github.com/Sazonow/Voltage-Analyzer-Pro
2. Убедитесь, что PR был слит (merged)
3. Если PR еще открыт, нажмите "Merge pull request"

### Шаг 2: Включите GitHub Pages в настройках репозитория

1. Перейдите в Settings репозитория: https://github.com/Sazonow/Voltage-Analyzer-Pro/settings/pages
2. В разделе "Build and deployment":
   - **Source**: Выберите "GitHub Actions" (НЕ "Deploy from a branch")
3. Сохраните настройки

### Шаг 3: Проверьте статус workflow

1. Перейдите в Actions: https://github.com/Sazonow/Voltage-Analyzer-Pro/actions
2. Найдите workflow "Deploy to GitHub Pages"
3. Проверьте статус:
   - ✅ Зеленая галочка = успешно развернут
   - ❌ Красный крестик = ошибка (кликните для просмотра логов)
   - 🟡 Желтый кружок = выполняется

### Шаг 4: Запустите workflow вручную

Если workflow не запустился автоматически:

1. Перейдите в Actions: https://github.com/Sazonow/Voltage-Analyzer-Pro/actions
2. Выберите "Deploy to GitHub Pages" в левом меню
3. Нажмите "Run workflow" справа
4. Выберите ветку `main` или `master`
5. Нажмите зеленую кнопку "Run workflow"

### Шаг 5: Подождите 2-3 минуты

После запуска workflow, подождите несколько минут для:
- Сборки приложения (build)
- Развертывания на GitHub Pages (deploy)

### Шаг 6: Проверьте URL

После успешного развертывания, ваш сайт будет доступен по адресу:
**https://sazonow.github.io/Voltage-Analyzer-Pro/**

## Альтернативный метод: Ручное развертывание

Если автоматическое развертывание не работает, вы можете развернуть вручную:

### Вариант 1: Через gh-pages branch

```bash
# Склонируйте репозиторий
git clone https://github.com/Sazonow/Voltage-Analyzer-Pro.git
cd Voltage-Analyzer-Pro

# Установите зависимости
npm install

# Соберите проект
npm run build

# Установите gh-pages (если еще не установлен)
npm install -g gh-pages

# Разверните
gh-pages -d dist
```

Затем в Settings → Pages выберите:
- Source: "Deploy from a branch"
- Branch: `gh-pages` / `root`

### Вариант 2: Используйте другой хостинг

Если GitHub Pages не работает, можете использовать:
- **Netlify**: https://app.netlify.com/drop (просто перетащите папку `dist`)
- **Vercel**: https://vercel.com/new (подключите GitHub репозиторий)
- **Cloudflare Pages**: https://pages.cloudflare.com/

## Частые ошибки / Common Errors

### Ошибка 404 на странице
**Причина**: Неправильный base path в vite.config.ts
**Решение**: Убедитесь, что `base: '/Voltage-Analyzer-Pro/'` в vite.config.ts

### Ошибка при сборке (Build fails)
**Причина**: Отсутствуют зависимости
**Решение**: Проверьте, что все зависимости в package.json установлены

### Workflow не запускается
**Причина**: Workflow файл не в ветке main/master
**Решение**: Слейте PR в main/master ветку

### Permissions error
**Причина**: Недостаточно прав для GitHub Pages
**Решение**: 
1. Settings → Actions → General
2. Scroll down to "Workflow permissions"
3. Выберите "Read and write permissions"
4. Сохраните

## Проверка настроек / Verification Checklist

- [ ] PR слит в main/master ветку
- [ ] GitHub Pages включен в Settings → Pages
- [ ] Source установлен на "GitHub Actions"
- [ ] Workflow существует в `.github/workflows/deploy.yml`
- [ ] Workflow запущен и завершился успешно
- [ ] Прошло 2-3 минуты после успешного workflow
- [ ] URL открывается: https://sazonow.github.io/Voltage-Analyzer-Pro/

## Нужна помощь? / Need Help?

Если ничего не помогло:
1. Откройте issue: https://github.com/Sazonow/Voltage-Analyzer-Pro/issues
2. Приложите скриншот страницы Actions
3. Приложите скриншот Settings → Pages
4. Опишите, какие шаги вы уже попробовали
