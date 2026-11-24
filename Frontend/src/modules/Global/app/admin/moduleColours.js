/**
 * One colour per service, shared by Reports (chart series) and Support (ticket
 * tags). Muted earth tones so five of them can sit side by side without the
 * page turning into a rainbow: the chrome stays neutral, these only mark which
 * service a number or ticket belongs to. Tours keeps the platform green.
 */
export const MODULE_COLOURS = {
  food: '#b4532a',
  taxi: '#b08a1e',
  hotel: '#3f6f8f',
  tours: '#0a4d2b',
  festivals: '#7a4a7e',
  platform: '#8a8a8a',
};

export const moduleColour = (key) => MODULE_COLOURS[key] || MODULE_COLOURS.platform;
