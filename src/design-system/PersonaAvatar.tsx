import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import {
  getPersona,
  type ProfilePersona,
  type ProfilePersonaId,
} from '../lib/profilePersonas';

type Props = {
  personaId: ProfilePersonaId | string;
  size?: number;
};

function Motif({
  persona,
  size,
}: {
  persona: ProfilePersona;
  size: number;
}) {
  const s = size;
  const a = persona.accent;
  const soft = persona.soft;

  switch (persona.motif) {
    case 'spark':
      return (
        <Path
          d={`M${s * 0.5} ${s * 0.18} L${s * 0.58} ${s * 0.42} L${s * 0.82} ${s * 0.5} L${s * 0.58} ${s * 0.58} L${s * 0.5} ${s * 0.82} L${s * 0.42} ${s * 0.58} L${s * 0.18} ${s * 0.5} L${s * 0.42} ${s * 0.42} Z`}
          fill={a}
        />
      );
    case 'orbit':
      return (
        <>
          <Circle
            cx={s * 0.5}
            cy={s * 0.5}
            r={s * 0.28}
            stroke={a}
            strokeWidth={s * 0.06}
            fill="none"
          />
          <Circle cx={s * 0.78} cy={s * 0.32} r={s * 0.08} fill={a} />
        </>
      );
    case 'flame':
      return (
        <Path
          d={`M${s * 0.5} ${s * 0.18} C${s * 0.72} ${s * 0.38} ${s * 0.78} ${s * 0.55} ${s * 0.5} ${s * 0.82} C${s * 0.22} ${s * 0.55} ${s * 0.28} ${s * 0.38} ${s * 0.5} ${s * 0.18} Z`}
          fill={a}
        />
      );
    case 'leaf':
      return (
        <Path
          d={`M${s * 0.5} ${s * 0.2} C${s * 0.78} ${s * 0.28} ${s * 0.82} ${s * 0.62} ${s * 0.5} ${s * 0.82} C${s * 0.18} ${s * 0.62} ${s * 0.22} ${s * 0.28} ${s * 0.5} ${s * 0.2} Z`}
          fill={a}
        />
      );
    case 'wave':
      return (
        <Path
          d={`M${s * 0.18} ${s * 0.55} Q${s * 0.32} ${s * 0.35} ${s * 0.5} ${s * 0.55} T${s * 0.82} ${s * 0.55} V${s * 0.72} Q${s * 0.66} ${s * 0.58} ${s * 0.5} ${s * 0.72} T${s * 0.18} ${s * 0.72} Z`}
          fill={a}
        />
      );
    case 'sun':
      return (
        <>
          <Circle cx={s * 0.5} cy={s * 0.5} r={s * 0.18} fill={a} />
          {[0, 45, 90, 135].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = s * 0.5 + Math.cos(rad) * s * 0.28;
            const y1 = s * 0.5 + Math.sin(rad) * s * 0.28;
            const x2 = s * 0.5 + Math.cos(rad) * s * 0.4;
            const y2 = s * 0.5 + Math.sin(rad) * s * 0.4;
            return (
              <Path
                key={deg}
                d={`M${x1} ${y1} L${x2} ${y2}`}
                stroke={a}
                strokeWidth={s * 0.055}
                strokeLinecap="round"
              />
            );
          })}
        </>
      );
    case 'grid':
      return (
        <>
          <Rect
            x={s * 0.28}
            y={s * 0.28}
            width={s * 0.18}
            height={s * 0.18}
            rx={s * 0.04}
            fill={a}
          />
          <Rect
            x={s * 0.54}
            y={s * 0.28}
            width={s * 0.18}
            height={s * 0.18}
            rx={s * 0.04}
            fill={soft}
            opacity={0.55}
          />
          <Rect
            x={s * 0.28}
            y={s * 0.54}
            width={s * 0.18}
            height={s * 0.18}
            rx={s * 0.04}
            fill={soft}
            opacity={0.55}
          />
          <Rect
            x={s * 0.54}
            y={s * 0.54}
            width={s * 0.18}
            height={s * 0.18}
            rx={s * 0.04}
            fill={a}
          />
        </>
      );
    case 'ring':
      return (
        <>
          <Circle
            cx={s * 0.5}
            cy={s * 0.5}
            r={s * 0.3}
            stroke={a}
            strokeWidth={s * 0.07}
            fill="none"
          />
          <Circle cx={s * 0.5} cy={s * 0.5} r={s * 0.12} fill={a} />
        </>
      );
    default:
      return <Circle cx={s * 0.5} cy={s * 0.5} r={s * 0.22} fill={a} />;
  }
}

export function PersonaAvatar({ personaId, size = 48 }: Props) {
  const persona = getPersona(personaId);
  if (!persona) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#0F8F8A',
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: persona.color,
      }}
      accessibilityLabel={`Avatar ${persona.label}`}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size * 0.5} cy={size * 0.5} r={size * 0.5} fill={persona.color} />
        <Circle
          cx={size * 0.72}
          cy={size * 0.22}
          r={size * 0.22}
          fill={persona.soft}
          opacity={0.35}
        />
        <Motif persona={persona} size={size} />
      </Svg>
    </View>
  );
}
