#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
0.doc_mg/tests/run_tests.py
自動化整合測試套件：驗證 validate_contract.py 與 export_converter.py
"""

import os
import sys
import subprocess

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
TOOLS_DIR = os.path.join(BASE_DIR, "tools")

VALIDATOR_SCRIPT = os.path.join(TOOLS_DIR, "validate_contract.py")
CONVERTER_SCRIPT = os.path.join(TOOLS_DIR, "export_converter.py")
E2E_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_cross_plugin_e2e.py")

def run_command(cmd):
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8")
    return proc.returncode, proc.stdout, proc.stderr

def test_validator():
    print("[測試 1/4] 驗證 validate_contract.py 合法合約 (含 UniversalTaskPayload v2.3)...")
    valid_files = [
        os.path.join(FIXTURES_DIR, "valid_finance_summary.json"),
        os.path.join(FIXTURES_DIR, "valid_create_task.json"),
        os.path.join(FIXTURES_DIR, "valid_create_task_v2.json"),
        os.path.join(FIXTURES_DIR, "valid_focus_started.json"),
        os.path.join(FIXTURES_DIR, "valid_collect_note.json"),
        os.path.join(FIXTURES_DIR, "valid_clipper_snapshot.json")
    ]
    code, out, err = run_command([sys.executable, VALIDATOR_SCRIPT] + valid_files)
    assert code == 0, f"合法合約檢驗應返回 0，得到 {code}\n輸出: {out}\n錯誤: {err}"
    assert "通過 6" in out, "應全數通過 6 份合約"
    print("  -> 合法合約檢驗全部 PASS (包含 v2.3)")

    print("[測試 2/4] 驗證 validate_contract.py 阻擋非法合約...")
    invalid_file = os.path.join(FIXTURES_DIR, "invalid_contract.json")
    code, out, err = run_command([sys.executable, VALIDATOR_SCRIPT, invalid_file])
    assert code != 0, f"非法合約檢驗應返回非 0，得到 {code}"
    assert "protocolVersion" in out and "tags" in out, "應精確標出欄位型別錯誤"
    print("  -> 非法合約攔截與報錯機制 PASS")

def test_converter():
    print("[測試 3/4] 驗證 export_converter.py Obsidian Markdown 與 CSV 轉譯...")
    snapshot_nvda = os.path.join(FIXTURES_DIR, "valid_clipper_snapshot.json")
    snapshot_aapl = os.path.join(FIXTURES_DIR, "valid_clipper_snapshot_aapl.json")
    combined_csv = os.path.join(FIXTURES_DIR, "test_output_combined.csv")

    code, out, err = run_command([
        sys.executable, CONVERTER_SCRIPT,
        snapshot_nvda, snapshot_aapl,
        "--combine-csv", "-o", combined_csv
    ])
    assert code == 0, f"轉譯器應返回 0，得到 {code}\n輸出: {out}\n錯誤: {err}"
    assert os.path.exists(combined_csv), "應產出合併 CSV"

    # 檢查 Markdown 產物
    md_nvda = os.path.join(FIXTURES_DIR, "NVDA_research_20261002.md")
    assert os.path.exists(md_nvda), "應產出 NVDA Markdown 筆記"
    with open(md_nvda, "r", encoding="utf-8") as f:
        md_text = f.read()
    assert "---" in md_text and "target_median: 150.0" in md_text, "Markdown 應包含合法 YAML Frontmatter"
    assert "## 📊 核心估值與目標價共識" in md_text, "Markdown 應包含結構化估值表格"

    # 清理測試生成的中間檔
    if os.path.exists(combined_csv):
        os.remove(combined_csv)
    print("  -> Obsidian Markdown 與量化 CSV 轉譯驗證 PASS")

def test_cross_plugin_e2e():
    print("[測試 4/4] 驗證跨插件端對端通訊、Service Worker 休眠與 Outbox 離線重試...")
    code, out, err = run_command([sys.executable, E2E_SCRIPT])
    assert code == 0, f"端對端測試應返回 0，得到 {code}\n輸出: {out}\n錯誤: {err}"
    assert "全數通過 (ALL PASS)" in out, "端對端測試應全數通過"
    print("  -> 跨插件端對端通訊與 Outbox 重試驗證 PASS")

def main():
    print("================ 開始執行 0.doc_mg 自動化測試 ================")
    test_validator()
    test_converter()
    test_cross_plugin_e2e()
    print("================ 所有自動化測試順利通過 (ALL PASS) ================")

if __name__ == "__main__":
    main()
