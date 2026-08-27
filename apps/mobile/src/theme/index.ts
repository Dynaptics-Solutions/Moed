import { useColorScheme } from 'react-native';

import { geometry } from './geometry';
import {
  darkColors,
  darkShadow,
  lightColors,
  lightShadow,
  scrim,
  space,
  type ColorTokens,
} from './tokens';
import { fonts, type } from './type';

export type Theme = {
  colors: ColorTokens;
  shadow: typeof lightShadow | typeof darkShadow;
  type: typeof type;
  fonts: typeof fonts;
  geometry: typeof geometry;
  space: typeof space;
  scrim: string;
  isDark: boolean;
};

export function useTheme(): Theme {
  const isDark = useColorScheme() === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    shadow: isDark ? darkShadow : lightShadow,
    type,
    fonts,
    geometry,
    space,
    scrim,
    isDark,
  };
}

export { geometry, fonts, type, space, scrim, lightColors, darkColors };
export type { ColorTokens };
