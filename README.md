# BotC — Генератор збалансованих скриптів

Особистий веб-застосунок, що за концептом генерує збалансовані кастомні скрипти для
Blood on the Clocktower. Баланс оцінює Claude (цикл генерація → оцінка → доопрацювання).

- 📄 Дизайн: [`docs/superpowers/specs/2026-06-10-botc-script-generator-design.md`](docs/superpowers/specs/2026-06-10-botc-script-generator-design.md)
- 🗂 План: [`docs/superpowers/plans/2026-06-10-botc-script-generator-plan.md`](docs/superpowers/plans/2026-06-10-botc-script-generator-plan.md)

## Структура

Монорепо на npm workspaces:

- `shared/` — спільні типи (`@botc/shared`)
- `server/` — Node + TS бекенд (тримає API-ключ, оркеструє движок, роздає клієнт)
- `client/` — React + Vite + TS фронтенд

## Запуск (розробка)

```bash
npm install

# 1. Налаштуйте ключ
cp .env.example .env
#   та впишіть ANTHROPIC_API_KEY (https://console.anthropic.com/settings/keys)

# 2. Підніміть сервер (5174) і клієнт (5173) разом
npm run dev
```

Відкрийте http://localhost:5173 — сторінка показує стан бекенду через `/api/health`.

## Прод

```bash
npm run build
NODE_ENV=production npm start   # сервер роздає client/dist на :5174
```

## Статус

Фаза 0 (каркас) — у роботі. Наступне за планом: Фаза 1 (база ролей), Фаза 3 (движок).
