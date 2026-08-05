import { Asset } from 'expo-asset';
import { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { ClipPath, Defs, G, Image as SvgImage, Path } from 'react-native-svg';

import { getGameArt } from '../constants/gameArt';
import { GameArtImage } from './GameArtImage';

/**
 * Résout une URI affichable pour react-native-svg.
 * Évite `Image.resolveAssetSource` — cassé sous certains interops Metro
 * (`RNImage.default.resolveAssetSource is not a function`).
 */
async function resolveSourceUri(
  source: ImageSourcePropType,
): Promise<string | null> {
  if (typeof source === 'number') {
    try {
      const asset = Asset.fromModule(source);
      if (!asset.localUri) {
        await asset.downloadAsync();
      }
      return asset.localUri ?? asset.uri ?? null;
    } catch {
      return null;
    }
  }

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (entry && typeof entry === 'object' && typeof entry.uri === 'string') {
        return entry.uri;
      }
    }
    return null;
  }

  if (source && typeof source === 'object' && typeof source.uri === 'string') {
    return source.uri;
  }

  return null;
}

type Props = {
  catalogId: string;
  /** Opacité de l’artwork (0–1). */
  opacity?: number;
  /** Couleur fallback Phosphor. */
  color?: string;
};

type Pt = { x: number; y: number };

/**
 * Contour rectangulaire « déchiré » (bords irréguliers type sticker / paper rip).
 */
function tornRectPath(w: number, h: number): string {
  if (w < 8 || h < 8) return `M0,0 H${w} V${h} H0 Z`;

  const top = jaggedEdge({
    from: { x: 0, y: 10 },
    to: { x: w, y: 10 },
    steps: 14,
    amp: 9,
    axis: 'y',
  });
  const right = jaggedEdge({
    from: { x: w - 8, y: 10 },
    to: { x: w - 8, y: h - 10 },
    steps: 10,
    amp: 8,
    axis: 'x',
  });
  const bottom = jaggedEdge({
    from: { x: w, y: h - 10 },
    to: { x: 0, y: h - 10 },
    steps: 14,
    amp: 9,
    axis: 'y',
    reverseWave: true,
  });
  const left = jaggedEdge({
    from: { x: 8, y: h - 10 },
    to: { x: 8, y: 10 },
    steps: 10,
    amp: 8,
    axis: 'x',
    reverseWave: true,
  });

  const pts = [...top, ...right.slice(1), ...bottom.slice(1), ...left.slice(1)];
  return `M${pts.map((p) => `${p.x},${p.y}`).join(' L')} Z`;
}

function jaggedEdge(args: {
  from: Pt;
  to: Pt;
  steps: number;
  amp: number;
  axis: 'x' | 'y';
  reverseWave?: boolean;
}): Pt[] {
  const { from, to, steps, amp, axis, reverseWave } = args;
  const parts: Pt[] = [
    { x: +from.x.toFixed(1), y: +from.y.toFixed(1) },
  ];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const baseX = from.x + (to.x - from.x) * t;
    const baseY = from.y + (to.y - from.y) * t;
    const wave = (i % 2 === 0 ? 1 : -1) * (reverseWave ? -1 : 1);
    const jitter = wave * amp * (0.55 + ((i * 17) % 7) / 14);
    if (axis === 'y') {
      parts.push({
        x: +baseX.toFixed(1),
        y: +(baseY + jitter).toFixed(1),
      });
    } else {
      parts.push({
        x: +(baseX + jitter).toFixed(1),
        y: +baseY.toFixed(1),
      });
    }
  }
  return parts;
}

/**
 * Artwork plein cadre du bloc parent : net (cover/slice), semi-transparent,
 * découpé avec des bords déchirés.
 */
export function TornBleedGameArt({
  catalogId,
  opacity = 0.42,
  color = '#0186F0',
}: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [uri, setUri] = useState<string | null>(null);
  const clipId = useMemo(
    () => `torn-${catalogId.replace(/[^a-z0-9_-]/gi, '')}`,
    [catalogId],
  );

  useEffect(() => {
    let active = true;
    const art = getGameArt(catalogId);
    if (!art) {
      setUri(null);
      return;
    }
    if (art.imageUrl) {
      setUri(art.imageUrl);
      return;
    }
    if (art.localSource == null) {
      setUri(null);
      return;
    }
    setUri(null);
    resolveSourceUri(art.localSource).then((next) => {
      if (active) setUri(next);
    });
    return () => {
      active = false;
    };
  }, [catalogId]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) {
      setBox({ w: width, h: height });
    }
  };

  const path = useMemo(
    () => (box.w > 0 ? tornRectPath(box.w, box.h) : ''),
    [box.w, box.h],
  );

  return (
    <View style={styles.root} onLayout={onLayout} pointerEvents="none">
      {box.w > 0 && box.h > 0 && uri && path ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id={clipId}>
              <Path d={path} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#${clipId})`}>
            <SvgImage
              href={uri}
              x={0}
              y={0}
              width={box.w}
              height={box.h}
              preserveAspectRatio="xMidYMid slice"
              opacity={opacity}
            />
          </G>
          {/* Liseré déchiré pour renforcer l’effet papier */}
          <Path
            d={path}
            fill="none"
            stroke="rgba(255,255,255,0.38)"
            strokeWidth={1.6}
          />
          <Path
            d={path}
            fill="none"
            stroke="rgba(0,0,0,0.22)"
            strokeWidth={1}
            strokeDasharray="3 5"
          />
        </Svg>
      ) : (
        <View style={[styles.fallbackBleed, { opacity }]}>
          <GameArtImage
            catalogId={catalogId}
            size={box.w || 200}
            height={box.h || 160}
            color={color}
            brandedFallback
            resizeMode="cover"
            borderRadius={0}
            style={styles.fallbackImage}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  fallbackBleed: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
  },
});
