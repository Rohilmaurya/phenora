import urllib.request
import json

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
with open('sample_pediatric_consultation.pdf', 'rb') as f:
    pdf_bytes = f.read()

part1 = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="sample_pediatric_consultation.pdf"\r\n'
    f'Content-Type: application/pdf\r\n\r\n'
).encode('utf-8')
part2 = f'\r\n--{boundary}--\r\n'.encode('utf-8')
body = part1 + pdf_bytes + part2

headers = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2NhbC1jbGluaWNpYW4iLCJyb2xlIjoiY2xpbmljaWFuIiwiaXNzIjoicGhlbm9yYS1sb2NhbC1pZHAiLCJhdWQiOiJwaGVub3JhLWJhY2tlbmQiLCJpYXQiOjE3OTQyMjQxODEsImV4cCI6MTc5NjgxNjE4MX0.pqZ4RoDVuxopFf2YhpApPY_Uy-6BIFI7qPFOkcQeJIc',
    'Content-Type': f'multipart/form-data; boundary={boundary}',
}

req = urllib.request.Request('http://127.0.0.1:8000/v1/documents/extract-text', data=body, headers=headers)
with urllib.request.urlopen(req) as resp:
    print('Status:', resp.status)
    data = json.loads(resp.read().decode())
    print('Page count:', data.get('page_count'))
    print('Method:', data.get('extraction_method'))
    print('Text length:', len(data.get('extracted_text', '')))
    print('Text preview:\n', data.get('extracted_text')[:400])
