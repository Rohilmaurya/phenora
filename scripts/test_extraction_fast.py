import sys
sys.path.insert(0, ".")
import urllib.request
import json
import time
from backend.app.auth.bearer import create_token

token = create_token()
note = (
    "14-year-old evaluated for tall stature, arachnodactyly, severe pectus excavatum, "
    "ectopia lentis, and aortic root aneurysm. Negates epileptic seizures."
)

req = urllib.request.Request(
    "http://127.0.0.1:8000/v1/extractions",
    data=json.dumps({"note_text": note}).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
    },
)

t0 = time.time()
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode("utf-8"))
dur = round(time.time() - t0, 2)
print(f"Done! Status: {res.status} in {dur}s! Mentions count: {len(data['mentions'])}")
for m in data["mentions"]:
    print(f"  - {m['raw_term']}: {m['polarity']} ({m['source_span']['quote']})")
