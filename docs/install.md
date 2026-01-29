# 설치 가이드

## 로컬 PC 개발 환경

### 1. Conda 환경 설정

```bash
conda create -n infolink python=3.11
conda activate infolink
```

### 2. 백엔드 설정

```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env
# .env에서 DB 비밀번호 수정
```

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
cp .env.example .env
```

### 4. 서버 실행

```bash
# 백엔드 (터미널 1)
cd backend
uvicorn app.main:app --reload

# 프론트엔드 (터미널 2)
cd frontend
npm run dev
```

---

## 서버 DB 정보

## git 정보

## docker image repo 정보

