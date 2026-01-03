#!/bin/bash

# Простой скрипт для развертывания на GitHub Pages
# Simple script to deploy to GitHub Pages

set -e

echo "🚀 Начинаем развертывание на GitHub Pages..."
echo "🚀 Starting deployment to GitHub Pages..."
echo ""

# Установка зависимостей
echo "📦 Установка зависимостей..."
echo "📦 Installing dependencies..."
npm install

# Сборка проекта
echo "🔨 Сборка проекта..."
echo "🔨 Building project..."
npm run build

# Развертывание на gh-pages
echo "📤 Развертывание на GitHub Pages..."
echo "📤 Deploying to GitHub Pages..."
npx gh-pages -d dist

echo ""
echo "✅ Готово! Сайт развернут!"
echo "✅ Done! Site deployed!"
echo ""
echo "🌐 Ваш сайт будет доступен через несколько минут по адресу:"
echo "🌐 Your site will be available in a few minutes at:"
echo "   https://sazonow.github.io/Voltage-Analyzer-Pro/"
echo ""
echo "⚙️  Не забудьте настроить GitHub Pages в Settings:"
echo "⚙️  Don't forget to configure GitHub Pages in Settings:"
echo "   Settings → Pages → Source → gh-pages branch → / (root)"
echo "   https://github.com/Sazonow/Voltage-Analyzer-Pro/settings/pages"
