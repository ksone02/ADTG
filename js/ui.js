      // ===== Render =====
      const STEPS = [
        '50',
        '100',
        '200',
        '300',
        '400',
        '500',
        '600',
        '700',
        '800',
        '900',
      ];

      function renderScale(containerId, colors, lightText) {
        const el = document.getElementById(containerId);
        el.innerHTML = colors
          .map((hex, i) => {
            const isLight = lightText ? i < 5 : i >= 5;
            const textColor = isLight
              ? 'rgba(0,0,0,0.6)'
              : 'rgba(255,255,255,0.7)';
            return `<div class="scale-cell pickable" data-pick-hex="${hex}" title="클릭해서 ${hex} 적용" style="background:${hex};">
      <span class="step" style="color:${textColor}">${STEPS[i]}</span>
      <span class="hex" style="color:${textColor}">${hex}</span>
    </div>`;
          })
          .join('');
      }

      function renderOpacity(containerId, rgbaColors) {
        const el = document.getElementById(containerId);
        const isLight = containerId.includes('Light');
        el.innerHTML = rgbaColors
          .map((rgba, i) => {
            const textColor = isLight
              ? i < 6
                ? 'rgba(0,0,0,0.5)'
                : '#fff'
              : i < 6
                ? 'rgba(255,255,255,0.4)'
                : '#fff';
            return `<div class="opacity-cell" style="background:${rgba};">
      <span class="step" style="color:${textColor};font-size:8px;font-family:monospace;">${STEPS[i]}</span>
    </div>`;
          })
          .join('');
      }

      function renderSurfaces(containerId, surfaces) {
        const el = document.getElementById(containerId);
        const isLight = containerId.includes('Light');
        el.innerHTML = surfaces
          .map((s) => {
            const textColor = isLight
              ? 'rgba(0,0,0,0.5)'
              : 'rgba(255,255,255,0.6)';
            return `<div class="scale-cell pickable" data-pick-hex="${s.hex}" title="클릭해서 ${s.hex} 적용" style="background:${s.hex};border-radius:0;">
      <span class="step" style="color:${textColor}">${s.name}</span>
      <span class="hex" style="color:${textColor}">${s.hex}</span>
    </div>`;
          })
          .join('');
      }

      function renderSemantic(families) {
        const el = document.getElementById('semanticColors');
        const scaleMarkup = (scale, selectedIndex) =>
          scale
            .map((hex, i) => {
              const labelColor =
                hexLuminance(hex) > 0.45
                  ? 'rgba(0,0,0,0.72)'
                  : 'rgba(255,255,255,0.82)';
              return `<div class="family-cell pickable ${i === selectedIndex ? 'selected' : ''}" data-pick-hex="${hex}" title="${STEPS[i]} ${hex}" style="background:${hex};">
      <span class="step" style="color:${labelColor}">${STEPS[i]}</span>
    </div>`;
            })
            .join('');

        el.innerHTML = families
          .map(
            (f) => `
    <div class="family-card">
      <div class="family-head">
        <div class="family-name"><span class="family-dot" style="background:${f.lightFill.fill};"></span>${f.name}</div>
        <div class="family-meta">${f.source} · h ${Math.round(f.hue)} / c ${f.chroma.toFixed(3)}</div>
      </div>
      <div class="family-row">
        <div class="family-label">다크</div>
        <div class="family-scale">${scaleMarkup(f.darkScale, f.darkFill.index)}</div>
      </div>
      <div class="family-row">
        <div class="family-label">라이트</div>
        <div class="family-scale">${scaleMarkup(f.lightScale, f.lightFill.index)}</div>
      </div>
      <div class="family-picked">
        <span class="family-chip" style="background:${rgbaFromHex(f.darkFill.fill, 0.2)};color:${f.darkFill.fill};">다크 ${STEPS[f.darkFill.index]} ${f.darkFill.fill}</span>
        <span class="family-chip" style="background:${rgbaFromHex(f.lightFill.fill, 0.16)};color:${f.lightFill.fill};">라이트 ${STEPS[f.lightFill.index]} ${f.lightFill.fill}</span>
      </div>
    </div>
  `,
          )
          .join('');
      }

      function renderSemanticTokens(tokens) {
        const el = document.getElementById('semanticTokens');
        const filter = window.__tokenFilter || 'all';
        const filtered =
          filter === 'all' ? tokens : tokens.filter((t) => t.target === filter);
        el.innerHTML = filtered
          .map(
            (t) => `
    <div class="token-card">
      <div class="token-head">${t.name}</div>
      <div class="token-row">
        <div class="token-cell">
          <div class="token-mode">다크</div>
          <div class="token-swatch" style="background:${t.dark};color:${t.darkText};">Aa</div>
          <div class="token-hex">${t.dark}</div>
          <div class="token-ratio">${t.darkRatio ? `WCAG ${t.darkRatio.toFixed(2)}:1 / APCA ${Math.round(t.darkApca)}` : '비율 없음(알파 토큰)'}</div>
        </div>
        <div class="token-cell">
          <div class="token-mode">라이트</div>
          <div class="token-swatch" style="background:${t.light};color:${t.lightText};">Aa</div>
          <div class="token-hex">${t.light}</div>
          <div class="token-ratio">${t.lightRatio ? `WCAG ${t.lightRatio.toFixed(2)}:1 / APCA ${Math.round(t.lightApca)}` : '비율 없음(알파 토큰)'}</div>
        </div>
      </div>
    </div>
  `,
          )
          .join('');
      }

      function renderPreview(
        primaryHex,
        greyDark,
        greyLight,
        primaryDark,
        primaryLight,
        surfaces,
        semanticTokens,
      ) {
        const el = document.getElementById('modePreview');
        const tokenMap = Object.fromEntries(
          semanticTokens.map((t) => [t.name, t]),
        );
        const get = (name, mode, fallback) =>
          (tokenMap[name] && tokenMap[name][mode]) || fallback;
        const on = (name, mode, fallback) =>
          (tokenMap[name] && tokenMap[name][`${mode}Text`]) || fallback;

        const modeData = (mode, defaults) => ({
          surface: get('background.neutral.base', mode, defaults.surface),
          panel: get('background.neutral.elevated', mode, defaults.panel),
          muted: get('background.neutral.muted', mode, defaults.muted),
          dimmed: get('background.neutral.dimmed', mode, defaults.dimmed),
          hairline: get('border.neutral.hairline', mode, defaults.hairline),
          borderDefault: get(
            'border.neutral.default',
            mode,
            defaults.borderDefault,
          ),
          textPrimary: get('text.neutral.primary', mode, defaults.textPrimary),
          textSecondary: get(
            'text.neutral.secondary',
            mode,
            defaults.textSecondary,
          ),
          textTertiary: get(
            'text.neutral.tertiary',
            mode,
            defaults.textTertiary,
          ),
          primarySubtleBg: get(
            'background.primary.subtle',
            mode,
            defaults.primarySubtleBg,
          ),
          fillInfoWeak: get('fill.info.weak', mode, defaults.fillInfoWeak),
          fillCriticalWeak: get(
            'fill.critical.weak',
            mode,
            defaults.fillCriticalWeak,
          ),
          textInfo: get('text.info.default', mode, defaults.textInfo),
          textCritical: get(
            'text.critical.default',
            mode,
            defaults.textCritical,
          ),
          borderInfo: get('border.info.default', mode, defaults.borderInfo),
          borderCritical: get(
            'border.critical.default',
            mode,
            defaults.borderCritical,
          ),
          buttonPrimary: get(
            'button.primary.fill',
            mode,
            defaults.buttonPrimary,
          ),
          buttonPrimaryOn: on(
            'button.primary.fill',
            mode,
            defaults.buttonPrimaryOn,
          ),
          buttonPrimaryWeak: get(
            'button.primary.weak',
            mode,
            defaults.buttonPrimaryWeak,
          ),
          buttonPrimaryWeakOn: on(
            'button.primary.weak',
            mode,
            defaults.buttonPrimaryWeakOn,
          ),
          buttonDarkFill: get(
            'button.dark.fill',
            mode,
            defaults.buttonDarkFill,
          ),
          buttonDarkOn: on('button.dark.fill', mode, defaults.buttonDarkOn),
          buttonDangerWeak: get(
            'button.danger.weak',
            mode,
            defaults.buttonDangerWeak,
          ),
          buttonDangerWeakOn: on(
            'button.danger.weak',
            mode,
            defaults.buttonDangerWeakOn,
          ),
          buttonNeutralWeak: get(
            'button.neutral.weak',
            mode,
            defaults.buttonNeutralWeak,
          ),
          buttonNeutralWeakOn: on(
            'button.neutral.weak',
            mode,
            defaults.buttonNeutralWeakOn,
          ),
          pressedOverlay: get(
            'state.button.pressedOverlay',
            mode,
            defaults.pressedOverlay,
          ),
          borderPrimary: get(
            'border.primary.default',
            mode,
            defaults.borderPrimary,
          ),
          borderWarning: get(
            'border.warning.default',
            mode,
            defaults.borderWarning,
          ),
          badgeOutlineBorder: get(
            'border.neutral.hairline',
            mode,
            defaults.badgeOutlineBorder,
          ),
          badgeOutlineText: get(
            'text.neutral.secondary',
            mode,
            defaults.badgeOutlineText,
          ),
          badgeBlueBg: get('badge.blue.background', mode, defaults.badgeBlueBg),
          badgeBlueColor: get(
            'badge.blue.color',
            mode,
            defaults.badgeBlueColor,
          ),
          badgeTealBg: get('badge.teal.background', mode, defaults.badgeTealBg),
          badgeTealColor: get(
            'badge.teal.color',
            mode,
            defaults.badgeTealColor,
          ),
          badgeGreenBg: get(
            'badge.green.background',
            mode,
            defaults.badgeGreenBg,
          ),
          badgeGreenColor: get(
            'badge.green.color',
            mode,
            defaults.badgeGreenColor,
          ),
          badgeRedBg: get('badge.red.background', mode, defaults.badgeRedBg),
          badgeRedColor: get('badge.red.color', mode, defaults.badgeRedColor),
          badgeYellowBg: get(
            'badge.yellow.background',
            mode,
            defaults.badgeYellowBg,
          ),
          badgeYellowColor: get(
            'badge.yellow.color',
            mode,
            defaults.badgeYellowColor,
          ),
          badgeElephantBg: get(
            'badge.elephant.background',
            mode,
            defaults.badgeElephantBg,
          ),
          badgeElephantColor: get(
            'badge.elephant.color',
            mode,
            defaults.badgeElephantColor,
          ),
        });

        const dark = modeData('dark', {
          surface: surfaces.dark[1].hex,
          panel: surfaces.dark[2].hex,
          muted: surfaces.dark[3].hex,
          dimmed: 'rgba(0,0,0,0.56)',
          hairline: '#3c3c47',
          borderDefault: '#62626d',
          textPrimary: greyDark[9],
          textSecondary: greyDark[7],
          textTertiary: greyDark[6],
          primarySubtleBg: rgbaFromHex(primaryDark[5], 0.18),
          fillInfoWeak: rgbaFromHex('#4593fc', 0.16),
          fillCriticalWeak: rgbaFromHex('#fa616d', 0.18),
          textInfo: '#4593fc',
          textCritical: '#f66570',
          borderInfo: rgbaFromHex('#4593fc', 0.36),
          borderCritical: rgbaFromHex('#fa616d', 0.38),
          buttonPrimary: primaryDark[5],
          buttonPrimaryOn: '#ffffff',
          buttonPrimaryWeak: rgbaFromHex(primaryDark[5], 0.2),
          buttonPrimaryWeakOn: primaryDark[7],
          buttonDarkFill: '#4d4d59',
          buttonDarkOn: '#ffffff',
          buttonDangerWeak: rgbaFromHex('#fa616d', 0.18),
          buttonDangerWeakOn: '#fe818b',
          buttonNeutralWeak: rgbaFromHex('#d9d9ff', 0.11),
          buttonNeutralWeakOn: greyDark[7],
          pressedOverlay: 'rgba(0,0,0,0.26)',
          borderPrimary: rgbaFromHex(primaryDark[5], 0.52),
          borderWarning: rgbaFromHex('#ffc259', 0.48),
          badgeBlueBg: rgbaFromHex('#4593fc', 0.16),
          badgeBlueColor: '#4593fc',
          badgeTealBg: rgbaFromHex('#30b6b6', 0.16),
          badgeTealColor: '#30b6b6',
          badgeGreenBg: rgbaFromHex('#15c47e', 0.16),
          badgeGreenColor: '#15c47e',
          badgeRedBg: rgbaFromHex('#f66570', 0.16),
          badgeRedColor: '#f66570',
          badgeYellowBg: rgbaFromHex('#faa131', 0.16),
          badgeYellowColor: '#faa131',
          badgeElephantBg: rgbaFromHex('#c3c3c6', 0.16),
          badgeElephantColor: '#c3c3c6',
          badgeOutlineBorder: '#3c3c47',
          badgeOutlineText: greyDark[7],
        });

        const light = modeData('light', {
          surface: surfaces.light[1].hex,
          panel: surfaces.light[2].hex,
          muted: surfaces.light[5].hex,
          dimmed: 'rgba(0,0,0,0.2)',
          hairline: '#e5e8eb',
          borderDefault: '#b0b8c1',
          textPrimary: greyLight[9],
          textSecondary: greyLight[7],
          textTertiary: greyLight[6],
          primarySubtleBg: rgbaFromHex(primaryLight[5], 0.1),
          fillInfoWeak: rgbaFromHex('#3182f6', 0.14),
          fillCriticalWeak: rgbaFromHex('#f04452', 0.14),
          textInfo: '#1b64da',
          textCritical: '#d22030',
          borderInfo: rgbaFromHex('#3182f6', 0.28),
          borderCritical: rgbaFromHex('#f04452', 0.3),
          buttonPrimary: primaryLight[5],
          buttonPrimaryOn: '#ffffff',
          buttonPrimaryWeak: rgbaFromHex(primaryLight[5], 0.16),
          buttonPrimaryWeakOn: primaryLight[6],
          buttonDarkFill: '#4e5968',
          buttonDarkOn: '#ffffff',
          buttonDangerWeak: rgbaFromHex('#e42939', 0.14),
          buttonDangerWeakOn: '#d22030',
          buttonNeutralWeak: rgbaFromHex('#4e5968', 0.12),
          buttonNeutralWeakOn: greyLight[7],
          pressedOverlay: 'transparent',
          borderPrimary: rgbaFromHex(primaryLight[5], 0.4),
          borderWarning: rgbaFromHex('#ffb331', 0.42),
          badgeBlueBg: rgbaFromHex('#3182f6', 0.16),
          badgeBlueColor: '#1b64da',
          badgeTealBg: rgbaFromHex('#00818a', 0.16),
          badgeTealColor: '#0c8585',
          badgeGreenBg: rgbaFromHex('#02a262', 0.16),
          badgeGreenColor: '#029359',
          badgeRedBg: rgbaFromHex('#f04452', 0.16),
          badgeRedColor: '#d22030',
          badgeYellowBg: rgbaFromHex('#ffb331', 0.16),
          badgeYellowColor: '#dd7d02',
          badgeElephantBg: rgbaFromHex('#4e5968', 0.16),
          badgeElephantColor: '#4e5968',
          badgeOutlineBorder: '#d1d6db',
          badgeOutlineText: greyLight[7],
        });

        const renderMode = (label, d) => `
    <div class="mode-card" style="background:${d.surface};color:${d.textPrimary};">
      <div class="preview-mode-head">
        <div>
          <div class="mode-label" style="color:${d.textSecondary};">${label}</div>
          <div class="preview-hero-title" style="color:${d.textPrimary};font-size:15px;">실사용 조합</div>
        </div>
        <div class="preview-token" style="color:${d.textSecondary};"><span class="preview-token-dot" style="background:${d.buttonPrimary};"></span>${d.buttonPrimary}</div>
      </div>
      <div class="preview-shell">
        <div class="preview-hero" style="background:linear-gradient(180deg, ${d.primarySubtleBg}, ${d.panel});border-color:${d.borderPrimary};">
          <div class="preview-hero-copy">
            <div class="preview-kicker" style="color:${d.textSecondary};">결제 카드</div>
            <div class="preview-hero-title" style="color:${d.textPrimary};">이번 달 결제 금액 1,240,000원</div>
            <div class="preview-hero-desc" style="color:${d.textSecondary};">기본 색상, 텍스트, 경계, 배경이 함께 반응하는지 확인합니다.</div>
          </div>
          <div class="preview-row">
            <span class="comp-btn" style="background:${d.buttonPrimary};color:${d.buttonPrimaryOn};">기본</span>
            <span class="comp-btn outline" style="color:${d.buttonPrimary};border-color:${d.borderPrimary};">외곽선</span>
            <span class="comp-btn slim" style="background:${d.buttonPrimaryWeak};color:${d.buttonPrimaryWeakOn};">기본 약함</span>
          </div>
          <div class="preview-row">
            <span class="comp-chip" style="color:${d.textSecondary};border-color:${d.borderDefault};">중립</span>
            <span class="comp-chip" style="color:${d.buttonPrimary};border-color:${d.borderPrimary};">기본</span>
            <span class="comp-chip" style="color:${d.textSecondary};border-color:${d.hairline};">헤어라인</span>
          </div>
          <div class="preview-mini" style="background:${d.buttonPrimary};color:${d.buttonPrimaryOn};position:relative;overflow:hidden;">
            누름 상태
            <span style="position:absolute;inset:0;background:${d.pressedOverlay};"></span>
          </div>
        </div>
        <div class="preview-grid">
          <div class="preview-block" style="background:${d.primarySubtleBg};">
            <div class="preview-block-title" style="color:${d.textSecondary};">버튼 / 배지 토큰</div>
            <div class="preview-row">
              <span class="comp-btn slim" style="background:${d.buttonPrimaryWeak};color:${d.buttonPrimaryWeakOn};">기본 약함</span>
              <span class="comp-btn slim" style="background:${d.buttonDangerWeak};color:${d.buttonDangerWeakOn};">위험 약함</span>
              <span class="comp-btn slim" style="background:${d.buttonNeutralWeak};color:${d.buttonNeutralWeakOn};">중립 약함</span>
            </div>
            <div class="preview-row">
              <span class="comp-badge" style="background:${d.badgeBlueBg};color:${d.badgeBlueColor};">정보</span>
              <span class="comp-badge" style="background:${d.badgeTealBg};color:${d.badgeTealColor};">청록</span>
              <span class="comp-badge" style="background:${d.badgeGreenBg};color:${d.badgeGreenColor};">성공</span>
              <span class="comp-badge" style="background:${d.badgeYellowBg};color:${d.badgeYellowColor};">주의</span>
            </div>
            <div class="preview-row">
              <span class="comp-badge" style="background:${d.badgeRedBg};color:${d.badgeRedColor};">위험</span>
              <span class="comp-badge" style="background:${d.badgeElephantBg};color:${d.badgeElephantColor};">중립</span>
              <span class="comp-badge outline" style="color:${d.badgeOutlineText};border-color:${d.badgeOutlineBorder};">외곽선</span>
            </div>
          </div>
          <div class="preview-block" style="background:${d.panel};">
            <div class="preview-block-title" style="color:${d.textSecondary};">경계 / 텍스트</div>
            <div class="preview-stack tight">
              <div class="preview-item" style="background:${d.surface};border:1px solid ${d.hairline};">
                <span class="preview-name" style="color:${d.textSecondary};">결제 카드</span>
                <span class="preview-value" style="color:${d.textPrimary};">₩124만</span>
              </div>
              <div class="preview-item" style="background:${d.muted};border:1px solid ${d.borderDefault};">
                <span class="preview-name" style="color:${d.textTertiary};">보조 영역</span>
                <span class="preview-value" style="color:${d.textSecondary};">경계 / 텍스트</span>
              </div>
              <div class="preview-item" style="background:transparent;border:1px solid ${d.borderPrimary};">
                <span class="preview-name" style="color:${d.textSecondary};">외곽선 버튼</span>
                <span class="preview-value" style="color:${d.buttonPrimary};">기본</span>
              </div>
            </div>
          </div>
          <div class="preview-block" style="background:${d.panel};">
            <div class="preview-block-title" style="color:${d.textSecondary};">피드백</div>
            <div class="preview-stack">
              <div class="preview-toast" style="background:${d.buttonDarkFill};color:${d.buttonDarkOn};">토스트 · 결제 처리 중</div>
              <div class="preview-alert" style="background:${d.fillCriticalWeak};border-color:${d.borderCritical};color:${d.textCritical};">
                <div class="preview-alert-kicker">오류</div>
                <div class="preview-alert-title">다시 시도해 주세요</div>
              </div>
              <div class="preview-alert" style="background:${d.fillInfoWeak};border-color:${d.borderInfo};color:${d.textInfo};">
                <div class="preview-alert-kicker">정보</div>
                <div class="preview-alert-title">포트폴리오 동기화 완료</div>
              </div>
            </div>
          </div>
          <div class="preview-block" style="background:${d.panel};">
            <div class="preview-block-title" style="color:${d.textSecondary};">표면 위계</div>
            <div class="preview-stack tight">
              <div class="surface-row">
                <span class="surface-chip" style="background:${d.surface};color:${d.textSecondary};border:1px solid ${d.hairline};">표면</span>
                <span class="surface-chip" style="background:${d.panel};color:${d.textSecondary};border:1px solid ${d.hairline};">레이어</span>
                <span class="surface-chip" style="background:${d.muted};color:${d.textPrimary};border:1px solid ${d.hairline};">약한 배경</span>
              </div>
              <div class="preview-mini" style="background:${d.dimmed};color:#fff;">딤드 오버레이 (${d.dimmed})</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

        el.innerHTML = `${renderMode('다크 모드', dark)}${renderMode('라이트 모드', light)}`;
      }

      function buildPaletteMarkdown(
        inputHex,
        greyDark,
        greyLight,
        primaryDark,
        primaryLight,
        surfaces,
        semanticTokens,
        semanticFamilies,
      ) {
        const steps = [
          '50',
          '100',
          '200',
          '300',
          '400',
          '500',
          '600',
          '700',
          '800',
          '900',
        ];
        const tokenMap = Object.fromEntries(
          semanticTokens.map((t) => [t.name, t]),
        );
        const surfaceDark = surfaces.dark;
        const surfaceLight = surfaces.light;
        const roleOrder = [
          'primary',
          'info',
          'positive',
          'warning',
          'critical',
          'error',
          'accent',
          'teal',
          'orange',
          'neutral',
          'blue',
          'green',
          'red',
          'yellow',
          'elephant',
          'dark',
          'danger',
          'button',
        ];
        const targetOrder = [
          'fill',
          'text',
          'border',
          'background',
          'button',
          'badge',
          'state',
        ];

        const row = (name, dark, light) => `| ${name} | ${dark} | ${light} |`;
        const scaleRows = (scaleDark, scaleLight) =>
          steps
            .map((step, i) => row(step, scaleDark[i], scaleLight[i]))
            .join('\n');
        const tokenRow = (name) =>
          row(
            name,
            tokenMap[name] ? tokenMap[name].dark : '-',
            tokenMap[name] ? tokenMap[name].light : '-',
          );
        const componentRows = [
          ['기본 버튼 채움', 'button.primary.fill'],
          ['기본 버튼 약함', 'button.primary.weak'],
          ['위험 버튼 약함', 'button.danger.weak'],
          ['중립 버튼 약함', 'button.neutral.weak'],
          ['기본 버튼 약함 누름', 'button.primary.weakPressed'],
          ['위험 버튼 약함 누름', 'button.danger.weakPressed'],
          ['기본 버튼 외곽선', 'border.primary.default'],
          ['중립 헤어라인 경계', 'border.neutral.hairline'],
          ['딤드 오버레이', 'background.neutral.dimmed'],
          ['위험 배너', 'fill.critical.weak'],
          ['정보 배지', 'badge.blue.background'],
          ['청록 배지', 'badge.teal.background'],
          ['중립 배지', 'badge.elephant.background'],
          ['누름 오버레이', 'state.button.pressedOverlay'],
          ['중립 텍스트', 'text.neutral.primary'],
        ]
          .map(([label, tokenName]) =>
            row(
              label,
              tokenMap[tokenName] ? tokenMap[tokenName].dark : '-',
              tokenMap[tokenName] ? tokenMap[tokenName].light : '-',
            ),
          )
          .join('\n');
        const groupedTokenRows = targetOrder
          .map((target) => {
            const rows = semanticTokens
              .filter((t) => t.target === target)
              .sort((a, b) => {
                const roleA = roleOrder.includes(a.role)
                  ? roleOrder.indexOf(a.role)
                  : 99;
                const roleB = roleOrder.includes(b.role)
                  ? roleOrder.indexOf(b.role)
                  : 99;
                if (roleA !== roleB) return roleA - roleB;
                return a.name.localeCompare(b.name);
              })
              .map((t) => row(t.name, t.dark, t.light))
              .join('\n');
            return `### ${target}\n| 토큰 | 다크 | 라이트 |\n| --- | --- | --- |\n${rows}`;
          })
          .join('\n\n');
        const familyBlocks = semanticFamilies
          .map((f) => {
            const darkSteps = steps
              .map((step, i) => row(step, f.darkScale[i], f.lightScale[i]))
              .join('\n');
            return `### ${f.name} (${f.source}, h ${Math.round(f.hue)}, c ${f.chroma.toFixed(3)})\n| 단계 | 다크 | 라이트 |\n| --- | --- | --- |\n${darkSteps}\n\n- 선택된 시맨틱 단계: 다크 ${steps[f.darkFill.index]} (${f.darkFill.fill}) / 라이트 ${steps[f.lightFill.index]} (${f.lightFill.fill})`;
          })
          .join('\n\n');

        return `# PALETTE.md

입력값: \`${inputHex}\`

## 핵심 토큰
| 토큰 | 다크 | 라이트 |
| --- | --- | --- |
${tokenRow('fill.primary.default')}
${tokenRow('text.neutral.primary')}
${tokenRow('border.neutral.default')}
${tokenRow('background.neutral.base')}
${tokenRow('fill.positive.default')}
${tokenRow('fill.warning.default')}
${tokenRow('fill.critical.default')}

## 중립 스케일
| 단계 | 다크 | 라이트 |
| --- | --- | --- |
${scaleRows(greyDark, greyLight)}

## Primary 스케일
| 단계 | 다크 | 라이트 |
| --- | --- | --- |
${scaleRows(primaryDark, primaryLight)}

## 표면 위계
| 레이어 | 다크 | 라이트 |
| --- | --- | --- |
${row(surfaceDark[0].name, surfaceDark[0].hex, surfaceLight[0].hex)}
${row(surfaceDark[1].name, surfaceDark[1].hex, surfaceLight[1].hex)}
${row(surfaceDark[2].name, surfaceDark[2].hex, surfaceLight[2].hex)}
${row(surfaceDark[3].name, surfaceDark[3].hex, surfaceLight[3].hex)}
${row(surfaceDark[4].name, surfaceDark[4].hex, surfaceLight[4].hex)}
${row(surfaceDark[5].name, surfaceDark[5].hex, surfaceLight[5].hex)}

## 실무 컴포넌트 매핑
| 컴포넌트 | 다크 | 라이트 |
| --- | --- | --- |
${componentRows}

## 조화 보정된 시맨틱 색상군
${familyBlocks}

## 시맨틱 토큰 매트릭스
${groupedTokenRows}

## 사용법
- 기본 스케일 -> 시맨틱 -> 컴포넌트 순서로 사용합니다. raw palette를 컴포넌트에서 직접 쓰지 말고 semantic token을 통해 연결하세요.
- 시맨틱 색상군은 hue는 고정 의미색을 유지하고, primary 영향은 명도/채도 톤 보정으로만 반영됩니다.
- 채움/텍스트/경계/배경과 버튼/배지 별칭을 분리하면 컴포넌트 구현에서 의도 전달이 쉬워집니다.
- 같은 역할이라면 target이 달라도 같은 role을 유지하세요. 예: \`fill.warning.default\` + \`text.warning.default\` + \`border.warning.default\`.

## 실무 팁
1. Primary 강색은 행동 유도 포인트에만 제한적으로 사용하고, 정보 전달은 neutral + semantic text로 분리하세요.
2. Warning/Critical은 먼저 subtle background로 쓰고, 필요할 때만 fill default로 올리면 과한 경고 피로를 줄일 수 있습니다.
3. status role(positive/warning/critical/error/info)은 의미색 hue를 고정하고, 톤 보정만 허용하세요.
4. border는 neutral default를 기본으로 두고 상태 변화에서만 role border를 덮어쓰면 스크린 전체 노이즈가 줄어듭니다.
5. QA 시 다크모드 저밝기 환경에서 warning/critical text 가독성과 fill-primary 버튼 대비를 반드시 재확인하세요.

## CSS Variable Example
\`\`\`css
:root {
  --fill-primary-default: ${tokenMap['fill.primary.default'].light};
  --text-neutral-primary: ${tokenMap['text.neutral.primary'].light};
  --border-neutral-default: ${tokenMap['border.neutral.default'].light};
  --background-neutral-base: ${tokenMap['background.neutral.base'].light};
  --background-warning-subtle: ${tokenMap['background.warning.subtle'].light};
}

[data-theme="dark"] {
  --fill-primary-default: ${tokenMap['fill.primary.default'].dark};
  --text-neutral-primary: ${tokenMap['text.neutral.primary'].dark};
  --border-neutral-default: ${tokenMap['border.neutral.default'].dark};
  --background-neutral-base: ${tokenMap['background.neutral.base'].dark};
  --background-warning-subtle: ${tokenMap['background.warning.subtle'].dark};
}

.button-primary { background: var(--fill-primary-default); }
.list-item { border-color: var(--border-neutral-default); }
.warning-box { background: var(--background-warning-subtle); }
\`\`\`
`;
      }

      // ===== Main =====
      const presetColors = [
        '#3182f6', // Toss Blue
        '#6366f1', // Indigo
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#f43f5e', // Rose
        '#f97316', // Orange
        '#eab308', // Yellow
        '#22c55e', // Green
        '#14b8a6', // Teal
        '#06b6d4', // Cyan
      ];

      function initPresets() {
        const el = document.getElementById('presets');
        el.innerHTML = presetColors
          .map(
            (c) =>
              `<div class="preset" style="background:${c};" data-color="${c}" onclick="setColor('${c}')"></div>`,
          )
          .join('');
      }

      function setColor(hex) {
        document.getElementById('colorPicker').value = hex;
        document.getElementById('hexInput').value = hex;
        document
          .querySelectorAll('.preset')
          .forEach((p) =>
            p.classList.toggle('active', p.dataset.color === hex),
          );
        generate(hex);
      }

      function generate(hex) {
        const [r, g, b] = hexToRgb(hex);
        const [L, C, H] = rgbToOklch(r, g, b);
        const greyDark = generateGreyScale(H, 'dark', C, L);
        const greyLight = generateGreyScale(H, 'light', C, L);
        const primaryDark = generatePrimaryScale(H, C, 'dark', L);
        const primaryLight = generatePrimaryScale(H, C, 'light', L);
        const opDark = generateOpacityScale(H, 'dark');
        const opLight = generateOpacityScale(H, 'light');
        const surfDark = generateSurfaces(H, 'dark', C, L);
        const surfLight = generateSurfaces(H, 'light', C, L);
        const semanticFamilies = generateSemanticFamilies(
          primaryDark,
          primaryLight,
        );
        const semanticTokens = generateSemanticTokens(
          greyDark,
          greyLight,
          semanticFamilies,
          { dark: surfDark, light: surfLight },
        );

        renderScale('greyDark', greyDark, false);
        renderScale('greyLight', greyLight, true);
        renderScale('primaryDark', primaryDark, false);
        renderScale('primaryLight', primaryLight, true);
        renderOpacity('opacityDark', opDark);
        renderOpacity('opacityLight', opLight);
        renderSurfaces('surfacesDark', surfDark);
        renderSurfaces('surfacesLight', surfLight);
        renderSemantic(semanticFamilies);
        renderSemanticTokens(semanticTokens);
        window.__semanticTokens = semanticTokens;
        renderPreview(
          hex,
          greyDark,
          greyLight,
          primaryDark,
          primaryLight,
          { dark: surfDark, light: surfLight },
          semanticTokens,
        );
        const md = buildPaletteMarkdown(
          hex,
          greyDark,
          greyLight,
          primaryDark,
          primaryLight,
          { dark: surfDark, light: surfLight },
          semanticTokens,
          semanticFamilies,
        );
        document.getElementById('paletteMdPreview').textContent = md;
        window.__paletteMd = md;

        // Update opacity bg
        document.getElementById('opacityDark').style.background =
          surfDark[1].hex;
      }

      // Events
      document
        .getElementById('colorPicker')
        .addEventListener('input', (e) => setColor(e.target.value));
      document.getElementById('hexInput').addEventListener('input', (e) => {
        const v = e.target.value;
        if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(v);
      });

      document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-pick-hex]');
        if (!target) return;
        const hex = target.getAttribute('data-pick-hex');
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) setColor(hex);
      });

      document
        .getElementById('copyMdBtn')
        .addEventListener('click', async () => {
          const md = window.__paletteMd || '';
          if (!md) return;
          try {
            await navigator.clipboard.writeText(md);
            document.getElementById('copyMdBtn').textContent = '복사됨';
            setTimeout(() => {
              document.getElementById('copyMdBtn').textContent =
                '마크다운 복사';
            }, 1200);
          } catch (_) {}
        });

      document.getElementById('downloadMdBtn').addEventListener('click', () => {
        const md = window.__paletteMd || '';
        if (!md) return;
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'palette.md';
        a.click();
        URL.revokeObjectURL(a.href);
      });

      const paletteModal = document.getElementById('paletteModal');
      const openMdModalBtn = document.getElementById('openMdModalBtn');
      const closeMdModalBtn = document.getElementById('closeMdModalBtn');
      const tokenFilterEl = document.getElementById('tokenFilter');

      function setTokenFilter(nextFilter) {
        window.__tokenFilter = nextFilter;
        tokenFilterEl.querySelectorAll('[data-token-filter]').forEach((btn) => {
          btn.classList.toggle(
            'active',
            btn.dataset.tokenFilter === nextFilter,
          );
        });
        if (window.__semanticTokens)
          renderSemanticTokens(window.__semanticTokens);
      }

      function openPaletteModal() {
        paletteModal.classList.add('open');
        paletteModal.setAttribute('aria-hidden', 'false');
      }

      function closePaletteModal() {
        paletteModal.classList.remove('open');
        paletteModal.setAttribute('aria-hidden', 'true');
      }

      openMdModalBtn.addEventListener('click', openPaletteModal);
      closeMdModalBtn.addEventListener('click', closePaletteModal);
      paletteModal.addEventListener('click', (e) => {
        if (e.target === paletteModal) closePaletteModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && paletteModal.classList.contains('open'))
          closePaletteModal();
      });
      tokenFilterEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-token-filter]');
        if (!btn) return;
        setTokenFilter(btn.dataset.tokenFilter);
      });

      initPresets();
      setTokenFilter('all');
      setColor('#3182f6');
