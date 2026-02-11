import os
import re
import json
import html
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# =====================================================================
# CONFIG
# =====================================================================

BASE_URL = "https://www.crackap.com"

EXPORT_DIR = "export"
QUESTIONS_DIR = os.path.join(EXPORT_DIR, "questions")
IMAGES_DIR = os.path.join(EXPORT_DIR, "images")

os.makedirs(QUESTIONS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

# =====================================================================
# IMAGE SAVING
# =====================================================================

def save_image(img_url, qid, label, idx):
    try:
        res = requests.get(img_url, timeout=10)
        if res.status_code != 200:
            return None

        qfolder = os.path.join(IMAGES_DIR, str(qid))
        os.makedirs(qfolder, exist_ok=True)

        ext = os.path.splitext(img_url)[1] or ".png"
        fname = f"{label}_{idx}{ext}"

        with open(os.path.join(qfolder, fname), "wb") as f:
            f.write(res.content)

        return fname

    except Exception:
        return None


# =====================================================================
# BLOCK HELPERS
# =====================================================================

def add_text_prompt(blocks, text):
    text = text.strip()
    if not text:
        return

    # remove leading "12." etc only in prompts
    text = re.sub(r"^\s*\d+\.\s*", "", text)

    clean = html.unescape(text)
    blocks.append({"type": "text", "value": clean})


def add_text_choice(blocks, text):
    text = text.strip()
    if not text:
        return
    clean = html.unescape(text)
    blocks.append({"type": "text", "value": clean})


def add_image(blocks, img_url, qid, label, idx):
    saved = save_image(img_url, qid, label, idx)
    if saved:
        blocks.append({"type": "image", "url": saved})


# =====================================================================
# PROMPT PARSER
# =====================================================================

def extract_prompt_blocks(mcontent, qid):
    blocks = []
    img_idx = 1

    for el in mcontent.children:
        # stop once choices begin
        if el.name == "ul" and "qlist" in (el.get("class") or []):
            break

        if el.name == "p":
            raw = el.get_text(" ", strip=True)
            lt = raw.lower()

            if lt.startswith("question:"):
                continue
            if "correct answer" in lt:
                continue
            if "explanation" in lt:
                continue

            if raw:
                add_text_prompt(blocks, raw)

            # inline images
            for img in el.find_all("img"):
                url = urljoin(BASE_URL, img["src"])
                add_image(blocks, url, qid, "prompt", img_idx)
                img_idx += 1

    return blocks


# =====================================================================
# CHOICES PARSER
# =====================================================================

def extract_choices_blocks(qlist, qid):
    choices = {}
    img_idx = 1

    for li in qlist.find_all("li"):
        raw = li.get_text(" ", strip=True)

        m = re.match(r"([A-E])\.\s*(.*)", raw)
        if not m:
            continue

        letter = m.group(1)
        text_part = m.group(2).strip()
        blocks = []

        if text_part:
            add_text_choice(blocks, text_part)

        for img in li.find_all("img"):
            url = urljoin(BASE_URL, img["src"])
            add_image(blocks, url, qid, letter, img_idx)
            img_idx += 1

        choices[letter] = blocks

    return choices


# =====================================================================
# SECTION TAGGING — AP PSYCHOLOGY
# =====================================================================

SECTION_KEYWORDS = {
    "BIO": [
        "neuron", "axon", "synapse", "neurotransmitter", "action potential",
        "brain", "cortex", "hippocampus", "amygdala", "endocrine", "hormone",
        "nervous system", "genetics", "sleep", "sensation", "perception"
    ],
    "COG": [
        "memory", "encoding", "retrieval", "problem solving", "heuristic",
        "decision making", "attention", "intelligence", "iq", "thinking",
        "perception", "judgment"
    ],
    "DEV": [
        "conditioning", "classical", "operant", "reinforcement", "punishment",
        "development", "attachment", "piaget", "kohlberg", "erikson",
        "learning", "observational", "acquisition"
    ],
    "SOC": [
        "attribution", "conformity", "obedience", "attitude", "dissonance",
        "groupthink", "prejudice", "stereotype", "personality", "trait",
        "motivation", "emotion"
    ],
    "MPH": [
        "psychological disorder", "anxiety", "depression", "schizophrenia",
        "therapy", "treatment", "stress", "coping", "ptsd", "health",
        "positive psychology"
    ]
}


def assign_section(prompt_blocks, choices):
    text = ""

    for blk in prompt_blocks:
        if blk["type"] == "text":
            text += " " + blk["value"].lower()

    for _, blks in choices.items():
        for blk in blks:
            if blk["type"] == "text":
                text += " " + blk["value"].lower()

    scores = {code: 0 for code in SECTION_KEYWORDS}

    for code, words in SECTION_KEYWORDS.items():
        for kw in words:
            if kw in text:
                scores[code] += 1

    best_code = max(scores, key=lambda c: scores[c])
    return best_code


# =====================================================================
# MAIN SCRAPER
# =====================================================================

def scrape_question(qid):
    print(f"\n=== AP PSYCH Q{qid} ===")

    url = f"{BASE_URL}/ap/psychology/question-{qid}-answer-and-explanation.html"

    try:
        res = requests.get(url, timeout=10)
    except Exception:
        print("request failed")
        return

    if res.status_code != 200:
        print("skip:", res.status_code)
        return

    try:
        html_data = res.content.decode("utf-8", errors="replace")
    except Exception:
        html_data = res.text

    soup = BeautifulSoup(html_data, "html.parser")
    mcontent = soup.find("div", class_="mcontent")
    if not mcontent:
        print("missing mcontent")
        return

    prompt_blocks = extract_prompt_blocks(mcontent, qid)

    qlist = mcontent.find("ul", class_="qlist")
    if not qlist:
        print("no qlist")
        return

    choices = extract_choices_blocks(qlist, qid)

    # Correct Answer
    correct_answer = None
    st = mcontent.find("strong", string=re.compile("Correct Answer", re.I))
    if st:
        t = st.parent.get_text(" ", strip=True)
        m = re.search(r"Correct Answer:\s*([A-E])", t)
        if m:
            correct_answer = m.group(1)

    explanation = ""

    section_code = assign_section(prompt_blocks, choices)

    record = {
        "subject_code": "APPSYCH",
        "question_id": qid,
        "prompt_blocks": prompt_blocks,
        "choices": choices,
        "correct_answer": correct_answer,
        "explanation": explanation,
        "section_code": section_code,
    }

    outpath = os.path.join(QUESTIONS_DIR, f"{qid}.json")
    with open(outpath, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)

    print("Saved", outpath)


# =====================================================================
# RUN ALL
# =====================================================================

if __name__ == "__main__":
    for qid in range(1, 1271):   # AP Psych max Q = 1270
        scrape_question(qid)
