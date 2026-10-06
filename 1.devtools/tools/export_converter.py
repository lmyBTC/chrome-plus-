#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/export_converter.py
Chrome 多插件工作區：投研快照多格式匯出轉譯器 (Export Converter)

功能:
  1. 將 FinanceClipper 快照 JSON 轉譯為 Obsidian Markdown 投研筆記 (含 YAML Frontmatter 與 Dataview 標籤)
  2. 將快照 JSON 扁平化轉譯為量化分析專用 CSV (支援單一快照轉譯或多快照聚合合併)
"""

import os
import sys
import json
import csv
import argparse
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

# UTF-8 輸出防亂碼相容性處理
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

def safe_float(val: Any, default: float = 0.0) -> float:
    if val is None or val == "" or val == "-":
        return default
    if isinstance(val, (int, float)):
        return float(val)
    try:
        s = str(val).replace("$", "").replace(",", "").replace("%", "").strip()
        return float(s)
    except (ValueError, TypeError):
        return default

def safe_str(val: Any, default: str = "") -> str:
    if val is None:
        return default
    return str(val).strip()

def normalize_snapshot(data: Dict[str, Any]) -> Dict[str, Any]:
    """將不同來源 (minerSchema, ClipperPayload, aiClient) 規格正規化為統一結構"""
    payload = data.get("payload", data)
    stats_dict = payload.get("stats") or (payload.get("overview") and payload["overview"].get("stats")) or {}
    analyst_dict = payload.get("analyst") or {}

    ticker = safe_str(payload.get("ticker") or payload.get("symbol") or "UNKNOWN").upper()
    name = safe_str(payload.get("name") or "")
    price = safe_float(payload.get("price"))
    timestamp = safe_str(payload.get("timestamp") or datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # 目標價統計量讀取 (支援 targetPriceStats 物件或扁平欄位)
    t_stats = payload.get("targetPriceStats") or {}
    t_median = safe_float(t_stats.get("median") or payload.get("target_price_median") or payload.get("targetMedian") or analyst_dict.get("targetMedian") or payload.get("targetPrice"))
    t_mean = safe_float(t_stats.get("mean") or payload.get("targetMean") or payload.get("target_mean"))
    t_high = safe_float(t_stats.get("high") or payload.get("target_price_high") or payload.get("targetHigh") or analyst_dict.get("targetHigh"))
    t_low = safe_float(t_stats.get("low") or payload.get("target_price_low") or payload.get("targetLow") or analyst_dict.get("targetLow"))
    t_upside = safe_float(t_stats.get("upsidePercent") or payload.get("targetUpside") or payload.get("target_upside"))
    t_std = safe_float(t_stats.get("stdDev") or payload.get("targetStdDev") or payload.get("target_std_dev"))
    t_cv = safe_float(t_stats.get("cv") or payload.get("targetCv") or payload.get("target_cv"))

    # 如果有現價與中位數但缺少 upside，動態計算
    if t_upside == 0.0 and price > 0 and t_median > 0:
        t_upside = round(((t_median - price) / price) * 100, 2)

    # 52 週區間
    range52w = safe_str(payload.get("range52w") or stats_dict.get("52-wk range") or "")
    low52 = safe_float(payload.get("low52"))
    high52 = safe_float(payload.get("high52"))
    if (low52 == 0.0 or high52 == 0.0) and range52w and "-" in range52w:
        parts = range52w.split("-")
        if len(parts) >= 2:
            low52 = safe_float(parts[0])
            high52 = safe_float(parts[1])

    # 獲利與估值指標
    beta = safe_float(payload.get("beta") or stats_dict.get("Beta"))
    pe = safe_str(payload.get("pe") or stats_dict.get("P/E ratio") or "")
    mktcap = safe_str(payload.get("marketCap") or payload.get("mktcap") or stats_dict.get("Market cap") or "")
    consensus = safe_str(payload.get("analyst_consensus") or analyst_dict.get("consensus") or "")

    latest_eps_act = safe_float(payload.get("latestEpsActual") or (payload.get("earnings") and payload["earnings"].get("epsActual")))
    latest_eps_est = safe_float(payload.get("latestEpsEst") or (payload.get("earnings") and payload["earnings"].get("epsEstimate")))
    eps_surprise = safe_float(payload.get("epsSurprise") or (payload.get("earnings") and payload["earnings"].get("epsSurprise")))
    yoy = safe_float(payload.get("yoy") or (payload.get("earnings") and payload["earnings"].get("yoy")))

    note = safe_str(payload.get("note") or payload.get("notes") or "")
    url = safe_str(payload.get("url") or f"https://www.google.com/finance/quote/{ticker}:NASDAQ")
    financials_table = payload.get("financials_table") or []

    return {
        "ticker": ticker,
        "name": name,
        "price": price,
        "timestamp": timestamp,
        "date": timestamp.split(" ")[0] if " " in timestamp else timestamp.split("T")[0],
        "target_median": t_median,
        "target_mean": t_mean,
        "target_high": t_high,
        "target_low": t_low,
        "target_upside": t_upside,
        "target_std_dev": t_std,
        "target_cv": t_cv,
        "beta": beta,
        "range52w": range52w,
        "low52": low52,
        "high52": high52,
        "pe": pe,
        "mktcap": mktcap,
        "consensus": consensus,
        "latest_eps_act": latest_eps_act,
        "latest_eps_est": latest_eps_est,
        "eps_surprise": eps_surprise,
        "yoy": yoy,
        "note": note,
        "url": url,
        "financials_table": financials_table
    }

def convert_to_obsidian_markdown(norm: Dict[str, Any]) -> str:
    """產出結構化且相容 Obsidian YAML Frontmatter & Dataview 查詢之 Markdown"""
    lines: List[str] = []

    # 1. YAML Frontmatter
    lines.append("---")
    lines.append(f'title: "{norm["ticker"]} 投資研報快照"')
    lines.append(f'ticker: "{norm["ticker"]}"')
    if norm["name"]:
        lines.append(f'name: "{norm["name"]}"')
    lines.append(f'date: "{norm["date"]}"')
    lines.append(f'price: {norm["price"]}')
    lines.append(f'target_median: {norm["target_median"]}')
    lines.append(f'target_mean: {norm["target_mean"]}')
    lines.append(f'target_high: {norm["target_high"]}')
    lines.append(f'target_low: {norm["target_low"]}')
    lines.append(f'target_upside_pct: {norm["target_upside"]}')
    lines.append(f'target_std_dev: {norm["target_std_dev"]}')
    lines.append(f'target_cv: {norm["target_cv"]}')
    lines.append(f'beta: {norm["beta"]}')
    lines.append(f'range52w: "{norm["range52w"]}"')
    lines.append(f'low52: {norm["low52"]}')
    lines.append(f'high52: {norm["high52"]}')
    lines.append(f'latest_eps_actual: {norm["latest_eps_act"]}')
    lines.append(f'latest_eps_estimate: {norm["latest_eps_est"]}')
    lines.append(f'eps_surprise_pct: {norm["eps_surprise"]}')
    lines.append(f'yoy_pct: {norm["yoy"]}')
    lines.append(f'market_cap: "{norm["mktcap"]}"')
    lines.append(f'pe: "{norm["pe"]}"')
    lines.append(f'consensus: "{norm["consensus"]}"')
    lines.append("tags:")
    lines.append("  - 投資研究")
    lines.append("  - 研報快照")
    lines.append(f'  - {norm["ticker"]}')
    lines.append("---\n")

    # 2. Markdown 標題與簡介
    lines.append(f"# {norm['ticker']} 投資研究分析快照")
    if norm["name"]:
        lines.append(f"> **公司名稱**: {norm['name']} | **採集時間**: `{norm['timestamp']}` | [原始網址]({norm['url']})\n")
    else:
        lines.append(f"> **採集時間**: `{norm['timestamp']}` | [原始網址]({norm['url']})\n")

    # 3. 核心估值與市場共識表格
    lines.append("## 📊 核心估值與目標價共識")
    lines.append("| 項目 | 數據 | 項目 | 數據 |")
    lines.append("| :--- | :--- | :--- | :--- |")
    lines.append(f"| **現價** | `${norm['price']:.2f}` | **分析師共識** | `{norm['consensus'] or 'N/A'}` |")
    lines.append(f"| **目標價中位數** | `${norm['target_median']:.2f}` | **預期上漲空間** | `+{norm['target_upside']:.2f}%` |")
    lines.append(f"| **目標價均值** | `${norm['target_mean']:.2f}` | **目標價高/低區間** | `${norm['target_low']:.2f} ~ ${norm['target_high']:.2f}` |")
    lines.append(f"| **離散係數 (CV)** | `{norm['target_cv']:.4f}` | **標準差** | `{norm['target_std_dev']:.2f}` |")
    lines.append(f"| **市值** | `{norm['mktcap'] or 'N/A'}` | **本益比 (P/E)** | `{norm['pe'] or 'N/A'}` |")
    lines.append(f"| **Beta 值** | `{norm['beta']:.2f}` | **52 週價格區間** | `{norm['range52w'] or f'${norm['low52']:.2f} ~ ${norm['high52']:.2f}'}` |\n")

    # 4. 獲利表現
    lines.append("## 📈 獲利能力與 EPS 表現")
    lines.append("| 指標 | 數值 | 說明 |")
    lines.append("| :--- | :--- | :--- |")
    lines.append(f"| **最新季度實際 EPS** | `${norm['latest_eps_act']:.2f}` | 最新公佈業績 |")
    lines.append(f"| **市場預期 EPS** | `${norm['latest_eps_est']:.2f}` | 華爾街分析師共識預期 |")
    lines.append(f"| **EPS 驚喜度 (Surprise)** | `{norm['eps_surprise']:+.1f}%` | 實際值超越或低於預期幅度 |")
    lines.append(f"| **營收年增率 (YoY)** | `{norm['yoy']:+.1f}%` | 與去年同期相比增長率 |\n")

    # 5. 財務矩陣表格 (若有)
    if norm["financials_table"] and isinstance(norm["financials_table"], list) and len(norm["financials_table"]) > 0:
        lines.append("## 📋 損益表與財務矩陣")
        headers = norm["financials_table"][0]
        lines.append("| " + " | ".join(str(h) for h in headers) + " |")
        lines.append("| " + " | ".join([":---"] * len(headers)) + " |")
        for row in norm["financials_table"][1:]:
            lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
        lines.append("")

    # 6. 筆記與觀點
    lines.append("## 💡 投研筆記與觀點摘要")
    if norm["note"]:
        lines.append(f"{norm['note']}\n")
    else:
        lines.append("_（暫無自訂筆記內容）_\n")

    # 7. Dataview 導航提示
    lines.append("---")
    lines.append("*Obsidian 建議查詢：`TABLE price, target_median, target_upside_pct, consensus FROM #投資研究`*")

    return "\n".join(lines)

CSV_FIELDNAMES = [
    "timestamp",
    "ticker",
    "name",
    "price",
    "target_median",
    "target_mean",
    "target_high",
    "target_low",
    "target_upside_pct",
    "target_std_dev",
    "target_cv",
    "beta",
    "range52w",
    "low52",
    "high52",
    "latest_eps_actual",
    "latest_eps_est",
    "eps_surprise_pct",
    "yoy_pct",
    "pe",
    "market_cap",
    "analyst_consensus",
    "url",
    "note"
]

def norm_to_csv_row(norm: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "timestamp": norm["timestamp"],
        "ticker": norm["ticker"],
        "name": norm["name"],
        "price": norm["price"],
        "target_median": norm["target_median"],
        "target_mean": norm["target_mean"],
        "target_high": norm["target_high"],
        "target_low": norm["target_low"],
        "target_upside_pct": norm["target_upside"],
        "target_std_dev": norm["target_std_dev"],
        "target_cv": norm["target_cv"],
        "beta": norm["beta"],
        "range52w": norm["range52w"],
        "low52": norm["low52"],
        "high52": norm["high52"],
        "latest_eps_actual": norm["latest_eps_act"],
        "latest_eps_est": norm["latest_eps_est"],
        "eps_surprise_pct": norm["eps_surprise"],
        "yoy_pct": norm["yoy"],
        "pe": norm["pe"],
        "market_cap": norm["mktcap"],
        "analyst_consensus": norm["consensus"],
        "url": norm["url"],
        "note": norm["note"].replace("\n", " ").replace("\r", " ")
    }

def convert_single_file(json_path: str, output_format: str, out_target: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    norm = normalize_snapshot(data)
    ticker = norm["ticker"]
    date_str = norm["date"].replace("-", "")

    base_dir = os.path.dirname(json_path)
    if out_target and os.path.isdir(out_target):
        base_dir = out_target

    md_out_path = None
    csv_out_path = None

    if output_format in ("markdown", "md", "all"):
        if out_target and out_target.endswith(".md"):
            md_out_path = out_target
        else:
            md_out_path = os.path.join(base_dir, f"{ticker}_research_{date_str}.md")

        md_content = convert_to_obsidian_markdown(norm)
        with open(md_out_path, "w", encoding="utf-8") as f:
            f.write(md_content)

    if output_format in ("csv", "all"):
        if out_target and out_target.endswith(".csv"):
            csv_out_path = out_target
        else:
            csv_out_path = os.path.join(base_dir, f"{ticker}_metrics_{date_str}.csv")

        row = norm_to_csv_row(norm)
        # 寫入含 UTF-8 BOM 以確保 Excel 與各種工具開啟無亂碼
        with open(csv_out_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
            writer.writeheader()
            writer.writerow(row)

    return md_out_path, csv_out_path

def convert_combined_csv(json_paths: List[str], output_csv_path: str):
    rows = []
    for jp in json_paths:
        try:
            with open(jp, "r", encoding="utf-8") as f:
                data = json.load(f)
            norm = normalize_snapshot(data)
            rows.append(norm_to_csv_row(norm))
        except Exception as e:
            print(f"[警告] 讀取 {jp} 失敗: {e}")

    with open(output_csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

def main():
    parser = argparse.ArgumentParser(description="FinanceClipper 快照轉譯器 (Obsidian Markdown & CSV)")
    parser.add_argument("inputs", nargs="+", help="快照 JSON 檔案路徑或目錄")
    parser.add_argument("--format", "-f", default="all", choices=["markdown", "md", "csv", "all"], help="輸出格式 (預設: all)")
    parser.add_argument("--output", "-o", help="輸出檔案或目標目錄")
    parser.add_argument("--combine-csv", action="store_true", help="將多個快照合併為單一彙總 CSV")

    args = parser.parse_args()

    json_files = []
    for item in args.inputs:
        if os.path.isdir(item):
            for root, _, files in os.walk(item):
                for f in files:
                    if f.endswith(".json"):
                        json_files.append(os.path.join(root, f))
        elif os.path.isfile(item):
            json_files.append(item)
        else:
            print(f"[警告] 找不到檔案或目錄: {item}")

    if not json_files:
        print("[錯誤] 未找到任何有效的 .json 檔案")
        sys.exit(1)

    print(f"\n================ 多格式匯出轉譯器 (Export Converter) ================")
    print(f"找到 {len(json_files)} 個快照檔案待處理 | 輸出格式: {args.format}\n")

    if args.combine_csv and len(json_files) > 1:
        out_csv = args.output if (args.output and args.output.endswith(".csv")) else "combined_finance_metrics.csv"
        convert_combined_csv(json_files, out_csv)
        print(f"[成功] 已合併輸出量化彙整表: {out_csv}")
        # 若僅要求 csv 格式且已完成 combine_csv，直接結束
        if args.format == "csv":
            print(f"\n====================================================================\n")
            sys.exit(0)

    for jf in json_files:
        try:
            # 若已輸出 combine-csv，個別檔案輸出目標若為同一個 .csv 檔則自動降級為同目錄檔名，避免覆寫
            single_out_target = args.output
            if single_out_target and single_out_target.endswith(".csv") and args.combine_csv:
                single_out_target = os.path.dirname(single_out_target) or None

            md_path, csv_path = convert_single_file(jf, args.format, single_out_target)
            print(f"[完成] 來源: {os.path.basename(jf)}")
            if md_path:
                print(f"   -> Markdown: {md_path}")
            if csv_path:
                print(f"   -> CSV:      {csv_path}")
        except Exception as e:
            print(f"[失敗] 轉譯 {jf} 發生錯誤: {e}")

    print(f"\n====================================================================\n")

if __name__ == "__main__":
    main()
