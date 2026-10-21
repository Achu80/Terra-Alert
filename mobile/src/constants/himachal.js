// Himachal Pradesh districts and bounds - match frontend/src/utils/constants.js
export const HP_BOUNDS = {
    north: 33.2,
    south: 30.4,
    east: 79.0,
    west: 75.6,
};

export const HP_STATE_NAME = 'Himachal Pradesh';

export const HP_DISTRICTS = [
    { id: 'shimla', name: 'Shimla', lat: 31.1048, lon: 77.1734 },
    { id: 'mandi', name: 'Mandi', lat: 31.7084, lon: 76.9318 },
    { id: 'kullu', name: 'Kullu', lat: 31.9578, lon: 77.1093 },
    { id: 'kangra', name: 'Kangra', lat: 32.0998, lon: 76.2691 },
    { id: 'chamba', name: 'Chamba', lat: 32.5562, lon: 76.1262 },
    { id: 'hamirpur', name: 'Hamirpur', lat: 31.6838, lon: 76.5178 },
    { id: 'una', name: 'Una', lat: 31.4685, lon: 76.2708 },
    { id: 'bilaspur', name: 'Bilaspur', lat: 31.3409, lon: 76.7568 },
    { id: 'solan', name: 'Solan', lat: 30.9045, lon: 77.0967 },
    { id: 'sirmaur', name: 'Sirmaur', lat: 30.5628, lon: 77.2839 },
    { id: 'kinnaur', name: 'Kinnaur', lat: 31.583, lon: 78.383 },
    { id: 'lahaul_spiti', name: 'Lahaul and Spiti', lat: 32.5667, lon: 77.15 },
];

// Bounding-box check only - the box also covers edges of neighbouring states,
// so geocoded results are additionally filtered by state name
export const isWithinHP = (lat, lon) =>
    lat >= HP_BOUNDS.south && lat <= HP_BOUNDS.north && lon >= HP_BOUNDS.west && lon <= HP_BOUNDS.east;
