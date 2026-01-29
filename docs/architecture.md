# SIEM 프로젝트 아키텍처

## 전체 구성도

```mermaid
flowchart TB
    USER["👤 사용자"]

    subgraph DEV["개발 환경 (Client PC)"]
        subgraph BE_DEV["Backend"]
            CONDA["Conda 가상환경<br/>(Python 3.11)"]
            UVICORN["Uvicorn (ASGI)"]
            FASTAPI_DEV["FastAPI"]
            SQLA_DEV["SQLAlchemy ORM"]
        end
        subgraph FE_DEV["Frontend"]
            NPM["npm"]
            VITE["Vite Dev Server"]
            REACT_DEV["React + TypeScript"]
        end

        VITE -->|"API 호출"| UVICORN
        UVICORN --> FASTAPI_DEV --> SQLA_DEV
    end

    subgraph GIT["Git Workflow (GitLab)"]
        FEATURE["feature/*"]
        DEVELOP["develop"]
        MAIN["main<br/>(분기별 버전)"]
        HOTFIX["hotfix/*"]

        FEATURE -->|"기능 완료"| DEVELOP
        DEVELOP -->|"정리 완료"| MAIN
        HOTFIX -->|"긴급 수정"| MAIN
        MAIN -.->|"버그 발견"| HOTFIX
    end

    subgraph CICD["CI/CD Pipeline"]
        BUILD["Docker Build"]
        TEST["테스트 실행"]
        PUSH["Image Push<br/>(Registry)"]
        DEPLOY["서버 배포"]

        BUILD --> TEST --> PUSH --> DEPLOY
    end

    subgraph PROD["프로덕션 환경 (Server)"]
        subgraph WEB["Web Container (SIEM Web)"]
            subgraph BE_CONT["Backend Container"]
                FASTAPI_PROD["FastAPI + Uvicorn"]
                SQLA_PROD["SQLAlchemy"]
            end
            subgraph FE_CONT["Frontend Container"]
                NGINX["Nginx"]
                REACT_PROD["React (Build)"]
            end
        end

        subgraph DATA["Data Pipeline"]
            KAFKA["Kafka"]
            VECTOR["Vector"]
        end

        OS_DASH["OpenSearch<br/>Dashboard"]
 
        subgraph DB["Database"]
            POSTGRESQL["PostgreSQL<br/>(RDB)"]
            OPENSEARCH["OpenSearch<br/>(NoSQL)"]
        end

        KAFKA --> VECTOR --> OPENSEARCH

        NGINX -->|"API 프록시"| FASTAPI_PROD
        FASTAPI_PROD --> SQLA_PROD
        SQLA_PROD --> POSTGRESQL
        FASTAPI_PROD -->|"검색/로그"| OPENSEARCH
    end

    USER -->|"웹 접속"| NGINX
    USER -->|"대시보드 접속"| OS_DASH
    DEV -->|"git push"| GIT
    MAIN -->|"트리거"| CICD
    DEPLOY -->|"컨테이너 배포"| WEB
    SQLA_DEV -->|"DB 연결"| POSTGRESQL
