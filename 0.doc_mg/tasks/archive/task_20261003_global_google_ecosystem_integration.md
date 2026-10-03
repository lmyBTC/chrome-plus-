---
title: "跨插件 Google 生態系自動化對接架構設計與規格制定"
plugin: "global"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-05"
---

## 1. 目標
依據 PM 與投資研究員兩大角色之斷點診斷成果，設計串聯 Google 生態系（Google Sheets、Docs、Calendar、Drive、Tasks）之跨插件自動化對接藍圖。評估免審查輕量 Webhook 與官方 OAuth2 架構，擴充四大插件通訊合約，並編寫完整的 Google 生態系整合規格書 (`0.doc_mg/docs/google_ecosystem_integration_spec.md`) 與使用說明手冊。

## 2. 策略與鎖定檔案

### 核心設計維度
1. **Google Sheets 對接**：FinanceClipper 個股損益表/估值、ScrumClock 衝刺工時日誌一鍵結構化 Append。
2. **Google Docs & Drive 研報生成**：研報重點、影音字幕與估值自動組裝為 Docs 初稿，並備份至指定 Drive 資料夾。
3. **Google Calendar & Tasks 排程**：今日重點戰役 (Focus Task) 雙向轉 Google Task，衝刺排程自動登記 Google 日曆時間區塊。
4. **架構模式評估**：評估「Google Apps Script (GAS) Webhook（免審查、Zero-Config、輕量）」與「Chrome Identity OAuth 2.0（官方授權、高安全、審查門檻高）」之雙軌落地策略。

### 鎖定檔案 (Target Files)
- 使用說明.md
- 0.doc_mg/docs/cross_plugin_contract.md
- 0.doc_mg/docs/google_ecosystem_integration_spec.md (規劃產出)
- finance-research-clipper-oss/FINANCE_CLIPPER_README.md
- chrome_scrumclock/SCRUMCLOCK_README.md

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [x] L1 專家技能：.agents/skills/finance-clipper-core/SKILL.md、.agents/skills/scrumclock-core/SKILL.md (新增 Google 匯出與同步通訊契約規格)
- [x] L2 插件導航：使用說明.md、0.doc_mg/docs/cross_plugin_contract.md (擴充 Google 生態系協同章節)
- [x] L3 業務規格：0.doc_mg/docs/google_ecosystem_integration_spec.md (Google 授權、Webhook 與生態系資料規格 SSOT)
- [x] L4 任務生命週期：0.doc_mg/tasks/archive/global/ (結案後封存)

## 3. 任務拆解

### Phase 1: Google 對接架構評估與選型 (Architecture Evaluation) 狀態：`[已完成]`

### Phase 2: 跨插件協同通訊協議擴充設計 狀態：`[已完成]`
- [x] 任務 2.1: 擴充 cross_plugin_contract.md 訊息類型
    - [x] 設計 `EXPORT_TO_SHEETS`（支援財務報表與工時日誌兩大 Payload）
    - [x] 設計 `CREATE_DOC_REPORT`（支援研報內文、影音字幕與結論 Payload）
    - [x] 設計 `SYNC_CALENDAR_EVENT`（支援番茄鐘衝刺區塊與待辦提醒 Payload）
- [x] 任務 2.2: 定義各 Plugin 對應之通訊轉發與回執結構

### Phase 3: 編寫 Google 生態系整合規格書 狀態：`[已完成]`
- [x] 任務 3.1: 產出完整規格書 (0.doc_mg/docs/google_ecosystem_integration_spec.md)
    - [x] 規範 Google Sheets 財務底稿與工時模板之欄位結構 (Schema)
    - [x] 規範 Google Docs 研報自動排版樣板 (Template Layout)
    - [x] 規範 Google Calendar / Tasks 之事件 Payload 與雙向狀態代碼
- [x] 任務 3.2: 提供 Google Apps Script (GAS) 部署腳本範例與測試指南

### Phase 4: 使用說明更新與四層 SSOT 閉環驗收 狀態：`[已完成]`
- [x] 任務 4.1: 更新全域使用說明文檔
    - [x] 於 使用說明.md 擴充「Google 生態系自動化對接指引」專章
- [x] 任務 4.2: 回寫 L1~L3 規範文檔並執行驗收檢查
    - [x] 同步 .agents/skills/ 專家技能與跨插件契約

## 4. 影響評估
- 本任務提供完整且非侵入式的 Google 整合藍圖與通訊介面定義。
- 維持現有 Manifest V3 跨插件通訊相容性，後續實裝時各插件可獨立平滑接入。

## 5. 驗收標準
- [x] **架構評估嚴謹性**: 產出 GAS Webhook 與 OAuth2 方案之完整安全性、易用性與審核成本對比。
- [x] **通訊協議完備性**: cross_plugin_contract.md 完整涵蓋 Sheets/Docs/Calendar 擴充事件。
- [x] **規格書可實作性**: 整合規格書提供欄位 Schema、Payload 範例與 GAS 端接收範例。
- [x] **檔案編碼**: 確認所有產出文檔均為 UTF-8 (無 BOM)。
- [x] **SSOT 閉環**: 完成 Target SSOTs 宣告之文檔回寫與任務封存歸檔。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: abb958bf-8a04-4d80-b88c-060fcc532328 (Gate 1 Blueprint 初始化)
> - 2026-10-03 ID: c6d38496-38c5-44ea-ad4d-1652952fda13 (Gate 2 Phase 1 完成)
> - 2026-10-03 ID: 656dd361-2197-4ddf-9a1d-b1679e935003 (Gate 2 Phase 2 完成)
> - 2026-10-03 ID: ce4e988e-d317-49e2-b06a-f9bf9f6721e8 (Gate 2 Phase 3 完成)
> - 2026-10-03 ID: 634ef768-e177-4e20-982c-593151cd6397 (Gate 2 Phase 4 完成與全案驗收歸檔)
>
> **任務已圓滿結案**：全域 Google 生態系自動化對接規格書、契約與全域使用手冊已全面回寫完畢。
