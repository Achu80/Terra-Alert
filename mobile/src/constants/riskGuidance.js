/**
 * What to do at each alert level (Low has no alert).
 * Based on NDMA-referenced landslide do's and don'ts (Sphere India) and state disaster management
 * authority guidance: watch for warning signs, keep an emergency kit, avoid slopes / river valleys /
 * drainage channels in heavy rain, move out of the debris path, and stay away from the slide area afterwards.
 */

export const LEVEL_ORDER = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };

export const isAlertLevel = (level) => LEVEL_ORDER[level] >= LEVEL_ORDER.MODERATE;

export const RISK_GUIDANCE = {
    MODERATE: {
        title: 'Stay alert',
        summary: 'Landslides are possible, especially if heavy rain continues.',
        steps: [
            'Watch for warning signs: new cracks in the ground or walls, tilting trees or poles, new springs or seepage.',
            'Keep an emergency kit ready - water, food, first aid, torch, radio, medicines and a charged phone.',
            'Check rain and road updates before travelling on hill roads.',
            'Know your nearest safe place and the route to it, away from steep slopes and streams.',
        ],
    },
    HIGH: {
        title: 'Be ready to move',
        summary: 'Conditions favour landslides. Limit exposure and be prepared to leave quickly.',
        steps: [
            'Avoid travelling on hill roads and staying near steep slopes, river valleys or drainage channels - especially at night or in heavy rain.',
            'Listen for unusual sounds such as trees cracking or boulders knocking together.',
            'If a nearby stream suddenly rises, drops or turns muddy, a landslide may have started upstream - move away from it.',
            'Help children, elderly and sick family members move to safer ground first, and follow district advisories.',
        ],
    },
    CRITICAL: {
        title: 'Act now',
        summary: 'A landslide is likely. Move to safety and follow instructions from local authorities.',
        steps: [
            'Move away from slopes and out of any debris path immediately - go to stable, higher ground away from channels.',
            'Follow evacuation orders. Call 1077 (district) or 1070 (state) for disaster help.',
            'If you cannot escape, curl into a tight ball and protect your head.',
            'Afterwards, stay away from the slide area - more slides can follow. Watch for flooding and fallen power lines, and do not drink untreated water.',
        ],
    },
};

// Himachal Pradesh helplines (HPSDMA): 1070 State EOC (24x7), 1077 District EOC (same in every district)
export const EMERGENCY_NUMBERS = [
    { number: '112', label: 'All emergencies', icon: 'call' },
    { number: '108', label: 'Ambulance', icon: 'medkit' },
    { number: '1077', label: 'District disaster helpline', icon: 'business' },
    { number: '1070', label: 'State disaster helpline (24×7)', icon: 'shield' },
];
