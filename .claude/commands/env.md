# /env - 프론트엔드 & 백엔드 의존성 점검 및 설치

이 명령은 프론트엔드(npm)와 백엔드(pip) 의존성을 점검하고 누락된 패키지를 설치합니다.

## 실행 절차

### 1단계: 프론트엔드 의존성 점검 (frontend/)

1. `D:\cruxsiem\frontend` 디렉토리에서 node_modules 존재 여부를 확인합니다.
2. 설치된 패키지 상태를 점검합니다:
   ```
   cd /d/cruxsiem/frontend && npm ls --depth=0 2>&1
   ```
3. 누락되거나 버전이 맞지 않는 패키지가 있으면 설치합니다:
   ```
   cd /d/cruxsiem/frontend && npm install
   ```
4. 결과를 사용자에게 보고합니다.

### 2단계: 백엔드 의존성 점검 (backend/)

1. `D:\cruxsiem\backend\requirements.txt`를 읽어 필요한 패키지 목록을 확인합니다.
2. `cruxsiem` conda 환경에서 설치된 패키지를 확인합니다:
   ```
   conda run -n cruxsiem pip list 2>&1
   ```
3. requirements.txt의 각 패키지가 설치되어 있는지 대조합니다.
4. 누락된 패키지가 있으면 설치합니다:
   ```
   conda run -n cruxsiem pip install -r D:/cruxsiem/backend/requirements.txt
   ```
5. 결과를 사용자에게 보고합니다.

## 출력 형식

```
[env] 의존성 점검 결과

## Frontend (npm)
- 상태: ✅ 정상 / ⚠️ 누락 패키지 발견
- 설치된 패키지: {개수}개
- 누락 패키지: {목록 또는 "없음"}
- 조치: {npm install 실행 여부}

## Backend (pip - cruxsiem)
- 상태: ✅ 정상 / ⚠️ 누락 패키지 발견
- requirements.txt 패키지: {개수}개
- 누락 패키지: {목록 또는 "없음"}
- 조치: {pip install 실행 여부}
```

## 주의사항

- 백엔드 패키지는 반드시 `conda run -n cruxsiem` 접두사를 사용하여 cruxsiem 환경에 설치합니다.
- 프론트엔드는 `D:\cruxsiem\frontend` 디렉토리에서 실행합니다.
- 설치 실패 시 에러 내용을 사용자에게 상세히 보고합니다.
