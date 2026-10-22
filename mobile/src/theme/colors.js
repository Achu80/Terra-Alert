// Risk colors match frontend/src/utils/constants.js - kept identical in the dark glass theme
export const RISK_COLORS = {
    Critical: '#ef4444',
    High: '#f97316',
    Moderate: '#eab308',
    Low: '#10b981',
};

// Dark glass theme: near-black background, frosted translucent cards, warm yellow accent.
// Text colours are chosen for contrast on the background and on glass cards
// (text ~17:1, textMuted ~7.5:1 against the background).
export const colors = {
    background: '#0a0a0c',
    surface: '#161619', // solid panels: tab bar, pop-ups, inputs
    border: '#2a2a2f',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    primary: '#f5c451', // accent: buttons, active tab, chart line
    info: '#7cb7ff', // rainfall / water values

    // Glass cards
    glass: 'rgba(255,255,255,0.055)',
    glassTop: 'rgba(255,255,255,0.10)', // sheen at the top of a card
    glassBorder: 'rgba(255,255,255,0.10)',
    glassHighlight: 'rgba(255,255,255,0.22)', // lit top edge
};
