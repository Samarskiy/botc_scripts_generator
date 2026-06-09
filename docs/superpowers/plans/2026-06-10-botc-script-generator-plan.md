# План реалізації: Генератор збалансованих скриптів BotC

**Дата:** 2026-06-10
**Спека:** [`../specs/2026-06-10-botc-script-generator-design.md`](../specs/2026-06-10-botc-script-generator-design.md)
**Статус:** Готовий до реалізації

## Структура проєкту

```
botc-scenario-generator/
├── client/                  # React + Vite + TS (фронтенд)
│   ├── src/
│   │   ├── components/       # форма, прогрес, результат, хоумбрю
│   │   ├── lib/             # api-клієнт, homebrew-сховище
│   │   ├── types/          # імпорт зі shared
│   │   └── App.tsx
│   └── vite.config.ts
├── server/                  # Node + TS (бекенд)
│   ├── src/
│   │   ├── engine/          # движок генерації (ядро)
│   │   ├── data/            # завантажувач ролей
│   │   ├── export/          # JSON-форматер + PDF
│   │   ├── routes/         # /generate, /export
│   │   ├── anthropic.ts     # обгортка Claude SDK
│   │   ├── config.ts
│   │   └── index.ts        # HTTP-сервер, роздача client/dist
├── shared/                  # спільні типи + дані
│   ├── types.ts            # Character, Script, GenerateRequest…
│   └── roles.json          # офіційні ролі (вбудований датасет)
├── docs/superpowers/        # спека + цей план
├── .env                     # ANTHROPIC_API_KEY (gitignored)
└── package.json            # workspaces: client, server
```

Монорепо з npm workspaces. Один dev-скрипт піднімає бекенд (з hot-reload) і Vite; у проді бекенд роздає `client/dist`.

---

## Фаза 0 — Каркас проєкту

**Мета:** порожній, але запускний скелет.

1. `package.json` з workspaces (`client`, `server`), кореневі скрипти `dev` / `build` / `test`.
2. `client/` — `npm create vite@latest` (React + TS), базовий `App.tsx`.
3. `server/` — TS-проєкт, мінімальний HTTP-сервер (Express або вбудований `http`), ендпоінт `GET /health`.
4. `shared/types.ts` — стартові типи (нижче), імпортуються з обох сторін.
5. `.env` + `.gitignore` (вже є), `config.ts` читає `ANTHROPIC_API_KEY`, модель, поріг балансу, ліміт ітерацій.
6. Dev-флоу: `server` роздає `client/dist` у проді; у dev — Vite-проксі `/api` → бекенд.

**Готово, коли:** `npm run dev` піднімає сервер, `/health` відповідає, React-сторінка відкривається.

---

## Фаза 1 — Шар даних персонажів

**Мета:** валідна, типізована база офіційних ролей.

1. **Джерело даних:** зібрати/нормалізувати канонічний датасет ролей (clocktower.online / офіційний Script Tool) у `shared/roles.json` за схемою з розділу 4 спеки.
2. **Типи** (`shared/types.ts`):
   ```ts
   type Team = 'townsfolk'|'outsider'|'minion'|'demon'|'traveller'|'fabled';
   type Edition = 'tb'|'bmr'|'snv'|'experimental';
   interface Jinx { with: string; reason: string; }
   interface Character {
     id: string; name: string; team: Team; edition: Edition;
     ability: string; tags?: string[]; jinxes?: Jinx[];
     setup?: boolean; icon?: string; homebrew?: boolean;
   }
   ```
3. **Завантажувач** (`server/src/data/roles.ts`): `loadRoles(): Character[]`, `getById(id)`, індекс за id.
4. Юніт-тест: усі записи мають валідну `team`/`edition`, унікальні id, jinx-посилання вказують на наявні id.

**Готово, коли:** база завантажується, тести проходять.

---

## Фаза 2 — Хоумбрю-персонажі

**Мета:** користувач може додавати власні ролі.

1. **Сховище** (`client/src/lib/homebrew.ts`): CRUD у `localStorage`, та сама схема `Character` з `homebrew: true`, згенерований `id`.
2. **Валідація на введенні:** обов'язкові `name`, `team`, `ability`; унікальність id.
3. **UI менеджера** (`client/src/components/HomebrewManager.tsx`): список, форма додавання/редагування, завантаження іконки (data-URL) або плейсхолдер.
4. Хоумбрю передається у `POST /generate` разом із параметрами (бекенд не зберігає стан).

**Готово, коли:** можна додати/змінити/видалити роль, вона зберігається між сесіями.

---

## Фаза 3 — Движок генерації (ядро бекенду)

**Мета:** цикл Генерація → Оцінка → Доопрацювання. Найважливіша й найскладніша фаза.

1. **Обгортка Claude** (`server/src/anthropic.ts`): виклик зі структурованим виводом (tool use / JSON schema), ретрай з backoff на rate-limit/мережу.
2. **Збір пулу** (`engine/pool.ts`): `buildPool(request, roles, homebrew)` — фільтр за виданнями + хоумбрю, форс must-include, прибирання exclude. Рання перевірка здійсненності (пул достатній, must-include не конфліктують) → кидає зрозумілу помилку.
3. **Промпти** (`engine/prompts.ts`):
   - системний (експертиза дизайну скриптів + евристики балансу);
   - generation-промпт (пул + обмеження → схема результату);
   - evaluation-промпт (скрипт → схема оцінки).
4. **Схеми виводу** (`engine/schemas.ts`):
   ```ts
   interface GenerationResult { picks: { team: Team; ids: string[] }[]; conceptRationale: string; }
   interface EvaluationResult {
     overall: number;            // 0–10
     axes: Record<string, number>; // infoDensity, goodEvil, redundancy, degenerate, jinxLoad, complexity, conceptFit
     critique: string;
     suggestedSwaps: { out: string; in: string; why: string }[];
   }
   ```
5. **Валідація** (`engine/validate.ts`): id існують у пулі; склад адекватний (≈13/4/4/1+ або Teensyville-розміри); must-include присутні, exclude відсутні, є ≥1 Demon. Повертає список структурних помилок.
6. **Авто-ремонт:** якщо валідація впала — повторний generation-виклик зі списком помилок (1–2 спроби).
7. **Оркестратор** (`engine/generate.ts`):
   ```
   pool = buildPool(...)
   candidate = generate(pool, constraints)         // + auto-repair
   for i in 0..maxIters:
     evalRes = evaluate(candidate)
     if evalRes.overall >= threshold: break
     candidate = generate(pool, constraints, critique=evalRes)   // + auto-repair
   return { script: best, evaluation: bestEval }   // best = найвищий overall
   ```
   Поріг і `maxIters` — із `config.ts` (стартові: 8.0 і 2). Завжди повертає найкращого кандидата (з попередженням, якщо < порогу).
8. **Тести з мок-Claude:** детерміновано перевірити спрацювання доопрацювання, поріг, ліміт ітерацій, шлях авто-ремонту, повернення best-кандидата.

**Готово, коли:** движок із мок-відповідями проходить усі сценарії циклу.

---

## Фаза 4 — API-шар

**Мета:** з'єднати фронтенд із движком, із живим прогресом.

1. **`POST /api/generate`** (`server/src/routes/generate.ts`): тіло = `GenerateRequest` (концепт, гравці, складність, must/exclude, видання, хоумбрю). Відповідь — через **SSE**: події кроків циклу (`pool`, `generating`, `validating`, `evaluating`, `refining`, `done`) + фінальний результат. Дозволяє показати прогрес.
2. **Обробка помилок** (middleware): немає/невірний ключ → 401 з підказкою; нездійсненні обмеження → 422 з поясненням; rate limit → 429 після ретраїв; інше → 500 з безпечним повідомленням.
3. Типи запиту/відповіді — у `shared/types.ts`.

**Готово, коли:** `curl`/клієнт отримує потік подій і фінальний скрипт.

---

## Фаза 5 — Фронтенд: форма концепту

1. **`ConceptForm.tsx`**: тема (textarea), діапазон гравців, складність (повзунок), чипи видань (+хоумбрю), пікери must-include/exclude з пошуком персонажів.
2. **API-клієнт** (`client/src/lib/api.ts`): відкриває SSE до `/api/generate`, віддає потік подій.
3. Стан форми + сабміт → перехід на екран прогресу.

**Готово, коли:** форма збирає валідний `GenerateRequest`.

---

## Фаза 6 — Фронтенд: прогрес і результат

1. **`GenerationProgress.tsx`**: споживає SSE-події, показує поточний крок циклу (як у секції 3 макета).
2. **`ScriptResult.tsx`**: команди з іконками (Townsfolk/Outsiders/Minions/Demon), панель балансу (загальний бал + смужки за осями + текстова критика).
3. **Дії:** `↻ Доопрацювати` (ще ітерація з приміткою користувача — повторний `/generate` з попереднім кандидатом+приміткою), `⇄ Інший варіант` (новий прогін тих самих обмежень).

**Готово, коли:** повний прохід форма → прогрес → результат працює з реальним движком.

---

## Фаза 7 — Експорт

1. **JSON-форматер** (`server/src/export/scriptJson.ts`): офіційний формат Script Tool — метадані (`_meta`: name, author) + масив id; хоумбрю як inline-об'єкти (`id`, `name`, `team`, `ability`, `image`). **Golden-тест:** результат чисто імпортується у формат офіційного інструмента.
2. **PDF-роздавалка** (`server/src/export/scriptPdf.ts`): рендер на сервері, офіційні іконки ролей, хоумбрю — плейсхолдер/завантажена іконка; групування за командами + текст здібностей.
3. **Ендпоінти/клієнт:** `POST /api/export/json` та `/api/export/pdf`, кнопки завантаження у `ScriptResult`.

**Готово, коли:** JSON імпортується в clocktower.online, PDF друкується коректно.

---

## Фаза 8 — Тести й полірування помилок

1. Юніт: валідація, JSON-форматер, фільтр пулу, генерація PDF.
2. Движок: мок-Claude сценарії (з Фази 3).
3. Golden-тест схеми JSON.
4. Frontend: компонентні тести форми та `ScriptResult`.
5. Перевірити всі гілки помилок із розділу 6 спеки на реальному UI.

---

## Фаза 9 — Запуск і документація

1. `README.md`: де взяти Anthropic API-ключ, як заповнити `.env`, `npm install` → `npm run dev`.
2. Прод-режим: `npm run build` + `npm start` (бекенд роздає `client/dist`).
3. Опційний light-E2E: один реальний наскрізний прогін як ручна перевірка.

---

## Порядок і залежності

```
Ф0 → Ф1 → Ф3 (ядро) ─┬→ Ф4 → Ф5 → Ф6 → Ф7 → Ф8 → Ф9
          Ф2 ────────┘
```

- **Ф3 (движок) — критичний шлях;** робити рано, тестувати на мок-Claude ще до UI.
- **Ф2 (хоумбрю)** незалежна від Ф3, можна паралельно.
- **Ф7 (експорт)** залежить від готового об'єкта скрипту (після Ф6, але JSON-форматер можна почати щойно є тип `Script`).

## Початкова конфігурація (config.ts)

| Параметр | Стартове значення |
|---|---|
| `MODEL` | `claude-sonnet-4-6` |
| `BALANCE_THRESHOLD` | `8.0` |
| `MAX_ITERATIONS` | `2` |
| `AUTO_REPAIR_ATTEMPTS` | `2` |
