---
name: esyduckdb-api-hub
description: >-
  Query CCC analytics PostgreSQL via the API Hub EsyDuckDB raw SQL endpoint.
  Use when wiring wall screens to live data, replacing duckdb/local handlers,
  exploring schemas (evc, meters_signal, …), or when the user describes KPI
  calculation methods and data sources for /newapi migration.
---

# EsyDuckDB через API Hub — raw SQL

База CCC analytics (PostgreSQL) доступна только через хаб, не напрямую.

- **Endpoint:** `POST https://cccdev.esyasoft.app/newapi/hub/esyduckdb/db/query`
- **Local / same-origin:** `POST /newapi/hub/esyduckdb/db/query` (Vite proxies `/newapi` → hub)
- **Headers:** `Content-Type: application/json`
- **Auth:** нет (отдельный логин к хабу не нужен)
- **Body:**
```json
{
  "sql": "<один SELECT или WITH … SELECT>",
  "limit": 100
}
```
- `limit` опционален, по умолчанию 100, максимум 1000.
- Ответ: `{ "rows": [...], "count": N, "truncated": bool, "elapsed_ms": N, "limit": N }`

**Ограничения SQL:** только чтение; один statement; без `;` внутри; без INSERT/UPDATE/DELETE/DDL. Имена колонок с пробелами — в двойных кавычках (`"New Msn"`, `"Retrofit id"`). Схемы: `evc`, `meters_signal` и др.

**Как работать с запросами пользователя:**
1. Сформулируй нужный `SELECT`/`WITH`.
2. Выполни через `curl` или HTTP на endpoint выше.
3. По `truncated: true` — увеличь `limit` или сузь фильтр / добавь пагинацию в SQL.
4. Не придумывай отдельные API под каждый отчёт — всегда raw SQL через этот endpoint.

Пример:
```bash
curl -sS 'https://cccdev.esyasoft.app/newapi/hub/esyduckdb/db/query' \
  -H 'Content-Type: application/json' \
  -d '{"sql":"SELECT COUNT(*) AS n FROM meters_signal.devices","limit":10}'
```

## Wall data migration

User explains KPI math and sources **one metric / screen at a time**. Wire pages to this hub; do not invent mappings.

1. Confirm the screen field and calculation with the user (no guessed joins).
2. Probe schema/sample rows via the SQL endpoint before coding.
3. Prefer app calls to `/newapi/hub/esyduckdb/db/query` (works locally via Vite proxy and on deploy on the same host).
4. Replace duckdb/`server/*.mjs` handlers only for the metric being migrated; leave unrelated sources alone.
5. Keep `data-unwired` until the query is verified; then remove it for that field.
