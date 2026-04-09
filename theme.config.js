/** @type {const} */
const themeColors = {
  // PeakPulse — dark base with proper light mode alternative
  primary:    { light: '#D97706', dark: '#F59E0B' }, // Gold — slightly darker in light for contrast
  background: { light: '#F8FAFC', dark: '#0A0E14' }, // Light: cool white / Dark: deep navy-black
  surface:    { light: '#FFFFFF', dark: '#141A22' }, // Light: pure white cards / Dark: dark card surface
  foreground: { light: '#0F172A', dark: '#F1F5F9' }, // Light: dark slate / Dark: cool white
  muted:      { light: '#64748B', dark: '#64748B' }, // Slate muted (same both modes)
  border:     { light: '#E2E8F0', dark: '#1E293B' }, // Light: light slate / Dark: subtle dark border
  success:    { light: '#059669', dark: '#34D399' }, // Emerald — darker in light for contrast
  warning:    { light: '#D97706', dark: '#FBBF24' }, // Gold warning
  error:      { light: '#DC2626', dark: '#F87171' }, // Red — darker in light
  tint:       { light: '#D97706', dark: '#FBBF24' }, // Gold tab tint
  // Per-screen accent tokens
  ice:        { light: '#0891B2', dark: '#22D3EE' }, // Ice blue — darker in light
  mint:       { light: '#059669', dark: '#10B981' }, // Mint/teal — darker in light
  rose:       { light: '#DB2777', dark: '#F472B6' }, // Rose — darker in light
};

module.exports = { themeColors };
