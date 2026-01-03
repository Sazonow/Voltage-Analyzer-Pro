# 📋 ПОШАГОВАЯ ИНСТРУКЦИЯ / STEP-BY-STEP GUIDE

## Где запустить команду? / Where to run the command?

### Вариант 1: На вашем компьютере (РЕКОМЕНДУЕТСЯ)

#### Шаг 1: Склонируйте репозиторий
Откройте терминал (командную строку) на вашем компьютере и выполните:

```bash
git clone https://github.com/Sazonow/Voltage-Analyzer-Pro.git
cd Voltage-Analyzer-Pro
```

#### Шаг 2: Переключитесь на ветку с изменениями
```bash
git checkout copilot/setup-project-with-github-pages
```

#### Шаг 3: Запустите развертывание
```bash
npm install
npm run deploy
```

Команда спросит ваши учетные данные GitHub - введите их.

#### Шаг 4: Настройте GitHub Pages
1. Откройте в браузере: https://github.com/Sazonow/Voltage-Analyzer-Pro/settings/pages
2. В разделе "Source" выберите "Deploy from a branch"
3. В разделе "Branch" выберите **gh-pages** и **/ (root)**
4. Нажмите "Save"

---

### Вариант 2: Через GitHub Codespaces (онлайн)

#### Шаг 1: Откройте Codespaces
1. Перейдите на https://github.com/Sazonow/Voltage-Analyzer-Pro
2. Нажмите зеленую кнопку "<> Code"
3. Выберите вкладку "Codespaces"
4. Нажмите "Create codespace on copilot/setup-project-with-github-pages"

#### Шаг 2: В открывшемся редакторе VSCode онлайн
1. Откройте терминал (внизу экрана или Terminal → New Terminal)
2. Выполните команды:

```bash
npm install
npm run deploy
```

#### Шаг 3: Настройте GitHub Pages
1. Откройте в браузере: https://github.com/Sazonow/Voltage-Analyzer-Pro/settings/pages
2. В разделе "Source" выберите "Deploy from a branch"
3. В разделе "Branch" выберите **gh-pages** и **/ (root)**
4. Нажмите "Save"

---

### Вариант 3: Самый простой - Слейте PR и используйте GitHub Actions

Если команды кажутся сложными:

#### Шаг 1: Слейте этот PR
1. Перейдите на страницу PR: https://github.com/Sazonow/Voltage-Analyzer-Pro/pull/[НОМЕР_PR]
2. Нажмите зеленую кнопку "Merge pull request"
3. Нажмите "Confirm merge"

#### Шаг 2: Настройте GitHub Pages
1. Откройте: https://github.com/Sazonow/Voltage-Analyzer-Pro/settings/pages
2. В разделе "Source" выберите **"GitHub Actions"** (НЕ "Deploy from a branch"!)
3. Сохраните

#### Шаг 3: Подождите
1. Перейдите на: https://github.com/Sazonow/Voltage-Analyzer-Pro/actions
2. Дождитесь зеленой галочки ✅ (2-3 минуты)

---

## ✅ Результат

После выполнения любого из вариантов, ваш сайт будет доступен через 1-2 минуты по адресу:

**https://sazonow.github.io/Voltage-Analyzer-Pro/**

---

## ❓ Что такое терминал?

### На Windows:
- Нажмите `Win + R`
- Введите `cmd` и нажмите Enter
- ИЛИ найдите "Командная строка" в меню Пуск

### На Mac:
- Нажмите `Cmd + Space`
- Введите "Terminal"
- Нажмите Enter

### На Linux:
- Нажмите `Ctrl + Alt + T`

---

## 🆘 Нужна помощь?

Если все еще не понятно:
1. Выберите **Вариант 3** (самый простой - через слияние PR)
2. Или напишите мне, и я помогу

## 📹 Видео-инструкция

Если нужно видео с экрана, дайте знать, я могу создать детальную инструкцию с картинками для вашей операционной системы.
