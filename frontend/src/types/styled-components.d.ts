import 'styled-components';
import { theme } from '../styles/theme';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: typeof theme.colors;
    gradients: typeof theme.gradients;
    shadows: typeof theme.shadows;
    borderRadius: typeof theme.borderRadius;
    spacing: typeof theme.spacing;
    typography: typeof theme.typography;
    animations: typeof theme.animations;
    breakpoints: typeof theme.breakpoints;
    zIndex: typeof theme.zIndex;
  }
}
