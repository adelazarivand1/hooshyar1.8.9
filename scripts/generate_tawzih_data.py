import os
import glob
import re
import json
import html

CACHE_DIR = "scripts/sistani_cache"
VOL_META = {
    1: "توضیح المسائل جامع جلد ۱",
    2: "توضیح المسائل جامع جلد ۲",
    3: "توضیح المسائل جامع جلد ۳",
    4: "توضیح المسائل جامع جلد ۴",
}

def generate():
    files = sorted(glob.glob(f"{CACHE_DIR}/*.html"))
    items = []
    seen_ids = set()

    for fpath in files:
        fname = os.path.basename(fpath)
        if fname.startswith("toc_"):
            continue
        parts = fname.replace(".html", "").split("_")
        if len(parts) != 2:
            continue
        book_id, page_id = parts
        vol = 1 if book_id == "26575" else (2 if book_id == "26576" else (3 if book_id == "26577" else 4))
        vol_title = VOL_META[vol]
        
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
            
        m_h1 = re.search(r"<h1 class=[\"']c[\"']>(.*?)</h1>", content, re.DOTALL)
        section_raw = re.sub(r"<[^>]+>", "", m_h1.group(1)).strip() if m_h1 else "احکام شرعی"
        
        sec_parts = [p.strip() for p in section_raw.split("/") if p.strip()]
        section = sec_parts[0] if sec_parts else section_raw
        subsection = sec_parts[1] if len(sec_parts) > 1 else None
        
        m_text = re.search(r"<div class=[\"']baz book-text[\"']>(.*?)</div>", content, re.DOTALL)
        if not m_text:
            continue
        raw_text = m_text.group(1)
        
        m_fn = re.search(r"<div class=[\"']baz book-footnote[\"']>(.*?)</div>", content, re.DOTALL)
        fn_text = re.sub(r"<[^>]+>", " ", m_fn.group(1)).strip() if m_fn else None
        if fn_text:
            fn_text = html.unescape(re.sub(r"\s+", " ", fn_text))
            
        parts = re.split(r"(?:<b>)?مسأله\s*([0-9]+)\.?(?:</b>)?", raw_text)
        if len(parts) > 1:
            if parts[0].strip():
                clean_preamble = re.sub(r"<[^>]+>", " ", parts[0]).strip()
                clean_preamble = html.unescape(re.sub(r"\s+", " ", clean_preamble))
                if len(clean_preamble) > 15:
                    pid_key = f"tawzih_{vol}_{page_id}_preamble"
                    if pid_key not in seen_ids:
                        seen_ids.add(pid_key)
                        items.append({
                            "id": pid_key,
                            "volume": vol,
                            "volumeTitle": vol_title,
                            "section": section,
                            "subsection": subsection,
                            "issueNumber": None,
                            "title": f"مقدمه: {section}",
                            "text": clean_preamble,
                            "footnote": fn_text,
                            "sourceCitation": f"{vol_title} (چاپ ۱۴۰۳) - دفتر حضرت آیت‌الله العظمی سیستانی"
                        })
            for i in range(1, len(parts), 2):
                issue_num = int(parts[i])
                issue_body = re.sub(r"<[^>]+>", " ", parts[i+1]).strip()
                issue_body = html.unescape(re.sub(r"\s+", " ", issue_body))
                pid_key = f"tawzih_{vol}_{issue_num}"
                if pid_key in seen_ids:
                    pid_key = f"tawzih_{vol}_{issue_num}_{page_id}"
                seen_ids.add(pid_key)
                items.append({
                    "id": pid_key,
                    "volume": vol,
                    "volumeTitle": vol_title,
                    "section": section,
                    "subsection": subsection,
                    "issueNumber": issue_num,
                    "title": f"مسأله {issue_num}",
                    "text": issue_body,
                    "footnote": fn_text,
                    "sourceCitation": f"{vol_title} (چاپ ۱۴۰۳) - دفتر حضرت آیت‌الله العظمی سیستانی"
                })
        else:
            clean_text = re.sub(r"<[^>]+>", " ", raw_text).strip()
            clean_text = html.unescape(re.sub(r"\s+", " ", clean_text))
            if len(clean_text) > 10:
                pid_key = f"tawzih_{vol}_{page_id}"
                if pid_key not in seen_ids:
                    seen_ids.add(pid_key)
                    items.append({
                        "id": pid_key,
                        "volume": vol,
                        "volumeTitle": vol_title,
                        "section": section,
                        "subsection": subsection,
                        "issueNumber": None,
                        "title": section,
                        "text": clean_text,
                        "footnote": fn_text,
                        "sourceCitation": f"{vol_title} (چاپ ۱۴۰۳) - دفتر حضرت آیت‌الله العظمی سیستانی"
                    })

    # Validate
    for it in items:
        for k, v in it.items():
            if isinstance(v, str):
                if "\ufffd" in v:
                    raise ValueError(f"Found replacement char in item {it['id']}")
                if "â€¦" in v:
                    raise ValueError(f"Found mojibake in item {it['id']}")

    out_path = "src/data/tawzihMasailFullData.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated {out_path} with {len(items)} items! Size: {os.path.getsize(out_path)} bytes")

if __name__ == "__main__":
    generate()
