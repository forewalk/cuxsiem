# /conda - Conda 환경 전환

이 명령은 이후 모든 Bash 명령에서 `cruxsiem` conda 환경을 사용하도록 설정합니다.

## 실행 절차

1. 현재 conda 환경 상태를 확인합니다:
   ```
   conda info --envs
   ```

2. `cruxsiem` 환경이 존재하는지 확인합니다.

3. `cruxsiem` 환경의 Python 버전과 주요 패키지를 확인합니다:
   ```
   conda run -n cruxsiem python --version
   ```

4. 사용자에게 환경 정보를 안내합니다.

## 중요 규칙

- **이후 대화에서 모든 Python/pip 관련 Bash 명령은 반드시 `conda run -n cruxsiem` 접두사를 붙여 실행합니다.**
- 예시: `conda run -n cruxsiem python script.py`
- 예시: `conda run -n cruxsiem pip install package`
- 셸 상태는 Bash 호출 간 유지되지 않으므로, 매 명령마다 `conda run -n cruxsiem`을 사용해야 합니다.

## 출력 형식

```
[conda] cruxsiem 환경 활성화 완료
- Python: {버전}
- 경로: {conda prefix 경로}
```
