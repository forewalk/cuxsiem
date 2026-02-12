import requests
import json

# 테스트할 파라미터 설정 (30일 조회)
params = {
    "from_value": 30,
    "from_unit": "d",
    "q": ""
}

url = "http://localhost:8000/api/v1/dashboard/stats"

print(f"Testing URL: {url} with params: {params}")

try:
    response = requests.get(url, params=params)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Success!")
        print(f"Histogram points: {len(data['histogram'])}")
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
