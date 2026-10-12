# -*- coding: utf-8 -*-
"""
tools/compiler/sanitize_draft.py — 入口草稿物理消毒、LaTeX 雙重防線與 Token 防火牆核心腳本
=============================================================================
職責：
1. L1 文字直通 (Direct LaTeX Passthrough)：優先抽離隱藏於 alt、data-math 或 KaTeX 註解中的原始 LaTeX 文本，直接轉為 $...$ 或 $$...$$，完全免除多模態請求。
2. 物理抽離 Markdown 草稿中剩餘的 Base64 圖片，存為本地實體圖檔，避免污染 LLM 對話歷史。
3. L2 單列垂直拼圖 (--vertical-strip)：將無法文字直通的公式圖以 Pillow 合成單列垂直帶（寬度固定、左側顯眼 [EQ_X] 紅色標號），每圖上限 <= 6 式，杜絕 2D 矩陣縮放模糊。
4. 規範化 LaTeX 公式格式（修正 MathJax 渲染黏連、反斜線跳脫等）。
5. 剔除 AI 網頁剪貼產生的無效 UI 字串（如複製按鈕、發送紀錄等）。
6. 嚴守「靜音契約 (Silent Contract)」：在 --json 或 --quiet 模式下僅回傳微型 JSON 摘要 (< 200 字元)。
"""

import os
import sys
import re
import base64
import json
import argparse
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional

# 解決 Windows 終端輸出中文編碼
if sys.platform.startswith("win"):
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# 常用 LaTeX 數學特徵識別字
LATEX_MATH_INDICATORS = [
    r'\\frac', r'\\sum', r'\\int', r'\\sqrt', r'\\alpha', r'\\beta', r'\\theta',
    r'\\pi', r'\\gamma', r'\\partial', r'\\times', r'\\cdot', r'\\le', r'\\ge',
    r'\\neq', r'\\approx', r'\\infty', r'\\mathbf', r'\\mathcal', r'\\text\{',
    r'\\sigma', r'\\lambda', r'\\mu', r'\\delta', r'\\in', r'\\subset', r'\\pm',
    r'\\to', r'\\leftarrow', r'\\rightarrow', r'\\prod', r'\\lim', r'\\log',
    r'\\exp', r'\\cos', r'\\sin', r'\\hat', r'\\bar', r'\\tilde', r'\\left', r'\\right'
]
LATEX_INDICATOR_REGEX = re.compile('|'.join(LATEX_MATH_INDICATORS), re.IGNORECASE)


def is_likely_latex_math(text: str) -> bool:
    """
    判定字串是否為 LaTeX 數學公式。
    """
    if not text:
        return False
    text_clean = text.strip()
    if len(text_clean) < 2 or len(text_clean) > 800:
        return False

    # 若原本就包裹在 $ 或 $$ 中
    if (text_clean.startswith('$$') and text_clean.endswith('$$')) or \
       (text_clean.startswith('$') and text_clean.endswith('$')):
        return True

    # 包含典型 LaTeX 指令
    if LATEX_INDICATOR_REGEX.search(text_clean):
        return True

    # 若含有中文，通常是圖片描述說明，非純公式
    if bool(re.search(r'[\u4e00-\u9fff]', text_clean)):
        return False

    # 檢查是否為一般檔名或識別碼 (如 formula_image_2, chart_data_plot)
    # 若沒有數學等號且含有多字元 snake_case，視為普通標籤
    if '=' not in text_clean and re.search(r'[A-Za-z]{2,}_[A-Za-z]{2,}', text_clean):
        return False

    # 包含等號的簡潔算式（如 "E = mc^2", "f(x) = a_1 x + b", "y = x + 1"）
    if '=' in text_clean and len(text_clean) <= 150:
        if re.match(r'^[A-Za-z0-9\s\(\)\[\]\{\}\.,\^_\+\-\*\/=<>\\|~]+$', text_clean):
            return True

    # 包含明確上標與運算符號的算式（如 "x^2 + y^2", "e^{-x}"）
    if '^' in text_clean and re.search(r'[A-Za-z0-9]\^[A-Za-z0-9\{]', text_clean):
        return True

    return False


def clean_latex_string(formula: str) -> str:
    """清理公式外層的包裝符號並去空白"""
    f = formula.strip()
    if f.startswith('$$') and f.endswith('$$') and len(f) >= 4:
        f = f[2:-2].strip()
    elif f.startswith('$') and f.endswith('$') and len(f) >= 2:
        f = f[1:-1].strip()
    elif f.startswith(r'\(') and f.endswith(r'\)') and len(f) >= 4:
        f = f[2:-2].strip()
    elif f.startswith(r'\[') and f.endswith(r'\]') and len(f) >= 4:
        f = f[2:-2].strip()
    return f


def extract_latex_passthrough(content: str) -> Tuple[str, int]:
    """
    L1 文字直通防線：
    在圖片下載/解碼前，優先檢視 alt、data-math、data-latex 或 KaTeX 註解。
    若包含 LaTeX 數學文本，直接轉換為 $...$ 或 $$...$$，從根本上規避多模態呼叫。
    """
    converted_count = 0

    # 1. 處理 KaTeX / MathJax annotation: <annotation encoding="application/x-tex">formula</annotation>
    def katex_replace(match):
        nonlocal converted_count
        formula = clean_latex_string(match.group(1))
        converted_count += 1
        return f"\n\n$${formula}$$\n\n"

    content = re.sub(
        r'<annotation\s+encoding=["\']application/x-tex["\']>([\s\S]*?)</annotation>',
        katex_replace,
        content,
        flags=re.IGNORECASE
    )

    # 2. 處理 HTML <img> 標籤中的 data-math 或 alt 含有 LaTeX
    def html_img_replace(match):
        nonlocal converted_count
        full_tag = match.group(0)
        # 優先搜尋 data-math 或 data-latex
        dm_match = re.search(r'data-(?:math|latex)=["\']([^"\']+)["\']', full_tag, re.IGNORECASE)
        alt_match = re.search(r'alt=["\']([^"\']+)["\']', full_tag, re.IGNORECASE)

        candidate = None
        if dm_match:
            candidate = dm_match.group(1)
        elif alt_match:
            candidate = alt_match.group(1)

        if candidate and is_likely_latex_math(candidate):
            converted_count += 1
            formula = clean_latex_string(candidate)
            # 若前後有換行或此 tag 獨佔行，轉為塊級公式
            return f"\n\n$${formula}$$\n\n"
        return full_tag

    content = re.sub(r'<img\s+[^>]*?>', html_img_replace, content, flags=re.IGNORECASE)

    # 3. 處理 Markdown 行內/區塊圖片: ![alt](src)
    def md_img_replace(match):
        nonlocal converted_count
        alt = match.group(1).strip()
        src = match.group(2).strip()

        # 檢查 alt 或 src URL 中帶有的 latex (例如 svg?latex=... 或 codecogs.com/png.latex?...)
        candidate = None
        if is_likely_latex_math(alt):
            candidate = alt
        elif "latex?" in src or "latex=" in src:
            url_part = src.split("latex?", 1)[-1].split("latex=", 1)[-1]
            try:
                import urllib.parse
                candidate = urllib.parse.unquote(url_part)
            except Exception:
                pass

        if candidate and is_likely_latex_math(candidate):
            converted_count += 1
            formula = clean_latex_string(candidate)
            return f"\n\n$${formula}$$\n\n"

        return match.group(0)

    content = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', md_img_replace, content)

    return content, converted_count


def extract_base64_images(content: str, assets_dir: Path, base_name: str) -> Tuple[str, List[Path]]:
    """
    抽取 Markdown 中的所有 Base64 圖片並存為實體檔案，替換為本機相對路徑。
    回傳更新後的內容以及新抽取的圖片檔案路徑清單。
    """
    assets_dir.mkdir(parents=True, exist_ok=True)
    extracted_paths: List[Path] = []
    count = 0

    # 1. 參考式定義塊提取: [id]: <data:image/ext;base64,...>
    ref_pattern = re.compile(
        r'^\s*\[([^\]]+)\]:\s*<?data:image/([a-zA-Z0-9\+\-]+);base64,([A-Za-z0-9+/=\s]+)>?',
        re.MULTILINE
    )

    def ref_replace(match):
        nonlocal count
        img_id = match.group(1).strip()
        img_ext = match.group(2).lower()
        if img_ext == "jpeg":
            img_ext = "jpg"
        b64_data = re.sub(r'\s+', '', match.group(3))
        
        count += 1
        safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', img_id)
        img_filename = f"{base_name}_{safe_id}.{img_ext}"
        img_path = assets_dir / img_filename

        try:
            with open(img_path, "wb") as f:
                f.write(base64.b64decode(b64_data))
            extracted_paths.append(img_path)
            rel_path = img_path.as_posix()
            return f"[{img_id}]: {rel_path}"
        except Exception:
            return match.group(0)

    content = ref_pattern.sub(ref_replace, content)

    # 2. 行內式提取: ![alt](data:image/ext;base64,...)
    inline_pattern = re.compile(
        r'!\[([^\]]*)\]\(data:image/([a-zA-Z0-9\+\-]+);base64,([A-Za-z0-9+/=\s]+)\)'
    )

    def inline_replace(match):
        nonlocal count
        alt_text = match.group(1)
        img_ext = match.group(2).lower()
        if img_ext == "jpeg":
            img_ext = "jpg"
        b64_data = re.sub(r'\s+', '', match.group(3))

        count += 1
        img_filename = f"{base_name}_inline_{count:02d}.{img_ext}"
        img_path = assets_dir / img_filename

        try:
            with open(img_path, "wb") as f:
                f.write(base64.b64decode(b64_data))
            extracted_paths.append(img_path)
            rel_path = img_path.as_posix()
            return f"![{alt_text}]({rel_path})"
        except Exception:
            return match.group(0)

    content = inline_pattern.sub(inline_replace, content)

    # 3. HTML img 標籤提取: <img ... src="data:image/ext;base64,..." ...>
    html_pattern = re.compile(
        r'<img\s+([^>]*?)src=["\']data:image/([a-zA-Z0-9\+\-]+);base64,([A-Za-z0-9+/=\s]+)["\']([^>]*?)>',
        re.IGNORECASE
    )

    def html_replace(match):
        nonlocal count
        pre_attr = match.group(1)
        img_ext = match.group(2).lower()
        if img_ext == "jpeg":
            img_ext = "jpg"
        b64_data = re.sub(r'\s+', '', match.group(3))
        post_attr = match.group(4)

        count += 1
        img_filename = f"{base_name}_html_{count:02d}.{img_ext}"
        img_path = assets_dir / img_filename

        try:
            with open(img_path, "wb") as f:
                f.write(base64.b64decode(b64_data))
            extracted_paths.append(img_path)
            rel_path = img_path.as_posix()
            return f'<img {pre_attr}src="{rel_path}"{post_attr}>'
        except Exception:
            return match.group(0)

    content = html_pattern.sub(html_replace, content)

    return content, extracted_paths


def create_vertical_strips(
    image_paths: List[Path],
    output_dir: Path,
    base_name: str,
    max_per_strip: int = 6,
    strip_width: int = 800
) -> List[Dict[str, Any]]:
    """
    L2 單列垂直拼圖防線：
    將未能以文字直通轉譯的公式圖合成單列垂直帶。
    - 嚴禁 2D 矩陣網格（杜絕縮放下採樣模糊與空間錯位）。
    - 寬度固定為 800px，左側 120px 區域繪製醒目的 [EQ_X] 紅色標號。
    - 每圖上限 <= 6 式，超過自動分卷為 strip_01.png, strip_02.png...
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return []

    if not image_paths:
        return []

    output_dir.mkdir(parents=True, exist_ok=True)
    strips_meta: List[Dict[str, Any]] = []

    # 分卷處理
    total_imgs = len(image_paths)
    for strip_idx in range(0, total_imgs, max_per_strip):
        chunk_paths = image_paths[strip_idx: strip_idx + max_per_strip]
        volume_num = (strip_idx // max_per_strip) + 1

        # 讀取並計算各圖尺寸
        loaded_images = []
        label_width = 120
        content_max_width = strip_width - label_width - 20
        total_height = 20  # 上下留白

        for i, p in enumerate(chunk_paths):
            try:
                im = Image.open(p).convert("RGB")
                w, h = im.size
                # 若寬度超過內容區域，等比例縮小
                if w > content_max_width:
                    scale = content_max_width / float(w)
                    new_w = content_max_width
                    new_h = max(int(h * scale), 20)
                    im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
                else:
                    new_w, new_h = w, h

                # 保證每個單元至少有 50px 高度以清晰容納標籤
                cell_height = max(new_h, 50) + 20
                loaded_images.append({
                    "img": im,
                    "orig_path": p,
                    "w": new_w,
                    "h": new_h,
                    "cell_height": cell_height,
                    "eq_num": strip_idx + i + 1
                })
                total_height += cell_height
            except Exception:
                continue

        if not loaded_images:
            continue

        # 建立垂直畫布（純白底色）
        strip_canvas = Image.new("RGB", (strip_width, total_height), (255, 255, 255))
        draw = ImageDraw.Draw(strip_canvas)

        current_y = 10
        strip_eq_items = []

        for item in loaded_images:
            cell_h = item["cell_height"]
            eq_num = item["eq_num"]
            eq_label = f"[EQ_{eq_num}]"

            # 繪製左側標籤區域（淺灰色邊框 + 醒目紅色粗標題）
            draw.rectangle(
                [(10, current_y), (label_width - 10, current_y + cell_h - 10)],
                outline=(220, 220, 220),
                width=1
            )
            draw.text(
                (20, current_y + (cell_h - 10) // 2 - 8),
                eq_label,
                fill=(220, 20, 60)
            )

            # 貼入公式圖片（垂直置中）
            img_y = current_y + (cell_h - 10 - item["h"]) // 2
            strip_canvas.paste(item["img"], (label_width, img_y))

            # 繪製分隔底線
            draw.line(
                [(10, current_y + cell_h - 5), (strip_width - 10, current_y + cell_h - 5)],
                fill=(240, 240, 240),
                width=1
            )

            strip_eq_items.append({
                "label": eq_label,
                "eq_index": eq_num,
                "source_image": str(item["orig_path"].as_posix())
            })
            current_y += cell_h

        strip_filename = f"{base_name}_strip_{volume_num:02d}.png"
        strip_path = output_dir / strip_filename
        strip_canvas.save(strip_path, format="PNG", optimize=True)

        strips_meta.append({
            "strip_volume": volume_num,
            "strip_file": str(strip_path.as_posix()),
            "equations_count": len(strip_eq_items),
            "equations": strip_eq_items
        })

    return strips_meta


def sanitize_latex(content: str) -> Tuple[str, int]:
    """
    規範化 LaTeX 公式格式，確保前後留有合理空行，並修復反斜線轉義與標記異常。
    """
    fixed_count = 0

    # 1. 確保塊級公式 $$ 前後有空行，防止與前後文字段落黏結
    def fix_block_math(match):
        nonlocal fixed_count
        formula = match.group(1).strip()
        fixed_count += 1
        return f"\n\n$${formula}$$\n\n"

    # 匹配獨立行或被行包夾的 $$...$$
    content = re.sub(r'(?<!\$)\$\$(?!\$)(.+?)(?<!\$)\$\$(?!\$)', fix_block_math, content, flags=re.DOTALL)

    # 2. 壓縮過多的連續空行（超過 2 行空行壓為 1 行空行）
    content = re.sub(r'\n{4,}', '\n\n', content)

    return content, fixed_count


# --- Angular / Web Component DOM 深度剝除正則與過濾規則 ---

# 1. 純 UI 標籤：整段剃除（含內部文字與子標籤）
UI_NOISE_TAGS = [
    'gem-icon-button', 'mat-icon', 'button', 'mat-button',
    'mat-ripple', 'svg', 'gds-icon-button'
]
UI_NOISE_REGEX = re.compile(
    r'<(?P<tag>' + '|'.join(UI_NOISE_TAGS) + r')\b[^>]*>[\s\S]*?</(?P=tag)>'
    r'|<(?:' + '|'.join(UI_NOISE_TAGS) + r')\b[^>]*?/>',
    re.IGNORECASE
)

# 2. 容器自訂標籤：保留內部內容，僅剝除外層標籤 (Unwrap)
CONTAINER_TAGS = [
    'response-element', 'message-content', 'model-response',
    'user-query', 'chat-window', 'rich-text', 'sparkle-container'
]
CONTAINER_TAG_REGEX = re.compile(
    r'</?(?:' + '|'.join(CONTAINER_TAGS) + r'|[a-zA-Z][a-zA-Z0-9]*-[a-zA-Z0-9_-]+)\b[^>]*>',
    re.IGNORECASE
)

# 3. 框架私有屬性：剝除 Angular / Polymer / Closure 標籤屬性
DOM_PRIVATE_ATTR_REGEX = re.compile(
    r'\s+(?:_ngcontent-[a-zA-Z0-9_-]+(?:="[^"]*"|=\'[^\']*\'|=[^\s>]+)?'
    r'|_nghost-[a-zA-Z0-9_-]+(?:="[^"]*"|=\'[^\']*\'|=[^\s>]+)?'
    r'|ng-reflect-[a-zA-Z0-9_-]+(?:="[^"]*"|=\'[^\']*\'|=[^\s>]+)?'
    r'|jsaction=(?:"[^"]*"|\'[^\']*\'|[^\s>]+)'
    r'|jscontroller=(?:"[^"]*"|\'[^\']*\'|[^\s>]+)'
    r'|jsname=(?:"[^"]*"|\'[^\']*\'|[^\s>]+)'
    r'|jsmodel=(?:"[^"]*"|\'[^\']*\'|[^\s>]+)'
    r'|jsshadow(?:\b|="[^"]*"|=\'[^\']*\'))',
    re.IGNORECASE
)


def strip_dom_private_attributes(text: str) -> Tuple[str, int]:
    """
    在 HTML 標籤內部剝除 Angular 與前端框架的私有屬性。
    """
    count = 0

    def tag_replacer(match):
        nonlocal count
        tag_str = match.group(0)
        new_tag, n = DOM_PRIVATE_ATTR_REGEX.subn('', tag_str)
        if n > 0:
            count += n
            new_tag = re.sub(r'\s{2,}>', '>', new_tag)
            new_tag = re.sub(r'\s+>', '>', new_tag)
        return new_tag

    result = re.sub(r'<[a-zA-Z0-9]+(?:\s+[^>]*?)?/?>', tag_replacer, text)
    return result, count


def clean_clipboard_artifacts(content: str) -> Tuple[str, int]:
    """
    清理從 Gemini / ChatGPT 等網頁介面複製時夾帶的垃圾文字與 Angular / DOM 雜訊標籤：
    1. 整段剃除純 UI 雜訊標籤（<gem-icon-button>, <mat-icon>, <button>, <svg> 等）
    2. 解包容器自訂組件（<response-element>, <message-content> 等，保留內部文字）
    3. 剝除殘存標籤中 Angular/Web 框架私有屬性（_ngcontent-*, _nghost-*, jsaction 等）
    4. 清除剪貼板文字雜訊（「你說了：」、「複製程式碼」等）
    """
    cleaned_count = 0

    # 1. 剃除純 UI 雜訊組件
    content, noise_tag_count = UI_NOISE_REGEX.subn('', content)
    cleaned_count += noise_tag_count

    # 2. 解包容器自訂標籤 (Unwrap)
    content, container_tag_count = CONTAINER_TAG_REGEX.subn('', content)
    cleaned_count += container_tag_count

    # 3. 剝除 Angular / 前端私有屬性
    content, attr_count = strip_dom_private_attributes(content)
    cleaned_count += attr_count

    # 4. 清理文字剪貼雜訊
    artifacts = [
        r'^你說了：?\s*$',
        r'^Gemini 說：?\s*$',
        r'^ChatGPT 說：?\s*$',
        r'^\s*複製程式碼\s*$',
        r'^\s*複製\s*$',
        r'^\s*分享\s*$',
        r'^\s*匯出至「文件」\s*$',
        r'^\s*重新產生\s*$',
        r'^\s*編輯\s*$',
    ]
    for pattern in artifacts:
        regex = re.compile(pattern, re.MULTILINE)
        matches = regex.findall(content)
        if matches:
            cleaned_count += len(matches)
            content = regex.sub('', content)

    return content, cleaned_count


def sanitize_markdown(
    input_path: str,
    output_path: Optional[str] = None,
    assets_dir: Optional[str] = None,
    passthrough_latex: bool = True,
    vertical_strip: bool = False,
    strip_max: int = 6
) -> Dict[str, Any]:
    in_file = Path(input_path).resolve()
    if not in_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    with open(in_file, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    orig_length = len(content)
    base_name = in_file.stem.lower().replace(" ", "_")

    if not assets_dir:
        repo_root = Path(__file__).resolve().parent.parent.parent
        target_assets = repo_root / "assets" / "images" / "draft" / base_name
    else:
        target_assets = Path(assets_dir).resolve()

    # 1. L1 文字直通防線：優先抽取含有 LaTeX 文本的圖片
    latex_passthrough_count = 0
    if passthrough_latex:
        content, latex_passthrough_count = extract_latex_passthrough(content)

    # 2. 抽離剩餘 Base64 實體檔案
    content, extracted_images = extract_base64_images(content, target_assets, base_name)

    # 3. L2 單列垂直拼圖防線：若指定 --vertical-strip 且有抽取到圖片
    strips_info = []
    if vertical_strip and extracted_images:
        strips_dir = target_assets / "strips"
        strips_info = create_vertical_strips(
            extracted_images,
            strips_dir,
            base_name,
            max_per_strip=strip_max
        )

    # 4. LaTeX 規範化
    content, latex_fixed_count = sanitize_latex(content)

    # 5. 清理複製雜訊
    content, artifact_count = clean_clipboard_artifacts(content)

    # 6. 寫入目標檔案
    if not output_path:
        out_file = in_file
    else:
        out_file = Path(output_path).resolve()

    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(content.rstrip() + "\n")

    new_length = len(content)
    bytes_saved = orig_length - new_length

    result: Dict[str, Any] = {
        "status": "ok",
        "input": str(in_file),
        "output": str(out_file),
        "latex_passthrough_count": latex_passthrough_count,
        "base64_extracted": len(extracted_images),
        "vertical_strips_count": len(strips_info),
        "latex_fixed": latex_fixed_count,
        "artifacts_removed": artifact_count,
        "bytes_reduced": bytes_saved,
        "tokens_saved_approx": int(bytes_saved / 3.2) if bytes_saved > 0 else 0
    }
    if strips_info:
        result["strips"] = strips_info

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Sanitize draft Markdown with Dual-Track Formula Engine, Base64 extraction, and UI artifact cleaning."
    )
    parser.add_argument("--input", "-i", required=True, help="Path to input markdown draft")
    parser.add_argument("--output", "-o", default=None, help="Path to output sanitized markdown (defaults to overwriting input)")
    parser.add_argument("--assets-dir", default=None, help="Directory to save extracted images")
    parser.add_argument("--no-latex-passthrough", action="store_true", help="Disable L1 LaTeX text passthrough")
    parser.add_argument("--vertical-strip", action="store_true", help="Enable L2 vertical strip synthesis for extracted equation images")
    parser.add_argument("--strip-max", type=int, default=6, help="Maximum equations per vertical strip (default: 6)")
    parser.add_argument("--json", action="store_true", help="Output compact JSON summary (Silent Contract)")
    parser.add_argument("--quiet", "-q", action="store_true", help="Minimal silent execution")

    args = parser.parse_args()

    try:
        summary = sanitize_markdown(
            input_path=args.input,
            output_path=args.output,
            assets_dir=args.assets_dir,
            passthrough_latex=not args.no_latex_passthrough,
            vertical_strip=args.vertical_strip,
            strip_max=args.strip_max
        )
        if args.json or args.quiet:
            print(json.dumps(summary, ensure_ascii=False, separators=(',', ':')))
        else:
            print("==================================================")
            print("Draft Sanitization Completed Successfully")
            print(f"- Output file: {summary['output']}")
            print(f"- L1 LaTeX Passthrough: {summary['latex_passthrough_count']}")
            print(f"- Base64 images extracted: {summary['base64_extracted']}")
            if summary.get('vertical_strips_count', 0) > 0:
                print(f"- L2 Vertical strips created: {summary['vertical_strips_count']}")
            print(f"- LaTeX blocks adjusted: {summary['latex_fixed']}")
            print(f"- Artifacts cleaned: {summary['artifacts_removed']}")
            print(f"- Size reduced: {summary['bytes_reduced']} bytes (~{summary['tokens_saved_approx']} tokens saved)")
            print("==================================================")
        sys.exit(0)
    except Exception as e:
        err_obj = {"status": "error", "message": str(e)}
        if args.json or args.quiet:
            print(json.dumps(err_obj, ensure_ascii=False, separators=(',', ':')), file=sys.stderr)
        else:
            print(f"[Error] Sanitization failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
