# ADTG

브랜드 primary color 하나로 다크/라이트 팔레트, 중립 스케일, 시맨틱 토큰, 컴포넌트 토큰, 미리보기, `PALETTE.md` 내보내기를 생성하는 정적 디자인 토큰 생성기입니다.

## 주요 기능

- Primary 색상 기반 50-900 스케일 생성
- 다크/라이트 중립 스케일과 투명도 스케일 생성
- 표면 위계 생성: base, elevated, muted, dimmed, hairline 등
- 시맨틱 색상군 생성: primary, info, positive, warning, critical, accent, teal, orange
- 시맨틱 토큰 생성: `fill`, `text`, `border`, `background`, `button`, `badge`, `state`, `control`, `effect`
- 실제 UI 조합 미리보기: 버튼, 배지, 외곽선, 피드백, 표면 계층
- `PALETTE.md` 모달 미리보기, 복사, 다운로드
- 빌드 도구 없이 브라우저에서 바로 실행되는 단일 페이지 앱

## 실행

별도 의존성 설치가 필요 없습니다.

```sh
open index.html
```

로컬 서버로 확인하고 싶다면 임의의 정적 서버를 사용하면 됩니다.

```sh
python3 -m http.server 8000
```

그 다음 `http://localhost:8000`으로 접속합니다.

## 파일 구조

```text
.
├── index.html
└── js
    ├── color-system.js
    └── ui.js
```

- `index.html`: 레이아웃, 스타일, 모달, 섹션 마크업을 담당합니다.
- `js/color-system.js`: OKLCH 변환, 팔레트 생성, 시맨틱 토큰 계산을 담당합니다.
- `js/ui.js`: 렌더링, preview 구성, `PALETTE.md` 생성, 이벤트 처리를 담당합니다.

## 생성 로직

ADTG는 입력한 primary color를 OKLCH로 변환한 뒤, 명도(L), 채도(C), 색상각(H)을 기준으로 팔레트와 토큰을 계산합니다.

### Primary Scale

Primary scale은 내장 기준 팔레트의 tone curve를 기반으로 하되, 500 단계는 사용자가 선택한 primary color의 명도에 가깝게 유지합니다. 극단의 밝은/어두운 단계로 갈수록 명도 이동량을 완만하게 줄여서 전체 50-900 스케일이 급격히 무너지지 않도록 합니다.

이 방식 때문에 `#3181F6`처럼 기준 primary에 가까운 색은 기준 팔레트와 거의 같은 버튼 색으로 나오고, `#FFBC00`처럼 명도가 높은 primary는 어두운 갈색으로 눌리지 않고 밝은 노란 primary action color로 유지됩니다.

### Neutral Scale

Neutral scale은 primary hue를 약하게 반영합니다. 라이트/다크 모드에서 회색이 완전히 무채색으로 떠 보이지 않도록 아주 낮은 chroma tint를 적용하고, 입력색이 내장 기준 primary와 가까울수록 기준 neutral scale에 더 가깝게 보정합니다.

### Surface Tokens

Surface는 UI 레이어를 검증하기 위한 배경 계층입니다.

- `background.neutral.base`
- `background.neutral.elevated`
- `background.neutral.muted`
- `background.neutral.dimmed`
- `border.neutral.hairline`

Preview는 이 토큰들을 실제 카드, 리스트, 외곽선, 딤드 오버레이에 적용해서 배경만이 아니라 텍스트와 경계까지 같이 확인하도록 구성되어 있습니다.

### Semantic Families

시맨틱 색상군은 의미별 hue를 유지합니다. 예를 들어 warning은 warning 계열 hue를 유지하고, critical은 critical 계열 hue를 유지합니다.

Primary 변화는 의미색의 hue를 바꾸는 방식이 아니라, primary scale에서 계산된 명도/채도 이동량을 의미색 scale에 완만하게 반영하는 방식으로 적용됩니다. 따라서 primary를 바꿔도 info, positive, warning, critical 같은 의미는 유지되고, 전체 UI 톤만 primary와 더 잘 맞도록 조정됩니다.

### Component Tokens

컴포넌트 토큰은 raw scale 값을 직접 보여주는 용도가 아니라 실제 컴포넌트에서 쓰기 위한 별칭 계층입니다.

대표 토큰:

- `button.primary.fill`
- `button.primary.weak`
- `button.danger.weak`
- `button.neutral.weak`
- `badge.blue.background`
- `badge.green.background`
- `badge.red.background`
- `badge.yellow.background`
- `badge.elephant.background`
- `state.button.pressedOverlay`
- `state.listRow.disabledBackground`
- `control.radio.indicatorBackground`
- `effect.gradient.toTop`
- `effect.gradient.toBottom`
- `effect.gradient.layeredToTop`
- `effect.toast.background`
- `effect.hairline.background`

약한 버튼과 배지 배경은 단순히 낮은 alpha를 씌우지 않고, 보정된 semantic scale 단계에서 가져옵니다. 이렇게 해야 밝은 primary나 노란 primary에서도 배경이 화면에서 사라지지 않고, 토큰 리스트와 preview가 같은 값을 검증합니다.

Effect 토큰은 색상 스케일에서 직접 고를 수 없는 CSS value를 다룹니다. 기본/레이어 표면의 방향성 그라데이션, hairline background, toast background, swiper bullet background처럼 컴포넌트 구현에서 반복되는 시각 효과를 토큰으로 분리합니다.

### Text Contrast

토큰 생성 시 WCAG contrast ratio와 APCA 값을 계산합니다. 불투명 색상은 `darkText`, `lightText`, 대비 값이 같이 표시됩니다. 알파 기반 토큰은 배경 합성 결과가 사용처에 따라 달라질 수 있으므로 ratio를 별도로 표시하지 않습니다.

## Preview

Preview는 생성된 `semanticTokens`를 직접 읽어서 렌더링합니다. 따라서 왼쪽 시맨틱 토큰 리스트에서 보이는 값과 오른쪽 미리보기의 버튼/배지/경계/피드백 색상이 같은 토큰 소스를 사용합니다.

검증 대상:

- primary fill 버튼과 on-color
- weak 버튼 3종
- 정보/청록/성공/주의/위험/중립 배지
- outline badge와 outline button
- hairline border와 default border
- info/critical feedback 영역
- gradient, toast, radio indicator, disabled row 같은 effect/control 토큰
- 다크/라이트 표면 계층

## Export

하단 floating CTA의 `PALETTE.md 추출하기` 버튼을 누르면 export 모달이 열립니다.

모달에서 할 수 있는 일:

- 생성된 markdown 미리보기
- 클립보드 복사
- `PALETTE.md` 다운로드
- 적용 가이드 확인

Export 문서에는 다음 내용이 포함됩니다.

- 입력 primary 값
- 중립 스케일
- primary 스케일
- 표면 위계
- 실무 컴포넌트 매핑
- 조화 보정된 시맨틱 색상군
- 시맨틱 토큰 매트릭스
- effect/control/state 확장 토큰
- CSS variable 예시

## 설계 원칙

- Primary 색상은 action color의 기준으로 사용합니다.
- 의미색은 primary hue로 덮어쓰지 않습니다.
- 의미색의 hue는 유지하고, 명도/채도 tone만 primary에 맞춰 보정합니다.
- Preview는 별도 하드코딩 색상이 아니라 생성된 semantic token을 사용합니다.
- 약색 토큰은 보이는지 여부가 preview surface에만 의존하지 않도록 semantic scale에서 먼저 계산합니다.
- 라이트/다크 토큰은 같은 이름으로 제공하되, 각 모드에 맞는 값과 on-color를 따로 계산합니다.

## 개발 메모

현재 앱은 프레임워크 없이 작성된 정적 HTML/CSS/JavaScript 앱입니다. 새 의존성을 추가하지 않아도 대부분의 로직 수정과 UI 조정이 가능합니다.

검증할 때는 최소한 다음을 확인하세요.

```sh
node - <<'NODE'
const fs = require('fs');
for (const file of ['js/color-system.js', 'js/ui.js']) {
  new Function(fs.readFileSync(file, 'utf8'));
  console.log(`${file}: syntax ok`);
}
NODE
```

추천 수동 QA:

- 기준 primary에 가까운 파란색
- 밝은 노란색: `#FFBC00`
- 초록색: `#22C55E`
- 빨간색: `#EF4444`
- 분홍색: `#EC4899`

각 색상에서 primary 버튼, weak 버튼, 배지 배경, outline, 피드백 카드, 다크/라이트 표면 위계를 함께 확인합니다.
