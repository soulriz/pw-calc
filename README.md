# Калькулятор персонажа — веб-версія

Копія `calc_data/Калькулятор персонажа (тестова версія).html`, перенесена на:

- **backend** — ASP.NET Core 8 (minimal API) + EF Core + PostgreSQL (`backend/PwCalc.Api`)
- **frontend** — React 18 + TypeScript + Vite + Tailwind CSS 4 (`frontend`)

Формули ті самі (`frontend/src/calc.ts` — 1:1 з HTML-версії). Дані гри лежать у Postgres, збірки персонажів теж зберігаються в базі.

## Структура

```
data/                  items_calc.js, buffs_calc.js — дані з calc_data/tools (імпортуються в Postgres)
backend/PwCalc.Api/
  Program.cs           API: /api/meta, /api/items, /api/items/by-ids, /api/builds (CRUD)
  Data/AppDb.cs        таблиці items, stones, item_sets, buffs, meta, builds (дані — jsonb)
  Data/DataImporter.cs імпорт data/*.js при старті (повторно — коли файли змінились)
frontend/
  public/icons, ui     іконки предметів і картинки інтерфейсу з клієнта
  src/calc.ts          формули персонажа, предмети, бафи
  src/store.ts         стан збірки (localStorage) і кеш предметів з API
  src/components/      панелі: персонаж, екіпіровка, інвентар, бафи, вікно предмета, збірки
```

## Запуск (розробка)

1. PostgreSQL 16 на `localhost:5432`. Рядок підключення — у `backend/PwCalc.Api/appsettings.Development.json`
   (файл не комітиться; шаблон — `appsettings.json`). База `pwcalc` створюється сама.
2. Backend:
   ```
   cd backend/PwCalc.Api
   dotnet run
   ```
   API на http://localhost:5080. Перший старт імпортує дані (~6 тис. предметів).
3. Frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Відкрити http://localhost:5173 (запити `/api` проксуються на backend).

## Продакшн-збірка

```
cd frontend && npm run build
```
і скопіювати `frontend/dist/*` у `backend/PwCalc.Api/wwwroot/` — тоді backend віддає і сайт, і API з одного порту.

## Оновлення даних гри

Після оновлення клієнта перегенерувати дані скриптами з `calc_data/tools` (extract.py, build_calc.py, build_buffs.py),
скопіювати `calc_data/items_calc.js` і `calc_data/buffs_calc.js` у `data/` та перезапустити backend — імпорт пройде сам.
Іконки: скопіювати `calc_data/icons` і `calc_data/ui` у `frontend/public/`.
