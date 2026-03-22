# CLAUDE.md

Spec Plan Manager — 用於編寫和管理 Markdown 規格與計畫文件的 Tauri 2 桌面應用程式。

## 指令

```bash
npm install              # 安裝前端依賴
npm run dev              # Vite 開發伺服器 (port 5173)
npm run tauri dev        # 完整 Tauri 開發（Rust 後端 + Vite 前端）
npm run build            # TypeScript 檢查 + Vite 建置
npm run tauri build      # 正式建置（macOS .dmg / Windows .msi）
npm run lint             # ESLint 程式碼檢查
npm run test             # Vitest 前端測試
npm run test:rust        # Cargo test Rust 後端測試
npm run test:all         # 前端 + Rust 全部測試
```

## 架構

```
src/                     # React 19 + TypeScript 前端
├── components/          # UI 元件（editor, file-tree, preview, layout, spec-analyzer, updater 等）
├── hooks/               # 自訂 hooks（auto-save, file-watcher, keyboard-shortcuts, spec-analyzer 等）
├── stores/              # Zustand stores（editor, workspace, coverage, search, settings, spec-analyzer）
├── routes/              # TanStack Router 檔案式路由（index, editor, settings）
├── i18n/                # react-i18next 多語系（en.json, zh-TW.json）
├── types/               # TypeScript 型別定義
├── lib/                 # 工具函式（utils.ts — cn() class merge helper）
├── styles/              # CSS（markdown-preview.css）
└── __tests__/           # Vitest 前端測試
src-tauri/               # Rust 後端（Tauri 2）
├── src/commands/        # Tauri IPC 指令（file_operations, frontmatter, search, watcher, coverage, app_settings, spec_analyzer）
├── src/models/          # Rust 資料模型（file_node, frontmatter, coverage, spec_analyzer）
├── src/process_utils.rs # 子程序工具模組
└── src/errors.rs        # 錯誤型別
```

## 關鍵模式

- **路徑別名**：`@/` 對應 `./src/`（tsconfig + vite 設定）
- **狀態管理**：Zustand stores，不使用 Redux。每個領域有獨立的 store 檔案。
- **路由**：TanStack Router，透過 vite plugin 自動 code-splitting
- **樣式**：Tailwind CSS v4（vite plugin，非 PostCSS）
- **UI 基礎元件**：Radix UI + class-variance-authority（shadcn/ui 模式）
- **Markdown 處理**：unified → remark-parse → remark-gfm → remark-rehype → rehype-react
- **Tauri IPC**：指令定義在 `src-tauri/src/commands/`，前端透過 `@tauri-apps/api` 呼叫
- **多語系**：react-i18next，支援 `en.json` 和 `zh-TW.json` 雙語介面

## 環境先決條件

- **Rust toolchain**：minimum rust-version `1.77.2`
- **Tauri CLI**：`@tauri-apps/cli` ^2.10.1（已在 devDependencies）
- **Node.js**：需支援 ESM（`"type": "module"`）

## 關鍵設定檔

- `tauri.conf.json` — Tauri app 設定（視窗大小、CSP、bundle targets）
- `vite.config.ts` — Vite 設定（Tailwind v4 plugin、React plugin、路徑別名）
- `tsconfig.json` — TypeScript 設定（路徑別名 `@/` → `./src/`）
- `scripts/sync-version.mjs` — 版本號同步腳本

## 注意事項

- CSP 設定嚴格：`default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://github.com https://objects.githubusercontent.com` — 不允許 inline scripts，connect-src 允許 GitHub（用於自動更新）
- Tailwind v4 使用 `@tailwindcss/vite` plugin，非 PostCSS 方式
- `npm run dev` 只啟動 Vite；需用 `npm run tauri dev` 才有完整 Rust 後端
- Mermaid 圖表需要 CSP 中的 `'wasm-unsafe-eval'`
- 檔案監控指令（start_watching/stop_watching）由 Tauri 端管理檔案系統事件
- 版本同步：修改版本號時使用 `npm version <patch|minor|major>`，會自動透過 `scripts/sync-version.mjs` 同步至 `src-tauri/Cargo.toml` 和 `tauri.conf.json`
- 測試環境：Vitest + jsdom + @testing-library/react，設定檔為 `src/test-setup.ts`
- 自動更新：整合 `@tauri-apps/plugin-updater`，相關元件在 `src/components/updater/`
