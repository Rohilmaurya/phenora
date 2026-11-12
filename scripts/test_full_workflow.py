import urllib.request
import json

sample = """14-year-old male evaluated in dysmorphology clinic for tall stature, progressive anterior chest wall deformity, and reduced exercise tolerance. Exam shows marked arachnodactyly of bilateral hands with positive wrist and thumb signs, severe pectus excavatum deformity, and high-arched palate. Ophthalmology confirms bilateral ectopia lentis with upward crystalline lens subluxation. Transthoracic echocardiogram demonstrates aortic root aneurysm at the sinuses of Valsalva (diameter 41 mm, Z-score +3.8) with mild aortic regurgitation. Patient negates epileptic seizures or developmental regression."""

headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC1jbGluaWNpYW4iLCJyb2xlIjoiY2xpbmljaWFuIiwiaXNzIjoicGhlbm9yYS1sb2NhbC1pZHAiLCJhdWQiOiJwaGVub3JhLWJhY2tlbmQiLCJpYXQiOjE3OTQyMjQxODEsImV4cCI6MTc5NjgxNjE4MX0.pqZ4RoDVuxopFf2YhpApPY_Uy-6BIFI7qPFOkcQeJIc",
    "Content-Type": "application/json",
}

print("1. Testing /v1/health...")
req_h = urllib.request.Request("http://127.0.0.1:8000/v1/health")
with urllib.request.urlopen(req_h) as r:
    h = json.loads(r.read().decode())
    print("Health response:", h)

print("\n2. Testing /v1/extractions...")
req_e = urllib.request.Request(
    "http://127.0.0.1:8000/v1/extractions",
    data=json.dumps({"note_text": sample}).encode(),
    headers=headers,
)
with urllib.request.urlopen(req_e) as r:
    ext_data = json.loads(r.read().decode())
print(f"Extraction returned {len(ext_data.get('mentions', []))} mentions.")
for m in ext_data.get("mentions", [])[:3]:
    print("  Mention:", m["source_span"]["quote"], "->", [c["label"] for c in m["hpo_candidates"][:1]])

print("\n3. Testing /v1/matches...")
observations = []
for m in ext_data["mentions"]:
    hpo_id = m["hpo_candidates"][0]["hpo_id"] if m.get("hpo_candidates") else "HP:0000001"
    observations.append({
        "observation_id": m["mention_id"],
        "hpo_id": hpo_id,
        "polarity": m.get("polarity", "present"),
        "temporality": "current",
        "experiencer": "patient",
        "onset_age_group": "unknown",
        "review_status": "confirmed",
        "source_mention_ids": [m["mention_id"]],
    })

req_m = urllib.request.Request(
    "http://127.0.0.1:8000/v1/matches",
    data=json.dumps({"observations": observations, "candidate_limit": 10}).encode(),
    headers=headers,
)
with urllib.request.urlopen(req_m) as r:
    match_data = json.loads(r.read().decode())

print(f"Match status: {match_data.get('status')}")
print(f"Candidates returned: {len(match_data.get('candidates', []))}")
for c in match_data.get("candidates", [])[:3]:
    print(f"  Candidate #{c['rank']}: {c['disease_label']} ({c['disease_id']}) with {len(c['supporting_observations'])} supporting findings")

graph = match_data.get("graph", {})
nodes = graph.get("nodes", [])
edges = graph.get("edges", [])
print(f"Graph nodes: {len(nodes)}, Graph edges: {len(edges)}")
if nodes:
    print("Sample node 0:", nodes[0])
    print("Sample node last:", nodes[-1])
if edges:
    print("Sample edge 0:", edges[0])
