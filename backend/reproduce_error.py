import requests
import json

# 테스트할 파라미터 설정 (사용자가 언급한 1월 25일 0시 부근)
params = {
    "from_date": "2026-01-25T00:00:00.000Z",
    "q": ""
}

url = "http://localhost:8000/api/v1/dashboard/stats"

print(f"Testing URL: {url} with params: {params}")

try:
    response = requests.get(url, params=params)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Success! Summary:")
        print(json.dumps(data['summary'], indent=2))
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
