import urllib.request
import json
import time

text = (
    "14-year-old male evaluated in dysmorphology clinic for tall stature, progressive anterior chest wall deformity, "
    "and reduced exercise tolerance. Exam shows marked arachnodactyly of bilateral hands with positive wrist and thumb signs, "
    "severe pectus excavatum deformity, and high-arched palate. Ophthalmology confirms bilateral ectopia lentis with upward crystalline lens subluxation. "
    "Transthoracic echocardiogram demonstrates aortic root aneurysm at the sinuses of Valsalva (diameter 41 mm, Z-score +3.8) with mild aortic regurgitation. "
    "Patient negates epileptic seizures or developmental regression."
)

import sys
sys.path.insert(0, ".")
from backend.app.extractor.prompt import build_extraction_prompt
prompt = build_extraction_prompt(text)

payload = json.dumps({
    "model": "llama3.2:3b",
    "prompt": prompt,
    "stream": False,
    "format": "json",
    "options": {"temperature": 0.0}
}).encode("utf-8")

req = urllib.request.Request("http://127.0.0.1:11434/api/generate", data=payload, headers={"Content-Type": "application/json"})
t0 = time.time()
print("Sending request to Ollama...")
try:
    res = urllib.request.urlopen(req, timeout=120)
    data = json.loads(res.read().decode("utf-8"))
    print(f"Done in {time.time() - t0:.2f}s")
    print("Response:\n", data.get("response")[:400])
except Exception as e:
    print("Failed:", e)
