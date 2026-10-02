# План реализации: миграция dev_profile на Vite + React 19 + TypeScript + SCSS

> **Для агентов-исполнителей:** ОБЯЗАТЕЛЬНЫЙ СУБ-СКИЛЛ: используйте
> `subagent-driven-development` (рекомендуется) или `executing-plans`, чтобы выполнять этот
> план задача за задачей. Шаги отмечены чекбоксами (`- [ ]`) для отслеживания прогресса.

**Goal:** Тот же самый сайт (визуально 1:1), но на Vite 8 + React 19 + TypeScript + SCSS,
с `AGENTS.md` и обновлённым деплоем на GitHub Pages.

**Architecture:** SPA из шести презентационных компонентов без состояния; стили — глобальные
SCSS-партиалы, имена классов сохранены дословно от старого `styles.css`, поэтому паритет
проверяется попиксельной сверкой скриншотов. Данные (навыки, достижения, контакты, меню)
вынесены в `src/data/profile.ts` и рендерятся через `.map()`.

**Tech Stack:** Vite 8 (Rolldown), React 19, TypeScript ~6.0.2, sass-embedded, oxlint,
prettier, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-02-vite-react-scss-migration-design.md`

## Global Constraints

- Node `^20.19.0 || >=22.12.0`; локально 24.15.0, в CI — 24.
- Версии строго из спеки §4: `react`/`react-dom` `^19.3.0`, `vite` `^8.3.1`,
  `@vitejs/plugin-react` `^6.1.1`, `typescript` `~6.0.2` (не 7.x),
  `sass-embedded` `^1.105.1`, `oxlint` `^1.85.0`, `@types/node` `^24.19.0`,
  `@types/react`/`@types/react-dom` `^19.3.0`, `prettier` `^3.3.3`.
- **Любая команда npm, обращающаяся к сети** (`install`, `ci`, `npx`, `create`),
  запускается с `--cache /tmp/dsh-npm-cache`. Без этого npm падает с `EPERM`: песочница DSH
  запрещает запись в `~/.npm`. `sudo chown` из подсказки npm делать нельзя — диагноз npm
  неверен. Команды `run build` / `run dev` сети не требуют и флага не нужны.
- Дев-сервер: порт **5173**, запускается фоновым job-ом (`npm run dev`). Перед curl-проверкой
  убедиться, что он отвечает; если нет — перезапустить. Все проверки в задачах идут против
  `http://localhost:5173`.
  **Проверено на практике:** Vite 8 слушает только IPv6 (`lsof` показывает `[::1]:5173`),
  поэтому `http://127.0.0.1:5173` даёт отказ соединения (`curl` exit 7), а `localhost`
  работает. Использовать именно `localhost`; `server.host` в конфиге не переопределять.
- `base: './'` в `vite.config.ts` обязателен: сайт публикуется в подпапку
  `https://epik7th.github.io/profile/`.
- SCSS: только `@use`/`@forward`, никакого `@import`. Цвета и шрифты — только через
  переменные, хардкод запрещён.
- TS: `verbatimModuleSyntax` включён, типы импортируются как `import type`.
- Отступы — табы, ширина 4 (`.prettierrc`: `useTabs: true`, `tabWidth: 4`).
- Разметка и классы переносятся дословно; имена классов не меняются.
- **Известные дефекты вёрстки не исправляются** (спека §10): мобильный overflow из-за
  `white-space: nowrap`, `zoom: 0.6`, отсутствие favicon.
- Файлы `src/index.html` и `src/styles.css` удаляются только в последней задаче, после
  успешной сверки скриншотов.

**Отличие от спеки §7.3 (сознательное).** Градиенты заданы не списком, а четырьмя
переменными плюс `$gradient-stop`, потому что поведение Sass при передаче списка в аргументы
обычной CSS-функции неочевидно, а значения обязаны остаться прежними. Цвета те же:
`#c43ce1`/`#008cff 80%` и `#00879f`/`#00ff95 80%`.

---

## Структура файлов

| Файл | Ответственность |
|---|---|
| `package.json` | зависимости, скрипты, `type: module`, `engines` |
| `vite.config.ts` | плагин React + `base: './'` |
| `tsconfig.json` / `.app.json` / `.node.json` | конфиги типов из апстрим-шаблона |
| `index.html` | оболочка: `#root` + вход `main.tsx` |
| `src/main.tsx` | монтирование React, импорт глобальных стилей |
| `src/App.tsx` | композиция секций |
| `src/data/profile.ts` | текстовые данные страницы и их типы |
| `src/components/*.tsx` | по одному презентационному компоненту на секцию |
| `src/styles/main.scss` | точка входа стилей, только `@use` |
| `src/styles/abstracts/*` | переменные и миксины |
| `src/styles/base/*` | шрифты, база, анимации |
| `src/styles/layout/*` | каркас: шапка, hero, секции |
| `src/styles/components/*` | `typewriter`, `tags`, `contacts` |
| `.github/workflows/deploy-pages.yml` | CI: сборка Vite → `dist/` → Pages |
| `AGENTS.md` | описание проекта для AI-агентов |

---

### Task 1: Тулинг, конфиги и оболочка приложения

**Files:**
- Modify: `package.json` (полностью)
- Modify: `.prettierrc`
- Create: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `index.html`, `src/vite-env.d.ts`, `src/main.tsx`, `src/App.tsx`
- Modify: `package-lock.json` (сгенерируется `npm install`)

**Interfaces:**
- Consumes: ничего.
- Produces: `App` — компонент без пропсов, default export из `src/App.tsx`;
  скрипты `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`;
  `main.tsx` монтирует `<App />` в `#root`.

- [ ] **Step 1: Заменить `package.json` целиком**

```json
{
	"name": "dev_profile",
	"private": true,
	"version": "1.0.0",
	"description": "About developer page",
	"type": "module",
	"author": "epik7th",
	"license": "ISC",
	"engines": {
		"node": "^20.19.0 || >=22.12.0"
	},
	"scripts": {
		"dev": "vite",
		"build": "tsc -b && vite build",
		"preview": "vite preview",
		"typecheck": "tsc -b",
		"lint": "oxlint",
		"format": "prettier --write .",
		"format:check": "prettier --check ."
	},
	"dependencies": {
		"react": "^19.3.0",
		"react-dom": "^19.3.0"
	},
	"devDependencies": {
		"@types/node": "^24.19.0",
		"@types/react": "^19.3.0",
		"@types/react-dom": "^19.3.0",
		"@vitejs/plugin-react": "^6.1.1",
		"oxlint": "^1.85.0",
		"prettier": "^3.3.3",
		"sass-embedded": "^1.105.1",
		"typescript": "~6.0.2",
		"vite": "^8.3.1"
	}
}
```

Поле `main: "index.js"` удалено — такого файла нет.

- [ ] **Step 2: Создать конфиги TypeScript и Vite**

`tsconfig.json` — дословно из апстрим-шаблона:

```json
{
	"files": [],
	"references": [
		{ "path": "./tsconfig.app.json" },
		{ "path": "./tsconfig.node.json" }
	]
}
```

`tsconfig.app.json` — дословно из шаблона (в нём нет `strict`; копируем как есть, не
добавляем от себя):

```json
{
	"compilerOptions": {
		"tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
		"target": "es2023",
		"lib": ["ES2023", "DOM"],
		"module": "esnext",
		"types": ["vite/client"],
		"allowArbitraryExtensions": true,
		"skipLibCheck": true,

		/* Bundler mode */
		"moduleResolution": "bundler",
		"allowImportingTsExtensions": true,
		"verbatimModuleSyntax": true,
		"moduleDetection": "force",
		"noEmit": true,
		"jsx": "react-jsx",

		/* Linting */
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"erasableSyntaxOnly": true,
		"noFallthroughCasesInSwitch": true
	},
	"include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
	"compilerOptions": {
		"tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
		"target": "es2023",
		"lib": ["ES2023"],
		"types": ["node"],
		"skipLibCheck": true,

		/* Bundler mode */
		"module": "nodenext",
		"allowImportingTsExtensions": true,
		"verbatimModuleSyntax": true,
		"moduleDetection": "force",
		"noEmit": true,

		/* Linting */
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"erasableSyntaxOnly": true,
		"noFallthroughCasesInSwitch": true
	},
	"include": ["vite.config.ts"]
}
```

`vite.config.ts` — шаблон плюс `base: './'`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
	base: './',
	plugins: [react()],
})
```

- [ ] **Step 3: Обновить `.prettierrc`**

Добавить `"useTabs": true` и заменить `"tabWidth": 2` на `"tabWidth": 4`; остальное не
трогать. Итог:

```json
{
	"semi": false,
	"trailingComma": "es5",
	"singleQuote": true,
	"printWidth": 1000,
	"tabWidth": 4,
	"useTabs": true,
	"arrowParens": "always",
	"endOfLine": "auto",
	"proseWrap": "never",
	"bracketSpacing": true
}
```

- [ ] **Step 4: Установить зависимости**

Run:
```bash
npm install --cache /tmp/dsh-npm-cache --no-audit --no-fund
```
Expected: команда завершается без ошибок, `package-lock.json` обновлён, в `node_modules`
появились `vite`, `react`, `sass-embedded`, `typescript`, `oxlint`.
Если снова `EPERM` — **не** запускать `sudo chown`, а сообщить о блокировке.

- [ ] **Step 5: Создать оболочку**

`index.html`:

```html
<!doctype html>
<html lang="ru">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>WEB-Developer Ruslan Khakimov</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/main.tsx"></script>
	</body>
</html>
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
	throw new Error('Не найден элемент #root в index.html')
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>
)
```

`src/App.tsx` — на этом шаге заглушка; страница будет пустой, это ожидаемо:

```tsx
export default function App() {
	return null
}
```

- [ ] **Step 6: Проверить типы и сборку**

Run:
```bash
npm run typecheck && npm run build
```
Expected: обе команды успешны, создан `dist/index.html`.
Если `typecheck` падает с `No inputs were found in config file` — значит
`src/vite-env.d.ts` не создан (шаг 5).

- [ ] **Step 7: Проверить дев-сервер**

Run (фоновым job-ом, порт 5173):
```bash
npm run dev
```
Затем:
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/
```
Expected: `200`. Дев-сервер оставить работающим для следующих задач.

- [ ] **Step 8: Коммит**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json .prettierrc index.html src/vite-env.d.ts src/main.tsx src/App.tsx
git commit -m "build: перевести проект на Vite 8 + React 19 + TypeScript"
```

---

### Task 2: SCSS-инфраструктура и базовый слой

**Files:**
- Create: `src/styles/main.scss`, `src/styles/abstracts/_index.scss`,
  `src/styles/abstracts/_variables.scss`, `src/styles/abstracts/_mixins.scss`,
  `src/styles/base/_fonts.scss`, `src/styles/base/_base.scss`,
  `src/styles/base/_animations.scss`
- Modify: `src/main.tsx` (добавить импорт стилей)

**Interfaces:**
- Consumes: `App` из Task 1.
- Produces: `@use '../abstracts' as *` из любого партиала на один уровень глубины;
  переменные и миксины:
  `$color-bg`, `$color-text`, `$color-heading`, `$color-link`, `$color-link-hover`,
  `$color-nav-link`, `$color-nav-link-hover`, `$color-accent-pink`, `$color-border`,
  `$color-tag-text`, `$color-tag-hover`, `$color-footer-bg`, `$color-header-bg`,
  `$color-white`, `$color-bracket`, `$color-icon`, `$color-icon-hover`,
  `$gradient-logo-from`, `$gradient-logo-to`, `$gradient-title-from`, `$gradient-title-to`,
  `$gradient-stop`, `$font-main`, `$breakpoint-mobile`;
  `@mixin bracket-frame($left, $right, $color)`, `@mixin gradient-text($from, $to, $stop)`.

- [ ] **Step 1: Создать `src/styles/abstracts/_variables.scss`**

```scss
// Палитра и базовые значения. Источник — src/styles.css (до миграции).

$color-bg: black;
$color-text: #6aab73;
$color-heading: #56a8f5;
$color-link: #548af7;
$color-link-hover: #bea1ef;
$color-nav-link: #42c3d4;
$color-nav-link-hover: aqua;
$color-accent-pink: #cc55b9;
$color-border: #27272a;
$color-tag-text: #75757e;
$color-tag-hover: #00ff95;
$color-footer-bg: #18181a;
$color-header-bg: #ffffff30;
$color-white: #fff;
$color-bracket: rgba(255, 255, 255, 0.5);
$color-icon: rgba(255, 255, 255, 0.25);
$color-icon-hover: rgba(255, 255, 255, 0.5);

// Градиенты: у второго цвета позиция останова 80% — часть значения.
$gradient-logo-from: #c43ce1;
$gradient-logo-to: #008cff;
$gradient-title-from: #00879f;
$gradient-title-to: #00ff95;
$gradient-stop: 80%;

$font-main: 'DevFont', sans-serif;
$breakpoint-mobile: 600px;
```

- [ ] **Step 2: Создать `src/styles/abstracts/_mixins.scss`**

```scss
// Обрамление из квадратных скобок: логотип и пункты меню при наведении.
@mixin bracket-frame($left, $right, $color) {
	&::before,
	&::after {
		position: absolute;
		color: $color;
	}

	&::before {
		content: '[';
		margin-left: $left;
	}

	&::after {
		content: ']';
		margin-right: $right;
	}
}

// Градиентный текст с прозрачной заливкой.
@mixin gradient-text($from, $to, $stop) {
	background: -webkit-linear-gradient(45deg, $from, $to $stop);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}
```

- [ ] **Step 3: Создать `src/styles/abstracts/_index.scss`**

```scss
@forward 'variables';
@forward 'mixins';
```

- [ ] **Step 4: Создать `src/styles/base/_fonts.scss`**

Четыре `@font-face` из `src/styles.css:3-22` дословно; в путях `./assets/fonts/` заменить
на `../../assets/fonts/`:

```scss
@font-face {
	font-family: 'DevFont';
	src: url('../../assets/fonts/JetBrainsMono-Light.woff2') format('woff2');
}
@font-face {
	font-family: 'DevFont';
	src: url('../../assets/fonts/JetBrainsMono-Bold.woff2') format('woff2');
	font-weight: bold;
}
@font-face {
	font-family: 'DevFont';
	src: url('../../assets/fonts/JetBrainsMono-LightItalic.woff2') format('woff2');
	font-style: italic;
}
@font-face {
	font-family: 'DevFont';
	src: url('../../assets/fonts/JetBrainsMono-BoldItalic.woff2') format('woff2');
	font-weight: bold;
	font-style: italic;
}
```

- [ ] **Step 5: Создать `src/styles/base/_base.scss`**

Из `src/styles.css:24-65` плюс мобильное правило для `body::before` из `src/styles.css:286-288`.
Значения цветов заменяются переменными; `url('./assets/images/bg.jpg')` →
`url('../../assets/images/bg.jpg')`.

```scss
@use '../abstracts' as *;

body,
html {
	padding: 0;
	margin: 0;
	scroll-behavior: smooth;
}
body {
	font-family: $font-main;
	font-optical-sizing: auto;
	font-weight: 200;
	font-style: normal;
	background: $color-bg;
	color: $color-text;
	padding-top: 2rem;
	position: relative;
}
body::before {
	content: '';
	background: url('../../assets/images/bg.jpg') no-repeat 45% 0;
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: -1;
	opacity: 0.3;
}

h1,
h2,
h3,
h4 {
	color: $color-heading;
}

a {
	color: $color-link;
	transition: color 200ms linear;
}
a:hover {
	color: $color-link-hover;
}

@media (max-width: $breakpoint-mobile) {
	body::before {
		background-position-x: 23%;
	}
}
```

- [ ] **Step 6: Создать `src/styles/base/_animations.scss`**

Все четыре `@keyframes` проекта, дословно: `slideLeft` и `slideRight` из
`src/styles.css:153-170`, `typing` и `blink-caret` из `src/styles.css:239-255`.

- [ ] **Step 7: Создать `src/styles/main.scss`**

Порядок `@use` фиксирован; он влияет только на порядок вывода CSS, а селекторы между
собой не конфликтуют (проверяется сверкой скриншотов в Task 7).

```scss
@use 'base/fonts';
@use 'base/base';
@use 'base/animations';
```

Это полное содержимое файла на данном шаге. Файлов `layout/*` и `components/*` ещё нет, а
`@use` несуществующего партиала — ошибка сборки, поэтому строки для них добавляются в Task 3
и Task 4. Итоговый порядок после всех задач:

```scss
@use 'base/fonts';
@use 'base/base';
@use 'base/animations';
@use 'layout/header';
@use 'layout/hero';
@use 'layout/sections';
@use 'components/typewriter';
@use 'components/tags';
@use 'components/contacts';
```

- [ ] **Step 8: Подключить стили в `src/main.tsx`**

Добавить импорт после импортов React:

```tsx
import './styles/main.scss'
```

- [ ] **Step 9: Проверить, что Sass компилируется и ассеты отдаются**

Run:
```bash
npm run build
```
Expected: сборка успешна, в `dist/assets/` есть CSS-файл.

Проверить содержимое собранного CSS:
```bash
grep -l "DevFont" dist/assets/*.css
grep -c "body::before" dist/assets/*.css
```
Expected: файл найден, счётчик больше нуля.

Проверить ассеты на работающем дев-сервере:
```bash
for p in /src/assets/images/bg.jpg /src/assets/fonts/JetBrainsMono-Light.woff2; do
  printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:5173$p"
done
```
Expected: оба `200`.

- [ ] **Step 10: Коммит**

```bash
git add src/styles src/main.tsx
git commit -m "style: разложить CSS на SCSS-партиалы, добавить базовый слой"
```

---

### Task 3: Шапка и hero-секция

**Files:**
- Create: `src/data/profile.ts`, `src/components/Header.tsx`, `src/components/Hero.tsx`,
  `src/styles/layout/_header.scss`, `src/styles/layout/_hero.scss`,
  `src/styles/components/_typewriter.scss`
- Modify: `src/App.tsx`, `src/styles/main.scss`

**Interfaces:**
- Consumes: переменные и миксины из Task 2 (`bracket-frame`, `gradient-text`,
  `$gradient-logo-from`, `$gradient-logo-to`, `$gradient-stop`, `$gradient-title-from`,
  `$gradient-title-to`, `$color-bracket`, `$color-white`, `$color-nav-link`,
  `$color-nav-link-hover`, `$color-header-bg`, `$color-accent-pink`, `$breakpoint-mobile`).
- Produces: из `src/data/profile.ts` — `navLinks: NavLink[]`, `achievements: string[]`,
  `skills: string[]`, `contacts: Contact[]`, типы `NavLink`, `Contact`;
  компоненты `Header`, `Hero` — без пропсов, default export.

- [ ] **Step 1: Создать `src/data/profile.ts` (целиком)**

Файл создаётся полностью сразу, чтобы не править его дважды; `achievements`, `skills`,
`contacts` начнут использоваться в Task 4.

```ts
export type NavLink = {
	href: string
	label: string
}

export type Contact = {
	label: string
	href: string
	icon: 'telegram' | 'mail'
}

export const navLinks: NavLink[] = [
	{ href: '#about', label: 'Обо мне' },
	{ href: '#achievements', label: 'Достижения' },
	{ href: '#skills', label: 'Навыки' },
	{ href: '#contact', label: 'Контакты' },
]

export const achievements: string[] = [
	'Интеграция приложений с крупными операторами мобильной связи РФ',
	'Интеграция со службами доставок',
	'Интеграция с платежными эквайрингами',
	'Разработка микросервисной архитектуры',
	'PWA приложения',
	'Telegram боты',
]

export const skills: string[] = [
	'Typescript',
	'Javascript',
	'PostgreSQL',
	'Redis',
	'Express',
	'React',
	'Angular',
	'WS',
	'PWA',
	'NodeJS',
	'SCSS',
	'HTML5',
]

export const contacts: Contact[] = [
	{ label: 'Написать в telegram @epik7th', href: 'https://t.me/epik7th', icon: 'telegram' },
	{
		label: 'Написать на почту epik7th@gmail.com',
		href: 'mailto:epik7th@gmail.com',
		icon: 'mail',
	},
]
```

- [ ] **Step 2: Создать `src/styles/layout/_header.scss`**

Из `src/styles.css:66-104` и `171-201`; повторяющийся паттерн со скобками заменяется
миксином, цвета — переменными, медиазапрос для `header` (`src/styles.css:283-285`)
переезжает в конец файла.

Ориентир для `.logo` (порядок свойств сохранён, `::before`/`::after` даёт миксин):

```scss
@use '../abstracts' as *;

.logo {
	animation: slideRight 500ms ease-out 0s 1 normal none;
	font-weight: 100;
	padding: 0 1rem;
	font-size: 24px;
	position: relative;
	margin-left: 10px;
	@include bracket-frame(-15px, -12px, $color-bracket);
}
.logo > span {
	font-weight: 700;
	color: $color-white;
	@include gradient-text($gradient-logo-from, $gradient-logo-to, $gradient-stop);
}
```

Далее — `header` (строки 93-104, `background: #ffffff30` → `$color-header-bg`),
`.header-nav` (171-173), `.header-nav ul` (174-181), `.header-nav ul > li > a` (182-185,
`color: #42c3d4` → `$color-nav-link`), и вместо блоков 186-201 один:

```scss
.header-nav ul > li > a:hover {
	@include bracket-frame(-10px, -12px, $color-white);
	color: $color-nav-link-hover;
	transition: color 200ms linear;
}
```

В конце:

```scss
@media (max-width: $breakpoint-mobile) {
	header {
		zoom: 0.6;
	}
}
```

- [ ] **Step 3: Создать `src/styles/layout/_hero.scss`**

Из `src/styles.css:119-152` дословно, с двумя заменами: `.description` — `color: #cc55b9` →
`$color-accent-pink`; `.main-title-photo .title` — три строки градиента заменяются на
`@include gradient-text($gradient-title-from, $gradient-title-to, $gradient-stop);`.
Файл начинается с `@use '../abstracts' as *;`.

- [ ] **Step 4: Создать `src/styles/components/_typewriter.scss`**

Из `src/styles.css:231-238`; `border-right: 0.15em solid #ffffff` →
`0.15em solid $color-white`. Файл начинается с `@use '../abstracts' as *;`.
Сами `@keyframes typing`/`blink-caret` уже лежат в `base/_animations.scss` (Task 2).

- [ ] **Step 5: Создать `src/components/Header.tsx`**

```tsx
import { navLinks } from '../data/profile'

export default function Header() {
	return (
		<header>
			<div className="logo">
				<span>epik7th</span>
			</div>
			<nav className="header-nav">
				<ul>
					{navLinks.map((link) => (
						<li key={link.href}>
							<a href={link.href}>{link.label}</a>
						</li>
					))}
				</ul>
			</nav>
		</header>
	)
}
```

- [ ] **Step 6: Создать `src/components/Hero.tsx`**

Обратить внимание на заголовок: HTML-сущности `&lt;`/`&gt;` из старой разметки в JSX
**не работают**, вместо них строковые литералы.

```tsx
import photo from '../assets/images/photo.jpeg'

export default function Hero() {
	return (
		<section id="main">
			<article className="content">
				<div className="main-title-photo">
					<div className="main-text">
						<div className="description typewriter">Привет! Я Руслан Хакимов -</div>
						<div className="title">
							{'<Fullstack'} <br /> {'web Developer / >'}
						</div>
					</div>
					<div className="photo">
						<img src={photo} alt="Фото профиля" />
					</div>
				</div>
			</article>
		</section>
	)
}
```

- [ ] **Step 7: Дописать `main.scss` и собрать `App.tsx`**

Добавить в конец `src/styles/main.scss` три строки — файл станет таким:

```scss
@use 'base/fonts';
@use 'base/base';
@use 'base/animations';
@use 'layout/header';
@use 'layout/hero';
@use 'components/typewriter';
```

`src/App.tsx`:

```tsx
import Header from './components/Header'
import Hero from './components/Hero'

export default function App() {
	return (
		<>
			<Header />
			<Hero />
		</>
	)
}
```

- [ ] **Step 8: Проверить типы, линтер и рендер**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: все три команды успешны.

Проверить, что страница содержит шапку и заголовок:
```bash
curl -s http://localhost:5173/ | head -5
```
Expected: HTML оболочки; содержимое рендерит React, поэтому проверка — скриншотом:

```bash
cat > /tmp/dsh-shot.sh <<'EOF'
#!/bin/bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="$1"; OUT="$2"; SIZE="$3"; BUDGET="${4:-10000}"
PROFILE="$(mktemp -d /tmp/dsh-chrome-XXXXXX)"
rm -f "$OUT"
"$CHROME" --headless=new --no-sandbox --disable-gpu --disable-crash-reporter --disable-breakpad \
  --disable-dev-shm-usage --no-first-run --hide-scrollbars \
  --user-data-dir="$PROFILE" --crash-dumps-dir="$PROFILE/crash" \
  --window-size="$SIZE" --virtual-time-budget="$BUDGET" \
  --screenshot="$OUT" "$URL" >/dev/null 2>&1 &
pid=$!
for _ in $(seq 1 60); do [ -s "$OUT" ] && sleep 2 && break; sleep 1; done
kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
pkill -f "user-data-dir=$PROFILE" 2>/dev/null
rm -rf "$PROFILE"
[ -s "$OUT" ] && echo "OK   $OUT ($(stat -f%z "$OUT") байт)" || { echo "FAIL $OUT"; exit 1; }
EOF
chmod +x /tmp/dsh-shot.sh
/tmp/dsh-shot.sh "http://localhost:5173/" /tmp/task3.png "1440,900"
```
Expected: `OK`, на снимке — шапка с логотипом и меню, блок `<Fullstack web Developer / >`
с градиентом, фото, печатающийся текст. Часть секций пока отсутствует — это нормально.

- [ ] **Step 9: Коммит**

```bash
git add src/data/profile.ts src/components/Header.tsx src/components/Hero.tsx src/styles/layout/_header.scss src/styles/layout/_hero.scss src/styles/components/_typewriter.scss src/styles/main.scss src/App.tsx
git commit -m "feat: перенести шапку и hero-секцию в React-компоненты"
```

---

### Task 4: Остальные секции, полная страница

**Files:**
- Create: `src/components/About.tsx`, `src/components/Achievements.tsx`,
  `src/components/Skills.tsx`, `src/components/Contacts.tsx`,
  `src/styles/layout/_sections.scss`, `src/styles/components/_tags.scss`,
  `src/styles/components/_contacts.scss`
- Modify: `src/App.tsx`, `src/styles/main.scss`

**Interfaces:**
- Consumes: `achievements`, `skills`, `contacts` из `src/data/profile.ts` (Task 3);
  `$color-border`, `$color-tag-text`, `$color-tag-hover`, `$color-footer-bg`,
  `$color-icon`, `$color-icon-hover` (Task 2).
- Produces: компоненты `About`, `Achievements`, `Skills`, `Contacts` — без пропсов,
  default export; `App` рендерит все шесть секций.

- [ ] **Step 1: Создать `src/styles/layout/_sections.scss`**

Из `src/styles.css:109-118` и `277-281`; `.card` (105-108) **не переносится** — мёртвый
класс. `background-color: #18181a` → `$color-footer-bg`. Файл начинается с
`@use '../abstracts' as *;`.

- [ ] **Step 2: Создать `src/styles/components/_tags.scss`**

Из `src/styles.css:256-276`: `#27272a` → `$color-border`, `#75757e` → `$color-tag-text`,
`#00ff95` → `$color-tag-hover`. Файл начинается с `@use '../abstracts' as *;`.

- [ ] **Step 3: Создать `src/styles/components/_contacts.scss`**

Из `src/styles.css:202-230`: `rgba(255, 255, 255, 0.25)` → `$color-icon`,
`rgba(255, 255, 255, 0.5)` → `$color-icon-hover`, а в масках
`url('./assets/icons/…)` → `url('../../assets/icons/…)`. Файл начинается с
`@use '../abstracts' as *;`.

- [ ] **Step 4: Создать `src/components/About.tsx`**

Разметка из `src/index.html:38-55` дословно, `class` → `className`:

```tsx
export default function About() {
	return (
		<section id="about">
			<article className="content">
				<h2>#Обо мне</h2>
				<p>Работаю ведущим разработчиком в компании SIM2M</p>
				<p>
					Более 9 лет коммерческого опыта в сфере разработки web-приложений. <br />
					Разрабатывал с нуля приложения:
				</p>
				<ul>
					<li>CRM</li>
					<li>Личный кабинет клиента</li>
					<li>Партнерские кабинеты</li>
					<li>REST-API</li>
					<li>Billing</li>
				</ul>
				<p>
					Все приложения разрабатывал на JavaScript и front-end и back-end, хорошо владею SQL
					языком
				</p>
			</article>
		</section>
	)
}
```

- [ ] **Step 5: Создать `src/components/Achievements.tsx`**

```tsx
import { achievements } from '../data/profile'

export default function Achievements() {
	return (
		<section id="achievements">
			<article className="content">
				<h2>#Достижения</h2>
				<ul>
					{achievements.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</article>
		</section>
	)
}
```

- [ ] **Step 6: Создать `src/components/Skills.tsx`**

```tsx
import { skills } from '../data/profile'

export default function Skills() {
	return (
		<section id="skills">
			<article className="content">
				<h2>#Навыки</h2>
				<div className="tags">
					{skills.map((skill) => (
						<div key={skill}>{skill}</div>
					))}
				</div>
			</article>
		</section>
	)
}
```

- [ ] **Step 7: Создать `src/components/Contacts.tsx`**

```tsx
import { contacts } from '../data/profile'

export default function Contacts() {
	return (
		<footer id="contact">
			<div className="content">
				<h2>#Контакты</h2>
				<div className="contact-container">
					{contacts.map((contact) => (
						<div className="contact-row" key={contact.href}>
							<i className={`contact-row-icon ${contact.icon}-icon`} />
							<a href={contact.href}>{contact.label}</a>
						</div>
					))}
				</div>
			</div>
		</footer>
	)
}
```

- [ ] **Step 8: Дописать `main.scss` и `App.tsx`**

В `src/styles/main.scss` вставить `@use 'layout/sections';` после строки
`@use 'layout/hero';` и дописать в конец `tags` и `contacts`. Итоговый вид файла:

```scss
@use 'base/fonts';
@use 'base/base';
@use 'base/animations';
@use 'layout/header';
@use 'layout/hero';
@use 'layout/sections';
@use 'components/typewriter';
@use 'components/tags';
@use 'components/contacts';
```

`src/App.tsx` — итоговый вид:

```tsx
import About from './components/About'
import Achievements from './components/Achievements'
import Contacts from './components/Contacts'
import Header from './components/Header'
import Hero from './components/Hero'
import Skills from './components/Skills'

export default function App() {
	return (
		<>
			<Header />
			<Hero />
			<About />
			<Achievements />
			<Skills />
			<Contacts />
		</>
	)
}
```

- [ ] **Step 9: Проверить, что страница собрана целиком**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: успешно.

```bash
/tmp/dsh-shot.sh "http://localhost:5173/" /tmp/task4-desktop.png "1440,2800"
```
Expected: на снимке все секции — «#Обо мне», «#Достижения», «#Навыки» с 12 тегами,
«#Контакты» с двумя строками и иконками. Проверить глазами, что фон, фото и шрифты на месте.

- [ ] **Step 10: Коммит**

```bash
git add src/components src/styles src/App.tsx
git commit -m "feat: перенести остальные секции страницы в React-компоненты"
```

---

### Task 5: Workflow для GitHub Pages под сборку Vite

**Files:**
- Delete: `.github/workflows/jekyll-gh-pages.yml`
- Create: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: скрипты `build` и `package-lock.json` из Task 1.
- Produces: CI-пайплайн, публикующий `dist/`.

- [ ] **Step 1: Заменить workflow**

Причина: старый файл публикует `src/` через `actions/jekyll-build-pages@v1`, а после
миграции `index.html` там больше нет — сайт отдал бы 404.

```bash
git rm .github/workflows/jekyll-gh-pages.yml
```

Создать `.github/workflows/deploy-pages.yml`:

```yaml
# Сборка Vite и публикация dist/ на GitHub Pages
name: Deploy to GitHub Pages

on:
  # Runs on pushes targeting the default branch
  push:
    branches: ["main"]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
# However, do NOT cancel in-progress runs as we want to allow these production deployments to complete.
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Проверить YAML парсером и глазами**

Run:
```bash
python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/deploy-pages.yml')); print(sorted(d['jobs'].keys())); print([s.get('uses') or s.get('run') for s in d['jobs']['build']['steps']])"
```
Expected: `['build', 'deploy']` и список шагов, среди которых нет ни одного с `jekyll`.

Дополнительно убедиться, что упоминаний Jekyll не осталось:
```bash
grep -ri jekyll .github/ && echo "ОСТАЛСЯ JEKYLL" || echo "Jekyll не упоминается"
```
Expected: `Jekyll не упоминается`.

- [ ] **Step 3: Убедиться, что `npm ci` в CI сработает**

`npm ci` в CI упадёт, если `package-lock.json` рассинхронизирован с `package.json`.
Проверить сухим прогоном (без `--dry-run` команда удалила бы `node_modules`):

Run:
```bash
npm ci --dry-run --cache /tmp/dsh-npm-cache --no-audit --no-fund
```
Expected: завершается успешно, без ошибок вида `npm ci can only install packages when your
package.json and package-lock.json are in sync`.

- [ ] **Step 4: Коммит**

```bash
git add .github/workflows
git commit -m "ci: публиковать dist/ вместо Jekyll-сборки src/"
```

---

### Task 6: `AGENTS.md`

**Files:**
- Create: `AGENTS.md`

**Interfaces:**
- Consumes: всё вышеописанное (структура, скрипты, версии, конвенции).
- Produces: документ для AI-агентов; на код не влияет.

- [ ] **Step 1: Создать `AGENTS.md`**

````markdown
# AGENTS.md — dev_profile

## Что это

Личная страница-портфолио веб-разработчика (Руслан Хакимов, `epik7th`).
Одностраничное приложение без бэкенда: только разметка, стили и текстовые данные.
Публикуется на GitHub Pages: <https://epik7th.github.io/profile/>.

## Стек и версии

| Пакет | Версия | Примечание |
|---|---|---|
| react, react-dom | ^19.3.0 | |
| vite | ^8.3.1 | сборщик на Rolldown |
| @vitejs/plugin-react | ^6.1.1 | требует `vite ^8.0.0` |
| typescript | ~6.0.2 | **не 7.x**: версия официального шаблона Vite |
| sass-embedded | ^1.105.1 | Vite использует его автоматически для `.scss` |
| oxlint | ^1.85.0 | линтер, замена ESLint |
| prettier | ^3.3.3 | форматирование |

Node: `^20.19.0 || >=22.12.0` (в CI — 24).

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | дев-сервер с HMR на <http://localhost:5173> |
| `npm run build` | `tsc -b && vite build` — **ошибки типов валят сборку** |
| `npm run preview` | просмотр собранного `dist/` |
| `npm run typecheck` | только проверка типов |
| `npm run lint` | oxlint |
| `npm run format` / `npm run format:check` | prettier |

## Структура

```
index.html                  оболочка: <div id="root"> + /src/main.tsx
src/main.tsx                монтирование React + импорт глобальных стилей
src/App.tsx                 композиция секций
src/data/profile.ts         тексты: меню, достижения, навыки, контакты
src/components/*.tsx        по компоненту на секцию, без пропсов
src/styles/main.scss        точка входа стилей, только @use
src/styles/abstracts/       переменные и миксины
src/styles/base/            шрифты, база, анимации
src/styles/layout/          шапка, hero, секции
src/styles/components/      typewriter, tags, contacts
src/assets/                 изображения, иконки, шрифты
.github/workflows/          CI: сборка и деплой на GitHub Pages
```

## Конвенции

- **SCSS:** только `@use`/`@forward`, `@import` запрещён (устарел в Sass).
- **Цвета и шрифты** — только через переменные из `abstracts/_variables.scss`, хардкод
  в партиалах запрещён.
- **TS:** `verbatimModuleSyntax` включён — типы импортируются как
  `import type { Contact } from '../data/profile'`.
- **Отступы** — табы, ширина 4 (`.prettierrc` + `.editorconfig` согласованы).
- **Имена классов** в стилях и JSX сохраняются как есть, исторические; не переименовывать.
- **Тексты и списки** — в `src/data/profile.ts`, а не в компонентах.
- Пути в `url()` внутри SCSS — относительно **своего партиала** (`../../assets/...`).

## Как добавить новую секцию

1. данные — в `src/data/profile.ts`;
2. компонент — `src/components/Имя.tsx`, default export, без пропсов;
3. подключить в `src/App.tsx`;
4. стили — `src/styles/layout/_имя.scss` или `src/styles/components/_имя.scss`;
5. `@use` новой партиал-папки/файла в `src/styles/main.scss`.

## Подводные камни

- **npm падает с `EPERM` и советует `sudo chown`.** Диагноз неверен: это песочница,
  запрещающая запись в `~/.npm`. Обход — `npm install --cache /tmp/dsh-npm-cache`.
  `sudo chown` выполнять не нужно.
- **`tsc -b` не проверяет типы в `vite build`** — они проверяются отдельным шагом, поэтому
  `npm run build` включает `tsc -b`.
- **HTML-сущности в JSX не работают:** `&lt;` выведется как текст. Писать
  `{'<Fullstack'}`.
- **`dist/` и `docs/verification/` не коммитятся** (второе — локальные скриншоты сверки).
- Версии из таблицы выше не менять поодиночке: `@vitejs/plugin-react` 6 требует Vite 8,
  TypeScript взят из официального шаблона.

## Известные особенности (не баги миграции, сохраняются намеренно)

1. На мобильной ширине контент обрезается справа: `.typewriter` с `white-space: nowrap`
   создаёт горизонтальный overflow.
2. `zoom: 0.6` в медиазапросе — нестандартное свойство, работает в Chrome/Safari.
3. `favicon.ico` отсутствует — дев-сервер отдаёт 404 на `/favicon.ico`.

## Чего не делать

- Не переписывать на роутер или фреймворк без явного запроса.
- Не «чинить» особенности из списка выше попутно: это отдельные задачи.
- Не удалять неиспользуемые `.woff2` из `src/assets/fonts/` без проверки — 4 из 18
  подключены как `DevFont`.
````

- [ ] **Step 2: Проверить, что документ не врёт**

Дев-сервер из Task 1 должен быть запущен; второй экземпляр не поднимать (порт занят).

Run:
```bash
for p in / /src/main.tsx; do printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:5173$p"; done
```
Expected: `200` на оба пути — порт 5173 из документа совпадает с фактическим.
Если сервер не отвечает, перезапустить `npm run dev` фоновым job-ом и повторить.

- [ ] **Step 3: Коммит**

```bash
git add AGENTS.md
git commit -m "docs: добавить AGENTS.md с описанием проекта"
```

---

### Task 7: Финальная проверка, удаление старого и сверка скриншотов

**Files:**
- Delete: `src/index.html`, `src/styles.css`
- Create (временный, не коммитится): `/tmp/dsh-diff.py`
- Create (не коммитится): `docs/verification/after-desktop.png`, `after-mobile.png`

**Interfaces:**
- Consumes: всё предыдущее.
- Produces: подтверждение паритета и чистое рабочее дерево.

- [ ] **Step 1: Убедиться, что старые файлы больше нигде не используются**

Run:
```bash
grep -rn "styles.css\|src/index.html" --include='*.tsx' --include='*.ts' --include='*.scss' --include='*.html' --include='*.json' . --exclude-dir=node_modules --exclude-dir=dist || echo "ссылок нет"
```
Expected: `ссылок нет`.

- [ ] **Step 2: Удалить старые файлы и проверить сборку**

```bash
git rm src/index.html src/styles.css
npm run typecheck && npm run lint && npm run build
```
Expected: сборка успешна, `dist/` создан. Удаление не влияет на рендер: `index.html` в
корне и SCSS-партиалы самодостаточны.

- [ ] **Step 3: Снять скриншоты «после»**

Убедиться, что дев-сервер запущен, и снять те же два размера, что и эталон:

```bash
/tmp/dsh-shot.sh "http://localhost:5173/" docs/verification/after-desktop.png "1440,2800" 10000
/tmp/dsh-shot.sh "http://localhost:5173/" docs/verification/after-mobile.png  "390,1400"  10000
```
Expected: два `OK`.

- [ ] **Step 4: Сравнить попиксельно**

Создать `/tmp/dsh-diff.py`:

```python
import sys
from pathlib import Path

from PIL import Image, ImageChops

THRESHOLD = 8


def main(a_path: str, b_path: str) -> int:
	a = Image.open(a_path).convert('RGB')
	b = Image.open(b_path).convert('RGB')

	if a.size != b.size:
		print(f'РАЗМЕР РАЗЛИЧАЕТСЯ: {a.size} != {b.size}')
		return 1

	diff = ImageChops.difference(a, b)
	r, g, bl = diff.split()
	worst = ImageChops.lighter(ImageChops.lighter(r, g), bl)
	hist = worst.histogram()

	total = a.size[0] * a.size[1]
	soft = total - hist[0]
	hard = sum(hist[THRESHOLD + 1:])

	print(f'{Path(a_path).name} vs {Path(b_path).name}')
	print(f'  размер: {a.size[0]}x{a.size[1]} ({total} пикселей)')
	print(f'  отличается хотя бы на 1: {soft} ({100 * soft / total:.4f}%)')
	print(f'  отличается больше {THRESHOLD}: {hard} ({100 * hard / total:.4f}%)')
	print(f'  bbox различий: {diff.getbbox()}')

	out = Path(b_path).with_name(Path(b_path).stem + '-diff.png')
	Image.eval(diff, lambda p: min(255, p * 8)).save(out)
	print(f'  карта различий: {out}')
	return 0


if __name__ == '__main__':
	sys.exit(main(sys.argv[1], sys.argv[2]))
```

Run:
```bash
PY=/Users/epik7th/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3
$PY /tmp/dsh-diff.py docs/verification/baseline-desktop.png docs/verification/after-desktop.png
$PY /tmp/dsh-diff.py docs/verification/baseline-mobile.png  docs/verification/after-mobile.png
```
Expected: одинаковые размеры, доля пикселей с разницей больше 8 — близка к нулю
(погрешность сглаживания шрифтов). **Если доля заметная или bbox покрывает целые блоки —
это регрессия:** открыть `*-diff.png` и найти потерянный стиль, а не списывать на шум.

- [ ] **Step 5: Проверить форматирование и относительность путей**

```bash
npm run format:check
```
Если падает — выполнить `npm run format` и закоммитить форматирование отдельным коммитом.

```bash
grep -o '\(src\|href\)="[^"]*"' dist/index.html
```
Expected: пути начинаются с `./assets/` — относительные, иначе на
`https://epik7th.github.io/profile/` они уйдут в корень домена.

- [ ] **Step 6: Проверить `dist/` на отсутствие внешних шрифтов и наличие стилей**

```bash
grep -c "googleapis" dist/assets/*.css || echo "googleapis отсутствует — верно"
grep -c "typewriter" dist/assets/*.css
grep -c "@keyframes" dist/assets/*.css
```
Expected: `googleapis` отсутствует, `typewriter` и `@keyframes` найдены.

- [ ] **Step 7: Финальный коммит**

```bash
git add -A
git commit -m "chore: удалить старые src/index.html и src/styles.css после переноса"
git log --oneline -8
```

- [ ] **Step 8: Отчитаться о результате**

Сообщить пользователю: процент различий по обоим размерам, путь к `*-diff.png`,
список созданных файлов, статус ветки и напоминание, что **пуш в `origin` и публикация на
GitHub Pages остаются за пользователем**.

---

## Self-review плана

**Покрытие спеки:**

| Раздел спеки | Задача |
|---|---|
| §4 версии | Global Constraints, Task 1 Step 1 |
| §5 структура | Tasks 1–4 |
| §6 компоненты и данные | Task 3 Step 1, Steps 5–6; Task 4 Steps 4–8 |
| §7.1–7.3 стили, переменные, миксины | Task 2, Task 3 Steps 2–4, Task 4 Steps 1–3 |
| §7.4 мёртвый код | Task 2 (нет Yanone), Task 4 Step 1 (`.card`), Task 4 (нет пустого `div`) |
| §7.5 пути к ассетам | Task 2 Steps 4–5, Task 3 Step 3, Task 4 Step 3, Task 7 Step 5 |
| §8 конфиги | Task 1 Steps 1–3 |
| §8.1 деплой и CI | Task 5 |
| §9 перенос разметки в JSX | Task 3 Step 6, Task 4 Steps 4–8 |
| §10 известные особенности | Global Constraints |
| §11 проверка | Task 7 |
| §12 риски | Global Constraints (`--cache`), Task 5 Step 2, Task 7 Step 4 |
| §13 тесты | Не добавляются — соответствует спеке |
| §14 git и откат | Выполнено до плана: ветка `feat/vite-react-scss` |
| §15 AGENTS.md | Task 6 |
| §16 после | Не входит в план сознательно |

**Проверка на плейсхолдеры:** «TBD»/«TODO» отсутствуют; шаги, создающие файлы с новым
содержимым, приводят код целиком; шаги переноса CSS ссылаются на точные диапазоны строк
`src/styles.css`, который существует в рабочем дереве до Task 7 Step 2.

**Согласованность имён:** `bracket-frame($left, $right, $color)` и
`gradient-text($from, $to, $stop)` объявлены в Task 2 и используются в Task 3 ровно с этими
именами; `navLinks`/`achievements`/`skills`/`contacts` и типы `NavLink`/`Contact` объявлены
в Task 3 Step 1 и используются в Task 3 Step 5 и Task 4 Steps 5–7; имена партиалов в
`main.scss` совпадают с путями создаваемых файлов.
