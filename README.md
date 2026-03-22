# Spec Plan Manager

A desktop app for authoring and managing markdown specification and plan files, built with Tauri + React.

桌面應用程式，用於編寫和管理 Markdown 規格與計畫文件，使用 Tauri + React 打造。

## Features / 功能

### Editor / 編輯器
- Split-pane editor + live markdown preview (editor-only / split / preview-only modes)
  分割面板編輯器 + 即時 Markdown 預覽（僅編輯器 / 分割 / 僅預覽模式）
- CodeMirror 6 with syntax highlighting
  CodeMirror 6 語法高亮
- YAML frontmatter parsing and inline editing (status, priority, effort, tags)
  YAML 前置資料解析與行內編輯（狀態、優先級、工作量、標籤）
- Auto-save with unsaved-change indicators
  自動儲存，含未儲存變更指示器
- Multi-tab file editing with tab bar
  多分頁檔案編輯
- Keyboard shortcuts (⌘S / Ctrl+S save, ⌘B / Ctrl+B toggle sidebar, ⌘W / Ctrl+W close tab, ⌘\ / Ctrl+\ cycle preview mode)
  鍵盤快捷鍵（⌘S / Ctrl+S 儲存、⌘B / Ctrl+B 切換側邊欄、⌘W / Ctrl+W 關閉分頁、⌘\ / Ctrl+\ 切換預覽模式）

### Markdown Preview / Markdown 預覽
- Mermaid diagram rendering / Mermaid 圖表渲染
- Syntax highlighting for code blocks / 程式碼區塊語法高亮
- GFM tables, checkboxes, and task lists / GFM 表格、勾選框、任務列表
- Heading anchor links / 標題錨點連結

### Workspace / 工作區
- File tree browser with expand/collapse and context menu (Open, Copy Path, Show in Finder, Delete)
  檔案樹瀏覽器，含展開/收合及右鍵選單（開啟、複製路徑、在 Finder 中顯示、刪除）
- Multi-project workspace with project selector
  多專案工作區與專案選擇器
- Full-text search across all project files
  跨專案全文搜尋
- Real-time file watcher for external changes
  即時檔案監控（偵測外部變更）
- Breadcrumb navigation / 麵包屑導航

### Coverage Analysis / 覆蓋率分析
- Spec coverage scanning via Claude CLI integration
  透過 Claude CLI 整合進行規格覆蓋率掃描
- Per-requirement status badges (Implemented / Partial / Not Implemented / Unknown)
  逐項需求狀態徽章（已實作 / 部分實作 / 未實作 / 未知）
- Bilingual reasoning display (EN/中) with color-coded labels
  雙語分析說明顯示（EN/中），附彩色標籤
- Manual override support with right-click context menu
  手動覆寫支援，透過右鍵選單操作
- Coverage cache persistence (.spec-coverage.json)
  覆蓋率快取持久化（.spec-coverage.json）
- Coverage summary with progress bar in frontmatter header
  前置資料標頭中的覆蓋率摘要與進度條

### Spec Analyzer / 規格分析器
- One-click spec analysis extracting DO/DON'T checklists and verification criteria
  一鍵規格分析，萃取 DO/DON'T 清單與驗證指標
- Collapsible results panel with summary bar, DO/DON'T sections, and verification table
  可收合的結果面板，含摘要列、DO/DON'T 區段與驗證表格
- Bilingual analysis with auto-translation support (EN ↔ 中)
  雙語分析，支援自動翻譯（EN ↔ 中）
- Analysis history and cache persistence per project
  逐專案的分析歷史與快取持久化
- Export analysis results to Markdown
  匯出分析結果為 Markdown

### Progress Tracking / 進度追蹤
- Checkbox-based progress tracking with visual progress bar
  基於勾選框的進度追蹤，含視覺化進度條
- Frontmatter status/priority badges with inline editing
  前置資料狀態/優先級徽章，支援行內編輯

### Settings / 設定
- Theme switching (Light / Dark / System)
  主題切換（淺色 / 深色 / 跟隨系統）
- Language switching (English / 繁體中文) via react-i18next
  語言切換（English / 繁體中文）透過 react-i18next
- Editor font size configuration / 編輯器字型大小設定
- Auto-save toggle / 自動儲存開關
- Keyboard shortcuts reference / 鍵盤快捷鍵參考

### Auto Update / 自動更新
- In-app update checker via Tauri updater plugin
  透過 Tauri updater 插件的應用程式內更新檢查
- Download progress indicator with release notes display
  下載進度指示器與版本說明顯示
- One-click download, install, and relaunch
  一鍵下載、安裝與重新啟動

## Tech Stack / 技術堆疊

| Layer / 層級 | Technology / 技術                       |
|--------------|-----------------------------------------|
| Frontend     | React 19, TypeScript, Tailwind CSS v4   |
| Editor       | CodeMirror 6                            |
| Routing      | TanStack Router                         |
| State        | Zustand                                 |
| i18n         | react-i18next                           |
| UI           | Radix UI, Lucide Icons                  |
| Backend      | Rust (Tauri 2)                          |
| Markdown     | unified / remark / rehype               |
| Diagrams     | Mermaid 11                              |
| Build/CI     | GitHub Actions (multi-platform release) |

## Development / 開發

### Prerequisites / 前置需求

- Node.js >= 18
- Rust (stable) — install via [rustup](https://rustup.rs) / 透過 rustup 安裝
- Tauri CLI prerequisites — see [Tauri docs](https://tauri.app/start/prerequisites/) / 參見 Tauri 文件
- Claude CLI (optional, for coverage analysis & spec analyzer) — install from [claude.ai/code](https://claude.ai/code) / 選用，用於覆蓋率分析與規格分析器

### Setup & Run / 安裝與執行

```bash
npm install
npm run tauri dev
```

## Testing / 測試

```bash
# Frontend tests (Vitest) / 前端測試
npm run test

# Rust unit tests / Rust 單元測試
npm run test:rust

# Both / 全部
npm run test:all
```

## Build / 建置

```bash
npm run tauri build
```

Produces a platform-native installer (`.dmg` on macOS, `.msi` on Windows).
產出平台原生安裝檔（macOS 為 `.dmg`，Windows 為 `.msi`）。

## Release / 發布

Push a version tag to trigger the GitHub Actions release workflow:
推送版本標籤以觸發 GitHub Actions 發布流程：

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow builds for macOS (aarch64 + x86_64) and Windows, then creates a draft GitHub Release with updater artifacts.
流程會建置 macOS（aarch64 + x86_64）與 Windows 版本，並建立包含更新器產物的 GitHub Release 草稿。

## License / 授權

MIT
