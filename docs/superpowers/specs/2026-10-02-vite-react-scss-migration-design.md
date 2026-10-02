# Миграция dev_profile на Vite + React 19 + TypeScript + SCSS

Дата: 2026-10-02
Статус: на ревью
Область: `dev_profile` — личная страница-портфолио веб-разработчика

## 1. Контекст

Сейчас проект — статическая страница из двух файлов: `src/index.html` (105 строк) и
`src/styles.css` (289 строк), плюс `src/assets/` (фото, фон, 2 SVG, 18 файлов шрифтов).
Сборщика нет, JS нет вообще, вся анимация сделана на CSS. Единственная зависимость —
`prettier` (dev). В git один коммит `init`.

Пользователь решил перевести проект на Vite и React последней версии, с TypeScript.
Внешний вид страницы при этом должен остаться прежним.

## 2. Цель и критерий готовности

Цель: тот же сайт, но на современном стеке — Vite 8, React 19, TypeScript, SCSS-партиалы,
плюс `AGENTS.md` с описанием проекта для AI-агентов.

Считаем готовым, когда одновременно выполнено:

1. `npm run build` проходит (включая `tsc -b`) без ошибок;
2. `npm run lint` и `npm run format:check` чистые;
3. `npm run dev` отдаёт страницу и все ассеты;
4. **визуальная сверка скриншотов до/после не показывает различий** в пределах
   погрешности рендеринга (см. §11);
5. `AGENTS.md` существует и соответствует фактическому состоянию проекта.

## 3. Границы

**Входит:**

- перенос всей разметки в React-компоненты (одностраничное приложение);
- перевод CSS в SCSS-партиалы без изменения селекторов и значений;
- конфиги Vite, TypeScript, Prettier, `package.json`;
- `AGENTS.md`;
- удаление `src/index.html` и `src/styles.css` после переноса;
- удаление мёртвого кода, перечисленного в §7.4;
- **переписывание GitHub Actions workflow под Vite (§8.1)** — не «желательно», а
  обязательно: иначе деплой на GitHub Pages сломается;
- подтягивание локальной `main` до `origin/main` (§14).

**Не входит (сознательно):**

- редизайн: ни одна строка вёрстки и ни одно значение стиля не меняются;
- **исправление существующих дефектов вёрстки** (см. §10) — «1:1» означает, что они
  сохраняются;
- ESLint и тесты: логики в приложении нет, тестировать нечего (см. §13);
- интерактив, мобильное меню, роутинг, новые страницы;
- обновление `README.md` (остаётся как есть).

## 4. Версии

Все версии сверены с npm и апстрим-шаблоном `create-vite`, а не взяты по памяти.

| Пакет | Версия | Обоснование |
|---|---|---|
| `react`, `react-dom` | `^19.3.0` | `latest` в npm = 19.3.0 — «последний React», как просил пользователь |
| `vite` | `^8.3.1` | `latest` = 8.3.2; версия взята из официального шаблона |
| `@vitejs/plugin-react` | `^6.1.1` | требует peer `vite ^8.0.0` — совпадает |
| `typescript` | `~6.0.2` | **не 7.0.2**: официальный шаблон Vite пинит 6.x, хотя в npm `latest` = 7.0.2 |
| `sass-embedded` | `^1.105.1` | рекомендация документации Vite для `.scss` |
| `oxlint` | `^1.85.0` | линтер официального шаблона (не ESLint) |
| `@types/node` | `^24.19.0` | из шаблона |
| `@types/react`, `@types/react-dom` | `^19.3.0` | из шаблона |
| `prettier` | `^3.3.3` | уже есть в проекте |

Требования к окружению: Node `^20.19.0 || >=22.12.0` (проверено у пользователя: 24.15.0),
npm 11.

Peer-зависимости `@vitejs/plugin-react` — `oxc-transform-react`, `@rolldown/plugin-babel`,
`babel-plugin-react-compiler` — помечены как `optional`, установка без них корректна.

**Решение по TypeScript.** Брать `latest` (7.0.2) сознательно не будем: шаблон Vite
остаётся на 6.x, и сочетание «Vite 8 + TS 7» не проверено апстримом. Версия из шаблона —
наименее рискованный выбор. Обновление до 7.x — отдельная задача.

## 5. Целевая структура

```
dev_profile/
├── .github/workflows/deploy-pages.yml   # переписан под Vite (§8.1)
├── index.html                  # оболочка: <div id="root"> + /src/main.tsx
├── vite.config.ts
├── tsconfig.json               # references
├── tsconfig.app.json
├── tsconfig.node.json
├── package.json
├── AGENTS.md
├── .prettierrc                 # useTabs/tabWidth приведены к .editorconfig
├── docs/
│   ├── verification/           # скриншоты сверки, вне git (см. §11)
│   └── superpowers/specs/      # этот документ
└── src/
    ├── main.tsx                # createRoot + import './styles/main.scss'
    ├── App.tsx
    ├── vite-env.d.ts
    ├── data/profile.ts         # navLinks, achievements, skills, contacts
    ├── components/
    │   ├── Header.tsx
    │   ├── Hero.tsx
    │   ├── About.tsx
    │   ├── Achievements.tsx
    │   ├── Skills.tsx
    │   └── Contacts.tsx
    ├── styles/
    │   ├── main.scss
    │   ├── abstracts/_index.scss      # @forward variables, mixins
    │   ├── abstracts/_variables.scss
    │   ├── abstracts/_mixins.scss
    │   ├── base/_fonts.scss
    │   ├── base/_base.scss
    │   ├── base/_animations.scss
    │   ├── layout/_header.scss
    │   ├── layout/_hero.scss
    │   ├── layout/_sections.scss
    │   └── components/
    │       ├── _contacts.scss
    │       ├── _tags.scss
    │       └── _typewriter.scss
    └── assets/                 # без изменений
```

Компоненты лежат плоско, без папки на каждый: своих стилей и тестов у них нет, вложенность
была бы пустой.

## 6. Компоненты и данные

`App.tsx` собирает секции в том же порядке, что и сейчас: `Header`, `Hero` (`#main`),
`About` (`#about`), `Achievements` (`#achievements`), `Skills` (`#skills`),
`Contacts` (`#contact`).

`Hero` остаётся `section#main` с `article.content`, как в текущей разметке.

`data/profile.ts` содержит данные, которые сейчас дублируются разметкой, и экспортирует:

- `navLinks: { href: string; label: string }[]` — 4 пункта меню;
- `achievements: string[]` — 6 пунктов;
- `skills: string[]` — 12 тегов;
- `contacts: { label: string; href: string; icon: 'telegram' | 'mail' }[]` — 2 контакта;
- типы `NavLink`, `Contact`.

Списки рендерятся через `.map()` с `key`. Это единственное содержательное «реагирование»
в проекте, и оно не меняет итоговую разметку. Ссылки остаются ровно такими, как сейчас:
без `target="_blank"` и без `rel`, чтобы не менять поведение переходов.

Важно: при `verbatimModuleSyntax: true` типы импортируются только как
`import type { Contact } from '../data/profile'`, иначе сборка падает.

## 7. Стили

### 7.1 Подход

Глобальные SCSS-партиалы, имена классов сохраняются **дословно**. Селекторы остаются
прежними, поэтому паритет проверяется и диффом, и скриншотом; `@keyframes` и id-селекторы
(`#about`, `#achievements`, `#skills`, `#contact`) не конфликтуют с локальными именами.

Отвергнутая альтернатива — SCSS Modules (`Header.module.scss`): даёт изоляцию, но требует
переписать каждый `className` на `styles.x`, а `@keyframes` и id-селекторы выносить в
`:global`. Для одностраничника с уникальными именами классов выгода не оправдывает
изменения всей разметки.

Партиалы подключают переменные и миксины одной строкой `@use '../abstracts' as *;`
(резолвится в `abstracts/_index.scss`). `@import` не используется нигде: он устарел в Sass,
а внешний импорт Google Fonts удаляется (см. §7.4).

### 7.2 Карта переноса CSS

| Текущие строки `styles.css` | Куда переезжает |
|---|---|
| 1 (`@import` Yanone Kaffeesatz) | удаляется (§7.4) |
| 3–22 (`@font-face` ×4) | `base/_fonts.scss` |
| 24–50 (`html`,`body`,`body::before`) | `base/_base.scss` |
| 52–65 (`h1`–`h4`, `a`, `a:hover`) | `base/_base.scss` |
| 66–92 (`.logo`, `::before`, `::after`) | `layout/_header.scss` |
| 93–104 (`header`) | `layout/_header.scss` |
| 105–108 (`.card`) | удаляется (§7.4) |
| 109–118 (`.content`, `#about/#achievements/#skills`) | `layout/_sections.scss` |
| 119–142 (`.main-title-photo`, `.description`, `.title`, `.main-text`) | `layout/_hero.scss` |
| 143–152 (`.photo > img`) | `layout/_hero.scss` |
| 153–170 (`slideLeft`, `slideRight`) | `base/_animations.scss` |
| 171–201 (`.header-nav` и вложенные) | `layout/_header.scss` |
| 202–230 (`.contact-*`, маски иконок) | `components/_contacts.scss` |
| 231–238 (`.typewriter`) | `components/_typewriter.scss` |
| 239–255 (`typing`, `blink-caret`) | `base/_animations.scss` |
| 256–276 (`.tags`, `.tags > div`) | `components/_tags.scss` |
| 277–281 (`#contact`) | `layout/_sections.scss` |
| 282–289 (`@media max-width: 600px`) | разносится к своим правилам: `header` → `layout/_header.scss`, `body::before` → `base/_base.scss` |

Все `@keyframes` собираются в `base/_animations.scss`, а «потребители» остаются в своих
партиалах. Итого 13 SCSS-файлов.

### 7.3 Переменные и миксины

`abstracts/_variables.scss` — палитра (каждое значение из текущего CSS, без изменений):

`$color-bg: black`, `$color-text: #6aab73`, `$color-heading: #56a8f5`,
`$color-link: #548af7`, `$color-link-hover: #bea1ef`, `$color-nav-link: #42c3d4`,
`$color-nav-link-hover: aqua`, `$color-accent-pink: #cc55b9`,
`$color-border: #27272a`, `$color-tag-text: #75757e`, `$color-tag-hover: #00ff95`,
`$color-footer-bg: #18181a`, `$color-header-bg: #ffffff30`,
`$gradient-logo: (#c43ce1, #008cff 80%)`, `$gradient-title: (#00879f, #00ff95 80%)`,
`$color-white: #fff`, `$color-bracket: rgba(255, 255, 255, 0.5)`,
`$color-icon: rgba(255, 255, 255, 0.25)`, `$color-icon-hover: rgba(255, 255, 255, 0.5)`,
`$font-main: 'DevFont', sans-serif`, `$breakpoint-mobile: 600px`.

`abstracts/_mixins.scss` — два миксина, каждый убирает реальное дублирование:

- `@mixin bracket-frame($left, $right, $color)` — абсолютные `::before`/`::after` с `[` и `]`.
  Сейчас паттерн продублирован у `.logo` (−15px/−12px, полупрозрачный белый) и у
  `.header-nav a:hover` (−10px/−12px, белый);
- `@mixin gradient-text($gradient)` — `-webkit-linear-gradient(45deg, …)` +
  `background-clip: text` + прозрачная заливка. Сейчас продублирован у `.logo > span`
  и `.main-title-photo .title`. Важно: позиция останова `80%` у второго цвета — часть
  значения градиента (`#008cff 80%`), и она обязана остаться в переменной, иначе градиент
  визуально поедет.

Правило на будущее: любое значение цвета или шрифта в партиалах обязано быть переменной,
хардкод запрещён.

### 7.4 Мёртвый код

Удаляется, потому что не влияет на рендеринг:

1. `@import` шрифта `Yanone Kaffeesatz` — во всём проекте нет ни одного
   `font-family: 'Yanone Kaffeesatz'`; единственное семейство — `DevFont`. Лишний
   блокирующий сетевой запрос.
2. Класс `.card` (строки 105–108) — в разметке не встречается (проверены все классы CSS
   против HTML; `.card` — единственный неиспользуемый).
3. Пустой `<div class="">` в `index.html` (строка 21), оборачивающий все секции и футер:
   `class=""` не несёт смысла, а ни одного CSS-правила, которое зависело бы от этого
   уровня вложенности, нет (проверено: общих селекторов по `div` в стилях не существует,
   `div` встречается только внутри `.tags`). Секции становятся прямыми детьми `body`.

Побочный эффект: раз внешний `@import` уходит, в SCSS не остаётся CSS-импортов вообще,
и вопрос совместимости Sass-импортов снимается целиком.

Шрифтовые файлы (18 `.woff2`) остаются на месте: подключены 4, остальные не удаляем —
это отдельная задача и риск потери нужного начертания.

### 7.5 Пути к ассетам

`index.html` переезжает из `src/` в корень, SCSS раскладывается по подпапкам, поэтому все
пути пересчитываются. Это место, где ошибка проявится молча: страница соберётся, а фон и
фото просто не загрузятся, поэтому пути проверяются отдельным пунктом (§11, п. 5).

В разметке ассеты подключаются через импорт, а не строкой пути — так Vite попадёт их в
сборку и захэширует:

```tsx
import photo from '../assets/images/photo.jpeg'
// ...
<img src={photo} alt="Фото профиля" />
```

`vite/client` (подключён в `tsconfig.app.json` через `types`) даёт объявления модулей для
`*.jpeg` и `*.svg`, а `allowArbitraryExtensions: true` позволяет импортировать их из TS.

В SCSS `url()` указывается относительно **своего партиала**:

| Было | Стало | Файл |
|---|---|---|
| `url('./assets/images/bg.jpg')` | `url('../../assets/images/bg.jpg')` | `base/_base.scss` |
| `url('./assets/icons/telegram.svg')` | `url('../../assets/icons/telegram.svg')` | `components/_contacts.scss` |
| `url('./assets/icons/envelope.svg')` | `url('../../assets/icons/envelope.svg')` | `components/_contacts.scss` |
| `url('./assets/fonts/JetBrainsMono-*.woff2')` | `url('../../assets/fonts/JetBrainsMono-*.woff2')` | `base/_fonts.scss` |

Четыре подключённых начертания `DevFont` — Light, Bold, LightItalic, BoldItalic — сохраняют
свои `font-weight`/`font-style`, как сейчас.

## 8. Конфиги

Содержимое `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` и `vite.config.ts`
берётся из апстрим-шаблона `create-vite/template-react-ts` **как есть** (файлы получены
из репозитория Vite и переносятся дословно, а не пишутся по памяти). Ключевое из них:
project references, `target: es2023`, `moduleResolution: bundler`, `jsx: react-jsx`,
`verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `noUnusedLocals`,
`noUnusedParameters`, `types: ["vite/client"]`.

Скаффолдер `npm create vite` не запускается: он полез бы в `~/.npm/_npx`, который
заблокирован песочницей, а содержимое конфигов уже получено из апстрима.

`vite.config.ts` отличается от шаблона одним добавлением — `base: './'`, чтобы сборка
работала и локально, и в подпапке (GitHub Pages), и на любом статическом сервере:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
})
```

`package.json` — скрипты:

| Скрипт | Команда | Назначение |
|---|---|---|
| `dev` | `vite` | дев-сервер с HMR |
| `build` | `tsc -b && vite build` | типы + сборка; ошибка типов валит сборку |
| `preview` | `vite preview` | просмотр собранного `dist/` |
| `typecheck` | `tsc -b` | отдельная проверка типов |
| `lint` | `oxlint` | линтер |
| `format` | `prettier --write .` | форматирование |
| `format:check` | `prettier --check .` | проверка форматирования в CI |

Прочее в `package.json`: `private: true`, `type: module`, `engines.node`. Удаляется
`main: "index.js"` — такого файла нет.

`index.html` (в корне) — оболочка: `lang="ru"`, `meta viewport`, прежний `<title>`,
`<div id="root">` и `<script type="module" src="/src/main.tsx">`. Тег
`<link href="./styles.css" rel="stylesheet">` удаляется: стили приходят из `main.tsx`
через `import './styles/main.scss'`. Ссылок на Google Fonts не остаётся, так как
единственный внешний шрифт был мёртвым (§7.4).

`.prettierrc` — добавляются `useTabs: true` и `tabWidth: 4`. Сейчас там `tabWidth: 2` без
`useTabs`, то есть prettier переформатировал бы весь проект в 2 пробела, тогда как
`.editorconfig` для `{js,scss,html,ts,tsx}` требует табы с `indent_size 4`, а весь текущий
код написан табами. Приводим конфиги к согласию в пользу существующего стиля.
`printWidth: 1000` сохраняется (им объясняется однострочный стиль текущего CSS).

`.gitignore` — существующий (`node_modules`, `dist`) достаточен; добавляется
`docs/verification/` (§11).

### 8.1 Деплой и CI (GitHub Pages)

Это выяснилось при само-ревью и меняет объём работ.

**Как деплоится сейчас.** Репозиторий — `github.com/epik7th/profile`, то есть страница
открывается по адресу `https://epik7th.github.io/profile/` — **в подпапке**, а не в корне
домена. Деплой идёт через GitHub Actions, файл `.github/workflows/jekyll-gh-pages.yml`:
`actions/jekyll-build-pages@v1` с `source: ./src/` собирает содержимое `src/` и публикует
его как статический сайт (`_site` → Pages). Jekyll здесь ничего не обрабатывает, он просто
копирует файлы.

**Что ломается при миграции.** После переноса `index.html` уезжает в корень репозитория, а
готовый сайт появляется только в `dist/` после сборки. Старый workflow в этом состоянии
опубликует содержимое `src/`, в котором `index.html` уже нет, — **продакшн отдаст 404**.
Поэтому workflow переписывается в той же задаче.

**Как будет.** Файл переименовывается в `.github/workflows/deploy-pages.yml` (слово «jekyll»
в имени станет ложью), шаги сборки заменяются на нодовые:

```yaml
- uses: actions/checkout@v4
- uses: actions/configure-pages@v5
- uses: actions/setup-node@v4
  with:
    node-version: 24
    cache: npm
- run: npm ci
- run: npm run build
- uses: actions/upload-pages-artifact@v3
  with:
    path: ./dist
```

Шаги `deploy` (`actions/deploy-pages@v4`), `permissions` и `concurrency` сохраняются как
есть. Jekyll-шаг удаляется полностью.

Версия Node в CI — 24, как у пользователя локально; требование `engines` (`>=22.12`)
выполняется. `npm ci` требует синхронизированного `package-lock.json`, поэтому обновлённый
lock коммитится вместе с `package.json`.

`base: './'` из §8 здесь обязателен, а не косметичен: при публикации в подпапку `/profile/`
абсолютные пути вида `/assets/...` вели бы в корень домена и дали бы 404. Относительные
пути разрешаются от URL страницы и работают в подпапке.

**Что проверяется, а что нет.** Локально проверяются: валидность YAML, успешная сборка в
`dist/`, относительность путей в собранном `index.html`. Сам факт публикации на Pages
проверяется только пушем в `origin/main` — это внешнее действие, которое выполняется
отдельно и в рамках этой задачи не делается (см. §14).

## 9. Перенос разметки в JSX

Разметка переносится дословно, с двумя механическими заменами:

1. `class` → `className`;
2. одиночные теги (`<br />`, `<img … />`, `<meta … />`) в текущем файле уже
   самозакрывающиеся — сохраняем это в TSX, где иначе и нельзя.

Отдельная ловушка, которую легко испортить: сейчас заголовок записан как
`&lt;Fullstack <br /> web Developer / &gt;`. **HTML-сущности в JSX не работают** — внутри
JSX `&lt;` выведется как текст `&lt;`. Правильно:

```tsx
{'<Fullstack'} <br /> {'web Developer / >'}
```

Итоговый видимый текст обязан остаться `<Fullstack web Developer / >`.

`vite-env.d.ts` содержит `/// <reference types="vite/client" />`.

## 10. Известные особенности текущей вёрстки (сохраняются как есть)

Зафиксировано по эталонным скриншотам, чтобы при переносе их не «починили» случайно:

1. **Горизонтальный overflow на мобильной ширине.** У `.typewriter` стоит
   `white-space: nowrap`, строка «Привет! Я Руслан Хакимов -» не переносится и задаёт
   минимальную ширину шире вьюпорта, из-за чего на 390px контент обрезается справа.
   Это текущее поведение продакшена, а не регрессия миграции.
2. `zoom: 0.6` в медиазапросе — нестандартное свойство, но поддерживается Chrome/Safari
   и сейчас работает; не заменяем на `transform`.
3. У страницы нет `favicon.ico` — в логе дев-сервера будет 404. Так и сейчас.

Все три пункта — кандидаты на отдельное исправление **после** миграции, когда паритет уже
зафиксирован.

## 11. Проверка

Автоматизируемая часть:

1. `npm run typecheck` — чисто;
2. `npm run build` — успешно, `dist/` создан;
3. `npm run lint` — чисто;
4. `npm run format:check` — чисто;
5. `npm run dev` — 200 на `/` и на всех ассетах: `photo.jpeg`, `bg.jpg`, `telegram.svg`,
   `envelope.svg`, `JetBrainsMono-*.woff2`;
6. в `dist/`: `index.html` ссылается на захэшированные `assets/*`, в собранном CSS есть
   `.typewriter` и `@keyframes`, нет `googleapis`;
7. в `dist/index.html` пути к ассетам **относительные** (`./assets/…`), а не абсолютные —
   иначе на `https://epik7th.github.io/profile/` они уйдут в корень домена (§8.1);
8. `.github/workflows/deploy-pages.yml` — YAML валиден, шаг Jekyll отсутствует,
   `upload-pages-artifact` указывает на `./dist`.

Визуальная сверка (главный критерий «1:1»):

- эталон снят **до** правок: `docs/verification/baseline-desktop.png` (1440×2800) и
  `baseline-mobile.png` (390×1400);
- Chrome запускается headless; флаги и приём с принудительным завершением описаны в §12;
- обязателен `--virtual-time-budget=10000`: без него кадр снимается в начале CSS-анимации
  `.typewriter`, у которого `width: 0`, и текст заголовка просто не виден — это уже
  приводило к ложному выводу при первом пробном снимке;
- после миграции снимаются `after-desktop.png` и `after-mobile.png` при тех же размерах и
  том же бюджете;
- сравнение — попиксельное, через Pillow из bundled-набора Python; в отчёт идёт процент
  различающихся пикселей. Ожидание — различие в пределах погрешности сглаживания шрифтов;
  любой заметный кластер различий разбирается как регрессия, а не списывается на шум.

Папка `docs/verification/` добавляется в `.gitignore`: это локальные артефакты проверки
(~0.7 МБ), они воспроизводимы по описанной выше команде, и в git им не место.

## 12. Риски и обходы

| Риск | Обход | Статус |
|---|---|---|
| `npm` падает с `EPERM` и советует `sudo chown` | Диагноз npm неверный: `~/.npm` принадлежит пользователю, root-файлов 0. Причина — песочница DSH (`workspace-write`) запрещает запись вне рабочей папки, а npm пишет кэш и логи в `~/.npm`. Запись в `~/.npm` проверена: `Operation not permitted`; в `/tmp` — разрешена. Все команды npm идут с `--cache /tmp/dsh-npm-cache` | Проверено |
| Headless Chrome падает с `Trace/BPT trap` | Причина — вложенная песочница Chrome (`sandbox initialization failed: Operation not permitted`) и запись crashpad в `~/Library/Application Support`. Лечится `--no-sandbox --disable-crash-reporter --disable-breakpad` + свой `--user-data-dir` в `/tmp`. Chrome при этом не завершается сам после `--screenshot`, поэтому запуск в фоне с убийством по таймауту | Проверено, скриншоты сняты |
| Если и `/tmp`-кэш окажется заблокирован | Запросить у пользователя разовое расширение доступа (`sandbox_permissions`), а не искать обходные пути | Не потребовалось |
| Vite 8 (Rolldown) + plugin-react 6 + TS 6 — свежее сочетание | Версии взяты из официального шаблона Vite; доказательство — фактический `npm run build`, а не предположение | Контролируется |
| Ошибка типов валит сборку (`tsc -b && vite build`) | Ожидаемое поведение; проверяется на шаге 2 §11 | Контролируется |
| Потеря стилей при переносе в партиалы | Карта переноса §7.2 покрывает все 289 строк; сверка скриншотами ловит пропуск | Контролируется |
| **Переезд ломает продакшн, если забыть про CI**: старый workflow публикует `src/`, где `index.html` больше нет → 404 на сайте | Workflow переписывается в той же задаче §8.1; относительные пути проверяются в `dist/index.html` (§11, п. 7) | Обнаружено при само-ревью |
| Локальная `main` отстаёт от `origin/main` на коммит с workflow | `git pull --ff-only` до начала работы; своих коммитов локально нет, так что fast-forward безопасен и ничего не теряет | Обнаружено при само-ревью |
| Публикация на Pages не проверяется локально | Честно зафиксировано в §8.1: проверяются YAML и сборка, а сам деплой — только пушем, который в эту задачу не входит | Принято |

## 13. Тесты

Не добавляются, и это осознанно: в приложении нет ни логики, ни состояния, ни ветвлений —
только разметка и данные. Единственное, что можно проверить тестом, — «рендерится и
содержит тексты», но это слабее и дороже, чем уже выполняемая попиксельная сверка со
эталоном. Если появится интерактив, тестовый фреймворк добавляется вместе с ним.

## 14. Порядок работ, git и откат

Порядок:

1. `git pull --ff-only` — локальная `main` отстаёт от `origin/main` на один коммит
   (`2f3d0ae Create jekyll-gh-pages.yml`), своих коммитов локально нет, поэтому
   fast-forward безопасен и ничего не теряет. Без этого шага файла workflow локально просто
   не существует, и править его будет нечего;
2. ветка `feat/vite-react-scss` от обновлённой `main`;
3. отдельные коммиты: спека → конфиги и зависимости → партиалы SCSS → компоненты →
   workflow под Vite → `AGENTS.md` → проверка.

Пуш в `origin` и фактическая публикация на GitHub Pages **в задачу не входят** — это
внешнее действие, которое пользователь выполняет сам, когда посчитает нужным. Здесь
готовится только рабочее состояние и проверенный локально `dist/`.

Откат: `git switch main`. Текущая версия страницы остаётся в истории, файлы из git не
удаляются — только из рабочего дерева. Пока изменения не запушены, продакшн продолжает
работать по-старому.

## 15. AGENTS.md

Язык — русский. Разделы:

1. **Что это** — личная страница-портфолио, одностраничник, без бэкенда;
2. **Стек и версии** — таблица §4 с требованием к Node;
3. **Команды** — таблица §8, включая предупреждение, что `build` включает проверку типов;
4. **Структура** — дерево §5 с назначением папок;
5. **Конвенции** — `@use`/`@forward` вместо `@import`; цвета и шрифты только через
   переменные; `import type` для типов (`verbatimModuleSyntax`); табы, отступ 4; имена
   классов сохраняются как есть; новые тексты и списки — в `data/profile.ts`, а не в
   компонентах;
6. **Как добавить секцию** — пошагово: данные → компонент → подключение в `App.tsx` →
   партиал → `@use` в `main.scss`;
7. **Подводные камни** — `EPERM` у npm и обход через `--cache`; удаление `dist` перед
   чистой сборкой; `docs/verification/` не коммитится; HTML-сущности в JSX не работают;
8. **Известные особенности** — три пункта §10, чтобы их не приняли за баги миграции;
9. **Чего не делать** — не переписывать на фреймворк-роутер без запроса, не менять версии
   из §4 поодиночке, не коммитить `node_modules`/`dist`.

## 16. Что можно сделать после

- обновить TypeScript до 7.x, когда шаблон Vite это подтвердит;
- починить мобильный overflow (§10.1) — `white-space: nowrap` заменить на анимацию,
  не ломающую переносы;
- убрать неиспользуемые 14 файлов шрифтов;
- добавить `favicon.ico`;
- при желании — SCSS Modules, если проект вырастет за одну страницу.
