/** @type {const} */
const themeColors = {
  // NanoBanana Redesign — deep dark base with per-screen accent semantics
  primary:    { light: '#F59E0B', dark: '#F59E0B' }, // Gold — workouts & energy
  background: { light: '#0A0E14', dark: '#0A0E14' }, // Deep navy-black
  surface:    { light: '#141A22', dark: '#141A22' }, // Dark card surface
  foreground: { light: '#F1F5F9', dark: '#F1F5F9' }, // Cool white
  muted:      { light: '#64748B', dark: '#64748B' }, // Slate muted
  border:     { light: '#1E293B', dark: '#1E293B' }, // Subtle dark border
  success:    { light: '#10B981', dark: '#34D399' }, // Emerald
  warning:    { light: '#F59E0B', dark: '#FBBF24' }, // Gold warning
  error:      { light: '#EF4444', dark: '#F87171' }, // Red
  tint:       { light: '#F59E0B', dark: '#FBBF24' }, // Gold tab tint
  // Per-screen accent tokens
  ice:        { light: '#22D3EE', dark: '#22D3EE' }, // Ice blue — body scan & health
  mint:       { light: '#10B981', dark: '#10B981' }, // Mint/teal — meals & nutrition
  rose:       { light: '#F472B6', dark: '#F472B6' }, // Rose — protein & targets
};

module.exports = { themeColors };
