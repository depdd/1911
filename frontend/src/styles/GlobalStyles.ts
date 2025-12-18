import { createGlobalStyle } from 'styled-components'
import { theme } from './theme'

export const GlobalStyles = createGlobalStyle`
  /* CSS Reset and Base Styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: ${theme.typography.fontFamily};
    font-size: ${theme.typography.fontSize.md};
    font-weight: ${theme.typography.fontWeight.normal};
    line-height: ${theme.typography.lineHeight.normal};
    color: ${theme.colors.text};
    background: ${theme.colors.background};
    overflow-x: hidden;
  }

  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundLight};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.primary};
    border-radius: 4px;
    opacity: 0.7;
  }

  ::-webkit-scrollbar-thumb:hover {
    opacity: 1;
  }

  /* Selection Styling */
  ::selection {
    background: ${theme.colors.primary};
    color: ${theme.colors.background};
  }

  /* Focus Styles */
  *:focus {
    outline: 2px solid ${theme.colors.primary};
    outline-offset: 2px;
  }

  /* Link Styles */
  a {
    color: ${theme.colors.primary};
    text-decoration: none;
    transition: all ${theme.animations.duration.fast} ${theme.animations.easing.easeOut};
  }

  a:hover {
    color: ${theme.colors.primaryLight};
    text-decoration: underline;
  }

  /* Button Reset */
  button {
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
    transition: all ${theme.animations.duration.fast} ${theme.animations.easing.easeOut};
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Input Reset */
  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
    background: ${theme.colors.backgroundLight};
    color: ${theme.colors.text};
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.md};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    transition: all ${theme.animations.duration.fast} ${theme.animations.easing.easeOut};
  }

  input:focus, textarea:focus, select:focus {
    border-color: ${theme.colors.primary};
    box-shadow: 0 0 0 2px ${theme.colors.shadow};
  }

  input::placeholder, textarea::placeholder {
    color: ${theme.colors.textTertiary};
  }

  /* Table Styles */
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    text-align: left;
    border-bottom: 1px solid ${theme.colors.borderLight};
  }

  th {
    font-weight: ${theme.typography.fontWeight.semibold};
    color: ${theme.colors.primary};
    background: ${theme.colors.backgroundLight};
  }

  tr:hover {
    background: ${theme.colors.shadowLight};
  }

  /* Animation Classes */
  .fade-in {
    animation: fadeIn 0.5s ease-out;
  }

  .slide-up {
    animation: slideUp 0.3s ease-out;
  }

  .slide-down {
    animation: slideDown 0.3s ease-out;
  }

  .scale-in {
    animation: scaleIn 0.3s ease-out;
  }

  .glow {
    box-shadow: ${theme.shadows.glow};
  }

  .glow-strong {
    box-shadow: ${theme.shadows.glowStrong};
  }

  /* Keyframe Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px ${theme.colors.primary};
    }
    50% {
      box-shadow: 0 0 20px ${theme.colors.primary}, 0 0 30px ${theme.colors.primary};
    }
  }

  /* Utility Classes */
  .text-center {
    text-align: center;
  }

  .text-left {
    text-align: left;
  }

  .text-right {
    text-align: right;
  }

  .flex {
    display: flex;
  }

  .flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .flex-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .flex-column {
    display: flex;
    flex-direction: column;
  }

  .grid {
    display: grid;
  }

  .hidden {
    display: none;
  }

  .invisible {
    visibility: hidden;
  }

  .opacity-0 {
    opacity: 0;
  }

  .opacity-50 {
    opacity: 0.5;
  }

  .opacity-100 {
    opacity: 1;
  }

  /* Responsive Utilities */
  @media (max-width: ${theme.breakpoints.md}) {
    .mobile-hidden {
      display: none;
    }
  }

  @media (min-width: ${theme.breakpoints.md}) {
    .desktop-hidden {
      display: none;
    }
  }

  /* Custom Component Styles */
  .ant-layout {
    background: transparent !important;
  }

  .ant-layout-header {
    background: rgba(10, 14, 26, 0.8) !important;
    backdrop-filter: blur(10px);
    border-bottom: 1px solid ${theme.colors.border};
  }

  .ant-layout-sider {
    background: rgba(10, 14, 26, 0.9) !important;
    backdrop-filter: blur(10px);
    border-right: 1px solid ${theme.colors.border};
  }

  .ant-card {
    background: rgba(26, 31, 58, 0.6) !important;
    border: 1px solid ${theme.colors.border} !important;
    backdrop-filter: blur(10px);
  }

  .ant-modal-content {
    background: rgba(26, 31, 58, 0.95) !important;
    backdrop-filter: blur(10px);
    border: 1px solid ${theme.colors.border} !important;
  }

  .ant-modal-header {
    background: transparent !important;
    border-bottom: 1px solid ${theme.colors.border} !important;
  }

  .ant-modal-title {
    color: ${theme.colors.primary} !important;
  }

  .ant-table {
    background: transparent !important;
  }

  .ant-table-thead > tr > th {
    background: ${theme.colors.backgroundLight} !important;
    border-bottom: 1px solid ${theme.colors.border} !important;
  }

  .ant-table-tbody > tr > td {
    border-bottom: 1px solid ${theme.colors.borderLight} !important;
  }

  .ant-table-tbody > tr:hover > td {
    background: ${theme.colors.shadowLight} !important;
  }

  /* Chart Container Styles */
  .chart-container {
    background: rgba(26, 31, 58, 0.4);
    border: 1px solid ${theme.colors.border};
    border-radius: ${theme.borderRadius.lg};
    padding: ${theme.spacing.md};
    backdrop-filter: blur(5px);
  }

  /* Data Table Styles */
  .data-table {
    .ant-table-cell {
      color: ${theme.colors.textSecondary};
    }
    
    .ant-table-cell.price-up {
      color: ${theme.colors.success};
    }
    
    .ant-table-cell.price-down {
      color: ${theme.colors.error};
    }
    
    .ant-table-cell.price-neutral {
      color: ${theme.colors.textTertiary};
    }
  }

  /* Status Indicators */
  .status-connected {
    color: ${theme.colors.success};
  }
  
  .status-disconnected {
    color: ${theme.colors.error};
  }
  
  .status-connecting {
    color: ${theme.colors.warning};
  }

  /* Profit/Loss Colors */
  .profit {
    color: ${theme.colors.success};
  }
  
  .loss {
    color: ${theme.colors.error};
  }
  
  .neutral {
    color: ${theme.colors.textTertiary};
  }
`