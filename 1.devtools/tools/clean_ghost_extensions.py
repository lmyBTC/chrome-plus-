#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
clean_ghost_extensions.py
精準清理 Chrome Canary (Chrome SxS) 中 Secure Preferences 殘留的幽靈 Extension ID。

功能：
1. 偵測並定位 Chrome Canary 的 Secure Preferences。
2. 檢查 Chrome Canary 是否已完全關閉，防止檔案寫入鎖死或記憶體覆寫。
3. 支援 --dry-run (預設) 唯讀分析衝突與位置。
4. 支援 --apply 自動建立時間戳備份並安全剔除 4 組歷史隨機舊 ID。
5. 支援 --restore 提供一鍵回滾機制。
"""

import os
import sys
import json
import shutil
import argparse
import subprocess
from datetime import datetime

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# 4 組歷史幽靈 ID 及其對應路徑
GHOST_EXTENSIONS = {
    "agaallmookjjfabbpdgoeailhfllcgkn": "chrome_scrumclock/dist (舊隨機 ID)",
    "egchfajhgaaebcbnbmbhnmdabicbflkf": "chrome_video speed plus (舊隨機 ID)",
    "gpgleghipcihiijlbieohhbghedmlppe": "chrome_gemini_nano (舊隨機 ID)",
    "lddmofabeepifibcahaneebcjapolbjl": "finance-research-clipper-oss (舊隨機 ID)",
}

# 5 款插件正規固定公鑰 ID (白名單對照)
VALID_PROJECT_EXTENSIONS = {
    "kjnoegggihncdaimlgfccccogghjapgn": "browser-activity-monitor",
    "ahiihabnbjeoeneahcgbdcofncjoclcp": "chrome_scrumclock/dist",
    "dhdnogmjajghbdcgdccicpkfljmcoieg": "chrome_video speed plus",
    "ejookehegbdmnkohfllcblcnjbgahgke": "chrome_gemini_nano",
    "imnnkgiglcbjknfbkdfocdhoookkipji": "finance-research-clipper-oss",
}

def get_default_preferences_path():
    """取得 Chrome Canary 預設之 Secure Preferences 檔案路徑"""
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    if not local_app_data:
        return ""
    return os.path.join(
        local_app_data,
        r"Google\Chrome SxS\User Data\Default\Secure Preferences"
    )

def is_chrome_running():
    """檢查 Chrome Canary 是否正在運作中"""
    try:
        # 使用 powershell 查詢 chrome.exe 進程
        cmd = ["powershell", "-Command", "Get-Process -Name chrome -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path"]
        res = subprocess.run(cmd, capture_output=True, text=True, check=False)
        output = res.stdout.strip()
        if not output:
            return False, []
        
        canary_procs = []
        for line in output.splitlines():
            line_str = line.strip()
            if "Chrome SxS" in line_str:
                canary_procs.append(line_str)
        return len(canary_procs) > 0, canary_procs
    except Exception as e:
        print(f"[警告] 檢查進程時發生例外: {e}")
        return False, []

def close_chrome_canary():
    """強制關閉所有 Chrome Canary 進程"""
    cmd = ["powershell", "-Command", "Get-Process -Name chrome -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*Chrome SxS*' } | Stop-Process -Force"]
    subprocess.run(cmd, capture_output=True, check=False)

def scan_ghosts(obj, ghost_set, current_path=""):
    """遞迴掃描 JSON 物件中出現幽靈 ID 的所有位置"""
    findings = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            child_path = f"{current_path}.{k}" if current_path else k
            if k in ghost_set:
                findings.append((child_path, "dict_key", k))
            findings.extend(scan_ghosts(v, ghost_set, child_path))
    elif isinstance(obj, list):
        for idx, item in enumerate(obj):
            child_path = f"{current_path}[{idx}]"
            if isinstance(item, str) and item in ghost_set:
                findings.append((child_path, "list_item", item))
            findings.extend(scan_ghosts(item, ghost_set, child_path))
    return findings

def remove_ghosts_inplace(obj, ghost_set):
    """遞迴在字典與列表中就地剔除所有幽靈 ID"""
    removed_count = 0
    if isinstance(obj, dict):
        keys_to_del = [k for k in obj.keys() if k in ghost_set]
        for k in keys_to_del:
            del obj[k]
            removed_count += 1
        for k, v in list(obj.items()):
            removed_count += remove_ghosts_inplace(v, ghost_set)
    elif isinstance(obj, list):
        items_to_del = [item for item in obj if isinstance(item, str) and item in ghost_set]
        for item in items_to_del:
            obj.remove(item)
            removed_count += 1
        for item in obj:
            removed_count += remove_ghosts_inplace(item, ghost_set)
    return removed_count

def main():
    parser = argparse.ArgumentParser(description="Chrome Canary 幽靈 Extension ID 清理工具")
    parser.add_argument("--path", type=str, default="", help="自訂 Secure Preferences 檔案路徑")
    parser.add_argument("--apply", action="store_true", help="執行實體刪除與寫入 (未提供則為 dry-run)")
    parser.add_argument("--kill-chrome", action="store_true", help="執行 apply 前若 Chrome Canary 仍開啟，自動強制關閉")
    parser.add_argument("--restore", type=str, default="", help="指定備份檔路徑進行還原")

    args = parser.parse_args()

    pref_path = args.path if args.path else get_default_preferences_path()

    print("==================================================")
    print("🧹 Chrome Canary 幽靈 Extension ID 清理與防護工具")
    print("==================================================")
    print(f"目標設定檔路徑: {pref_path}")

    # 1. 處理還原指令
    if args.restore:
        bak_file = args.restore
        if not os.path.exists(bak_file):
            print(f"[錯誤] 找不到指定的備份檔案: {bak_file}")
            sys.exit(1)
        shutil.copy2(bak_file, pref_path)
        print(f"[成功] 已將備份檔還原至: {pref_path}")
        sys.exit(0)

    # 檢查目標設定檔是否存在
    if not os.path.exists(pref_path):
        print(f"[錯誤] 目標檔案不存在: {pref_path}")
        print("請確認 Chrome Canary 是否已安裝並至少開啟過一次。")
        sys.exit(1)

    # 2. 檢查 Chrome Canary 執行狀態
    running, procs = is_chrome_running()
    if running:
        if args.apply:
            if args.kill_chrome:
                print(f"[防護機制] 正在自動終止 {len(procs)} 個 Chrome Canary 進程...")
                close_chrome_canary()
                # 再次確認
                running_after, _ = is_chrome_running()
                if running_after:
                    print("[錯誤] 無法完全終止 Chrome Canary 進程，請手動關閉瀏覽器後重試。")
                    sys.exit(1)
                print("[防護機制] Chrome Canary 已完全關閉。")
            else:
                print(f"[阻擋] 偵測到 Chrome Canary 正在執行中 (共 {len(procs)} 個處理程序)！")
                print("為防止檔案寫入鎖死或重啟時被記憶體快取覆寫，請先關閉 Chrome Canary，或附加 --kill-chrome 參數。")
                sys.exit(1)
        else:
            print(f"[提示] 偵測到 Chrome Canary 正在執行中 (唯讀掃描不受影響)。")

    # 3. 讀取並解析 Secure Preferences
    try:
        with open(pref_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[錯誤] 解析 JSON 失敗: {e}")
        sys.exit(1)

    ghost_set = set(GHOST_EXTENSIONS.keys())
    findings = scan_ghosts(data, ghost_set)

    # 列出路徑衝突比對
    settings = data.get("extensions", {}).get("settings", {})
    print("\n--- 🔍 擴充功能註冊路徑診斷清單 ---")
    
    # 檢查專案正規插件現況
    print("\n[專案正規固定 ID 狀態]")
    for valid_id, name in VALID_PROJECT_EXTENSIONS.items():
        if valid_id in settings:
            ext_path = settings[valid_id].get("path", "N/A")
            print(f"  ✅ {name} ({valid_id}) -> 路徑: {ext_path}")
        else:
            print(f"  ⚠️ {name} ({valid_id}) -> 尚未載入或不在 settings 中")

    # 檢查幽靈 ID 現況
    print("\n[偵測到的幽靈 ID 衝突狀態]")
    if not findings:
        print("  🎉 太棒了！未在 Secure Preferences 中偵測到任何幽靈 ID！")
    else:
        for ghost_id, desc in GHOST_EXTENSIONS.items():
            if ghost_id in settings:
                conflict_path = settings[ghost_id].get("path", "N/A")
                print(f"  ❌ 幽靈 ID: {ghost_id} ({desc})")
                print(f"     衝突路徑: {conflict_path}")

        print(f"\n全域共發現 {len(findings)} 處幽靈 ID 節點：")
        for p, kind, gid in findings:
            print(f"  - [{kind}] {p}")

    # 4. 執行模式決策
    if not args.apply:
        print("\n--------------------------------------------------")
        print("💡 目前處於 [唯讀模式 / Dry-Run]。未對檔案做任何變更。")
        if findings:
            print("若要執行實體清除，請執行：")
            print("  python 1.devtools/tools/clean_ghost_extensions.py --apply --kill-chrome")
        print("--------------------------------------------------")
        sys.exit(0)

    # 5. Apply 實體刪除流程
    if not findings:
        print("\n無需進行任何清理操作。")
        sys.exit(0)

    print("\n--- 🚀 開始執行實體清理 ---")
    # 建立備份
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{pref_path}.bak.{timestamp}"
    try:
        shutil.copy2(pref_path, backup_path)
        print(f"[備份成功] 原始檔案已安全備份至:\n  {backup_path}")
    except Exception as e:
        print(f"[錯誤] 備份失敗，中止操作: {e}")
        sys.exit(1)

    # 執行剔除
    removed_total = remove_ghosts_inplace(data, ghost_set)
    print(f"[清理進度] 已自 JSON 結構中剔除 {removed_total} 處幽靈節點。")

    # 寫回檔案 (Chrome 使用緊湊單行 JSON 格式)
    try:
        with open(pref_path, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
        print("[寫入成功] 更新後的 Secure Preferences 已寫入磁碟。")
    except Exception as e:
        print(f"[錯誤] 寫入失敗: {e}")
        print(f"正在嘗試從備份還原...")
        shutil.copy2(backup_path, pref_path)
        sys.exit(1)

    # 6. 二次驗證 (Re-verification)
    try:
        with open(pref_path, "r", encoding="utf-8") as f:
            verify_data = json.load(f)
        post_findings = scan_ghosts(verify_data, ghost_set)
        if len(post_findings) == 0:
            print("\n✅ [二次驗收通過] Secure Preferences 中已 100% 消除所有幽靈 Extension ID！")
            print("目前專案各插件路徑均只對應單一固定 ID，底層 Inode / Path 指標衝突徹底解除。")
        else:
            print(f"\n[警告] 仍有 {len(post_findings)} 處殘留，請檢查。")
            sys.exit(1)
    except Exception as e:
        print(f"[驗證錯誤] {e}")
        sys.exit(1)

    print("\n==================================================")
    print("🎉 清理任務完成！")
    print(f"若需還原，可使用參數: --restore \"{backup_path}\"")
    print("==================================================")

if __name__ == "__main__":
    main()
