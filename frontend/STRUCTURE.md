# Frontend Structure Documentation

## 📁 Directory Structure

```
frontend/src/
├── assets/              # Static assets (images, icons, fonts)
│   ├── hero.png
│   ├── react.svg
│   └── vite.svg
│
├── components/          # Reusable React components
│   ├── animations/      # Animation components
│   │   ├── PageTransition.jsx
│   │   └── SimpleTransition.jsx
│   │
│   ├── forecast/        # Forecast visualization components
│   │   └── ForecastDisplay.jsx
│   │
│   ├── layout/          # Layout components (Sidebar, TopBar, etc.)
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   └── TopBar.jsx
│   │
│   ├── map/             # Map-related components
│   │   ├── InteractiveMap.jsx
│   │   └── RiskHeatmap.jsx
│   │
│   ├── ui/              # UI kit and reusable UI components
│   │   └── UIKit.jsx
│   │
│   ├── weather/         # Weather-related components
│   │   └── WeatherBackground.jsx
│   │
│   └── index.js         # Barrel export for components
│
├── context/             # React Context providers
│   └── WeatherContext.jsx
│
├── hooks/               # Custom React hooks
│   ├── useLocalStorage.js
│   ├── useDebounce.js
│   └── index.js         # Barrel export for hooks
│
├── pages/               # Page components (routes)
│   ├── HomePage.jsx
│   ├── DashboardPage.jsx
│   ├── MapExplorerPage.jsx
│   ├── PredictionPage.jsx
│   └── OtherPages.jsx
│
├── services/            # API and external service integrations
│   ├── api.js           # Centralized API calls
│   └── geocoding.js     # Location search and geocoding
│
├── utils/               # Utility functions and helpers
│   ├── constants.js     # Application constants
│   └── helpers.js       # Helper functions
│
├── App.jsx              # Main App component
├── App.css              # App-specific styles
├── main.jsx             # Application entry point
└── index.css            # Global styles (Tailwind)
```

## 📦 Module Organization

### Components (`/components`)
Reusable UI components organized by feature:
- **animations/**: Framer Motion wrappers and transitions
- **forecast/**: Forecast charts and displays
- **layout/**: App layout structure (Sidebar, TopBar, Layout)
- **map/**: Leaflet map components
- **ui/**: Generic UI components (buttons, cards, etc.)
- **weather/**: Weather-related UI components

**Usage:**
```javascript
// Import from barrel export
import { Layout, InteractiveMap, PageTransition } from '@/components'

// Or import directly
import Layout from '@/components/layout/Layout'
```

### Context (`/context`)
React Context providers for global state:
- **WeatherContext**: Theme and weather state management

**Usage:**
```javascript
import { useWeather } from '@/context/WeatherContext'

function MyComponent() {
    const { theme, weather } = useWeather()
    return <div className={theme.cardBg}>...</div>
}
```

### Hooks (`/hooks`)
Custom React hooks for reusable logic:
- **useLocalStorage**: Persist state in localStorage
- **useDebounce**: Debounce values

**Usage:**
```javascript
import { useLocalStorage, useDebounce } from '@/hooks'

function MyComponent() {
    const [value, setValue] = useLocalStorage('key', 'default')
    const debouncedValue = useDebounce(value, 500)
}
```

### Pages (`/pages`)
Top-level page components mapped to routes:
- **HomePage**: Landing page
- **DashboardPage**: Dashboard overview
- **MapExplorerPage**: District map explorer
- **PredictionPage**: Individual location prediction

**Usage:**
```javascript
// In App.jsx or router config
import HomePage from '@/pages/HomePage'
import PredictionPage from '@/pages/PredictionPage'
```

### Services (`/services`)
External API and service integrations:
- **api.js**: Centralized API calls to backend
- **geocoding.js**: Location search and validation

**Usage:**
```javascript
import { predictionAPI, geeAPI } from '@/services/api'
import { searchLocation, isWithinHP } from '@/services/geocoding'

// Make API calls
const result = await predictionAPI.predict(lat, lon)
const locations = await searchLocation('Shimla')
```

### Utils (`/utils`)
Utility functions and constants:
- **constants.js**: App-wide constants (risk levels, colors, config)
- **helpers.js**: Helper functions (formatting, calculations)

**Usage:**
```javascript
import { RISK_LEVELS, RISK_COLORS, HP_DISTRICTS } from '@/utils/constants'
import { getRiskLevel, formatDate, formatConfidence } from '@/utils/helpers'

const level = getRiskLevel(85) // 'CRITICAL'
const colors = getRiskColor('HIGH') // { bg: '...', text: '...', ... }
```

## 🎯 Best Practices

### 1. Component Organization
- **One component per file**
- **Co-locate related files** (component + styles + tests)
- **Use barrel exports** (`index.js`) for cleaner imports

### 2. Naming Conventions
- **Components**: PascalCase (`MyComponent.jsx`)
- **Hooks**: camelCase with `use` prefix (`useMyHook.js`)
- **Utils**: camelCase (`myHelper.js`)
- **Constants**: UPPER_SNAKE_CASE (`MY_CONSTANT`)

### 3. Import Order
```javascript
// 1. External dependencies
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. Internal components
import { Layout, InteractiveMap } from '@/components'

// 3. Hooks and context
import { useWeather } from '@/context/WeatherContext'
import { useLocalStorage } from '@/hooks'

// 4. Services and API
import { predictionAPI } from '@/services/api'

// 5. Utils and constants
import { RISK_LEVELS } from '@/utils/constants'
import { getRiskLevel } from '@/utils/helpers'

// 6. Styles
import './MyComponent.css'
```

### 4. Component Structure
```javascript
// 1. Imports
import React, { useState, useEffect } from 'react'

// 2. Constants (component-specific)
const DEFAULT_VALUE = 10

// 3. Helper functions (component-specific)
function calculateSomething(value) {
    return value * 2
}

// 4. Component
export default function MyComponent({ prop1, prop2 }) {
    // 4a. Hooks
    const [state, setState] = useState(null)
    const { theme } = useWeather()
    
    // 4b. Effects
    useEffect(() => {
        // ...
    }, [])
    
    // 4c. Event handlers
    const handleClick = () => {
        // ...
    }
    
    // 4d. Render
    return (
        <div>
            {/* JSX */}
        </div>
    )
}
```

## 🔧 Configuration

### Path Aliases (Optional)
Add to `vite.config.js` for cleaner imports:
```javascript
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@services': path.resolve(__dirname, './src/services'),
        }
    }
})
```

Then use:
```javascript
import { Layout } from '@components'
import { useWeather } from '@/context/WeatherContext'
```

## 📚 Key Files

### `main.jsx`
Application entry point, renders the root component.

### `App.jsx`
Main app component with routing and global providers.

### `index.css`
Global styles, Tailwind imports, and custom CSS.

### `services/api.js`
Centralized API client with all backend endpoints.

### `utils/constants.js`
All application constants in one place.

### `utils/helpers.js`
Reusable utility functions.

## 🚀 Adding New Features

### Adding a New Page
1. Create file in `/pages`: `NewPage.jsx`
2. Add route in `App.jsx`
3. Add navigation link in `Sidebar.jsx`

### Adding a New Component
1. Create file in appropriate `/components` subfolder
2. Export from `/components/index.js` (optional)
3. Import and use in pages

### Adding a New API Endpoint
1. Add function to `/services/api.js`
2. Use in components via import

### Adding a New Utility
1. Add function to `/utils/helpers.js`
2. Export and use where needed

## 📖 Examples

### Making an API Call
```javascript
import { predictionAPI } from '@/services/api'

async function getPrediction() {
    try {
        const result = await predictionAPI.predict(31.1048, 77.1734, {
            useCache: false,
            daysBack: 30
        })
        console.log(result)
    } catch (error) {
        console.error('Prediction failed:', error)
    }
}
```

### Using Constants
```javascript
import { RISK_COLORS, HP_DISTRICTS } from '@/utils/constants'
import { getRiskLevel } from '@/utils/helpers'

function RiskBadge({ score }) {
    const level = getRiskLevel(score)
    const colors = RISK_COLORS[level]
    
    return (
        <div className={`${colors.bg} ${colors.text}`}>
            {level}
        </div>
    )
}
```

### Custom Hook
```javascript
import { useLocalStorage } from '@/hooks'

function MyComponent() {
    const [favorites, setFavorites] = useLocalStorage('favorites', [])
    
    const addFavorite = (item) => {
        setFavorites([...favorites, item])
    }
    
    return <div>...</div>
}
```

## 🎨 Styling

- **Tailwind CSS**: Primary styling method
- **CSS Modules**: For component-specific styles (optional)
- **Global Styles**: `index.css` for app-wide styles

## 🧪 Testing (Future)

Recommended structure:
```
components/
├── MyComponent.jsx
├── MyComponent.test.jsx
└── MyComponent.module.css
```

## 📝 Notes

- All components use functional components with hooks
- State management via Context API (can add Redux/Zustand if needed)
- API calls centralized in `/services`
- Constants and helpers prevent code duplication
- Barrel exports (`index.js`) for cleaner imports
