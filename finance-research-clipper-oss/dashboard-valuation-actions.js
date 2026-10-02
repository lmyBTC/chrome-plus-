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

      try {
        const res = await window.FinanceAIClient.createScrumTask({
          ticker: ticker,
          title: taskTitle,
          notes: md,
          tags: tags,
          estimatedPomodoros: 2,
          url: window.location.href
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
    }
  };

  // 掛載至全域 DashboardActions 物件
  if (!window.DashboardActions) {
    window.DashboardActions = {};
  }
  Object.assign(window.DashboardActions, ValuationActions);
})();
