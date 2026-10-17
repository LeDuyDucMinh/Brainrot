import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Line,
} from 'react-native-svg';
import { BrainStage } from '../store/useAppStore';

interface BrainAvatarProps {
  stage: BrainStage;
  score: number;
  size?: number;
}

export const BrainAvatar: React.FC<BrainAvatarProps> = ({
  stage,
  score,
  size = 190,
}) => {
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const sparkAnim = useRef(new Animated.Value(0.6)).current;
  const boltFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation based on health stage
    let pulseDuration = 1800;
    let pulseScale = 1.05;

    if (stage === 'super') {
      pulseDuration = 1000;
      pulseScale = 1.07;
    } else if (stage === 'healthy') {
      pulseDuration = 1500;
      pulseScale = 1.05;
    } else if (stage === 'foggy') {
      pulseDuration = 2400;
      pulseScale = 1.02;
    } else if (stage === 'withered') {
      pulseDuration = 3000;
      pulseScale = 0.98;
    } else {
      // rotted: giật bất an (toxic twitch)
      pulseDuration = 700;
      pulseScale = 1.03;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: pulseScale,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: stage === 'withered' ? 0.96 : 1,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Lightning bolts spark flash & float
    const spark = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkAnim, {
          toValue: 1,
          duration: stage === 'super' ? 600 : 1100,
          useNativeDriver: true,
        }),
        Animated.timing(sparkAnim, {
          toValue: 0.35,
          duration: stage === 'super' ? 600 : 1100,
          useNativeDriver: true,
        }),
      ])
    );
    spark.start();

    const boltFloat = Animated.loop(
      Animated.sequence([
        Animated.timing(boltFloatAnim, {
          toValue: -4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(boltFloatAnim, {
          toValue: 4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    boltFloat.start();

    // Rotted stage has erratic toxic twitching
    if (stage === 'rotted') {
      const twitch = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 2, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
          Animated.delay(900),
        ])
      );
      twitch.start();
      return () => {
        pulse.stop();
        spark.stop();
        boltFloat.stop();
        twitch.stop();
      };
    }

    return () => {
      pulse.stop();
      spark.stop();
      boltFloat.stop();
    };
  }, [stage]);

  // Color theme for Lateral View (Side Profile) based on health stage
  const getStageTheme = () => {
    switch (stage) {
      case 'super':
        return {
          brainFill: '#FF80A0',
          brainShade: '#F43F5E',
          foldStroke: '#BE123C',
          stemColor: '#E11D48',
          cerebellumColor: '#FB7185',
          boltFill: '#FACC15',
          boltStroke: '#EAB308',
          rayColor: '#E2E8F0',
          auraColor: '#10B981',
          hasBolts: true,
          hasToxic: false,
        };
      case 'healthy':
        return {
          brainFill: '#F472B6',
          brainShade: '#EC4899',
          foldStroke: '#BE185D',
          stemColor: '#DB2777',
          cerebellumColor: '#F9A8D4',
          boltFill: '#FDE047',
          boltStroke: '#EAB308',
          rayColor: '#E2E8F0',
          auraColor: '#06B6D4',
          hasBolts: true,
          hasToxic: false,
        };
      case 'foggy':
        return {
          brainFill: '#CBD5E1',
          brainShade: '#A3E635',
          foldStroke: '#64748B',
          stemColor: '#475569',
          cerebellumColor: '#94A3B8',
          boltFill: '#CA8A04',
          boltStroke: '#854D0E',
          rayColor: '#F1F5F9',
          auraColor: '#D97706',
          hasBolts: false,
          hasToxic: false,
          crackOpacity: 0.3,
        };
      case 'decaying':
        return {
          brainFill: '#A3E635',
          brainShade: '#65A30D',
          foldStroke: '#3F6212',
          stemColor: '#365314',
          cerebellumColor: '#4D7C0F',
          boltFill: '#84CC16',
          boltStroke: '#65A30D',
          rayColor: '#F7FEE7',
          auraColor: '#65A30D',
          hasBolts: false,
          hasToxic: true,
          crackOpacity: 0.6,
        };
      case 'withered':
        return {
          brainFill: '#65A30D',
          brainShade: '#365314',
          foldStroke: '#1A2E05',
          stemColor: '#142203',
          cerebellumColor: '#3F6212',
          boltFill: '#84CC16',
          boltStroke: '#4D7C0F',
          rayColor: '#F8FAFC',
          auraColor: '#4D7C0F',
          hasBolts: false,
          hasToxic: true,
          crackOpacity: 0.85,
        };
      case 'rotted':
        return {
          brainFill: '#365314',
          brainShade: '#142203',
          foldStroke: '#0D1702',
          stemColor: '#0A0F01',
          cerebellumColor: '#1A2E05',
          boltFill: '#4D7C0F',
          boltStroke: '#1A2E05',
          rayColor: '#F8FAFC',
          auraColor: '#DC2626',
          hasBolts: false,
          hasToxic: true,
          crackOpacity: 1,
        };
    }
  };

  const theme = getStageTheme();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Animated Brain Profile Container */}
      <Animated.View
        style={[
          styles.brainWrapper,
          {
            transform: [
              { scale: pulseAnim },
              { translateX: shakeAnim },
            ],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 220 220" fill="none">
          <Defs>
            {/* Subtle Gradient for Lateral Brain Body */}
            <LinearGradient id="lateralBrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.brainFill} />
              <Stop offset="100%" stopColor={theme.brainShade} />
            </LinearGradient>
          </Defs>

          {/* 1. Radiating Energy Rays around the brain (Tia sáng năng lượng) */}
          <G id="energyRays" stroke={theme.rayColor} strokeWidth="2.5" strokeLinecap="round">
            <Line x1="72" y1="20" x2="80" y2="44" />
            <Line x1="102" y1="28" x2="104" y2="48" />
            <Line x1="168" y1="32" x2="152" y2="48" />
            <Line x1="192" y1="135" x2="174" y2="132" />
            <Line x1="180" y1="165" x2="156" y2="155" />
            <Line x1="28" y1="135" x2="48" y2="128" />
            <Line x1="60" y1="178" x2="76" y2="160" />
            <Line x1="88" y1="192" x2="94" y2="174" />
          </G>

          {/* 2. Yellow Lightning Energy Bolts (Tia sét năng lượng trí tuệ xung quanh) */}
          {theme.hasBolts && (
            <G id="lightningBolts">
              {/* Top-Left Lightning Bolt ⚡ */}
              <Path
                d="M32 28 L40 54 L34 56 L46 72 L38 52 L44 50 Z"
                fill={theme.boltFill}
                stroke={theme.boltStroke}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />

              {/* Top-Right Lightning Bolt ⚡ */}
              <Path
                d="M172 65 L188 48 L183 46 L198 32 L182 50 L187 52 Z"
                fill={theme.boltFill}
                stroke={theme.boltStroke}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />

              {/* Bottom-Left Lightning Bolt ⚡ */}
              <Path
                d="M36 175 L52 148 L46 147 L62 132 L47 150 L53 151 Z"
                fill={theme.boltFill}
                stroke={theme.boltStroke}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </G>
          )}

          {/* 3. Brainstem (Cuống não phía dưới) */}
          <Path
            d="M102 142 C 105 152, 110 162, 118 168 C 124 167, 126 160, 122 148 Z"
            fill={theme.stemColor}
            stroke={theme.foldStroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* 4. Cerebellum (Tiểu não phía dưới sau với các đường vân ngang) */}
          <G id="cerebellumProfile">
            <Path
              d="M116 144
                 C 124 154, 142 156, 150 148
                 C 156 142, 154 132, 145 128
                 C 134 126, 122 134, 116 144 Z"
              fill={theme.cerebellumColor}
              stroke={theme.foldStroke}
              strokeWidth="2.5"
            />
            {/* Cerebellum striations (vân tiểu não) */}
            <Path d="M124 140 C 132 144, 142 144, 148 138" stroke={theme.foldStroke} strokeWidth="1.8" fill="none" />
            <Path d="M122 146 C 130 150, 138 150, 144 144" stroke={theme.foldStroke} strokeWidth="1.8" fill="none" />
          </G>

          {/* 5. Main Cerebrum Body - Side Profile Contour (Thân não chính nhìn nghiêng) */}
          <Path
            d="M50 115
               C 42 105, 42 88, 52 75
               C 62 62, 78 54, 98 54
               C 118 54, 136 60, 152 72
               C 166 84, 172 100, 170 116
               C 168 130, 158 142, 146 146
               C 138 148, 128 146, 120 142
               C 112 138, 102 138, 92 142
               C 78 146, 68 142, 60 134
               C 54 128, 52 120, 50 115 Z"
            fill="url(#lateralBrainGrad)"
            stroke={theme.foldStroke}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* 6. Lateral Cerebral Sulci & Gyri (Các nếp gấp và rãnh hồi não nhìn nghiêng chuẩn mẫu) */}
          <G id="lateralFolds" stroke={theme.foldStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Frontal Lobe folds (Phía trước trán) */}
            <Path d="M54 94 C 64 90, 75 92, 80 84 C 84 76, 78 68, 68 70" />
            <Path d="M66 108 C 76 104, 86 106, 92 98 C 96 92, 90 84, 82 86" />

            {/* Superior / Parietal folds (Phía trên đỉnh đầu) */}
            <Path d="M96 60 C 102 70, 114 74, 120 66 C 124 60, 134 64, 140 70" />
            <Path d="M102 82 C 112 76, 124 80, 132 74 C 138 70, 146 76, 150 84" />
            <Path d="M108 98 C 118 92, 130 96, 138 90 C 146 84, 156 90, 160 100" />

            {/* Sylvian / Lateral Fissure (Rãnh bên chính giữa phân cách thùy thái dương) */}
            <Path d="M62 122 C 78 114, 98 116, 114 110 C 132 104, 146 112, 158 110" />

            {/* Temporal Lobe folds (Thùy thái dương phía dưới) */}
            <Path d="M72 132 C 86 126, 100 130, 112 124" />
            <Path d="M84 140 C 96 136, 108 138, 116 134" />

            {/* Occipital Lobe folds (Phía sau gáy) */}
            <Path d="M152 92 C 162 102, 162 114, 154 122" />
            <Path d="M142 118 C 150 126, 150 134, 142 140" />
          </G>

          {/* 7. Decay Cracks (Khi bị thoái hóa / teo khô / thối rữa) */}
          {(stage === 'decaying' || stage === 'withered' || stage === 'rotted') && (
            <G id="lateralCracks" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={theme.crackOpacity || 0.85}>
              <Path d="M70 78 L85 92 L78 106 L95 120" />
              <Path d="M120 75 L135 90 L128 108 L142 122" />
              <Path d="M90 128 L105 138 L98 146" />
            </G>
          )}

          {/* 8. Toxic Fumes & Bubbles (Khi bị thối rữa) */}
          {theme.hasToxic && (
            <G id="toxicFumesGroup">
              <Circle cx="50" cy="55" r="6" fill="#84CC16" opacity="0.7" />
              <Circle cx="38" cy="42" r="4" fill="#84CC16" opacity="0.5" />
              <Circle cx="160" cy="55" r="7" fill="#84CC16" opacity="0.7" />
              <Circle cx="172" cy="40" r="5" fill="#84CC16" opacity="0.5" />
              <Circle cx="105" cy="38" r="5" fill="#84CC16" opacity="0.6" />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  brainWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
