      // ===== OKLCH Color Math =====
      function srgbToLinear(c) {
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }
      function linearToSrgb(c) {
        return c <= 0.0031308
          ? 12.92 * c
          : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      }

      function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
      }

      function rgbToHex(r, g, b) {
        const clamp = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
        return (
          '#' +
          [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')
        );
      }

      function isInGamut(r, g, b) {
        return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
      }

      function rgbToOklch(r, g, b) {
        const lr = srgbToLinear(r),
          lg = srgbToLinear(g),
          lb = srgbToLinear(b);
        const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
        const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
        const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
        const l = Math.cbrt(l_),
          m = Math.cbrt(m_),
          s = Math.cbrt(s_);
        const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
        const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
        const bv = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
        const C = Math.sqrt(a * a + bv * bv);
        let H = (Math.atan2(bv, a) * 180) / Math.PI;
        if (H < 0) H += 360;
        return [L, C, H];
      }

      function oklchToRgb(L, C, H) {
        const hRad = (H * Math.PI) / 180;
        const a = C * Math.cos(hRad),
          b = C * Math.sin(hRad);
        const l = L + 0.3963377774 * a + 0.2158037573 * b;
        const m = L - 0.1055613458 * a - 0.0638541728 * b;
        const s = L - 0.0894841775 * a - 1.291485548 * b;
        const l3 = l * l * l,
          m3 = m * m * m,
          s3 = s * s * s;
        const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
        const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
        const bv = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
        return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bv)];
      }

      function oklchToHex(L, C, H) {
        const [r, g, b] = oklchToRgb(L, C, H);
        return rgbToHex(r, g, b);
      }

      function oklchToHexClamped(L, C, H) {
        let c = Math.max(0, C);
        for (let i = 0; i < 24; i += 1) {
          const [r, g, b] = oklchToRgb(L, c, H);
          if (isInGamut(r, g, b)) return rgbToHex(r, g, b);
          c *= 0.92;
        }
        return oklchToHex(L, 0, H);
      }

      function channelLuminance(c) {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      }

      function hexLuminance(hex) {
        const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * 255));
        return (
          0.2126 * channelLuminance(r) +
          0.7152 * channelLuminance(g) +
          0.0722 * channelLuminance(b)
        );
      }

      function contrastRatio(fgHex, bgHex) {
        const L1 = hexLuminance(fgHex);
        const L2 = hexLuminance(bgHex);
        const maxL = Math.max(L1, L2);
        const minL = Math.min(L1, L2);
        return (maxL + 0.05) / (minL + 0.05);
      }

      function apcaContrastLc(txtHex, bgHex) {
        const mainTRC = 2.4;
        const normBG = 0.56;
        const normTXT = 0.57;
        const revTXT = 0.62;
        const revBG = 0.65;
        const blkThrs = 0.022;
        const blkClmp = 1.414;
        const scaleBoW = 1.14;
        const scaleWoB = 1.14;
        const loBoWoffset = 0.027;
        const loWoBoffset = 0.027;
        const deltaYmin = 0.0005;
        const loClip = 0.1;

        const toY = (hex) => {
          const [r8, g8, b8] = hexToRgb(hex).map((v) => Math.round(v * 255));
          const rs = Math.pow(r8 / 255, mainTRC);
          const gs = Math.pow(g8 / 255, mainTRC);
          const bs = Math.pow(b8 / 255, mainTRC);
          let y = rs * 0.2126729 + gs * 0.7151522 + bs * 0.072175;
          if (y <= blkThrs) y += Math.pow(blkThrs - y, blkClmp);
          return y;
        };

        const txtY = toY(txtHex);
        const bgY = toY(bgHex);
        if (Math.abs(bgY - txtY) < deltaYmin) return 0;

        let sapc = 0;
        if (bgY > txtY) {
          sapc = (Math.pow(bgY, normBG) - Math.pow(txtY, normTXT)) * scaleBoW;
          if (sapc < loClip) return 0;
          return (sapc - loBoWoffset) * 100;
        }

        sapc = (Math.pow(bgY, revBG) - Math.pow(txtY, revTXT)) * scaleWoB;
        if (sapc > -loClip) return 0;
        return (sapc + loWoBoffset) * 100;
      }

      function rgbaFromHex(hex, alpha) {
        const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * 255));
        return `rgba(${r},${g},${b},${alpha})`;
      }

      function parseCssColor(value) {
        if (value === 'transparent') {
          return { hex: '#000000', alpha: 0, format: 'transparent' };
        }
        if (/^#[0-9a-fA-F]{6}$/.test(value)) {
          return { hex: value.toLowerCase(), alpha: 1, format: 'hex' };
        }
        const rgba = value.match(
          /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/,
        );
        if (!rgba) return null;
        const [, r, g, b, alpha] = rgba;
        return {
          hex: rgbToHex(Number(r) / 255, Number(g) / 255, Number(b) / 255),
          alpha: Number(alpha),
          format: 'rgba',
        };
      }

      function formatCssColor(hex, alpha, referenceFormat) {
        const roundedAlpha = Math.round(alpha * 1000) / 1000;
        if (referenceFormat === 'transparent' && roundedAlpha <= 0.001) {
          return 'transparent';
        }
        if (referenceFormat === 'hex' && roundedAlpha >= 0.999) return hex;
        return rgbaFromHex(hex, roundedAlpha);
      }

      function mixCssColorValue(baseValue, referenceValue, weight) {
        const base = parseCssColor(baseValue);
        const reference = parseCssColor(referenceValue);
        if (!base || !reference) {
          return weight >= 0.5 ? referenceValue : baseValue;
        }
        const mixedHex = mixOklchHex(base.hex, reference.hex, weight);
        const mixedAlpha = base.alpha * (1 - weight) + reference.alpha * weight;
        return formatCssColor(mixedHex, mixedAlpha, reference.format);
      }

      function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
      }

      function findAccessibleFill(
        hue,
        chroma,
        startL,
        minRatio = 4.5,
        minApca = 60,
        minL = 0.28,
        maxL = 0.82,
      ) {
        const textCandidates = ['#ffffff', '#0b1220'];
        let best = null;
        let fallback = null;

        for (let i = 0; i <= 60; i += 1) {
          const L = minL + ((maxL - minL) * i) / 60;
          const fill = oklchToHexClamped(L, chroma, hue);
          for (const text of textCandidates) {
            const ratio = contrastRatio(text, fill);
            const apca = Math.abs(apcaContrastLc(text, fill));
            if (
              !fallback ||
              ratio + apca * 0.02 > fallback.ratio + fallback.apca * 0.02
            ) {
              fallback = { fill, text, ratio, apca, L };
            }
            if (ratio < minRatio || apca < minApca) continue;

            const distance = Math.abs(L - startL);
            if (
              !best ||
              distance < best.distance ||
              (distance === best.distance &&
                ratio + apca * 0.02 > best.ratio + best.apca * 0.02)
            ) {
              best = { fill, text, ratio, apca, L, distance };
            }
          }
        }

        if (best) return best;
        return (
          fallback || {
            fill: oklchToHexClamped(startL, chroma, hue),
            text: '#ffffff',
            ratio: 1,
            apca: 0,
            L: startL,
          }
        );
      }

      // ===== Palette Generation =====
      function generateScale(hue, chromaBase, lightSteps) {
        return lightSteps.map(([L, cMul]) => {
          const C = chromaBase * cMul;
          return oklchToHexClamped(L, C, hue);
        });
      }

      function tintReferenceScale(referenceScale, hue, tintChroma, mode) {
        const multipliers =
          mode === 'dark'
            ? [1.15, 1.08, 1.0, 0.92, 0.84, 0.68, 0.52, 0.38, 0.24, 0.08]
            : [0.1, 0.16, 0.24, 0.34, 0.46, 0.6, 0.76, 0.92, 1.06, 1.22];
        return referenceScale.map((hex, i) => {
          const [L] = toOklch(hex);
          const C = clamp(tintChroma * multipliers[i], 0, 0.02);
          return oklchToHexClamped(L, C, hue);
        });
      }

      function generateGreyScale(
        hue,
        mode,
        sourceChroma = null,
        sourceLightness = null,
      ) {
        const affinity = referenceAffinity(hue, sourceChroma, sourceLightness);
        const tintChromaBase =
          sourceChroma == null
            ? 0.008
            : clamp(0.005 + sourceChroma * 0.02, 0.006, 0.011);
        const referenceScale =
          mode === 'dark'
            ? TOSS_REFERENCE_SCALES.grey.dark
            : TOSS_REFERENCE_SCALES.grey.light;
        const generatedScale = tintReferenceScale(
          referenceScale,
          hue,
          tintChromaBase,
          mode,
        );
        return generatedScale.map((hex, i) =>
          mixOklchHex(hex, referenceScale[i], affinity),
        );
      }

      function generatePrimaryScale(hue, chroma, mode, sourceLightness = null) {
        const referenceScale =
          mode === 'dark'
            ? TOSS_REFERENCE_SCALES.blue.dark
            : TOSS_REFERENCE_SCALES.blue.light;
        const [rr, rg, rb] = hexToRgb(TOSS_PRIMARY_REFERENCE_HEX);
        const [refL, refC, refH] = rgbToOklch(rr, rg, rb);
        const dH = signedHueDelta(refH, hue);
        const dC = chroma - refC;
        const dL = (sourceLightness == null ? refL : sourceLightness) - refL;

        // Keep all primaries on a similar tone curve so Toss blue does not appear
        // systematically brighter than other hues in the same UI layout.
        const normalizedLShift = clamp(
          dL * (mode === 'dark' ? 0.34 : 0.3),
          -0.022,
          0.022,
        );

        return referenceScale.map((hex, i) => {
          const [L, C, H] = toOklch(hex);
          const distance = Math.abs(i - 5);
          const lWeight = clamp(1 - distance * 0.11, 0.42, 1);
          const cWeight = clamp(1 - distance * 0.1, 0.35, 1);
          const nextL = clamp(
            L + normalizedLShift * lWeight,
            mode === 'dark' ? 0.2 : 0.14,
            mode === 'dark' ? 0.96 : 0.98,
          );
          const nextC = clamp(C + dC * cWeight, 0.01, 0.3);
          return oklchToHexClamped(nextL, nextC, normalizeHue(H + dH));
        });
      }

      function generateOpacityScale(hue, mode) {
        const [r, g, b] = oklchToRgb(0.88, 0.01, hue);
        const ri = Math.round(r * 255),
          gi = Math.round(g * 255),
          bi = Math.round(b * 255);
        const opacities =
          mode === 'dark'
            ? [0.05, 0.11, 0.19, 0.27, 0.36, 0.47, 0.6, 0.75, 0.89, 1.0]
            : [0.02, 0.05, 0.1, 0.18, 0.31, 0.46, 0.58, 0.7, 0.8, 0.91];

        if (mode === 'dark') {
          return opacities.map((a) => `rgba(${ri},${gi},${bi},${a})`);
        } else {
          const [dr, dg, db] = oklchToRgb(0.15, 0.01, hue);
          const dri = Math.round(dr * 255),
            dgi = Math.round(dg * 255),
            dbi = Math.round(db * 255);
          return opacities.map((a) => `rgba(${dri},${dgi},${dbi},${a})`);
        }
      }

      function generateSurfaces(
        hue,
        mode,
        sourceChroma = null,
        sourceLightness = null,
      ) {
        const affinity = referenceAffinity(hue, sourceChroma, sourceLightness);
        const tint =
          sourceChroma == null
            ? 0.005
            : clamp(0.0035 + sourceChroma * 0.012, 0.004, 0.008);
        if (mode === 'dark') {
          const refs = [
            '#202027',
            '#17171c',
            '#202027',
            '#2c2c35',
            '#2c2c35',
            '#101013',
          ];
          const names = [
            '스크린',
            '앱',
            '표면',
            '레이어',
            '플로트',
            '그레이 배경',
          ];
          return refs.map((hex, i) => {
            const [L] = toOklch(hex);
            const cMul = [0.55, 0.65, 0.62, 0.72, 0.75, 0.48][i];
            const generatedHex = oklchToHexClamped(L, tint * cMul, hue);
            return {
              name: names[i],
              hex: mixOklchHex(generatedHex, hex, affinity),
            };
          });
        }
        const refs = [
          '#f6f7f9',
          '#ffffff',
          '#ffffff',
          '#ffffff',
          '#ffffff',
          '#f2f4f6',
        ];
        const names = ['스크린', '앱', '표면', '레이어', '플로트', '그레이 배경'];
        return refs.map((hex, i) => {
          if (hex === '#ffffff') return { name: names[i], hex };
          const [L] = toOklch(hex);
          const cMul = [0.35, 0, 0, 0, 0, 0.45][i];
          const generatedHex = oklchToHexClamped(L, tint * cMul, hue);
          return {
            name: names[i],
            hex: mixOklchHex(generatedHex, hex, affinity),
          };
        });
      }

      const TOSS_REFERENCE_SCALES = {
        blue: {
          light: [
            '#e8f3ff',
            '#c9e2ff',
            '#90c2ff',
            '#64a8ff',
            '#4593fc',
            '#3182f6',
            '#2272eb',
            '#1b64da',
            '#1957c2',
            '#194aa6',
          ],
          dark: [
            '#202c4d',
            '#23386a',
            '#25478c',
            '#265ab3',
            '#2970d9',
            '#3485fa',
            '#449bff',
            '#61b0ff',
            '#8fcdff',
            '#c8e7ff',
          ],
        },
        green: {
          light: [
            '#f0faf6',
            '#aeefd5',
            '#76e4b8',
            '#3fd599',
            '#15c47e',
            '#03b26c',
            '#02a262',
            '#029359',
            '#028450',
            '#027648',
          ],
          dark: [
            '#153729',
            '#135338',
            '#136d47',
            '#138a59',
            '#13a065',
            '#16bb76',
            '#26cf88',
            '#4ee4a6',
            '#82f6c5',
            '#ccffea',
          ],
        },
        red: {
          light: [
            '#ffeeee',
            '#ffd4d6',
            '#feafb4',
            '#fb8890',
            '#f66570',
            '#f04452',
            '#e42939',
            '#d22030',
            '#bc1b2a',
            '#a51926',
          ],
          dark: [
            '#3c2020',
            '#562025',
            '#7a242d',
            '#9e2733',
            '#ca2f3d',
            '#f04251',
            '#fa616d',
            '#fe818b',
            '#ffa8ad',
            '#ffd1d3',
          ],
        },
        yellow: {
          light: [
            '#fff9e7',
            '#ffefbf',
            '#ffe69b',
            '#ffdd78',
            '#ffd158',
            '#ffc342',
            '#ffb331',
            '#faa131',
            '#ee8f11',
            '#dd7d02',
          ],
          dark: [
            '#3d2d1a',
            '#724c1e',
            '#b56f1d',
            '#eb8b1e',
            '#ffa126',
            '#ffb134',
            '#ffc259',
            '#ffd68a',
            '#ffe5b2',
            '#fff1d4',
          ],
        },
        purple: {
          light: [
            '#f9f0fc',
            '#edccf8',
            '#da9bef',
            '#c770e4',
            '#b44bd7',
            '#a234c7',
            '#9128b4',
            '#8222a2',
            '#73228e',
            '#65237b',
          ],
          dark: [
            '#3f2447',
            '#522361',
            '#66247b',
            '#7b2595',
            '#962fb5',
            '#ae3dd1',
            '#c353e5',
            '#d77cf2',
            '#eaacfc',
            '#f6d9ff',
          ],
        },
        teal: {
          light: [
            '#edf8f8',
            '#bce9e9',
            '#89d8d8',
            '#58c7c7',
            '#30b6b6',
            '#18a5a5',
            '#109595',
            '#0c8585',
            '#097575',
            '#076565',
          ],
          dark: [
            '#203537',
            '#224e51',
            '#226368',
            '#247e85',
            '#26939a',
            '#2eaab2',
            '#43bec7',
            '#65d4dc',
            '#9be8ee',
            '#d6fcff',
          ],
        },
        orange: {
          light: [
            '#fff3e0',
            '#ffe0b0',
            '#ffcd80',
            '#ffbd51',
            '#ffa927',
            '#fe9800',
            '#fb8800',
            '#f57800',
            '#ed6700',
            '#e45600',
          ],
          dark: [
            '#3d2500',
            '#563200',
            '#804600',
            '#a85f00',
            '#cf7200',
            '#f18600',
            '#fd9528',
            '#ffa861',
            '#ffc39e',
            '#ffe4d6',
          ],
        },
        grey: {
          light: [
            '#f9fafb',
            '#f2f4f6',
            '#e5e8eb',
            '#d1d6db',
            '#b0b8c1',
            '#8b95a1',
            '#6b7684',
            '#4e5968',
            '#333d4b',
            '#191f28',
          ],
          dark: [
            '#202027',
            '#2c2c35',
            '#3c3c47',
            '#4d4d59',
            '#62626d',
            '#7e7e87',
            '#9e9ea4',
            '#c3c3c6',
            '#e4e4e5',
            '#ffffff',
          ],
        },
      };

      function normalizeHue(h) {
        const mod = h % 360;
        return mod < 0 ? mod + 360 : mod;
      }

      function signedHueDelta(from, to) {
        let d = normalizeHue(to) - normalizeHue(from);
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return d;
      }

      function roleReferenceFamily(role) {
        const map = {
          info: 'blue',
          positive: 'green',
          warning: 'yellow',
          critical: 'red',
          accent: 'purple',
          teal: 'teal',
          orange: 'orange',
        };
        return map[role] || 'blue';
      }

      const TOSS_PRIMARY_REFERENCE_HEX = '#3182f6';
      const ROLE_TONE_CALIBRATION = {
        info: { lMix: 0.32, cMix: 0.22, cMaxShift: 0.026 },
        positive: { lMix: 0.34, cMix: 0.2, cMaxShift: 0.024 },
        warning: { lMix: 0.28, cMix: 0.14, cMaxShift: 0.018 },
        critical: { lMix: 0.3, cMix: 0.16, cMaxShift: 0.02 },
        accent: { lMix: 0.3, cMix: 0.24, cMaxShift: 0.028 },
        teal: { lMix: 0.3, cMix: 0.2, cMaxShift: 0.024 },
        orange: { lMix: 0.28, cMix: 0.18, cMaxShift: 0.022 },
      };
      const TDS_REFERENCE_SEMANTIC_TOKENS = {
        'button.primary.fill': {
          dark: '#3485fa',
          light: '#3182f6',
          darkText: '#ffffff',
          lightText: '#ffffff',
        },
        'button.primary.weak': {
          dark: 'rgba(217,217,255,0.11)',
          light: '#e8f3ff',
          darkText: '#449bff',
          lightText: '#2272eb',
        },
        'button.danger.weak': {
          dark: 'rgba(217,217,255,0.11)',
          light: '#ffeeee',
          darkText: '#fa616d',
          lightText: '#e42939',
        },
        'button.dark.fill': {
          dark: '#4d4d59',
          light: '#4e5968',
          darkText: '#ffffff',
          lightText: '#ffffff',
        },
        'button.neutral.weak': {
          dark: 'rgba(217,217,255,0.11)',
          light: '#f2f4f6',
          darkText: '#c3c3c6',
          lightText: '#4e5968',
        },
        'button.light.weak': {
          dark: 'rgba(217,217,255,0.11)',
          light: 'rgba(222,222,255,0.19)',
          darkText: '#ffffff',
          lightText: '#ffffff',
        },
        'button.primary.weakPressed': {
          dark: 'rgba(217,217,255,0.11)',
          light: 'rgba(49,130,246,0.26)',
        },
        'button.danger.weakPressed': {
          dark: 'rgba(217,217,255,0.11)',
          light: 'rgba(244,67,54,0.26)',
        },
        'button.neutral.weakPressed': {
          dark: 'rgba(217,217,255,0.11)',
          light: 'rgba(78,89,104,0.26)',
        },
        'button.light.weakPressed': {
          dark: 'rgba(217,217,255,0.11)',
          light: 'rgba(255,255,255,0.26)',
        },
        'state.button.pressedOverlay': {
          dark: 'rgba(0,0,0,0.26)',
          light: 'transparent',
        },
        'badge.blue.color': { dark: '#4593fc', light: '#1b64da' },
        'badge.blue.background': {
          dark: 'rgba(69,147,252,0.16)',
          light: 'rgba(49,130,246,0.16)',
        },
        'badge.teal.color': { dark: '#30b6b6', light: '#0c8585' },
        'badge.teal.background': {
          dark: 'rgba(38,157,166,0.16)',
          light: 'rgba(0,129,138,0.16)',
        },
        'badge.green.color': { dark: '#15c47e', light: '#029359' },
        'badge.green.background': {
          dark: 'rgba(21,196,126,0.16)',
          light: 'rgba(2,162,98,0.16)',
        },
        'badge.red.color': { dark: '#f66570', light: '#d22030' },
        'badge.red.background': {
          dark: 'rgba(239,83,80,0.16)',
          light: 'rgba(244,67,54,0.16)',
        },
        'badge.yellow.color': { dark: '#faa131', light: '#dd7d02' },
        'badge.yellow.background': {
          dark: 'rgba(255,209,88,0.16)',
          light: 'rgba(255,179,49,0.16)',
        },
        'badge.elephant.color': { dark: '#c3c3c6', light: '#4e5968' },
        'badge.elephant.background': {
          dark: 'rgba(195,195,198,0.16)',
          light: 'rgba(78,89,104,0.16)',
        },
      };

      function toOklch(hex) {
        const [r, g, b] = hexToRgb(hex);
        return rgbToOklch(r, g, b);
      }

      function mixValue(a, b, t) {
        return a + (b - a) * t;
      }

      function mixHue(a, b, t) {
        return normalizeHue(a + signedHueDelta(a, b) * t);
      }

      function mixOklchHex(fromHex, toHex, t) {
        if (t <= 0) return fromHex;
        if (t >= 1) return toHex;
        const [aL, aC, aH] = toOklch(fromHex);
        const [bL, bC, bH] = toOklch(toHex);
        return oklchToHexClamped(
          mixValue(aL, bL, t),
          mixValue(aC, bC, t),
          mixHue(aH, bH, t),
        );
      }

      function referenceAffinity(
        hue,
        sourceChroma = null,
        sourceLightness = null,
      ) {
        const [rr, rg, rb] = hexToRgb(TOSS_PRIMARY_REFERENCE_HEX);
        const [refL, refC, refH] = rgbToOklch(rr, rg, rb);
        const hueGap = Math.abs(signedHueDelta(refH, hue)) / 36;
        const chromaGap =
          sourceChroma == null ? 0 : Math.abs(sourceChroma - refC) / 0.08;
        const lightnessGap =
          sourceLightness == null ? 0 : Math.abs(sourceLightness - refL) / 0.08;
        const distance = Math.sqrt(
          hueGap * hueGap + chromaGap * chromaGap + lightnessGap * lightnessGap,
        );
        return clamp(1 - distance, 0, 1);
      }

      function buildPrimaryToneDeltas(primaryScale, referencePrimaryScale) {
        return primaryScale.map((hex, i) => {
          const [Lp, Cp] = toOklch(hex);
          const [Lr, Cr] = toOklch(referencePrimaryScale[i]);
          return {
            dL: clamp(Lp - Lr, -0.06, 0.06),
            dC: clamp(Cp - Cr, -0.05, 0.05),
          };
        });
      }

      function applyToneCalibrationToScale(referenceScale, toneDeltas, role) {
        const cfg = ROLE_TONE_CALIBRATION[role] || {
          lMix: 0.3,
          cMix: 0.18,
          cMaxShift: 0.022,
        };
        return referenceScale.map((hex, i) => {
          const delta = toneDeltas[i] || { dL: 0, dC: 0 };
          if (Math.abs(delta.dL) < 1e-6 && Math.abs(delta.dC) < 1e-6)
            return hex;
          const [L, C, H] = toOklch(hex);
          const nextL = clamp(L + delta.dL * cfg.lMix, 0.02, 0.99);
          const cCandidate = C + delta.dC * cfg.cMix;
          const nextC = clamp(
            cCandidate,
            Math.max(0, C - cfg.cMaxShift),
            Math.min(0.28, C + cfg.cMaxShift),
          );
          if (Math.abs(nextL - L) < 1e-6 && Math.abs(nextC - C) < 1e-6)
            return hex;
          return oklchToHexClamped(nextL, nextC, H);
        });
      }

      function pickScaleStepWithText(scale, stepIndex) {
        const index = clamp(stepIndex, 0, scale.length - 1);
        const fill = scale[index];
        const pair = pickAccessiblePair(fill, 4.5, 60);
        return {
          index,
          fill,
          text: pair.text,
          ratio: pair.ratio,
          apca: pair.apca,
        };
      }

      function pickTextToneFromScale(
        scale,
        bgHex,
        preferLighter,
        minRatio = 4.5,
        minApca = 60,
      ) {
        const candidates = scale.map((hex, index) => ({
          index,
          hex,
          lum: hexLuminance(hex),
          ratio: contrastRatio(hex, bgHex),
          apca: Math.abs(apcaContrastLc(hex, bgHex)),
        }));
        const strict = candidates.filter(
          (c) => c.ratio >= minRatio && c.apca >= minApca,
        );
        if (strict.length) {
          strict.sort((a, b) =>
            preferLighter ? b.lum - a.lum : a.lum - b.lum,
          );
          return strict[0];
        }
        return candidates.sort(
          (a, b) => b.ratio + b.apca * 0.02 - (a.ratio + a.apca * 0.02),
        )[0];
      }

      function generateSemanticFamilies(primaryDarkScale, primaryLightScale) {
        const [br, bg, bb] = hexToRgb(TOSS_PRIMARY_REFERENCE_HEX);
        const [baselineL, baselineC, baselineH] = rgbToOklch(br, bg, bb);
        const baselinePrimaryDark = generatePrimaryScale(
          baselineH,
          baselineC,
          'dark',
          baselineL,
        );
        const baselinePrimaryLight = generatePrimaryScale(
          baselineH,
          baselineC,
          'light',
          baselineL,
        );
        const roles = [
          { role: 'primary', name: 'Primary' },
          { role: 'info', name: 'Info' },
          { role: 'positive', name: 'Positive' },
          { role: 'warning', name: 'Warning' },
          { role: 'critical', name: 'Critical' },
          { role: 'accent', name: 'Accent' },
          { role: 'teal', name: 'Teal' },
          { role: 'orange', name: 'Orange' },
        ];
        const primaryToneDelta = {
          dark: buildPrimaryToneDeltas(primaryDarkScale, baselinePrimaryDark),
          light: buildPrimaryToneDeltas(
            primaryLightScale,
            baselinePrimaryLight,
          ),
        };

        return roles.map((item) => {
          let darkScale = [];
          let lightScale = [];
          let source = '기준 보정';
          const preferredStepByRole = {
            primary: 5,
            info: 5,
            positive: 5,
            warning: 5,
            critical: 5,
            accent: 5,
          };

          if (item.role === 'primary') {
            darkScale = [...primaryDarkScale];
            lightScale = [...primaryLightScale];
            source = 'primary 동적';
          } else {
            const familyKey = roleReferenceFamily(item.role);
            darkScale = applyToneCalibrationToScale(
              TOSS_REFERENCE_SCALES[familyKey].dark,
              primaryToneDelta.dark,
              item.role,
            );
            lightScale = applyToneCalibrationToScale(
              TOSS_REFERENCE_SCALES[familyKey].light,
              primaryToneDelta.light,
              item.role,
            );
            source = `${familyKey} 기준 보정`;
          }

          const preferredStep = preferredStepByRole[item.role] || 5;
          const darkFill = pickScaleStepWithText(darkScale, preferredStep);
          const lightFill = pickScaleStepWithText(lightScale, preferredStep);
          const [lr, lg, lb] = hexToRgb(lightScale[5]);
          const [, chroma, hue] = rgbToOklch(lr, lg, lb);
          return {
            role: item.role,
            name: item.name,
            hue,
            chroma,
            darkScale,
            lightScale,
            darkFill,
            lightFill,
            source,
          };
        });
      }

      function pickAccessiblePair(fillHex, minRatio = 4.5, minApca = 60) {
        const whiteRatio = contrastRatio('#ffffff', fillHex);
        const darkRatio = contrastRatio('#0b1220', fillHex);
        const whiteApca = Math.abs(apcaContrastLc('#ffffff', fillHex));
        const darkApca = Math.abs(apcaContrastLc('#0b1220', fillHex));
        const candidates = [
          { text: '#ffffff', ratio: whiteRatio, apca: whiteApca },
          { text: '#0b1220', ratio: darkRatio, apca: darkApca },
        ];

        const strict = candidates
          .filter((c) => c.ratio >= minRatio && c.apca >= minApca)
          .sort((a, b) => b.ratio + b.apca * 0.02 - (a.ratio + a.apca * 0.02));
        if (strict.length) return strict[0];

        const relaxed = candidates
          .filter((c) => c.ratio >= minRatio || c.apca >= minApca)
          .sort((a, b) => b.ratio + b.apca * 0.02 - (a.ratio + a.apca * 0.02));
        if (relaxed.length) return relaxed[0];

        return candidates.sort((a, b) => b.ratio - a.ratio)[0];
      }

      function makeSemanticToken(
        target,
        role,
        variant,
        dark,
        light,
        forceDarkText,
        forceLightText,
      ) {
        const name = `${target}.${role}.${variant}`;
        const darkPair = dark.startsWith('rgba')
          ? { text: '#ffffff', ratio: null, apca: null }
          : pickAccessiblePair(dark, 4.5, 60);
        const lightPair = light.startsWith('rgba')
          ? { text: '#0b1220', ratio: null, apca: null }
          : pickAccessiblePair(light, 4.5, 60);
        return {
          name,
          target,
          role,
          variant,
          dark,
          light,
          darkText: forceDarkText || darkPair.text,
          lightText: forceLightText || lightPair.text,
          darkRatio: darkPair.ratio,
          lightRatio: lightPair.ratio,
          darkApca: darkPair.apca ?? null,
          lightApca: lightPair.apca ?? null,
        };
      }

      function generateSemanticTokens(
        greyDark,
        greyLight,
        semanticFamilies,
        surfaces,
      ) {
        const familyMap = Object.fromEntries(
          semanticFamilies.map((f) => [f.role, f]),
        );
        const roleScaleHex = (role, mode, index, preferLightScale = false) => {
          const family = familyMap[role];
          if (!family) return '#000000';
          if (mode === 'dark' && preferLightScale)
            return family.lightScale[index];
          return mode === 'dark'
            ? family.darkScale[index]
            : family.lightScale[index];
        };
        const roleOrder = [
          'primary',
          'info',
          'positive',
          'warning',
          'critical',
          'accent',
          'teal',
          'orange',
        ];
        const roleTokens = roleOrder.flatMap((role) => {
          const family = familyMap[role];
          if (!family) return [];
          const darkTextTone = pickTextToneFromScale(
            family.darkScale,
            surfaces.dark[1].hex,
            true,
            4.5,
            60,
          );
          const lightTextTone = pickTextToneFromScale(
            family.lightScale,
            surfaces.light[1].hex,
            false,
            4.5,
            60,
          );
          return [
            makeSemanticToken(
              'fill',
              role,
              'default',
              family.darkFill.fill,
              family.lightFill.fill,
              family.darkFill.text,
              family.lightFill.text,
            ),
            makeSemanticToken(
              'fill',
              role,
              'weak',
              rgbaFromHex(family.darkFill.fill, 0.22),
              rgbaFromHex(family.lightFill.fill, 0.14),
            ),
            makeSemanticToken(
              'text',
              role,
              'default',
              darkTextTone.hex,
              lightTextTone.hex,
            ),
            makeSemanticToken(
              'border',
              role,
              'default',
              rgbaFromHex(family.darkFill.fill, 0.56),
              rgbaFromHex(family.lightFill.fill, 0.44),
            ),
            makeSemanticToken(
              'background',
              role,
              'subtle',
              rgbaFromHex(family.darkFill.fill, 0.2),
              rgbaFromHex(family.lightFill.fill, 0.1),
            ),
          ];
        });

        const neutralTokens = [
          makeSemanticToken(
            'background',
            'neutral',
            'base',
            surfaces.dark[1].hex,
            surfaces.light[1].hex,
          ),
          makeSemanticToken(
            'background',
            'neutral',
            'elevated',
            surfaces.dark[2].hex,
            surfaces.light[2].hex,
          ),
          makeSemanticToken(
            'background',
            'neutral',
            'muted',
            surfaces.dark[3].hex,
            surfaces.light[5].hex,
          ),
          makeSemanticToken(
            'background',
            'neutral',
            'dimmed',
            'rgba(0,0,0,0.56)',
            'rgba(0,0,0,0.2)',
          ),
          makeSemanticToken(
            'fill',
            'neutral',
            'default',
            greyDark[3],
            greyLight[8],
          ),
          makeSemanticToken(
            'text',
            'neutral',
            'primary',
            greyDark[9],
            greyLight[9],
          ),
          makeSemanticToken(
            'text',
            'neutral',
            'secondary',
            greyDark[7],
            greyLight[7],
          ),
          makeSemanticToken(
            'text',
            'neutral',
            'tertiary',
            greyDark[6],
            greyLight[6],
          ),
          makeSemanticToken(
            'border',
            'neutral',
            'default',
            rgbaFromHex(greyDark[8], 0.34),
            rgbaFromHex(greyLight[8], 0.28),
          ),
          makeSemanticToken(
            'border',
            'neutral',
            'subtle',
            rgbaFromHex(greyDark[7], 0.22),
            rgbaFromHex(greyLight[7], 0.18),
          ),
          makeSemanticToken(
            'border',
            'neutral',
            'hairline',
            greyDark[2],
            greyLight[2],
          ),
        ];

        const baseTokens = [...neutralTokens, ...roleTokens];
        const tokenMap = Object.fromEntries(baseTokens.map((t) => [t.name, t]));
        const pick = (
          name,
          fallbackDark = '#000000',
          fallbackLight = '#000000',
        ) => {
          const found = tokenMap[name];
          if (found) return found;
          return { dark: fallbackDark, light: fallbackLight };
        };
        const aliasToken = (
          target,
          role,
          variant,
          sourceName,
          darkText,
          lightText,
        ) => {
          const source = pick(sourceName);
          return calibratedToken(
            target,
            role,
            variant,
            source.dark,
            source.light,
            darkText,
            lightText,
          );
        };
        const [primaryL, primaryC, primaryH] = toOklch(
          roleScaleHex('primary', 'light', 5),
        );
        const tdsReferenceWeight = referenceAffinity(
          primaryH,
          primaryC,
          primaryL,
        );
        const calibratedToken = (
          target,
          role,
          variant,
          dark,
          light,
          darkText,
          lightText,
        ) => {
          const name = `${target}.${role}.${variant}`;
          const reference = TDS_REFERENCE_SEMANTIC_TOKENS[name];
          if (!reference) {
            return makeSemanticToken(
              target,
              role,
              variant,
              dark,
              light,
              darkText,
              lightText,
            );
          }
          return makeSemanticToken(
            target,
            role,
            variant,
            mixCssColorValue(dark, reference.dark, tdsReferenceWeight),
            mixCssColorValue(light, reference.light, tdsReferenceWeight),
            reference.darkText
              ? mixCssColorValue(
                  darkText || reference.darkText,
                  reference.darkText,
                  tdsReferenceWeight,
                )
              : darkText,
            reference.lightText
              ? mixCssColorValue(
                  lightText || reference.lightText,
                  reference.lightText,
                  tdsReferenceWeight,
                )
              : lightText,
          );
        };

        const tossLikeTokens = [
          aliasToken(
            'button',
            'primary',
            'fill',
            'fill.primary.default',
            '#ffffff',
            '#ffffff',
          ),
          calibratedToken(
            'button',
            'primary',
            'weak',
            rgbaFromHex(roleScaleHex('primary', 'dark', 5), 0.2),
            rgbaFromHex(roleScaleHex('primary', 'light', 0), 0.16),
            roleScaleHex('primary', 'dark', 7),
            roleScaleHex('primary', 'light', 6),
          ),
          calibratedToken(
            'button',
            'danger',
            'weak',
            rgbaFromHex(roleScaleHex('critical', 'dark', 5), 0.18),
            rgbaFromHex(roleScaleHex('critical', 'light', 0), 0.14),
            roleScaleHex('critical', 'dark', 7),
            roleScaleHex('critical', 'light', 7),
          ),
          calibratedToken(
            'button',
            'dark',
            'fill',
            '#4d4d59',
            '#4e5968',
            '#ffffff',
            '#ffffff',
          ),
          calibratedToken(
            'button',
            'neutral',
            'weak',
            rgbaFromHex(greyDark[1], 0.11),
            rgbaFromHex(greyLight[1], 0.12),
            greyDark[7],
            greyLight[7],
          ),
          calibratedToken(
            'button',
            'light',
            'weak',
            'rgba(217,217,255,0.11)',
            'rgba(222,222,255,0.19)',
            '#ffffff',
            '#ffffff',
          ),
          calibratedToken(
            'button',
            'primary',
            'weakPressed',
            rgbaFromHex(roleScaleHex('primary', 'dark', 5), 0.33),
            rgbaFromHex(roleScaleHex('primary', 'light', 5), 0.26),
            roleScaleHex('primary', 'dark', 8),
            roleScaleHex('primary', 'light', 7),
          ),
          calibratedToken(
            'button',
            'danger',
            'weakPressed',
            rgbaFromHex(roleScaleHex('critical', 'dark', 5), 0.33),
            rgbaFromHex(roleScaleHex('critical', 'light', 5), 0.26),
            roleScaleHex('critical', 'dark', 8),
            roleScaleHex('critical', 'light', 8),
          ),
          calibratedToken(
            'button',
            'neutral',
            'weakPressed',
            'rgba(222,222,255,0.19)',
            'rgba(78,89,104,0.26)',
            greyDark[8],
            greyLight[8],
          ),
          calibratedToken(
            'button',
            'light',
            'weakPressed',
            'rgba(217,217,255,0.11)',
            'rgba(255,255,255,0.26)',
            '#ffffff',
            '#ffffff',
          ),
          calibratedToken(
            'state',
            'button',
            'pressedOverlay',
            'rgba(0,0,0,0.26)',
            'transparent',
          ),

          calibratedToken(
            'badge',
            'blue',
            'color',
            roleScaleHex('info', 'dark', 4, true),
            roleScaleHex('info', 'light', 7),
          ),
          calibratedToken(
            'badge',
            'blue',
            'background',
            rgbaFromHex(roleScaleHex('info', 'dark', 4, true), 0.16),
            rgbaFromHex(roleScaleHex('info', 'light', 5), 0.16),
          ),
          calibratedToken(
            'badge',
            'teal',
            'color',
            roleScaleHex('teal', 'dark', 4, true),
            roleScaleHex('teal', 'light', 7),
          ),
          calibratedToken(
            'badge',
            'teal',
            'background',
            rgbaFromHex(roleScaleHex('teal', 'dark', 4, true), 0.16),
            rgbaFromHex(roleScaleHex('teal', 'light', 5), 0.16),
          ),
          calibratedToken(
            'badge',
            'green',
            'color',
            roleScaleHex('positive', 'dark', 4, true),
            roleScaleHex('positive', 'light', 7),
          ),
          calibratedToken(
            'badge',
            'green',
            'background',
            rgbaFromHex(roleScaleHex('positive', 'dark', 4, true), 0.16),
            rgbaFromHex(roleScaleHex('positive', 'light', 6), 0.16),
          ),
          calibratedToken(
            'badge',
            'red',
            'color',
            roleScaleHex('critical', 'dark', 4, true),
            roleScaleHex('critical', 'light', 7),
          ),
          calibratedToken(
            'badge',
            'red',
            'background',
            rgbaFromHex(roleScaleHex('critical', 'dark', 4, true), 0.16),
            rgbaFromHex(roleScaleHex('critical', 'light', 5), 0.16),
          ),
          calibratedToken(
            'badge',
            'yellow',
            'color',
            roleScaleHex('warning', 'dark', 7, true),
            roleScaleHex('warning', 'light', 9),
          ),
          calibratedToken(
            'badge',
            'yellow',
            'background',
            rgbaFromHex(roleScaleHex('warning', 'dark', 4, true), 0.16),
            rgbaFromHex(roleScaleHex('warning', 'light', 6), 0.16),
          ),
          calibratedToken(
            'badge',
            'elephant',
            'color',
            greyDark[7],
            greyLight[7],
          ),
          calibratedToken(
            'badge',
            'elephant',
            'background',
            rgbaFromHex(greyDark[7], 0.16),
            rgbaFromHex(greyLight[7], 0.16),
          ),

          aliasToken('fill', 'error', 'default', 'fill.critical.default'),
          aliasToken('fill', 'error', 'weak', 'fill.critical.weak'),
          aliasToken('text', 'error', 'default', 'text.critical.default'),
          aliasToken('border', 'error', 'default', 'border.critical.default'),
          aliasToken(
            'background',
            'error',
            'subtle',
            'background.critical.subtle',
          ),
        ];

        return [...baseTokens, ...tossLikeTokens];
      }
