# 기획서: Pixel Mode (Retro/Nerd Style Theme)

## 1. 개요
SIEM 시스템의 개성을 부여하고 '너드(Nerd)'스러운 감성을 극대화하기 위해, 기존의 정갈한 UI를 도트 그래픽 스타일로 재해석하는 'Pixel Mode'를 도입합니다. 이 모드는 기본 테마(Light/Dark)와는 별개로 [고급 설정]에서 활성화할 수 있는 특별 모드로 작동합니다.

## 2. 디자인 리소스
- **시안 1**: `docs/figma/fixelmode/pixel_mode(1).jpg`
- **시안 2**: `docs/figma/fixelmode/pixel_mode(2).jpg`

## 3. 핵심 개발 단계 (Phase 1)

### 3.1 1단계: 테마 상태 관리 및 폰트 설정
- **상태 관리**: `useThemeStore` 또는 전역 상태에 `isPixelMode` 상태를 추가.
- **폰트 주입**: 픽셀 모드 활성화 시 구글 폰트 동적 로드.
  - 제목용: 'Press Start 2P'
  - 본문용: 'DotGothic16'
- **기대 효과**: 폰트 변경만으로 전체 분위기의 50% 완성.

### 3.2 2단계: MUI 전역 테마 오버라이드 (Global Styles)
- **Typography**: `font-family` 변경 및 `font-smooth: never` 적용.
- **Borders**: 일반 실선을 `border-image` 또는 `box-shadow (inset)`를 활용한 계단 모양 굵은 테두리로 변경.
- **Radius**: 모든 `borderRadius`를 0으로 초기화.
- **Buttons**: 클릭 시 입체감을 주는 애니메이션 (`active { transform: translate(2px, 2px) }`) 적용.

### 3.3 3단계: 가독성을 고려한 데이터 시각화 조정
- **Bar Chart**: 막대 두께를 굵게 하고 블랙 테두리를 추가하여 도트 블록 느낌 강조.
- **Data Grid**: 헤더에는 픽셀 폰트를 적용하고, 본문은 가독성을 위해 일반 폰트 유지(단, 테두리와 여백은 투박하게 설정).

### 3.4 4단계: 디테일 및 애니메이션
- **Pixelated Filter**: 기존 SVG 아이콘에 `filter: url(#pixelate)` 적용 검토.
- **Color Palette**: 네온 그린, 사이버 펑크 핑크 등 고채도 강조색 사용.
- **Loading Spinner**: 도트 캐릭터 또는 게이지 스타일의 애니메이션으로 대체.

## 4. 구현 전략
- **Minimal Effort**: 모든 이미지를 새로 그리지 않고, CSS(`box-shadow`, `font`)만으로 시스템 레이아웃을 '재해석'하여 가볍고 효율적으로 구현합니다.
- **Compatibility**: 기존 라이트/다크 모드와 연동되어 각 모드에서도 픽셀 스타일이 조화롭게 나타나도록 설계합니다.

## 5. 일정 (예상)
- Day 1-2: 전역 테마 설정 및 CSS 변수 정의.
- Day 3: MUI 컴포넌트(Button, Paper, Card) 오버라이드.
- Day 4: 차트 라이브러리 커스텀 렌더러 적용.
- Day 5: 전체 QA 및 가독성 테스트.
