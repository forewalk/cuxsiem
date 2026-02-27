# 개발 계획서: Pixel Mode

- **기능명**: Pixel Mode (너드/레트로 스타일 테마)
- **작성일**: 2026-02-27
- **브랜치**: feature/pixel
- **참조 기획서**: `docs/workflows/pixel-mode/1_pixel-mode_spec.md`

---

## 0. 구현 3원칙 (최우선 제약)

> 모든 구현 결정은 아래 3원칙의 우선순위를 따른다.

| 순위 | 원칙 | 의미 |
|------|------|------|
| 1 | **무겁지 않게** | 새 npm 패키지 추가 없음. SVG 필터/canvas/WebGL 없음. 폰트는 필요 시에만 동적 로드. |
| 2 | **가독성 우선** | 픽셀 폰트는 숫자/장식 요소에만 제한 적용. 한글/본문은 반드시 읽을 수 있어야 함. |
| 3 | **너드스러운 장난기** | 색상(네온 그린), 직각 테두리, 버튼 애니메이션으로 분위기 표현. 과도한 효과 금지. |

### 하지 않는 것 (원칙 위반 항목)

- ❌ `filter: url(#pixelate)` SVG 픽셀화 필터
- ❌ 차트 커스텀 렌더러 교체 (기존 차트에 색상만 적용)
- ❌ 'Press Start 2P' 폰트를 헤더/본문 전체에 적용 (한글 미지원, 가독성 파괴)
- ❌ `border-image` 계단 테두리 (복잡도 대비 효과 미미)
- ❌ 추가 npm 패키지 설치
- ❌ Loading Spinner 완전 교체 (기존 MUI CircularProgress 색상만 변경)

---

## 1. 핵심 동작 정의

픽셀 모드는 라이트/다크와 **완전히 독립된 3번째 테마**이다.

| 상황 | 동작 |
|------|------|
| 고급 설정에서 픽셀 모드 ON → 저장 | 픽셀 테마로 전환 (라이트/다크 무관) |
| 픽셀 모드 활성 상태에서 다크/라이트 토글 클릭 | 픽셀 모드 자동 비활성화 → 라이트/다크로 복귀 |
| 픽셀 모드 OFF → 저장 | 기존 라이트/다크 모드로 복귀 |

---

## 2. 변경 파일 목록

### 백엔드 (4개 파일 수정)

> **참고**: 로그/이벤트 데이터 인덱스와 무관합니다.
> `cs_policies` 인덱스의 `advanced_settings` 단일 문서(앱 설정값 저장소)에
> `pixel_mode` 필드 하나를 추가하는 것이 전부입니다.
> `user_register`, `tab_count` 등 기존 설정값과 동일한 위치입니다.

| 파일 | 변경 유형 |
|------|----------|
| `backend/app/models/advanced_settings.py` | `pixel_mode: bool` 필드 추가 |
| `backend/app/schemas/advanced_settings.py` | `pixel_mode: bool` 필드 추가 |
| `backend/app/repositories/advanced_settings.py` | `pixel_mode` 읽기/쓰기 추가 |
| `backend/app/services/advanced_settings.py` | 기본값 `pixel_mode=False` 추가 |

### 프론트엔드 (5개 파일 수정)

| 파일 | 변경 유형 |
|------|----------|
| `frontend/src/services/advancedSettingsService.ts` | `pixel_mode?: boolean` 필드 추가 |
| `frontend/src/theme/index.ts` | `createPixelTheme()` 함수 신규 추가 |
| `frontend/src/App.tsx` | 픽셀 모드 상태 관리 + 테마 분기 + 폰트 동적 로드 + 이벤트 수신 |
| `frontend/src/pages/admin/tabs/AdvancedSettingsTab.tsx` | 너드 설정 섹션 추가 |
| `frontend/src/locales/ko.json` 외 3개 | 픽셀 모드 i18n 키 추가 |

---

## 3. 백엔드 상세 설계

### 3-1. 모델 (`app/models/advanced_settings.py`)

```python
@dataclass
class AdvancedSettings:
    user_register: bool
    allow_multiple_sessions: bool
    tab_count: int
    updated_at: datetime
    pagination_size: int = 10
    time_filter_duration: int = 15
    time_filter_unit: str = "m"
    pixel_mode: bool = False          # 추가

    def to_dict(self) -> dict:
        return {
            "user_register": self.user_register,
            "allow_multiple_sessions": self.allow_multiple_sessions,
            "tab_count": self.tab_count,
            "updated_at": self.updated_at.isoformat(),
            "pagination_size": self.pagination_size,
            "time_filter_duration": self.time_filter_duration,
            "time_filter_unit": self.time_filter_unit,
            "pixel_mode": self.pixel_mode,   # 추가
        }
```

### 3-2. 스키마 (`app/schemas/advanced_settings.py`)

```python
class AdvancedSettingsBase(BaseModel):
    user_register: bool
    allow_multiple_sessions: bool = False
    tab_count: int = 10
    pagination_size: int = 10
    time_filter_duration: int = 15
    time_filter_unit: str = "m"
    pixel_mode: bool = False          # 추가
```

### 3-3. 리포지토리 (`app/repositories/advanced_settings.py`)

get_settings() 내 AdvancedSettings 생성자에 추가:
```python
pixel_mode=data.get("pixel_mode", False)   # 추가 (기존 문서 하위 호환)
```

### 3-4. 서비스 (`app/services/advanced_settings.py`)

기본값 생성 및 update 생성자 양쪽에 추가:
```python
# get_settings() 기본값 생성 시
pixel_mode=False,

# update_settings() 시
pixel_mode=update_data.pixel_mode,
```

---

## 4. 프론트엔드 상세 설계

### 4-1. 폰트 전략 (성능 핵심)

> 폰트 로드는 픽셀 모드 활성화 시에만 발생해야 한다.

**적용 폰트: `DotGothic16` 단일 폰트**

| 선택 이유 | 내용 |
|----------|------|
| 한글 완전 지원 | 한국어 텍스트 가독성 확보 |
| 도트/픽셀 감성 | 이름 그대로 도트 스타일 |
| 단일 폰트 요청 | 네트워크 요청 1회로 최소화 |
| 가독성 | 본문/테이블/레이블 모두 읽기 편함 |

**'Press Start 2P' 불사용 이유**: 한글 미지원, 폭이 매우 넓어 레이아웃 파괴, 본문 가독성 심각하게 훼손.

**동적 로드 방식 (App.tsx에서 처리):**
```typescript
// 픽셀 모드 활성화 시 주입
function injectPixelFont() {
  if (document.getElementById('pixel-font-link')) return;
  const link = document.createElement('link');
  link.id = 'pixel-font-link';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap';
  document.head.appendChild(link);
}

// 픽셀 모드 비활성화 시 제거 (메모리 절약)
function removePixelFont() {
  document.getElementById('pixel-font-link')?.remove();
}
```

- `display=swap`: 폰트 로드 전까지 시스템 폰트 사용 → 렌더링 차단 없음
- 이미 주입된 경우 중복 요청 방지 (`id` 체크)
- 픽셀 모드 해제 시 link 태그 제거로 깔끔하게 정리

**폰트 폴백 체인**: `'DotGothic16', 'Courier New', monospace`

---

### 4-2. theme/index.ts — 픽셀 테마 생성

기존 정적 theme export를 유지하면서 `createPixelTheme()` 함수 추가.

**픽셀 테마 색상 팔레트:**

| 용도 | 값 | 비고 |
|------|-----|------|
| 배경 (default) | `#0D0E1A` | 시안 2번 기준 — 어두운 네이비-차콜 |
| 카드 배경 (paper) | `#13141F` | 배경보다 살짝 밝음 |
| 주 강조색 (primary) | `#00FF9C` | 네온 그린 |
| 보조 강조색 (secondary) | `#FF6B00` | 오렌지 (숫자 강조) |
| 에러/경고색 | `#FF00CC` | 마젠타 |
| 기본 텍스트 | `#E0FFE0` | 살짝 그린 틴트 화이트 |
| 보조 텍스트 | `#00CC7A` | 다운된 네온 그린 |
| 구분선 (divider) | `#00FF9C33` | 투명도 있는 그린 |

**MUI 컴포넌트 오버라이드 — CSS만 사용, 추가 라이브러리 없음:**

```typescript
export function createPixelTheme() {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#00FF9C' },
      secondary: { main: '#FF6B00' },
      error: { main: '#FF00CC' },
      background: { default: '#0D0E1A', paper: '#13141F' },
      text: { primary: '#E0FFE0', secondary: '#00CC7A' },
      divider: '#00FF9C33',
    },
    typography: {
      // 전체 기본 폰트: DotGothic16 (한글 가독성)
      fontFamily: "'DotGothic16', 'Courier New', monospace",
    },
    shape: { borderRadius: 0 },  // 직각 처리 전역 적용
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            // box-shadow로 픽셀 느낌 테두리 (border-image 불사용)
            border: '2px solid #00FF9C',
            backgroundImage: 'none',
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: '2px solid currentColor',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            // 클릭 시 눌리는 효과 — CSS transform만, 성능 영향 없음
            transition: 'transform 0.05s, box-shadow 0.05s',
            '&:active': { transform: 'translate(2px, 2px)' },
          },
          contained: {
            // 입체감 box-shadow (픽셀 게임 버튼 느낌)
            boxShadow: '4px 4px 0px #005533',
            '&:active': {
              boxShadow: 'none',
              transform: 'translate(4px, 4px)',
            },
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              '& fieldset': { borderColor: '#00FF9C', borderWidth: '2px' },
              '&:hover fieldset': { borderColor: '#00FF9C' },
              '&.Mui-focused fieldset': { borderColor: '#00FF9C' },
            }
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: { borderBottom: '2px solid #00FF9C', backgroundImage: 'none' }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { borderRight: '2px solid #00FF9C33' }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          // 헤더만 대문자 + 강조 (본문은 기본 DotGothic16 유지 — 가독성)
          head: {
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.75rem',
            borderBottom: '2px solid #00FF9C',
            color: '#00FF9C',
          },
          body: {
            borderBottom: '1px solid #00FF9C22',
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 0 }
        }
      },
      MuiCssBaseline: {
        styleOverrides: `
          /* 폰트는 App.tsx에서 동적 주입 — 여기서는 스크롤바만 */
          ::-webkit-scrollbar { width: 8px !important; height: 8px !important; }
          ::-webkit-scrollbar-track { background: #0D0E1A !important; }
          ::-webkit-scrollbar-thumb {
            background-color: #00FF9C !important;
            border-radius: 0 !important;
          }
          ::-webkit-scrollbar-thumb:hover { background-color: #00CC7A !important; }
          * { scrollbar-color: #00FF9C #0D0E1A; }
        `
      }
    }
  });
}
```

---

### 4-3. App.tsx — 픽셀 모드 상태 관리

**추가할 상태:**
```typescript
const [pixelMode, setPixelMode] = useState<boolean>(() => {
  return localStorage.getItem("appPixelMode") === "true";
});
```

**폰트 동적 로드 useEffect (신규):**
```typescript
useEffect(() => {
  if (pixelMode) {
    injectPixelFont();
  } else {
    removePixelFont();
  }
}, [pixelMode]);
```

**테마 생성 분기 (useMemo 수정):**
```typescript
const theme = useMemo(() => {
  if (pixelMode) return createPixelTheme();
  return createTheme({ palette: { mode: darkMode ? "dark" : "light" }, ...기존... });
}, [darkMode, pixelMode]);
```

**다크/라이트 토글 핸들러 수정:**
```typescript
const handleDarkModeChange = useCallback(() => {
  if (pixelMode) {
    // 픽셀 모드 비활성화 → 라이트/다크 복귀
    setPixelMode(false);
    localStorage.setItem("appPixelMode", "false");
    // 백엔드 비동기 저장 (fire-and-forget, UI는 즉시 반응)
    advancedSettingsService.getSettings()
      .then(current => advancedSettingsService.updateSettings({ ...current, pixel_mode: false }))
      .catch(console.error);
    return;
  }
  const newDarkMode = !darkMode;
  setDarkMode(newDarkMode);
  localStorage.setItem("appDarkMode", JSON.stringify(newDarkMode));
}, [darkMode, pixelMode]);
```

**설정 로드 시 pixel_mode 동기화 (기존 useEffect 수정):**
```typescript
useEffect(() => {
  if (user) {
    const loadSettings = async () => {
      const settings = await advancedSettingsService.getSettings();
      if (settings.pixel_mode !== undefined) {
        setPixelMode(settings.pixel_mode);
        localStorage.setItem("appPixelMode", String(settings.pixel_mode));
      }
      if (settings.tab_count) setMaxTabs(settings.tab_count);
    };
    loadSettings();
  }
}, [user, setMaxTabs]);
```

**pixelModeChanged CustomEvent 수신 (신규 useEffect):**
```typescript
useEffect(() => {
  const handler = (e: Event) => {
    const { pixelMode: newMode } = (e as CustomEvent).detail;
    setPixelMode(newMode);
    localStorage.setItem("appPixelMode", String(newMode));
  };
  window.addEventListener('pixelModeChanged', handler);
  return () => window.removeEventListener('pixelModeChanged', handler);
}, []);
```

---

### 4-4. AdvancedSettingsTab.tsx — 너드 설정 섹션

기존 `defaultSettings` Box 섹션 아래 최하단에 추가:

```tsx
{/* 너드 설정 */}
<Box>
  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
    {t('nerdSettings')}
  </Typography>
  <Divider sx={{ mb: 2 }} />
  <FormControlLabel
    control={
      <Switch
        checked={settings.pixel_mode || false}
        onChange={(e) => handleChange('pixel_mode', e.target.checked)}
        color="primary"
      />
    }
    label={
      <Box>
        <Typography variant="body2">{t('pixelMode')}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t('pixelModeDesc')}
        </Typography>
      </Box>
    }
  />
</Box>
```

**handleSave 성공 후 CustomEvent 발생 추가:**
```typescript
window.dispatchEvent(new CustomEvent('pixelModeChanged', {
  detail: { pixelMode: settings.pixel_mode || false }
}));
```

---

### 4-5. i18n 키 추가 (4개 언어 파일)

| 키 | ko | en | ja | cn |
|----|----|----|----|----|
| `nerdSettings` | `너드 설정` | `Nerd Settings` | `マニア設定` | `极客设置` |
| `pixelMode` | `픽셀 모드` | `Pixel Mode` | `ピクセルモード` | `像素模式` |
| `pixelModeDesc` | `레트로 도트 스타일 UI로 전환합니다. 라이트/다크 모드 전환 시 자동 해제됩니다.` | `Switch to retro dot style UI. Auto-deactivated when switching light/dark mode.` | `レトロドットスタイルに切り替えます。ライト/ダークモード切替時に自動解除。` | `切换为复古像素风格UI。切换亮/暗模式时自动停用。` |

---

## 5. 구현 순서 (Phase)

### Phase 1: 백엔드 pixel_mode 필드 추가 _(~30분)_
- [ ] `app/models/advanced_settings.py` — `pixel_mode: bool = False` 추가, `to_dict()` 반영
- [ ] `app/schemas/advanced_settings.py` — `pixel_mode: bool = False` 추가
- [ ] `app/repositories/advanced_settings.py` — get에 `data.get("pixel_mode", False)` 추가
- [ ] `app/services/advanced_settings.py` — 기본값 및 update에 `pixel_mode` 반영

### Phase 2: 프론트엔드 서비스 타입 추가 _(~10분)_
- [ ] `advancedSettingsService.ts` — `pixel_mode?: boolean` 추가

### Phase 3: 픽셀 테마 생성 _(~50분)_
- [ ] `frontend/src/theme/index.ts` — `createPixelTheme()` 함수 구현
- [ ] 색상 팔레트 적용 (네온 그린 `#00FF9C`, 배경 `#0D0E1A`)
- [ ] MUI 컴포넌트 오버라이드 (Paper, Button, TextField, AppBar, Drawer, TableCell, Chip)
- [ ] `shape: { borderRadius: 0 }` 전역 직각 처리
- [ ] 스크롤바 스타일 (MuiCssBaseline)

### Phase 4: App.tsx 상태 관리 통합 _(~40분)_
- [ ] `pixelMode` 상태 추가 (localStorage 초기값)
- [ ] `injectPixelFont` / `removePixelFont` 함수 구현 (동적 link 주입)
- [ ] 폰트 로드 useEffect 추가 (`pixelMode` 변경 감지)
- [ ] `theme` useMemo에 픽셀 분기 추가
- [ ] `handleDarkModeChange` — 픽셀 모드 활성 시 비활성화 로직
- [ ] 설정 로드 useEffect에서 `pixel_mode` 동기화
- [ ] `pixelModeChanged` CustomEvent 수신 useEffect 추가

### Phase 5: UI 추가 및 i18n _(~30분)_
- [ ] `AdvancedSettingsTab.tsx` — 너드 설정 섹션 추가
- [ ] 저장 성공 후 `pixelModeChanged` CustomEvent 발생
- [ ] `ko.json`, `en.json`, `cn.json`, `ja.json` — 3개 키 추가

**총 예상 시간: 약 2.5시간**

---

## 6. 주의사항

1. **백엔드 하위 호환성**: OpenSearch 기존 문서에 `pixel_mode` 필드 없을 수 있음 → `data.get("pixel_mode", False)` 기본값 처리 필수
2. **폰트 로드 차단 방지**: `display=swap` URL 파라미터 필수. 폰트 없어도 레이아웃 깨지지 않도록 폴백 체인(`DotGothic16`, `Courier New`, monospace) 확인
3. **토글 버튼 UX**: 픽셀 모드 활성 중 다크/라이트 토글이 "픽셀 모드 해제" 역할을 함. 아이콘에 tooltip(`픽셀 모드 해제`) 추가하여 사용자 혼란 방지
4. **borderRadius: 0 전역 적용 부작용**: Dialog, Snackbar 등 일부 MUI 컴포넌트도 영향받음. 필요시 해당 컴포넌트만 예외 처리

---

## 7. 테스트 체크리스트

### 기능 동작
- [ ] 고급 설정 픽셀 모드 ON → 저장 → 즉시 픽셀 테마 적용 확인
- [ ] 픽셀 모드 중 다크/라이트 토글 클릭 → 픽셀 모드 해제 + 이전 모드 복귀 확인
- [ ] 페이지 새로고침 후 픽셀 모드 상태 유지 (localStorage)
- [ ] 고급 설정 재진입 시 토글 상태 서버값 일치 확인

### 성능
- [ ] 픽셀 모드 OFF 상태에서 DotGothic16 폰트 요청 없음 (브라우저 네트워크 탭)
- [ ] 픽셀 모드 ON 시 Google Fonts 요청 1건만 발생 확인
- [ ] 픽셀 모드 재활성화 시 폰트 중복 요청 없음 (id 체크)

### 가독성
- [ ] 한글 레이블/본문 DotGothic16 렌더링 확인 (판독 가능 수준)
- [ ] 테이블 본문 데이터 가독성 확인
- [ ] 네온 그린 대비 텍스트 명암 충분한지 확인

### 시각 효과
- [ ] Paper/Card 테두리 네온 그린 2px 직각 확인
- [ ] 버튼 클릭 시 translate(2px, 2px) 애니메이션 확인
- [ ] 스크롤바 네온 그린 확인
- [ ] 테이블 헤더 uppercase + 네온 그린 색상 확인
