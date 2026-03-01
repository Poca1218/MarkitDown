# Markdown Editor

一個功能豐富的網頁版 Markdown 編輯器，具有即時預覽、數學公式、圖表支援、主題切換等進階功能。採用 GitHub Dark 風格設計。

![Markdown Editor](https://via.placeholder.com/800x400/0d1117/58a6ff?text=Markdown+Editor)

## ✨ 功能特色

### 📝 編輯功能
- **分割檢視模式**：左側編輯器、右側即時預覽
- **同步捲動**：編輯與預覽區域同步滾動
- **全螢幕預覽**：專注於檢視完美呈現的效果
- **可調整分割比例**：拖曳中間分隔線調整左右寬度
- **即時預覽**：輸入即時更新預覽結果
- **Undo/Redo**：完整的歷史記錄支援
- **搜尋與取代**：支援正則表達式

### 🛠️ 編輯器工具列
快速插入各種 Markdown 格式：
- 粗體、斜體、刪除線
- 標題 (H1-H3)
- 連結、圖片
- 程式碼區塊、引用
- 有序/無序/任務清單
- 表格
- 數學公式、Mermaid 圖表

### 📂 檔案操作
- **新建檔案**：從零開始撰寫全新文件
- **開啟檔案**：支援拖曳上傳或點擊選擇 `.md` / `.markdown` 檔案
- **存檔**：支援選擇儲存路徑 (Chrome/Edge)
- **導出 HTML**：將渲染後的內容導出為獨立 HTML 文件
- **導出 PDF**：將文件導出為 PDF 格式
- **圖片拖曳上傳**：直接拖曳或貼上圖片，自動轉換為 Base64

### 🎨 設計特色
- **雙主題支援**：暗色/亮色主題隨時切換
- **Glassmorphism 設計**：毛玻璃效果，現代感十足
- **響應式佈局**：完美支援桌面、平板、手機
- **程式碼高亮**：使用 highlight.js 為程式碼區塊上色
- **流暢動畫**：細膩的過場效果和互動回饋

### 📐 進階功能
- **KaTeX 數學公式**：支援 LaTeX 語法的數學公式渲染
- **Mermaid 圖表**：流程圖、時序圖、圓餅圖等
- **目錄導航 (TOC)**：根據標題自動生成可點擊目錄
- **字數統計**：即時顯示字數、字元數、預估閱讀時間
- **列印友善**：針對列印優化的樣式

## ⌨️ 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl + N` | 新建檔案 |
| `Ctrl + O` | 開啟檔案 |
| `Ctrl + S` | 存檔 |
| `Ctrl + F` | 搜尋與取代 |
| `Ctrl + Z` | 復原 |
| `Ctrl + Y` | 重做 |
| `Ctrl + B` | 粗體 |
| `Ctrl + I` | 斜體 |
| `Ctrl + K` | 插入連結 |
| `Ctrl + E` | 切換編輯/預覽模式 |
| `Ctrl + P` | 列印 |
| `Escape` | 關閉對話框 / 切換到預覽模式 |

> **Mac 使用者**：請使用 `Cmd` 取代 `Ctrl`

## 🚀 使用方式

### 線上使用
1. 使用瀏覽器開啟 `index.html`
2. 拖曳 Markdown 檔案到頁面，或點擊「開啟」按鈕選擇檔案
3. 使用工具列按鈕或快捷鍵編輯文件
4. 點擊右上角按鈕切換主題或開啟目錄
5. 編輯完成後，點擊「存檔」或「導出」儲存您的作品

### 本地開發
```bash
# 克隆或下載專案
cd Markdown

# 使用任何靜態伺服器啟動
# 方法一：使用 Python
python -m http.server 8080

# 方法二：使用 Node.js
npx serve .

# 方法三：使用 VS Code Live Server 擴充套件
# 右鍵 index.html -> Open with Live Server
```

## 📁 專案結構

```
Markdown/
├── index.html      # 主頁面 HTML
├── styles.css      # 樣式表 (含 CSS 變數設計系統)
├── print.css       # 列印專用樣式表
├── app.js          # 應用邏輯
├── test.md         # 測試用 Markdown 檔案
└── README.md       # 本文件
```

## 🛠️ 技術棧

- **HTML5** - 語意化結構
- **CSS3** - 自訂屬性、Flexbox、Grid、動畫
- **Vanilla JavaScript** - 無框架依賴
- **[marked.js](https://marked.js.org/)** - Markdown 解析
- **[highlight.js](https://highlightjs.org/)** - 程式碼語法高亮
- **[KaTeX](https://katex.org/)** - 數學公式渲染
- **[Mermaid](https://mermaid.js.org/)** - 圖表繪製
- **[html2pdf.js](https://ekoopmans.github.io/html2pdf.js/)** - PDF 導出
- **Google Fonts** - Inter + JetBrains Mono 字型

## 🎯 支援的 Markdown 語法

- ✅ 標題 (H1 ~ H6)
- ✅ 粗體、斜體、刪除線
- ✅ 有序/無序清單
- ✅ 任務清單 (勾選框)
- ✅ 引用區塊
- ✅ 程式碼區塊 (含語法高亮)
- ✅ 行內程式碼
- ✅ 表格
- ✅ 連結與圖片
- ✅ 水平分隔線
- ✅ 數學公式 (LaTeX 語法)
- ✅ Mermaid 圖表

## 📱 瀏覽器支援

| 瀏覽器 | 支援 | 備註 |
|--------|------|------|
| Chrome | ✅ | 完整支援，包含檔案路徑選擇 |
| Edge | ✅ | 完整支援，包含檔案路徑選擇 |
| Firefox | ✅ | 部分支援 (檔案路徑選擇降級為下載) |
| Safari | ✅ | 部分支援 (檔案路徑選擇降級為下載) |

## 📄 授權

本專案 **未開放任何開源授權**。
未來如有授權、合作或商業使用需求，需另行取得作者授權。

## 📄 License

This project is proprietary and is not distributed under any open-source license.

All rights are strictly reserved by the author.  
No part of this project may be used, reproduced, modified, or distributed — whether for personal, educational, or commercial purposes — without explicit written authorization from the author.

---

<p align="center">
  Built with ❤️ using marked.js, highlight.js, KaTeX & Mermaid
</p>
