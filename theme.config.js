/** @type {const} */
const themeColors = {
  // FytNova — warm gold brand identity in both modes
  // Light mode: warm cream/amber tones (NOT plain white)
  // Dark mode: deep navy-black with gold accents
  primary:    { light: '#B45309', dark: '#F59E0B' },   // Gold — rich amber in light
  background: { light: '#FFF8F0', dark: '#0A0E14' },   // Light: warm cream / Dark: deep navy
  surface:    { light: '#FFF1E0', dark: '#141A22' },    // Light: warm peach card / Dark: dark surface
  foreground: { light: '#1C1917', dark: '#F1F5F9' },    // Light: warm black / Dark: cool white
  muted:      { light: '#78716C', dark: '#94A3B8' },    // Light: warm stone / Dark: cool slate
  border:     { light: '#E7D5C0', dark: '#1E293B' },    // Light: warm tan / Dark: subtle dark
  success:    { light: '#059669', dark: '#34D399' },    // Emerald
  warning:    { light: '#D97706', dark: '#FBBF24' },    // Gold warning
  error:      { light: '#DC2626', dark: '#F87171' },    // Red
  tint:       { light: '#B45309', dark: '#FBBF24' },    // Gold tab tint
  ice:        { light: '#0891B2', dark: '#22D3EE' },    // Ice blue
  mint:       { light: '#059669', dark: '#10B981' },    // Mint/teal
  rose:       { light: '#DB2777', dark: '#F472B6' },    // Rose
};
module.exports = { themeColors };
