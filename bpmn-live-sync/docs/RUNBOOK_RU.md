# Пошаговый запуск проекта на macOS / Cursor / Claude Code

Ниже — практический сценарий, как запустить проект так, чтобы:
- слева у тебя был открыт **Claude Code / Cursor**,
- справа в браузере был **live BPMN viewer**,
- а потом подключились **Miro** и **Google Slides / Google Docs**.

---

## 1. Что это за проект по сути

Это не “один магический MCP”, а связка из нескольких частей:

1. **BPMN MCP server** — Claude Code или Cursor через него создаёт и правит BPMN XML.
2. **Этот репозиторий** — следит за BPMN XML файлом, парсит его и разносит изменения дальше.
3. **Browser viewer** — показывает BPMN в браузере в live-режиме.
4. **Miro sync** — создаёт элементы на доске Miro.
5. **Google Slides sync** — рисует shapes/lines в слайде.
6. **Google Docs sync** — вставляет картинку диаграммы в документ.

То есть основной поток такой:

**Prompt in Claude Code → BPMN XML changed → local sync bridge reacts → viewer / Miro / Slides / Docs get updated**

---

## 2. Что тебе нужно установить заранее

### Обязательно

1. **Node.js 22+**
2. **npm**
3. **Cursor**
4. **Claude Code**
5. **Git**

### Для полного демо

6. аккаунт **Miro**
7. **Google Cloud project** + доступ к Google Slides API / Google Docs API
8. сервисный аккаунт Google
9. отдельный **Google Slides** файл для теста
10. отдельный **Google Docs** файл для теста

---

## 3. Скачай и запусти репозиторий

В терминале:

```bash
git clone https://github.com/YOUR_USERNAME/bpmn-live-sync.git
cd bpmn-live-sync
npm install
cp .env.example .env
npm run dev
```

После запуска сервер будет доступен здесь:

```text
http://localhost:8787
```

Проверка:

```bash
curl http://localhost:8787/health
```

---

## 4. Открой live viewer справа в браузере

Открой:

```text
http://localhost:8787/viewer/
```

Это и будет твоя правая часть экрана для live demo.

Если всё запущено корректно, ты увидишь BPMN-диаграмму из файла:

```text
./examples/order-approval.bpmn
```

---

## 5. Подключи BPMN MCP в Cursor / Claude Code

### Вариант A. Cursor

Открой настройки MCP в Cursor и добавь серверы из файла:

```text
config/mcp.cursor.json
```

Тебе нужно будет подставить реальный абсолютный путь к `bpmn-js-mcp/dist/index.js`.

### Вариант B. Claude Code

Скопируй пример:

```text
.claude/settings.local.json.example
```

в локальный конфиг Claude Code и тоже подставь реальный абсолютный путь.

---

## 6. Установи внешний BPMN MCP server

Для старта используй репозиторий `dattmavis/bpmn-js-mcp`.

Примерный сценарий:

```bash
git clone https://github.com/dattmavis/bpmn-js-mcp.git
cd bpmn-js-mcp
npm install
npm run build
```

После этого пропиши путь к:

```text
/ABSOLUTE/PATH/TO/bpmn-js-mcp/dist/index.js
```

в MCP-конфиг Cursor и/или Claude Code.

---

## 7. Как работать в реальном режиме

Теперь у тебя сценарий такой:

1. Слева открыт Claude Code в Cursor.
2. Справа открыт `http://localhost:8787/viewer/`.
3. Ты даёшь промпт Claude.
4. Claude через BPMN MCP создаёт или меняет BPMN.
5. Claude сохраняет XML в файл:

```text
./examples/order-approval.bpmn
```

6. watcher ловит изменение файла.
7. браузер справа автоматически обновляется.

Если хочешь принудительно вызвать sync:

```bash
curl -X POST http://localhost:8787/sync
```

---

## 8. Какой промпт давать Claude Code

Открой файл:

```text
config/prompts.md
```

Там уже есть готовые примеры.

Базовый вариант:

```text
Create a BPMN diagram for an order approval workflow with these nodes:
- Start event: Order placed
- User task: Review order
- Exclusive gateway: Approved?
- Service task: Fulfill order
- End event: Completed
- End event: Rejected
Connect the nodes in a valid BPMN flow, export the final BPMN XML, and save it to `./examples/order-approval.bpmn`.
```

---

## 9. Подключение Miro

Есть два режима:

### Режим 1. MCP для Miro внутри Claude / Cursor

Проект использует официальный Miro MCP URL:

```json
{
  "mcpServers": {
    "miro": {
      "url": "https://mcp.miro.com/"
    }
  }
}
```

### Режим 2. Прямой sync через Miro REST API

Именно этот репозиторий отправляет BPMN в Miro через API.

В `.env` заполни:

```bash
MIRO_ACCESS_TOKEN=...
MIRO_BOARD_ID=...
MIRO_AUTO_SYNC=true
```

После этого при изменении BPMN watcher будет отправлять узлы и связи в Miro.

Ручной запуск только в Miro:

```bash
curl -X POST http://localhost:8787/sync/miro
```

### Что важно понимать

Текущая версия — это **demo / portfolio starter**. Она создаёт элементы на доске, но пока не делает умное обновление existing items по diff.

То есть для production следующая итерация должна добавить:
- хранение map BPMN element ID → Miro item ID
- обновление, а не только создание
- удаление старых элементов
- поддержку lanes / pools

---

## 10. Подключение Google Slides

Это лучший вариант для “нативной” Google-диаграммы.

### Что нужно

1. создать Google Cloud project
2. включить Google Slides API
3. создать service account
4. дать сервисному аккаунту доступ к нужной презентации
5. взять `presentationId`

### Переменные `.env`

```bash
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SLIDES_PRESENTATION_ID=...
GOOGLE_SLIDES_AUTO_SYNC=true
```

### Ручной запуск только в Slides

```bash
curl -X POST http://localhost:8787/sync/google/slides
```

### Что делает текущая реализация

- читает BPMN graph
- берёт target slide
- удаляет предыдущие page elements на слайде
- создаёт shapes
- вставляет текст
- добавляет простые линии

### Ограничение

Это работает хорошо для demo и basic BPMN, но для сложных схем нужно ещё улучшать:
- routing connectors
- точную посадку линий на connection points
- lanes, pools, annotations

---

## 11. Подключение Google Docs

Для Docs логика другая.

В Docs API картинка вставляется **по публичному URL**, поэтому нужно:

1. этот сервис рендерит `diagram.png`
2. ты публикуешь её по публичному URL
3. Docs API вставляет её в документ

### В `.env`

```bash
GOOGLE_DOCS_DOCUMENT_ID=...
PUBLIC_IMAGE_BASE_URL=https://your-public-assets.example.com/bpmn
GOOGLE_DOCS_AUTO_SYNC=true
```

### В Google Doc добавь placeholder

В нужный документ вставь текст:

```text
[[BPMN_DIAGRAM_HERE]]
```

### Ручной запуск

```bash
curl -X POST http://localhost:8787/sync/google/docs
```

### Важно

Для локального `localhost` это не сработает напрямую, потому что Docs API нужен публично доступный URL картинки.

Для demo можно использовать:
- ngrok
- Cloudflare Tunnel
- S3 public bucket
- GCS public bucket

---

## 12. Как открыть браузер через MCP

Для этого в конфиг добавлен **Playwright MCP**.

Он нужен не для самого BPMN-рендера, а чтобы Claude Code / Cursor могли:
- открыть viewer
- открыть Miro board
- открыть Google Slides
- открыть Google Docs
- переключаться между вкладками
- проверять, что sync реально прошёл

Пример установки для Claude Code:

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

---

## 13. Самый сильный demo-сценарий для LinkedIn / GitHub

Я бы показывал именно так:

### Экран 1
Слева — Cursor / Claude Code.

### Экран 2
Справа — `http://localhost:8787/viewer/`.

### Дополнительно
Во вкладках открыть:
- Miro board
- Google Slides presentation

### Сценарий
1. Пишешь prompt в Claude Code.
2. Claude меняет BPMN XML.
3. Viewer справа мгновенно обновляется.
4. Нажимаешь:

```bash
curl -X POST http://localhost:8787/sync/miro
curl -X POST http://localhost:8787/sync/google/slides
```

5. Показываешь, что тот же процесс появился в Miro и Slides.

Это уже выглядит очень сильно для:
- GitHub portfolio
- LinkedIn post
- demo для hiring manager
- AI-native PM showcase

---

## 14. Что я бы рекомендовал улучшить до production

### Обязательно
- idempotent sync
- mapping table element IDs
- retries / backoff
- audit logs
- secret management через Vault / Doppler / 1Password / AWS Secrets Manager
- public asset upload pipeline для Docs
- нормальный auth flow вместо ручных токенов

### Для красоты
- GIF capture workflow
- отдельный React dashboard
- sync history
- diff viewer “before / after BPMN”
- экспорт demo в video / GIF / SVG snapshots

---

## 15. Что сейчас уже можно честно заявлять

Можно честно говорить так:

- это **working portfolio prototype / production-leaning starter**
- он показывает **real-time BPMN workflow from prompt to visual sync**
- он объединяет **Claude Code / Cursor + BPMN MCP + browser viewer + Miro + Google Workspace**

Но не стоит пока заявлять, что это fully production-ready enterprise platform.

Правильнее формулировать:

> “I built a production-leaning real-time BPMN sync prototype that lets me prompt from Claude Code, generate BPMN via MCP, preview the workflow live in the browser, and sync the same process to Miro and Google Workspace.”

