/**
 * dashboard-valuation-render.js - Finance Research Clipper 估值沙盒視圖渲染模組
 * 負責敏感度估值沙盒 (Valuation Sandbox) 之 DOM 建構、三情境卡片 (Bear/Base/Bull)、互動滑桿工作區、二維熱力矩陣渲染與即時聯動
 */

(function () {
  'use strict';

  const ValuationRender = {
    /**
     * 渲染敏感度估值沙盒視覺化介面 (Phase 3)
     * @param {Object} stock 基準標的物件
     * @param {HTMLElement} container 容器元素 (#sandbox-content)
     * @param {Object} callbacks 回調函式與設定模態框引用
     */
    renderValuationSandbox: function (stock, container, callbacks) {
      if (!stock || !container) return;
      container.textContent = '';

      const parseNum = (window.DashboardActions && window.DashboardActions.parseNumeric) || parseFloat;
      const price = parseNum(stock.price) || 100;
      let eps = parseNum(stock.latestEpsActual || stock.eps || (stock.earnings && stock.earnings.latestEps) || (stock.stats && stock.stats['每股盈餘']));
      const pe = parseNum(stock.pe || stock.peRatio || (stock.stats && (stock.stats['本益比'] || stock.stats['P/E ratio'] || stock.stats['PE']))) || 22;

      if (!eps || eps <= 0) {
        eps = pe > 0 ? parseFloat((price / pe).toFixed(2)) : 5.0;
      }

      const defaultGrowth = parseNum(stock.yoy) ? (parseNum(stock.yoy) / 100) : 0.12;

      // 沙盒內部狀態 (若該標的已有自訂暫存狀態則繼承，否則初始化智慧預設值)
      if (!container._sandboxState || container._sandboxState.ticker !== stock.ticker) {
        container._sandboxState = {
          ticker: stock.ticker,
          activeScenarioKey: 'base', // 'bear' | 'base' | 'bull'
          baseEps: eps,
          horizonYears: 3,
          // Bear 情境預設值
          bearGrowth: Math.max(-0.10, parseFloat((defaultGrowth * 0.45).toFixed(3))),
          bearPe: Math.max(6, parseFloat((pe * 0.72).toFixed(1))),
          bearDiscount: 0.105,
          // Base 情境預設值
          baseGrowth: defaultGrowth,
          basePe: pe > 0 ? pe : 22,
          baseDiscount: 0.09,
          // Bull 情境預設值
          bullGrowth: Math.min(0.60, parseFloat((defaultGrowth * 1.5 + 0.03).toFixed(3))),
          bullPe: Math.min(90, parseFloat((pe * 1.32).toFixed(1))),
          bullDiscount: 0.08
        };
      }

      const state = container._sandboxState;

      // 取得運算模型
      function getModel() {
        // 設定當前 active 情境參數做為敏感度矩陣中心
        let activeGrowth = state.baseGrowth;
        let activePe = state.basePe;
        let activeDiscount = state.baseDiscount;

        if (state.activeScenarioKey === 'bear') {
          activeGrowth = state.bearGrowth;
          activePe = state.bearPe;
          activeDiscount = state.bearDiscount;
        } else if (state.activeScenarioKey === 'bull') {
          activeGrowth = state.bullGrowth;
          activePe = state.bullPe;
          activeDiscount = state.bullDiscount;
        }

        return window.DashboardActions.generateValuationModel(stock, {
          baseEps: state.baseEps,
          horizonYears: state.horizonYears,
          activeScenarioKey: state.activeScenarioKey,
          bearGrowth: state.bearGrowth,
          bearPe: state.bearPe,
          bearDiscount: state.bearDiscount,
          baseGrowth: state.baseGrowth,
          basePe: state.basePe,
          baseDiscount: state.baseDiscount,
          bullGrowth: state.bullGrowth,
          bullPe: state.bullPe,
          bullDiscount: state.bullDiscount,
          activeGrowth: activeGrowth,
          activePe: activePe,
          activeDiscount: activeDiscount
        });
      }

      let currentModel = getModel();

      // ====================================================
      // 1. 沙盒頂部標的資訊與操作按鈕列 (Action Bar)
      // ====================================================
      const actionBar = document.createElement('div');
      actionBar.className = 'sandbox-actions-bar';

      // 左側標的徽章
      const infoPill = document.createElement('div');
      infoPill.className = 'sandbox-stock-info-pill';
      infoPill.innerHTML = `
        <span class="sandbox-ticker-badge">${stock.ticker}</span>
        <span class="sandbox-info-item">現價: <strong>$${price.toFixed(2)}</strong></span>
        <span class="sandbox-info-item">基準 EPS: <strong>$${state.baseEps.toFixed(2)}</strong></span>
        <span class="sandbox-info-item">目前 P/E: <strong>${pe}x</strong></span>
      `;
      actionBar.appendChild(infoPill);

      // 右側操作功能鍵 (複製 Markdown、Sheets 同步、ScrumClock 轉入)
      const actionBtnsWrap = document.createElement('div');
      actionBtnsWrap.className = 'sandbox-action-buttons';

      const btnCopyMd = document.createElement('button');
      btnCopyMd.className = 'btn-action btn-primary';
      btnCopyMd.innerHTML = '📋 複製估值報告';
      btnCopyMd.title = '複製 Bear / Base / Bull 情境與敏感度矩陣為 Markdown 表格';
      btnCopyMd.onclick = () => {
        window.DashboardActions.exportValuationMarkdown(currentModel);
      };
      actionBtnsWrap.appendChild(btnCopyMd);

      const btnSendGas = document.createElement('button');
      btnSendGas.className = 'btn-action btn-success';
      btnSendGas.innerHTML = '☁️ 同步至 Sheets';
      btnSendGas.title = '同步估值沙盒數據至 Google Apps Script 試算表';
      btnSendGas.onclick = () => {
        const settingsModal = (callbacks && callbacks.settingsModal) || document.getElementById('settings-modal');
        window.DashboardActions.sendValuationToGas(currentModel, btnSendGas, settingsModal);
      };
      actionBtnsWrap.appendChild(btnSendGas);

      const btnExportModelGas = document.createElement('button');
      btnExportModelGas.className = 'btn-action btn-template';
      btnExportModelGas.innerHTML = '📊 直套財務模型底稿';
      btnExportModelGas.title = '在 Google Sheets 產生含公式的 3-Statement 損益預測與 DCF 估值底稿';
      btnExportModelGas.onclick = () => {
        const settingsModal = (callbacks && callbacks.settingsModal) || document.getElementById('settings-modal');
        if (window.DashboardValuationActions && window.DashboardValuationActions.exportFinancialModelToGas) {
          window.DashboardValuationActions.exportFinancialModelToGas(stock, state, btnExportModelGas, settingsModal);
        } else if (window.DashboardActions && window.DashboardActions.exportFinancialModelToGas) {
          window.DashboardActions.exportFinancialModelToGas(stock, state, btnExportModelGas, settingsModal);
        }
      };
      actionBtnsWrap.appendChild(btnExportModelGas);

      const btnCopyModelTsv = document.createElement('button');
      btnCopyModelTsv.className = 'btn-action btn-secondary';
      btnCopyModelTsv.innerHTML = '📑 複製模型 TSV';
      btnCopyModelTsv.title = '複製帶公式與排版之 3-Statement & DCF 財務模型底稿 (Ctrl+V 直貼 Excel / Sheets)';
      btnCopyModelTsv.onclick = () => {
        if (window.DashboardValuationActions && window.DashboardValuationActions.copyFinancialModelTsv) {
          window.DashboardValuationActions.copyFinancialModelTsv(stock, state);
        } else if (window.DashboardActions && window.DashboardActions.copyFinancialModelTsv) {
          window.DashboardActions.copyFinancialModelTsv(stock, state);
        }
      };
      actionBtnsWrap.appendChild(btnCopyModelTsv);

      const btnSendScrum = document.createElement('button');
      btnSendScrum.className = 'btn-action btn-scrum';
      btnSendScrum.innerHTML = '🎯 推播至 ScrumClock';
      btnSendScrum.title = '將此標的估值區間與情境決策推播至 ScrumClock 今日作戰任務';
      btnSendScrum.onclick = () => {
        window.DashboardActions.sendValuationToScrumClock(currentModel, btnSendScrum);
      };
      actionBtnsWrap.appendChild(btnSendScrum);

      actionBar.appendChild(actionBtnsWrap);
      container.appendChild(actionBar);

      // ====================================================
      // 2. 三種情境核心卡片網格 (Scenario Cards: Bear / Base / Bull)
      // ====================================================
      const cardsGrid = document.createElement('div');
      cardsGrid.className = 'sandbox-scenario-grid';

      const scenarioConfigs = [
        {
          key: 'bear',
          title: '🐻 悲觀情境 (Bear)',
          subtitle: '保守防守底線',
          cardClass: 'card-bear',
          tagClass: 'tag-bear',
          colorVar: 'var(--accent-red)'
        },
        {
          key: 'base',
          title: '⚖️ 基準情境 (Base)',
          subtitle: '市場共識主軸',
          cardClass: 'card-base featured',
          tagClass: 'tag-base',
          colorVar: 'var(--accent-blue)'
        },
        {
          key: 'bull',
          title: '🚀 樂觀情境 (Bull)',
          subtitle: '超預期催化爆發',
          cardClass: 'card-bull',
          tagClass: 'tag-bull',
          colorVar: 'var(--accent-green)'
        }
      ];

      const scenarioCardElements = {};

      scenarioConfigs.forEach((sc) => {
        const data = currentModel.scenarios[sc.key];
        const card = document.createElement('div');
        const isActive = state.activeScenarioKey === sc.key;
        card.className = `sandbox-scenario-card ${sc.cardClass} ${isActive ? 'is-active-scenario' : ''}`;
        card.dataset.scenario = sc.key;
        card.title = `點擊切換為編輯此情境參數`;

        // 頂部標題列
        const header = document.createElement('div');
        header.className = 'scenario-card-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'scenario-title';
        titleSpan.textContent = sc.title;

        const tagSpan = document.createElement('span');
        tagSpan.className = `scenario-badge ${sc.tagClass}`;
        tagSpan.textContent = sc.subtitle;

        header.appendChild(titleSpan);
        header.appendChild(tagSpan);
        card.appendChild(header);

        // 目標價與空間
        const targetRow = document.createElement('div');
        targetRow.className = 'scenario-target-row';

        const priceDiv = document.createElement('div');
        priceDiv.className = 'scenario-target-price';
        priceDiv.textContent = `$${data.pvTargetPrice.toFixed(2)}`;

        const upsideDiv = document.createElement('div');
        const isUp = data.upsidePercent >= 0;
        upsideDiv.className = `scenario-target-upside ${isUp ? 'upside-pos' : 'upside-neg'}`;
        upsideDiv.textContent = `${isUp ? '+' : ''}${data.upsidePercent}%`;

        targetRow.appendChild(priceDiv);
        targetRow.appendChild(upsideDiv);
        card.appendChild(targetRow);

        // 關鍵參數摘要
        const metaList = document.createElement('div');
        metaList.className = 'scenario-meta-list';
        metaList.innerHTML = `
          <div class="scenario-meta-item">
            <span>預估 EPS 成長率 (CAGR):</span>
            <strong>${data.growthRatePercent}%</strong>
          </div>
          <div class="scenario-meta-item">
            <span>目標出場 Exit P/E:</span>
            <strong>${data.exitPe}x</strong>
          </div>
          <div class="scenario-meta-item">
            <span>必要折現率 (WACC):</span>
            <strong>${data.discountRatePercent}%</strong>
          </div>
          <div class="scenario-meta-item">
            <span>第 ${state.horizonYears} 年預估 EPS:</span>
            <strong>$${data.futureEps.toFixed(2)}</strong>
          </div>
          <div class="scenario-meta-item">
            <span>預估年化報酬 (IRR):</span>
            <strong style="color: ${data.irrPercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${data.irrPercent}%</strong>
          </div>
        `;
        card.appendChild(metaList);

        // 底部點擊編輯提示
        const footerHint = document.createElement('div');
        footerHint.className = 'scenario-edit-indicator';
        footerHint.textContent = isActive ? '● 當前編輯情境' : '點擊切換編輯';
        card.appendChild(footerHint);

        card.onclick = () => {
          if (state.activeScenarioKey !== sc.key) {
            state.activeScenarioKey = sc.key;
            syncActiveScenarioUI();
          }
        };

        scenarioCardElements[sc.key] = {
          card,
          priceDiv,
          upsideDiv,
          metaList,
          footerHint
        };

        cardsGrid.appendChild(card);
      });

      container.appendChild(cardsGrid);

      // ====================================================
      // 3. 互動微調面板與敏感度矩陣 (Interactive Workspace Panel)
      // ====================================================
      const workspaceWrap = document.createElement('div');
      workspaceWrap.className = 'sandbox-workspace-wrap';

      // 左側：滑桿微調面板
      const slidersPanel = document.createElement('div');
      slidersPanel.className = 'sandbox-sliders-panel';

      const slidersHeader = document.createElement('div');
      slidersHeader.className = 'sliders-panel-header';
      const slidersTitle = document.createElement('h3');
      slidersTitle.className = 'sliders-panel-title';
      slidersTitle.innerHTML = `🎛️ 敏感度參數微調 (<span id="sliders-active-scenario-name">基準情境 Base</span>)`;
      slidersHeader.appendChild(slidersTitle);

      const btnResetPreset = document.createElement('button');
      btnResetPreset.className = 'btn-secondary btn-reset-preset';
      btnResetPreset.textContent = '↺ 重置當前預設';
      btnResetPreset.title = '恢復當前情境之標準預設值';
      slidersHeader.appendChild(btnResetPreset);

      slidersPanel.appendChild(slidersHeader);

      // 輔助函式：建立滑桿控制器
      function createSliderGroup(label, min, max, step, val, unit, onChange) {
        const group = document.createElement('div');
        group.className = 'sandbox-slider-group';

        const labelRow = document.createElement('div');
        labelRow.className = 'sandbox-slider-label-row';

        const lbl = document.createElement('span');
        lbl.className = 'sandbox-slider-name';
        lbl.textContent = label;

        const valWrap = document.createElement('div');
        valWrap.className = 'sandbox-slider-val-wrap';

        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.className = 'sandbox-slider-num-input';
        numInput.min = min;
        numInput.max = max;
        numInput.step = step;
        numInput.value = val;

        const unitSpan = document.createElement('span');
        unitSpan.className = 'sandbox-slider-unit';
        unitSpan.textContent = unit;

        valWrap.appendChild(numInput);
        valWrap.appendChild(unitSpan);

        labelRow.appendChild(lbl);
        labelRow.appendChild(valWrap);
        group.appendChild(labelRow);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'sandbox-range-slider';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = val;

        slider.oninput = (e) => {
          const v = parseFloat(e.target.value);
          numInput.value = v;
          onChange(v);
        };

        numInput.oninput = (e) => {
          let v = parseFloat(e.target.value);
          if (isNaN(v)) return;
          v = Math.min(max, Math.max(min, v));
          slider.value = v;
          onChange(v);
        };

        group.appendChild(slider);

        return {
          element: group,
          updateValue: (newVal) => {
            slider.value = newVal;
            numInput.value = newVal;
          }
        };
      }

      // 取得當前情境的參數值
      function getActiveParams() {
        if (state.activeScenarioKey === 'bear') {
          return {
            growth: state.bearGrowth,
            pe: state.bearPe,
            discount: state.bearDiscount
          };
        }
        if (state.activeScenarioKey === 'bull') {
          return {
            growth: state.bullGrowth,
            pe: state.bullPe,
            discount: state.bullDiscount
          };
        }
        return {
          growth: state.baseGrowth,
          pe: state.basePe,
          discount: state.baseDiscount
        };
      }

      const activeParams = getActiveParams();

      // 1. EPS CAGR 成長率滑桿 (-15% ~ +50%)
      const growthSlider = createSliderGroup(
        '預估 EPS 複合成長率 (CAGR g):',
        -15,
        50,
        0.5,
        parseFloat((activeParams.growth * 100).toFixed(1)),
        '%',
        (val) => {
          const g = parseFloat((val / 100).toFixed(4));
          if (state.activeScenarioKey === 'bear') state.bearGrowth = g;
          else if (state.activeScenarioKey === 'bull') state.bullGrowth = g;
          else state.baseGrowth = g;
          liveUpdate();
        }
      );
      slidersPanel.appendChild(growthSlider.element);

      // 2. 目標出場 Exit P/E 滑桿 (5x ~ 80x)
      const peSlider = createSliderGroup(
        '目標出場本益比 (Exit P/E):',
        5,
        80,
        0.5,
        activeParams.pe,
        'x',
        (val) => {
          if (state.activeScenarioKey === 'bear') state.bearPe = val;
          else if (state.activeScenarioKey === 'bull') state.bullPe = val;
          else state.basePe = val;
          liveUpdate();
        }
      );
      slidersPanel.appendChild(peSlider.element);

      // 3. 必要折現率 Discount Rate 滑桿 (4% ~ 20%)
      const discountSlider = createSliderGroup(
        '必要折現率 (Discount Rate r / WACC):',
        4,
        20,
        0.5,
        parseFloat((activeParams.discount * 100).toFixed(1)),
        '%',
        (val) => {
          const r = parseFloat((val / 100).toFixed(4));
          if (state.activeScenarioKey === 'bear') state.bearDiscount = r;
          else if (state.activeScenarioKey === 'bull') state.bullDiscount = r;
          else state.baseDiscount = r;
          liveUpdate();
        }
      );
      slidersPanel.appendChild(discountSlider.element);

      // 4. 輔助參數列 (基準 EPS 微調 & 預測時間跨度)
      const subParamsRow = document.createElement('div');
      subParamsRow.className = 'sandbox-subparams-row';

      // 基準 EPS 輸入
      const epsInputWrap = document.createElement('div');
      epsInputWrap.className = 'subparam-item';
      epsInputWrap.innerHTML = `<label class="subparam-label">基準 EPS ($):</label>`;
      const epsNumInput = document.createElement('input');
      epsNumInput.type = 'number';
      epsNumInput.step = '0.05';
      epsNumInput.min = '0.1';
      epsNumInput.value = state.baseEps.toFixed(2);
      epsNumInput.className = 'subparam-input';
      epsNumInput.oninput = (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v > 0) {
          state.baseEps = v;
          liveUpdate();
        }
      };
      epsInputWrap.appendChild(epsNumInput);
      subParamsRow.appendChild(epsInputWrap);

      // 預測時間跨度切換 (1Y / 2Y / 3Y / 5Y)
      const horizonWrap = document.createElement('div');
      horizonWrap.className = 'subparam-item';
      horizonWrap.innerHTML = `<label class="subparam-label">預測時間跨度:</label>`;
      const horizonBtns = document.createElement('div');
      horizonBtns.className = 'horizon-btn-group';

      [1, 2, 3, 5].forEach((yr) => {
        const hBtn = document.createElement('button');
        hBtn.className = `btn-horizon ${state.horizonYears === yr ? 'active' : ''}`;
        hBtn.textContent = `${yr} 年`;
        hBtn.onclick = () => {
          state.horizonYears = yr;
          horizonBtns.querySelectorAll('.btn-horizon').forEach((b) => b.classList.remove('active'));
          hBtn.classList.add('active');
          liveUpdate();
        };
        horizonBtns.appendChild(hBtn);
      });

      horizonWrap.appendChild(horizonBtns);
      subParamsRow.appendChild(horizonWrap);

      slidersPanel.appendChild(subParamsRow);
      workspaceWrap.appendChild(slidersPanel);

      // 右側：敏感度二維熱力矩陣 (Sensitivity Heatmap Grid)
      const heatmapPanel = document.createElement('div');
      heatmapPanel.className = 'sandbox-heatmap-panel';

      const heatmapHeader = document.createElement('div');
      heatmapHeader.className = 'heatmap-panel-header';
      heatmapHeader.style.display = 'flex';
      heatmapHeader.style.justifyContent = 'space-between';
      heatmapHeader.style.alignItems = 'center';

      const titleWrap = document.createElement('div');
      titleWrap.innerHTML = `
        <h3 class="heatmap-panel-title">📊 敏感度二維熱力矩陣</h3>
        <div class="heatmap-panel-subtitle">橫軸：出場 Exit P/E | 縱軸：EPS 複合年成長率 (g)</div>
      `;
      heatmapHeader.appendChild(titleWrap);

      const btnCopyHeatmapTsv = document.createElement('button');
      btnCopyHeatmapTsv.className = 'btn-clean-tsv';
      btnCopyHeatmapTsv.title = '複製 5x5 估值敏感度矩陣為 Clean TSV，直貼 Excel / Google Sheets';
      btnCopyHeatmapTsv.innerHTML = '📋 複製 Clean TSV';
      btnCopyHeatmapTsv.addEventListener('click', () => {
        if (window.DashboardValuationActions && window.DashboardValuationActions.copySensitivityMatrixTsv) {
          window.DashboardValuationActions.copySensitivityMatrixTsv(currentModel);
        } else if (window.DashboardActions && window.DashboardActions.copySensitivityMatrixTsv) {
          window.DashboardActions.copySensitivityMatrixTsv(currentModel);
        }
      });
      heatmapHeader.appendChild(btnCopyHeatmapTsv);
      heatmapPanel.appendChild(heatmapHeader);

      const heatmapContainer = document.createElement('div');
      heatmapContainer.className = 'sandbox-heatmap-table-wrap';
      heatmapPanel.appendChild(heatmapContainer);
      workspaceWrap.appendChild(heatmapPanel);

      container.appendChild(workspaceWrap);

      // ====================================================
      // 4. 動態即時同步函式 (Live Sync & Updates)
      // ====================================================

      function renderHeatmapTable() {
        heatmapContainer.textContent = '';
        const matrix = currentModel.sensitivityMatrix;
        if (!matrix || !matrix.grid) return;

        const table = document.createElement('table');
        table.className = 'sandbox-heatmap-table';

        // 標題列 (Exit P/E)
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const cornerTh = document.createElement('th');
        cornerTh.className = 'heatmap-corner-th';
        cornerTh.textContent = 'g \\ P/E';
        headerRow.appendChild(cornerTh);

        matrix.peSteps.forEach((p) => {
          const th = document.createElement('th');
          th.className = 'heatmap-pe-th';
          th.textContent = `${p}x`;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 表格主體
        const tbody = document.createElement('tbody');
        matrix.grid.forEach((row, rIdx) => {
          const tr = document.createElement('tr');

          // 左側成長率標籤
          const gTh = document.createElement('th');
          gTh.className = 'heatmap-growth-th';
          const gVal = matrix.growthSteps[rIdx];
          gTh.textContent = `${gVal >= 0 ? '+' : ''}${(gVal * 100).toFixed(1)}%`;
          tr.appendChild(gTh);

          // 各儲存格
          row.forEach((cell) => {
            const td = document.createElement('td');
            const up = cell.upsidePercent;
            const isUp = up >= 0;

            // 熱力色彩漸層樣式類別
            let heatClass = 'heat-neutral';
            if (up > 35) heatClass = 'heat-pos-strong';
            else if (up > 15) heatClass = 'heat-pos-mid';
            else if (up > 0) heatClass = 'heat-pos-soft';
            else if (up > -15) heatClass = 'heat-neg-soft';
            else if (up > -30) heatClass = 'heat-neg-mid';
            else heatClass = 'heat-neg-strong';

            td.className = `heatmap-cell ${heatClass} ${cell.isCenter ? 'is-center-anchor' : ''}`;
            td.title = `成長率: ${(cell.growthRate * 100).toFixed(1)}%, 出場 P/E: ${cell.exitPe}x => 目標價: $${cell.targetPrice.toFixed(2)} (${isUp ? '+' : ''}${up}%)`;

            const priceSpan = document.createElement('div');
            priceSpan.className = 'cell-target-price';
            priceSpan.textContent = `$${cell.targetPrice.toFixed(1)}`;

            const upSpan = document.createElement('div');
            upSpan.className = 'cell-upside-badge';
            upSpan.textContent = `${isUp ? '+' : ''}${up}%`;

            td.appendChild(priceSpan);
            td.appendChild(upSpan);

            if (cell.isCenter) {
              const star = document.createElement('span');
              star.className = 'cell-center-star';
              star.textContent = '⭐';
              td.appendChild(star);
            }

            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        heatmapContainer.appendChild(table);
      }

      function updateScenarioCardsUI() {
        scenarioConfigs.forEach((sc) => {
          const data = currentModel.scenarios[sc.key];
          const el = scenarioCardElements[sc.key];
          if (!el) return;

          el.priceDiv.textContent = `$${data.pvTargetPrice.toFixed(2)}`;
          const isUp = data.upsidePercent >= 0;
          el.upsideDiv.className = `scenario-target-upside ${isUp ? 'upside-pos' : 'upside-neg'}`;
          el.upsideDiv.textContent = `${isUp ? '+' : ''}${data.upsidePercent}%`;

          el.metaList.innerHTML = `
            <div class="scenario-meta-item">
              <span>預估 EPS 成長率 (CAGR):</span>
              <strong>${data.growthRatePercent}%</strong>
            </div>
            <div class="scenario-meta-item">
              <span>目標出場 Exit P/E:</span>
              <strong>${data.exitPe}x</strong>
            </div>
            <div class="scenario-meta-item">
              <span>必要折現率 (WACC):</span>
              <strong>${data.discountRatePercent}%</strong>
            </div>
            <div class="scenario-meta-item">
              <span>第 ${state.horizonYears} 年預估 EPS:</span>
              <strong>$${data.futureEps.toFixed(2)}</strong>
            </div>
            <div class="scenario-meta-item">
              <span>預估年化報酬 (IRR):</span>
              <strong style="color: ${data.irrPercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${data.irrPercent}%</strong>
            </div>
          `;
        });
      }

      function syncActiveScenarioUI() {
        const scenarioNames = {
          bear: '🐻 悲觀情境 (Bear)',
          base: '⚖️ 基準情境 (Base)',
          bull: '🚀 樂觀情境 (Bull)'
        };

        const scNameEl = slidersPanel.querySelector('#sliders-active-scenario-name');
        if (scNameEl) {
          scNameEl.textContent = scenarioNames[state.activeScenarioKey] || '基準情境 Base';
        }

        scenarioConfigs.forEach((sc) => {
          const el = scenarioCardElements[sc.key];
          if (!el) return;
          const isActive = state.activeScenarioKey === sc.key;
          el.card.classList.toggle('is-active-scenario', isActive);
          el.footerHint.textContent = isActive ? '● 當前編輯情境' : '點擊切換編輯';
        });

        // 更新滑桿至該情境的值
        const params = getActiveParams();
        growthSlider.updateValue(parseFloat((params.growth * 100).toFixed(1)));
        peSlider.updateValue(params.pe);
        discountSlider.updateValue(parseFloat((params.discount * 100).toFixed(1)));

        liveUpdate();
      }

      function liveUpdate() {
        currentModel = getModel();
        updateScenarioCardsUI();
        renderHeatmapTable();
      }

      // 重置預設按鈕綁定
      btnResetPreset.onclick = () => {
        if (state.activeScenarioKey === 'bear') {
          state.bearGrowth = Math.max(-0.10, parseFloat((defaultGrowth * 0.45).toFixed(3)));
          state.bearPe = Math.max(6, parseFloat((pe * 0.72).toFixed(1)));
          state.bearDiscount = 0.105;
        } else if (state.activeScenarioKey === 'bull') {
          state.bullGrowth = Math.min(0.60, parseFloat((defaultGrowth * 1.5 + 0.03).toFixed(3)));
          state.bullPe = Math.min(90, parseFloat((pe * 1.32).toFixed(1)));
          state.bullDiscount = 0.08;
        } else {
          state.baseGrowth = defaultGrowth;
          state.basePe = pe > 0 ? pe : 22;
          state.baseDiscount = 0.09;
        }
        syncActiveScenarioUI();
        if (window.DashboardRender && window.DashboardRender.showToast) {
          window.DashboardRender.showToast('已重置為當前情境之預設參數');
        }
      };

      // 初次渲染熱力矩陣
      renderHeatmapTable();
    }
  };

  // 掛載至全域 DashboardRender 物件
  if (!window.DashboardRender) {
    window.DashboardRender = {};
  }
  Object.assign(window.DashboardRender, ValuationRender);
})();
