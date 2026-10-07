/**
 * test_google_sheets_exporter.js - 驗證 GoogleSheetsExporter 之欄位對齊與 Nano 反常識論點萃取
 */

const assert = require('assert');
const path = require('path');
const exporterPath = path.resolve(__dirname, '../../finance-research-clipper-oss/googleSheetsExporter.js');
const GoogleSheetsExporter = require(exporterPath);

console.log('--- 測試 1: 基本個股資料防腐與欄位對齊 ---');
const stock1 = {
  ticker: 'nvda ',
  name: 'NVIDIA Corporation',
  price: '128.50',
  stats: {
    '本益比': '42.1',
    '殖利率': '0.03%'
  },
  analyst: {
    consensus: '強力買進',
    targetMedian: '150.00'
  },
  aiSummary: {
    counterIntuitive: '市場低估其推論端晶片佔比，非單純訓練端放緩。',
    bullCase: 'CSP 資本支出翻倍且毛利率維持 75% 以上。'
  }
};

const payload1 = GoogleSheetsExporter.buildPortfolioPayload(stock1, {
  userNote: '長期看好 Blackwell 放量'
});

assert.strictEqual(payload1.action, 'SYNC_PORTFOLIO');
assert.strictEqual(payload1.payload.ticker, 'NVDA');
assert.strictEqual(payload1.payload.name, 'NVIDIA Corporation');
assert.strictEqual(payload1.payload.price, '128.50');
assert.strictEqual(payload1.payload.pe, '42.1');
assert.strictEqual(payload1.payload.yield, '0.03%');
assert.strictEqual(payload1.payload.targetPrice, '150.00');
assert.ok(payload1.payload.notes.includes('【自訂觀點】長期看好 Blackwell 放量'));
assert.ok(payload1.payload.notes.includes('【共識評級】強力買進'));
assert.ok(payload1.payload.notes.includes('【反常識論點】市場低估其推論端晶片佔比'));
assert.ok(payload1.payload.notes.includes('【多方論點】CSP 資本支出翻倍'));
console.log('✅ 測試 1 通過！欄位完全對齊，Nano 反常識與多方論點正確萃取。');

console.log('--- 測試 2: 邊界情況防呆降級 (缺少 stats / 缺少 analyst) ---');
const stock2 = {
  ticker: '2330.TW',
  price: 1050
};
const payload2 = GoogleSheetsExporter.buildPortfolioPayload(stock2);
assert.strictEqual(payload2.payload.ticker, '2330.TW');
assert.strictEqual(payload2.payload.name, '2330.TW');
assert.strictEqual(payload2.payload.price, '1050');
assert.strictEqual(payload2.payload.pe, '');
assert.strictEqual(payload2.payload.yield, '');
assert.strictEqual(payload2.payload.targetPrice, '');
assert.strictEqual(payload2.payload.notes, '');
console.log('✅ 測試 2 通過！缺少非必填欄位時自動安全降級為空字串，絕不崩潰。');

console.log('--- 測試 3: 缺少 ticker 防呆阻擋 ---');
assert.throws(() => {
  GoogleSheetsExporter.buildPortfolioPayload({ name: 'Invalid' });
}, /缺少有效的個股代碼/);
console.log('✅ 測試 3 通過！缺少 ticker 時立即拋出明確錯誤阻擋傳輸。');

console.log('--- 全部測試通過 (3/3)！---');
