/**
 * dashboard-valuation-actions.js - Finance Research Clipper 估值沙盒動作模組
 * 負責敏感度折現估值情境計算、5x5 熱力矩陣產生、Markdown 匯出、Google Sheets 同步與轉入 ScrumClock 戰役
 */

(function () {
  'use strict';

  function showToast(msg) {
    if (window.DashboardRender && window.DashboardRender.showToast) {
      window.DashboardRender.showToast(msg);
    }
  }

  function getParseNum() {
    return (window.DashboardActions && window.DashboardActions.parseNumeric) || function (val) {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (!val || typeof val !== 'string') return 0;
      const clean = val.replace(/[^0-9.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };
  }

  const ValuationActions = {
    /**
     * 敏感度估值沙盒情境試算引擎 (單一情境)
     */
    calculateValuationScenario: function (params) {
      const price = Math.max(0.01, params.price || 1);
      const baseEps = Math.max(0.01, params.baseEps || 1);
      const growthRate = typeof params.growthRate === 'number' ? params.growthRate : 0.12;
      const exitPe = Math.max(1, params.exitPe || 20);
      const discountRate = typeof params.discountRate === 'number' ? params.discountRate : 0.09;
      const horizonYears = Math.max(1, params.horizonYears || 3);

      // 未來每股盈餘 (Future EPS = EPS0 * (1 + g)^n)
      const futureEps = baseEps * Math.pow(1 + growthRate, horizonYears);
      // 未來名目目標價 (Nominal Target Price = Future EPS * Exit P/E)
      const nominalPrice = futureEps * exitPe;
      // 折現目標價 (PV Target Price = Nominal Price / (1 + r)^n)
      const pvTargetPrice = nominalPrice / Math.pow(1 + discountRate, horizonYears);
      // 潛在空間 % vs 現價
      const upsidePercent = ((pvTargetPrice - price) / price) * 100;
      // 名目上漲空間 %
      const nominalUpsidePercent = ((nominalPrice - price) / price) * 100;
      // 年化報酬率 (CAGR / IRR)
      const irrPercent = (Math.pow(Math.max(0.001, nominalPrice) / price, 1 / horizonYears) - 1) * 100;

      return {
        price: parseFloat(price.toFixed(2)),
        baseEps: parseFloat(baseEps.toFixed(2)),
        growthRate: parseFloat(growthRate.toFixed(4)),
        growthRatePercent: parseFloat((growthRate * 100).toFixed(1)),
        exitPe: parseFloat(exitPe.toFixed(1)),
        discountRate: parseFloat(discountRate.toFixed(4)),
        discountRatePercent: parseFloat((discountRate * 100).toFixed(1)),
        horizonYears: parseInt(horizonYears, 10),
        futureEps: parseFloat(futureEps.toFixed(2)),
        nominalPrice: parseFloat(nominalPrice.toFixed(2)),
        pvTargetPrice: parseFloat(pvTargetPrice.toFixed(2)),
        upsidePercent: parseFloat(upsidePercent.toFixed(1)),
        nominalUpsidePercent: parseFloat(nominalUpsidePercent.toFixed(1)),
        irrPercent: parseFloat(irrPercent.toFixed(1))
      };
    },

    /**
     * 構建估值沙盒完整模型 (Bear / Base / Bull 三種情境與 5x5 敏感度矩陣)
     */
    generateValuationModel: function (stock, customConfig = {}) {
      if (!stock) return null;
      const parseNum = getParseNum();
      const price = parseNum(stock.price) || 100;

      // 提取基準 EPS 與當前 P/E
      let eps = parseNum(stock.latestEpsActual || stock.eps || (stock.earnings && stock.earnings.latestEps) || (stock.stats && stock.stats['每股盈餘']));
      const pe = parseNum(stock.pe || stock.peRatio || (stock.stats && (stock.stats['本益比'] || stock.stats['P/E ratio'] || stock.stats['PE']))) || 22;

      if (!eps || eps <= 0) {
        eps = pe > 0 ? parseFloat((price / pe).toFixed(2)) : 5.0;
      }

      const baseEps = customConfig.baseEps !== undefined ? parseNum(customConfig.baseEps) : eps;
      const horizonYears = customConfig.horizonYears || 3;

      // 歷史 YoY 成長參考
      const historicalGrowth = parseNum(stock.yoy) || 12;

      // 情境參數初始化 (若未自訂則提供智慧預設值)
      const baseGrowth = customConfig.baseGrowth !== undefined ? customConfig.baseGrowth : (historicalGrowth / 100);
      const basePe = customConfig.basePe !== undefined ? customConfig.basePe : (pe > 0 ? pe : 22);
      const baseDiscount = customConfig.baseDiscount !== undefined ? customConfig.baseDiscount : 0.09;

      const bearGrowth = customConfig.bearGrowth !== undefined ? customConfig.bearGrowth : Math.max(-0.10, parseFloat((baseGrowth * 0.45).toFixed(3)));
      const bearPe = customConfig.bearPe !== undefined ? customConfig.bearPe : Math.max(6, parseFloat((basePe * 0.72).toFixed(1)));
      const bearDiscount = customConfig.bearDiscount !== undefined ? customConfig.bearDiscount : 0.105;

      const bullGrowth = customConfig.bullGrowth !== undefined ? customConfig.bullGrowth : Math.min(0.60, parseFloat((baseGrowth * 1.5 + 0.03).toFixed(3)));
      const bullPe = customConfig.bullPe !== undefined ? customConfig.bullPe : Math.min(90, parseFloat((basePe * 1.32).toFixed(1)));
      const bullDiscount = customConfig.bullDiscount !== undefined ? customConfig.bullDiscount : 0.08;

      const baseScenario = this.calculateValuationScenario({
        price, baseEps, growthRate: baseGrowth, exitPe: basePe, discountRate: baseDiscount, horizonYears
      });

      const bearScenario = this.calculateValuationScenario({
        price, baseEps, growthRate: bearGrowth, exitPe: bearPe, discountRate: bearDiscount, horizonYears
      });

      const bullScenario = this.calculateValuationScenario({
        price, baseEps, growthRate: bullGrowth, exitPe: bullPe, discountRate: bullDiscount, horizonYears
      });

      // 敏感度矩陣中心點（依目前 active 情境，預設 base）
      const centerGrowth = customConfig.activeGrowth !== undefined ? customConfig.activeGrowth : baseGrowth;
      const centerPe = customConfig.activePe !== undefined ? customConfig.activePe : basePe;
      const centerDiscount = customConfig.activeDiscount !== undefined ? customConfig.activeDiscount : baseDiscount;

      const growthDeltas = [-0.04, -0.02, 0, 0.02, 0.04];
      const peDeltas = [-4, -2, 0, 2, 4];

      const growthSteps = growthDeltas.map((d) => parseFloat((centerGrowth + d).toFixed(3)));
      const peSteps = peDeltas.map((d) => Math.max(4, parseFloat((centerPe + d).toFixed(1))));

      const matrix = [];
      growthSteps.forEach((g) => {
        const row = [];
        peSteps.forEach((p) => {
          const res = this.calculateValuationScenario({
            price, baseEps, growthRate: g, exitPe: p, discountRate: centerDiscount, horizonYears
          });
          row.push({
            growthRate: g,
            growthRatePercent: parseFloat((g * 100).toFixed(1)),
            exitPe: p,
            targetPrice: res.pvTargetPrice,
            nominalPrice: res.nominalPrice,
            upsidePercent: res.upsidePercent,
            isCenter: (Math.abs(g - centerGrowth) < 0.0001 && Math.abs(p - centerPe) < 0.0001)
          });
        });
        matrix.push(row);
      });

      return {
        ticker: stock.ticker,
        name: stock.name || stock.ticker,
        price,
        baseEps,
        currentPe: pe,
        horizonYears,
        activeScenarioKey: customConfig.activeScenarioKey || 'base',
        scenarios: {
          bear: bearScenario,
          base: baseScenario,
          bull: bullScenario
        },
        sensitivityMatrix: {
          growthSteps,
          peSteps,
          centerGrowth,
          centerPe,
          discountRate: centerDiscount,
          grid: matrix
        },
        timestamp: new Date().toLocaleString()
      };
    },

    /**
     * 複製估值沙盒分析結果至 Markdown
     */
    exportValuationMarkdown: function (model) {
      if (!model || !model.scenarios) {
        showToast('⚠️ 無可複製之估值沙盒數據');
        return;
      }

      const { ticker, name, price, baseEps, horizonYears, scenarios, sensitivityMatrix } = model;
      const { bear, base, bull } = scenarios;

      let md = `# 🧮 敏感度估值沙盒分析：${ticker} (${name})\n\n`;
      md += `* **現價**：$${price.toFixed(2)}\n`;
      md += `* **基準 EPS**：$${baseEps.toFixed(2)}\n`;
      md += `* **預測時間跨度**：${horizonYears} 年\n`;
      md += `* **評估時間**：${model.timestamp}\n\n`;

      md += `## 1. 三種情境目標價與空間試算 (Scenario Breakdown)\n\n`;
      md += `| 情境 (Scenario) | 複合成長率 (CAGR) | 目標 Exit P/E | 折現率 (WACC) | 未來 EPS | 目標價 (折現現值) | 潛在空間 | 年化回報 (IRR) |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      md += `| 🐻 **Bear (悲觀)** | ${bear.growthRatePercent}% | ${bear.exitPe}x | ${bear.discountRatePercent}% | $${bear.futureEps.toFixed(2)} | **$${bear.pvTargetPrice.toFixed(2)}** | ${bear.upsidePercent > 0 ? '+' : ''}${bear.upsidePercent}% | ${bear.irrPercent}% |\n`;
      md += `| ⚖️ **Base (基準)** | ${base.growthRatePercent}% | ${base.exitPe}x | ${base.discountRatePercent}% | $${base.futureEps.toFixed(2)} | **$${base.pvTargetPrice.toFixed(2)}** | ${base.upsidePercent > 0 ? '+' : ''}${base.upsidePercent}% | ${base.irrPercent}% |\n`;
      md += `| 🚀 **Bull (樂觀)** | ${bull.growthRatePercent}% | ${bull.exitPe}x | ${bull.discountRatePercent}% | $${bull.futureEps.toFixed(2)} | **$${bull.pvTargetPrice.toFixed(2)}** | ${bull.upsidePercent > 0 ? '+' : ''}${bull.upsidePercent}% | ${bull.irrPercent}% |\n\n`;

      if (sensitivityMatrix && sensitivityMatrix.grid) {
        md += `## 2. 敏感度熱力矩陣 (Exit P/E vs EPS CAGR 目標價)\n\n`;
        const headers = ['成長率 (g) \\ P/E', ...sensitivityMatrix.peSteps.map((p) => `${p}x`)];
        md += `| ${headers.join(' | ')} |\n`;
        md += `| ${headers.map(() => ':---').join(' | ')} |\n`;

        sensitivityMatrix.grid.forEach((row, idx) => {
          const gLabel = `${sensitivityMatrix.growthSteps[idx] >= 0 ? '+' : ''}${(sensitivityMatrix.growthSteps[idx] * 100).toFixed(1)}%`;
          const rowVals = row.map((cell) => {
            const upStr = `${cell.upsidePercent >= 0 ? '+' : ''}${cell.upsidePercent}%`;
            return `$${cell.targetPrice.toFixed(1)} (${upStr})${cell.isCenter ? ' ⭐' : ''}`;
          });
          md += `| **${gLabel}** | ${rowVals.join(' | ')} |\n`;
        });
        md += `\n> ⭐ 標記為當前情境中心交叉基準點\n`;
      }

      md += `\n> 數據計算模型：Finance Research Clipper OSS 估值沙盒引擎\n`;

      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(md).then(() => {
          showToast(`📋 已成功複製 $${ticker} 估值沙盒 Markdown 報告！`);
        }).catch(() => {
          showToast('複製失敗，請手動複製');
        });
      } else {
        showToast(`📋 估值報告已生成`);
      }
    },

    /**
     * 同步估值沙盒數據至 Google Sheets (GAS)
     */
    sendValuationToGas: function (model, btnSendGas, settingsModal) {
      if (!model || !model.scenarios) {
        showToast('⚠️ 無估值沙盒資料可同步');
        return;
      }

      chrome.storage.local.get(['gasUrl', 'gasSecretToken', 'appsScriptUrl'], (res) => {
        const gasUrl = res.gasUrl || res.appsScriptUrl;
        if (!gasUrl) {
          showToast('⚠️ 尚未設定 Google Apps Script URL，請先至設定面板配置！');
          if (settingsModal) settingsModal.style.display = 'flex';
          return;
        }

        const originalText = btnSendGas ? btnSendGas.textContent : '';
        if (btnSendGas) {
          btnSendGas.disabled = true;
          btnSendGas.textContent = '估值同步中...';
        }

        const payload = {
          protocolVersion: 1,
          action: 'valuation_sandbox_sync',
          secretToken: res.gasSecretToken || undefined,
          timestamp: Date.now(),
          ticker: model.ticker,
          name: model.name,
          price: model.price,
          baseEps: model.baseEps,
          horizonYears: model.horizonYears,
          scenarios: model.scenarios,
          sensitivitySummary: {
            centerGrowth: model.sensitivityMatrix?.centerGrowth,
            centerPe: model.sensitivityMatrix?.centerPe,
            discountRate: model.sensitivityMatrix?.discountRate
          }
        };

        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'cors',
          redirect: 'follow'
        }).then((resp) => {
          if (btnSendGas) {
            btnSendGas.disabled = false;
            btnSendGas.textContent = originalText;
          }
          if (resp.ok) {
            showToast(`🎉 成功同步 $${model.ticker} 估值沙盒情境至 Google Sheets！`);
          } else {
            showToast(`⚠️ 傳送失敗，HTTP 狀態碼: ${resp.status}`);
          }
        }).catch((err) => {
          if (btnSendGas) {
            btnSendGas.disabled = false;
            btnSendGas.textContent = originalText;
          }
          showToast(`❌ 連線錯誤: ${err.message}`);
        });
      });
    },

    /**
     * 推播估值沙盒結果至 ScrumClock 今日作戰戰役
     */
    sendValuationToScrumClock: async function (model, btnAddToScrum) {
      if (!model || !model.scenarios) {
        showToast('⚠️ 無估值沙盒資料可推播');
        return;
      }

      if (!window.FinanceAIClient || !window.FinanceAIClient.createScrumTask) {
        showToast('⚠️ 跨插件客戶端模組尚未載入');
        return;
      }

      const { ticker, name, price, baseEps, horizonYears, scenarios } = model;
      const { bear, base, bull } = scenarios;

      let md = `### 🧮 估值沙盒敏感度評估：${ticker} (${name})\n\n`;
      md += `* **現價**：$${price.toFixed(2)} | **基準 EPS**：$${baseEps.toFixed(2)} | **預測時間**：${horizonYears} 年\n\n`;
      md += `#### 🎯 三種情境目標價與空間\n`;
      md += `- 🐻 **悲觀 (Bear)**：目標價 **$${bear.pvTargetPrice.toFixed(2)}** (${bear.upsidePercent > 0 ? '+' : ''}${bear.upsidePercent}%) | 成長 ${bear.growthRatePercent}% / P/E ${bear.exitPe}x\n`;
      md += `- ⚖️ **基準 (Base)**：目標價 **$${base.pvTargetPrice.toFixed(2)}** (${base.upsidePercent > 0 ? '+' : ''}${base.upsidePercent}%) | 成長 ${base.growthRatePercent}% / P/E ${base.exitPe}x\n`;
      md += `- 🚀 **樂觀 (Bull)**：目標價 **$${bull.pvTargetPrice.toFixed(2)}** (${bull.upsidePercent > 0 ? '+' : ''}${bull.upsidePercent}%) | 成長 ${bull.growthRatePercent}% / P/E ${bull.exitPe}x\n\n`;
      md += `#### ⚔️ 關鍵作戰決策備忘\n`;
      md += `- 防守防線 (Bear Floor)：$${bear.pvTargetPrice.toFixed(2)}\n`;
      md += `- 空間主力 (Base Anchor)：$${base.pvTargetPrice.toFixed(2)}\n`;
      md += `- 向上催化 (Bull Ceiling)：$${bull.pvTargetPrice.toFixed(2)}\n`;

      const taskTitle = `[估值沙盒] 評估 $${ticker} 敏感度目標價 ($${bear.pvTargetPrice.toFixed(0)} ~ $${bull.pvTargetPrice.toFixed(0)})`;
      const tags = ['#投資估值', '#敏感度分析', `$${ticker}`];

      const originalText = btnAddToScrum ? btnAddToScrum.textContent : '';
      if (btnAddToScrum) {
        btnAddToScrum.disabled = true;
        btnAddToScrum.textContent = '⏳ 推播任務中...';
      }

      const deepLinkUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
        ? chrome.runtime.getURL(`dashboard.html?ticker=${encodeURIComponent(ticker)}`)
        : `dashboard.html?ticker=${encodeURIComponent(ticker)}`;

      try {
        const res = await window.FinanceAIClient.createScrumTask({
          ticker: ticker,
          title: taskTitle,
          notes: md,
          tags: tags,
          estimatedPomodoros: 2,
          url: deepLinkUrl,
          deepLinkUrl: deepLinkUrl
        });

        if (btnAddToScrum) {
          btnAddToScrum.disabled = false;
          btnAddToScrum.textContent = originalText;
        }

        if (res && res.success) {
          if (res.duplicate) {
            showToast(`ℹ️ $${ticker} 今日已在戰役中，已同步更新備忘！`);
          } else {
            showToast(`🎯 成功將 $${ticker} 估值沙盒推播至 ScrumClock 今日戰役！`);
          }
        } else {
          showToast(`⚠️ 建立任務失敗：${res ? res.error : '未知錯誤'}`);
        }
      } catch (err) {
        if (btnAddToScrum) {
          btnAddToScrum.disabled = false;
          btnAddToScrum.textContent = originalText;
        }
        showToast(`❌ 推播異常: ${err.message}`);
      }
    },

    /**
     * 複製估值沙盒 5x5 二維敏感度熱力矩陣為 Clean TSV (直貼 Excel / Google Sheets)
     * @param {Object} model 估值模型物件
     */
    copySensitivityMatrixTsv: function (model) {
      if (!model || !model.sensitivityMatrix || !model.sensitivityMatrix.grid) {
        showToast('⚠️ 無估值敏感度矩陣資料可複製');
        return;
      }

      const matrix = model.sensitivityMatrix;
      const cleanCell = (window.DashboardActions && window.DashboardActions.cleanTsvCell) || ((v) => String(v || '').trim());

      // 標題列：橫軸 Exit P/E
      const headerRow = ['g \\ Exit P/E', ...matrix.peSteps.map((p) => `${p}x`)];
      const rows = [headerRow];

      // 各列：縱軸複合成長率 g，對應各儲存格純目標價
      matrix.grid.forEach((row, rIdx) => {
        const gVal = matrix.growthSteps[rIdx];
        const gLabel = `${gVal >= 0 ? '+' : ''}${(gVal * 100).toFixed(1)}%`;
        const rowCells = [gLabel];

        row.forEach((cell) => {
          // 純數值目標價，方便分析師在 Excel 運算加總
          const priceNum = cell.targetPrice !== undefined && cell.targetPrice !== null
            ? Number(cell.targetPrice).toFixed(2)
            : '';
          rowCells.push(cleanCell(priceNum));
        });

        rows.push(rowCells);
      });

      const tsv = rows.map((r) => r.join('\t')).join('\n');

      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(tsv).then(() => {
          showToast(`📋 已複製 $${model.ticker || ''} 5x5 估值敏感度 Clean TSV！`);
        }).catch(() => {
          showToast('複製失敗，請手動複製');
        });
      } else {
        showToast('⚠️ 當前環境不支援剪貼簿自動寫入');
      }
    },

    /**
     * 建立標準 3-Statement & DCF 財務模型試算表底稿 (含 Excel/Google Sheets 公式)
     * @param {Object} stock 標的物件
     * @param {Object} customConfig 自訂情境與假設參數
     */
    buildFinancialModelBlueprint: function (stock, customConfig = {}) {
      if (!stock) return null;
      const parseNum = getParseNum();
      const ticker = stock.ticker || 'STOCK';
      const companyName = stock.name || stock.companyName || ticker;
      const price = Math.max(0.01, parseNum(stock.price) || 100);

      // 市值 (百萬美元)
      let mktCapVal = 0;
      if (stock.stats && (stock.stats['市值'] || stock.stats['Market cap'])) {
        const mktCapStr = String(stock.stats['市值'] || stock.stats['Market cap']);
        mktCapVal = parseNum(mktCapStr);
        if (/T/i.test(mktCapStr)) mktCapVal *= 1000000;
        else if (/B/i.test(mktCapStr)) mktCapVal *= 1000;
      }
      if (!mktCapVal || mktCapVal <= 0) {
        mktCapVal = price * 1000; // 預設 10 億股
      }

      // 流通股數 (百萬股)
      const shares = Math.max(1, parseFloat((mktCapVal / price).toFixed(1)));

      // 基準 EPS
      let eps = parseNum(stock.latestEpsActual || stock.eps || (stock.earnings && stock.earnings.latestEps) || (stock.stats && stock.stats['每股盈餘']));
      const pe = parseNum(stock.pe || stock.peRatio || (stock.stats && (stock.stats['本益比'] || stock.stats['P/E ratio'] || stock.stats['PE']))) || 22;
      if (!eps || eps <= 0) {
        eps = pe > 0 ? parseFloat((price / pe).toFixed(2)) : 4.5;
      }
      const baseEps = customConfig.baseEps !== undefined ? parseNum(customConfig.baseEps) : eps;

      // 基準營收 (百萬美元)
      let baseRevenue = 0;
      if (stock.incomeStatement && stock.incomeStatement.rows && stock.incomeStatement.rows.length > 0) {
        const revRow = stock.incomeStatement.rows.find((r) => /營業收入|營收|Revenue/i.test(r.metric || r[0]));
        if (revRow) {
          const val = revRow.periods ? revRow.periods[0] : revRow[1];
          baseRevenue = parseNum(val);
        }
      }
      if (!baseRevenue || baseRevenue <= 0) {
        // 若無直接營收，以 EPS * 股數 / 預設淨利率 (18%) 推算
        baseRevenue = parseFloat(((baseEps * shares) / 0.18).toFixed(1));
      }

      // 成長率與沙盒參數
      const baseGrowth = customConfig.baseGrowth !== undefined ? customConfig.baseGrowth : 0.15;
      const bearGrowth = customConfig.bearGrowth !== undefined ? customConfig.bearGrowth : Math.max(-0.05, parseFloat((baseGrowth * 0.45).toFixed(3)));
      const bullGrowth = customConfig.bullGrowth !== undefined ? customConfig.bullGrowth : Math.min(0.50, parseFloat((baseGrowth * 1.45).toFixed(3)));

      const basePe = customConfig.basePe !== undefined ? customConfig.basePe : (pe > 0 ? pe : 22);
      const bearPe = customConfig.bearPe !== undefined ? customConfig.bearPe : Math.max(8, parseFloat((basePe * 0.72).toFixed(1)));
      const bullPe = customConfig.bullPe !== undefined ? customConfig.bullPe : Math.min(80, parseFloat((basePe * 1.3).toFixed(1)));

      const baseDiscount = customConfig.baseDiscount !== undefined ? customConfig.baseDiscount : 0.09;
      const bearDiscount = customConfig.bearDiscount !== undefined ? customConfig.bearDiscount : 0.105;
      const bullDiscount = customConfig.bullDiscount !== undefined ? customConfig.bullDiscount : 0.08;

      const taxRate = 0.21;
      const terminalGrowth = 0.025;
      const fcfConversion = 0.85;
      const operatingMargin = 0.30;

      // 產生 5 年成長階梯 (衰減平滑)
      const gY1 = baseGrowth;
      const gY2 = parseFloat((baseGrowth * 0.92).toFixed(3));
      const gY3 = parseFloat((baseGrowth * 0.82).toFixed(3));
      const gY4 = parseFloat((baseGrowth * 0.72).toFixed(3));
      const gY5 = parseFloat((baseGrowth * 0.62).toFixed(3));

      // 計算 Bear / Bull 目標價參考值
      const bearCalc = this.calculateValuationScenario({
        price, baseEps, growthRate: bearGrowth, exitPe: bearPe, discountRate: bearDiscount, horizonYears: 3
      });
      const bullCalc = this.calculateValuationScenario({
        price, baseEps, growthRate: bullGrowth, exitPe: bullPe, discountRate: bullDiscount, horizonYears: 3
      });

      // 建立包含 Excel / Google Sheets 真正計算公式的二維 Grid
      // 座標系統對應：
      // Column A: 項目
      // Column B: 假設值 / Base Year (T)
      // Column C: Year 1 (T+1)
      // Column D: Year 2 (T+2)
      // Column E: Year 3 (T+3)
      // Column F: Year 4 (T+4)
      // Column G: Year 5 (T+5)
      const grid = [
        [`【${ticker}】3-Statement & DCF 估值試算模型底稿 (Financial Model)`, '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['【一、模型核心假設 (Model Assumptions)】', '', '', '', '', '', ''],
        ['現價 (Current Price)', price.toFixed(2), 'USD', '', '', '', ''],
        ['流通股數 (Shares Outstanding)', shares.toFixed(1), '百萬股 (Million)', '', '', '', ''],
        ['基準每股盈餘 (Base EPS)', baseEps.toFixed(2), 'USD', '', '', '', ''],
        ['基準營業收入 (Base Revenue)', baseRevenue.toFixed(1), '百萬美元 (M USD)', '', '', '', ''],
        ['有效所得稅率 (Effective Tax Rate)', taxRate.toFixed(2), '21.0%', '', '', '', ''],
        ['折現率 (WACC / Discount Rate)', baseDiscount.toFixed(3), `${(baseDiscount * 100).toFixed(1)}%`, '', '', '', ''],
        ['終端成長率 (Terminal Growth Rate g)', terminalGrowth.toFixed(3), `${(terminalGrowth * 100).toFixed(1)}%`, '', '', '', ''],
        ['出場本益比 (Exit P/E Multiple)', basePe.toFixed(1), 'x', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['【二、五年度損益預測表 (Income Statement Projection, 單位: 百萬美元)】', '', '', '', '', '', ''],
        ['財務指標 / 預測年度', '基準年 (Base T)', 'Year 1 (T+1)', 'Year 2 (T+2)', 'Year 3 (T+3)', 'Year 4 (T+4)', 'Year 5 (T+5)'],
        ['營收年增率 (Revenue Growth %)', 'N/A', gY1.toFixed(3), gY2.toFixed(3), gY3.toFixed(3), gY4.toFixed(3), gY5.toFixed(3)],
        ['營業收入 (Revenue)', '=$B$7', '=B16*(1+C15)', '=C16*(1+D15)', '=D16*(1+E15)', '=E16*(1+F15)', '=F16*(1+G15)'],
        ['營業利益率 (Operating Margin %)', operatingMargin.toFixed(2), operatingMargin.toFixed(2), operatingMargin.toFixed(2), operatingMargin.toFixed(2), operatingMargin.toFixed(2), operatingMargin.toFixed(2)],
        ['營業利益 (EBIT / Operating Income)', '=B16*B17', '=C16*C17', '=D16*D17', '=E16*E17', '=F16*F17', '=G16*G17'],
        ['所得稅費用 (Taxes)', '=B18*$B$8', '=C18*$B$8', '=D18*$B$8', '=E18*$B$8', '=F18*$B$8', '=G18*$B$8'],
        ['稅後淨利 (Net Income)', '=B18-B19', '=C18-C19', '=D18-D19', '=E18-E19', '=F18-F19', '=G18-G19'],
        ['每股盈餘 (EPS)', '=$B$6', '=C20/$B$5', '=D20/$B$5', '=E20/$B$5', '=F20/$B$5', '=G20/$B$5'],
        ['EPS 年增率 (YoY %)', 'N/A', '=(C21-B21)/B21', '=(D21-C21)/C21', '=(E21-D21)/D21', '=(F21-E21)/E21', '=(G21-F21)/F21'],
        ['', '', '', '', '', '', ''],
        ['【三、自由現金流與折現估值 (DCF Valuation, 單位: 百萬美元)】', '', '', '', '', '', ''],
        ['估值項目 / 預測期', '基準年 (Base T)', 'Year 1 (T+1)', 'Year 2 (T+2)', 'Year 3 (T+3)', 'Year 4 (T+4)', 'Year 5 (T+5)'],
        ['自由現金流轉換率 (FCF Conversion %)', fcfConversion.toFixed(2), fcfConversion.toFixed(2), fcfConversion.toFixed(2), fcfConversion.toFixed(2), fcfConversion.toFixed(2), fcfConversion.toFixed(2)],
        ['無槓桿自由現金流 (Unlevered FCF)', '=B20*B26', '=C20*C26', '=D20*D26', '=E20*E26', '=F20*F26', '=G20*G26'],
        ['折現期數 (Period n)', '0', '1', '2', '3', '4', '5'],
        ['折現因子 (Discount Factor)', '1.000', '=1/(1+$B$9)^C28', '=1/(1+$B$9)^D28', '=1/(1+$B$9)^E28', '=1/(1+$B$9)^F28', '=1/(1+$B$9)^G28'],
        ['自由現金流現值 (PV of FCF)', '=B27*B29', '=C27*C29', '=D27*D29', '=E27*E29', '=F27*F29', '=G27*G29'],
        ['', '', '', '', '', '', ''],
        ['【四、DCF 估值總結與合理目標價 (Implied Valuation Summary)】', '', '', '', '', '', ''],
        ['5 年預測期現金流現值總和 (Cumulative PV of FCF)', '=SUM(C30:G30)', '百萬美元', '', '', '', ''],
        ['終端價值 (Terminal Value - Gordon Growth)', '=(G27*(1+$B$10))/($B$9-$B$10)', '百萬美元', '', '', '', ''],
        ['終端價值折現現值 (PV of Terminal Value)', '=B34*G29', '百萬美元', '', '', '', ''],
        ['隱含企業/權益價值 (Implied Equity Value)', '=B33+B35', '百萬美元', '', '', '', ''],
        ['每股隱含合理目標價 (Implied Target Price Per Share)', '=B36/$B$5', 'USD / 股', '', '', '', ''],
        ['目前市場股價 (Current Stock Price)', '=$B$4', 'USD / 股', '', '', '', ''],
        ['潛在漲跌空間 (Implied Upside / Downside %)', '=(B37-B38)/B38', '百分比', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['【五、三種情境敏感度對比 (Scenario Comparison)】', '', '', '', '', '', ''],
        ['情境 (Scenario)', '營收成長率 (CAGR)', 'Exit P/E', '折現率 (WACC)', '預期每股目標價', '潛在漲跌空間', '說明'],
        ['🐻 悲觀情境 (Bear)', `${(bearGrowth * 100).toFixed(1)}%`, `${bearPe}x`, `${(bearDiscount * 100).toFixed(1)}%`, `$${bearCalc.pvTargetPrice.toFixed(2)}`, `${bearCalc.upsidePercent >= 0 ? '+' : ''}${bearCalc.upsidePercent}%`, '保守防守底線'],
        ['⚖️ 基準情境 (Base)', `${(baseGrowth * 100).toFixed(1)}%`, `${basePe}x`, `${(baseDiscount * 100).toFixed(1)}%`, '=B37', '=B39', '市場共識主軸'],
        ['🚀 樂觀情境 (Bull)', `${(bullGrowth * 100).toFixed(1)}%`, `${bullPe}x`, `${(bullDiscount * 100).toFixed(1)}%`, `$${bullCalc.pvTargetPrice.toFixed(2)}`, `${bullCalc.upsidePercent >= 0 ? '+' : ''}${bullCalc.upsidePercent}%`, '超預期催化爆發']
      ];

      return {
        ticker,
        companyName,
        price,
        shares,
        baseEps,
        baseRevenue,
        grid,
        targetSheetName: `${ticker}_財務模型`,
        timestamp: new Date().toLocaleString()
      };
    },

    /**
     * 一鍵發送標準 3-Statement & DCF 財務模型至 Google Sheets (GAS Webhook)
     */
    exportFinancialModelToGas: function (stock, customConfig = {}, btnElement, settingsModal) {
      if (!stock) {
        showToast('⚠️ 缺少標的資料');
        return;
      }

      chrome.storage.local.get(['gasUrl', 'gasSecretToken', 'appsScriptUrl'], (res) => {
        const gasUrl = res.gasUrl || res.appsScriptUrl;
        if (!gasUrl) {
          showToast('⚠️ 尚未設定 Google Apps Script URL，請先至設定面板配置！');
          if (settingsModal) settingsModal.style.display = 'flex';
          return;
        }

        const blueprint = this.buildFinancialModelBlueprint(stock, customConfig);
        if (!blueprint) {
          showToast('⚠️ 建立財務模型失敗');
          return;
        }

        const originalText = btnElement ? btnElement.textContent : '';
        if (btnElement) {
          btnElement.disabled = true;
          btnElement.textContent = '模型匯出中...';
        }

        const payload = {
          protocolVersion: 2,
          action: 'export_financial_model',
          type: 'EXPORT_FINANCIAL_MODEL',
          secretToken: res.gasSecretToken || undefined,
          timestamp: Date.now(),
          payload: {
            ticker: blueprint.ticker,
            companyName: blueprint.companyName,
            targetSheetName: blueprint.targetSheetName,
            grid: blueprint.grid
          }
        };

        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'cors',
          redirect: 'follow'
        }).then((resp) => {
          if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = originalText;
          }
          if (resp.ok) {
            showToast(`🎉 成功直套 [${blueprint.ticker}] 3-Statement & DCF 財務模型至 Google Sheets！`);
          } else {
            showToast(`⚠️ 匯出失敗，HTTP 狀態碼: ${resp.status}`);
          }
        }).catch((err) => {
          if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = originalText;
          }
          showToast(`❌ 連線錯誤: ${err.message}`);
        });
      });
    },

    /**
     * 一鍵複製標準 3-Statement & DCF 財務模型為 Clean TSV (直貼 Excel / Sheets)
     */
    copyFinancialModelTsv: function (stock, customConfig = {}) {
      if (!stock) {
        showToast('⚠️ 缺少標的資料');
        return;
      }

      const blueprint = this.buildFinancialModelBlueprint(stock, customConfig);
      if (!blueprint || !blueprint.grid) {
        showToast('⚠️ 財務模型建立失敗');
        return;
      }

      const tsv = blueprint.grid.map((row) => row.join('\t')).join('\n');

      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(tsv).then(() => {
          showToast(`📋 已複製 [${blueprint.ticker}] 完整 3-Statement & DCF 財務底稿！(Ctrl+V 直貼 Excel / Sheets)`);
        }).catch(() => {
          showToast('複製失敗，請手動複製');
        });
      } else {
        showToast('⚠️ 當前環境不支援剪貼簿自動寫入');
      }
    }
  };

  // 掛載至全域物件 (相容 DashboardActions 與 DashboardValuationActions)
  if (!window.DashboardActions) {
    window.DashboardActions = {};
  }
  Object.assign(window.DashboardActions, ValuationActions);
  window.DashboardValuationActions = ValuationActions;
})();

