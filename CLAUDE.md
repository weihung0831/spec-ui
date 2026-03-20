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
├── components/          # UI 元件（editor, file-tree, preview, layout 等）
├── hooks/               # 自訂 hooks（auto-save, file-watcher, keyboard-shortcuts 等）
├── stores/              # Zustand stores（editor, workspace, coverage, search, settings）
├── routes/              # TanStack Router 檔案式路由（index, editor, settings）
├── i18n/                # react-i18next 多語系（en.json, zh-TW.json）
├── types/               # TypeScript 型別定義
└── styles/              # CSS（markdown-preview.css）
src-tauri/               # Rust 後端（Tauri 2）
├── src/commands/        # Tauri IPC 指令（file_operations, frontmatter, search, watcher, coverage, app_settings）
├── src/models/          # Rust 資料模型（file_node, frontmatter, coverage）
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

## 注意事項

- CSP 設定嚴格：`script-src 'self' 'wasm-unsafe-eval'` — 不允許 inline scripts
- Tailwind v4 使用 `@tailwindcss/vite` plugin，非 PostCSS 方式
- `npm run dev` 只啟動 Vite；需用 `npm run tauri dev` 才有完整 Rust 後端
- Mermaid 圖表需要 CSP 中的 `'wasm-unsafe-eval'`
- 檔案監控指令（start_watching/stop_watching）由 Tauri 端管理檔案系統事件
