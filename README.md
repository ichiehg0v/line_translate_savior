# LINE Bot 翻譯助手

本專案是一個基於 **LINE Messaging API** 與 **OpenAI API** 的多語言翻譯 Bot，專門設計來協助需要外籍看護的家庭，透過群組即時翻譯，打破語言隔閡。

## 功能特點

1. **多語言即時翻譯**：支援同時將訊息翻譯為多種語言。
2. **群組對話支援**：適用於 LINE 群組，協助群組成員跨語言溝通，也可以在一對一聊天中使用。
3. **簡易設定命令**：使用 `/set` 命令快速設定目標語言。
4. **安全機制**：通關密語驗證，避免未經授權使用。
5. **翻譯模型**：目前使用 OpenAI `gpt-4o-mini`，設定在 `src/services/translationService.js`。

---

## 快速開始

### 1. 環境設定
- 準備以下必要資訊：
- **LINE Developers**：
  - Channel Access Token
  - Channel Secret
- **OpenAI**：
  - API Key
- **Google Cloud IAM**：
  - 啟用 Google Sheets API，並取得服務帳號金鑰 JSON 檔案。
- **Google Sheets**：
  - 建立一份試算表，並將工作表命名為 `Sheet1`。
  - 將試算表共用給服務帳號的 email，權限設為「編輯者」。
  - 表頭會在第一次寫入設定時自動建立。

### 2. 安裝相依套件

```bash
npm install
```

### 3. 設定環境變數

複製範本後填入實際的值：

```bash
cp .env.example .env
```

| 環境變數 | 說明 |
|---|---|
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token |
| `OPENAI_API_KEY` | OpenAI API Key |
| `GOOGLE_SHEET_ID` | 試算表網址中的 ID |
| `GOOGLE_CREDENTIALS` | 服務帳號金鑰 JSON 的內容，需寫成一行。未設定時會改讀 `credentials/service-account.json` |
| `PASSPHRASE` | 通關密語。未設定時，任何人都無法通過驗證 |

### 4. 啟動服務

```bash
npm start
```

- 服務預設使用 port 3000，可用環境變數 `PORT` 更改。
- 開發時可使用 `npm run dev`，程式修改後會自動重新啟動。
- 將 Webhook URL 設定至 LINE Developers Console，路徑為 `/webhook`，例如 `https://你的網域/webhook`。

---

## 使用方法

1. **邀請 LINE Bot 加入群組**，或直接與 Bot 一對一聊天。
2. **輸入通關密語** 進行驗證。每個群組與一對一聊天都需要各自驗證一次。
3. 使用 `/set` 命令設定目標語言，例如：`/set 繁體中文 印尼文`
4. 開始對話，Bot 會自動翻譯訊息至指定的語言。

> 回覆一定會包含英文翻譯，因為訊息會先翻成英文，再翻成其他目標語言，所以 `/set` 不需要設定英文。

---

## 技術架構

### 系統架構概覽

- **LINE Messaging API**：接收並回應使用者訊息。
- **OpenAI API**：進行多語言翻譯。
- **Google Sheets**：儲存使用者設定與驗證狀態。
- **Node.js + Express**：建立後端服務，處理訊息邏輯。

### 主要流程

1. **訊息接收**：監聽 LINE Webhook 並接收使用者訊息。
2. **驗證機制**：檢查是否已輸入通關密語。
3. **語言設定**：允許使用 `/set` 命令設定目標語言。
4. **多語言翻譯**：將訊息先翻成英文，再翻成指定語言並回傳。
5. **記錄與存儲**：將 LINE ID、身份類型（個人或群組）、語言設定、設定時間、驗證狀態與設定者等資訊存儲至 Google Sheets。

---

## 部署方式

### 雲端部署
- 使用 **Vercel** 或其他支援 Node.js 的雲端平台進行部署。
- 在平台上設定上述所有環境變數。
- 本專案的 Vercel 沒有連接 GitHub 自動部署，合併程式後需要手動部署：

```bash
npx vercel@latest --prod
```

### 本地測試
1. 使用 `ngrok` 暫時啟動公開 Webhook URL 進行測試。
2. 在 LINE Developers Console 設定 Webhook URL。

---

## 注意事項

1. **API 限額**：請注意 OpenAI API 的使用額度，避免超額費用。
2. **安全性**：妥善管理環境變數，確保 .env 不被外部存取。通關密語也屬於機密，請勿寫進程式碼。
3. **隱私**：訊息內容會傳送至 OpenAI 進行翻譯。請勿在 log 中記錄訊息內容或使用者 ID。
4. **模型停用**：OpenAI 會停用舊模型。如果 Bot 回覆「翻譯時發生錯誤」，請先確認模型是否仍可使用。
5. **服務穩定性**：Vercel 為免費版本，可能會有服務中斷的情況。

---

## 未來優化方向

1. 遷移至 **Firebase 資料庫** 提升效能與穩定性。
2. 使用 Linode 進行後端服務管理取代 Vercel。
3. 增加可以替換自己的 OpenAI API 或其他翻譯服務的功能，提供更多的翻譯選項。
4. 提供紀錄專有名詞翻譯的資料庫，增加使用者體驗。

