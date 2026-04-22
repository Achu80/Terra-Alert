# Frontend Architecture

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                       │
│                     (React + Tailwind CSS)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          PAGES LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Home   │  │Dashboard │  │   Map    │  │Prediction│   │
│  │   Page   │  │   Page   │  │ Explorer │  │   Page   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      COMPONENTS LAYER                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Layout  │  │   Maps   │  │ Forecast │  │Animation │   │
│  │Components│  │Components│  │Components│  │Components│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Context API (WeatherContext)            │   │
│  │  • Theme State  • Weather Data  • Global Settings    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVICES LAYER                          │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   API Service    │         │ Geocoding Service│          │
│  │  • Predictions   │         │  • Search        │          │
│  │  • Districts     │         │  • Validation    │          │
│  │  • Stats         │         │  • Reverse Geo   │          │
│  └──────────────────┘         └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND API                             │
│                   (Flask REST API)                           │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow

### Prediction Flow
```
User Clicks Map
      │
      ▼
PredictionPage Component
      │
      ├─> Get Coordinates
      │
      ▼
predictionAPI.predict()
      │
      ▼
Backend API (/api/predict)
      │
      ├─> Google Earth Engine
      ├─> XGBoost Model
      ├─> Generate Forecast
      │
      ▼
Response with Prediction
      │
      ▼
Update Component State
      │
      ▼
Render Results
      ├─> Risk Score Card
      ├─> Heatmap
      ├─> Forecast Charts
      └─> Recommendations
```

### Map Explorer Flow
```
User Opens Map Explorer
      │
      ▼
MapExplorerPage Component
      │
      ├─> Check Cache
      │   ├─> Cache Hit → Return Cached Data
      │   └─> Cache Miss → Fetch Fresh Data
      │
      ▼
predictionAPI.getDistricts()
      │
      ▼
Backend API (/api/districts/himachal)
      │
      ├─> Parallel Processing (12 districts)
      ├─> Google Earth Engine (each district)
      ├─> XGBoost Model (each district)
      │
      ▼
Response with All Districts
      │
      ├─> Save to Cache (30 min)
      │
      ▼
Update Component State
      │
      ▼
Render Map with Markers
      ├─> Color-coded by Risk
      ├─> Clickable Popups
      └─> Side Panel with Details
```

## 🔄 Component Hierarchy

```
App
├── WeatherProvider (Context)
│   └── Router
│       └── Layout
│           ├── Sidebar
│           ├── TopBar
│           └── Main Content
│               ├── HomePage
│               │   ├── Hero Section
│               │   ├── Features
│               │   └── CTA
│               │
│               ├── DashboardPage
│               │   ├── Stats Cards
│               │   ├── Charts
│               │   └── Recent Activity
│               │
│               ├── PredictionPage
│               │   ├── LocationSelector
│               │   │   ├── InteractiveMap
│               │   │   └── Search Input
│               │   │
│               │   └── PredictionResults
│               │       ├── Risk Score Card
│               │       ├── Metrics Grid
│               │       ├── RiskHeatmap
│               │       ├── Recommendations
│               │       ├── Environmental Parameters
│               │       └── ForecastSection
│               │           ├── Tab Buttons
│               │           ├── SevenDayForecast
│               │           ├── FourteenDayTrend
│               │           └── ThirtyDaySummary
│               │
│               └── MapExplorerPage
│                   ├── District Map (Leaflet)
│                   ├── District Markers
│                   ├── Side Panel
│                   └── Refresh Controls
```

## 🎨 Styling Architecture

```
Global Styles (index.css)
├── Tailwind Base
├── Tailwind Components
├── Tailwind Utilities
└── Custom Global Styles
    ├── Scrollbar
    ├── Animations
    └── Typography

Component Styles
├── Tailwind Utility Classes (Primary)
├── Dynamic Classes (theme.cardBg, etc.)
└── Inline Styles (for dynamic values)
```

## 🔌 API Integration

### API Service Structure
```javascript
services/api.js
├── fetchAPI() - Generic fetch wrapper
├── predictionAPI
│   ├── predict()
│   ├── getDistricts()
│   └── getDistrict()
├── geeAPI
│   ├── getData()
│   └── getProcessedData()
├── statsAPI
│   ├── getStats()
│   ├── getPredictions()
│   ├── getAlerts()
│   └── getHistory()
└── settingsAPI
    ├── get()
    └── update()
```

## 🎣 Custom Hooks

```
hooks/
├── useLocalStorage
│   └── Persist state in localStorage
│
└── useDebounce
    └── Debounce rapidly changing values
```

## 🌐 State Management

### Context Structure
```javascript
WeatherContext
├── State
│   ├── theme (colors, styles)
│   ├── weather (current weather)
│   └── settings (user preferences)
│
└── Actions
    ├── updateTheme()
    ├── updateWeather()
    └── updateSettings()
```

## 📦 Build & Bundle

```
Source Files (src/)
      │
      ▼
Vite Build Process
      │
      ├─> Transpile JSX → JS
      ├─> Process Tailwind CSS
      ├─> Bundle Dependencies
      ├─> Optimize Assets
      ├─> Code Splitting
      │
      ▼
Production Build (dist/)
      │
      ├─> index.html
      ├─> assets/
      │   ├─> index-[hash].js
      │   ├─> index-[hash].css
      │   └─> [images]
      │
      ▼
Deploy to Server
```

## 🚀 Performance Optimizations

### 1. Code Splitting
- Route-based splitting (lazy loading pages)
- Component-level splitting for heavy components

### 2. Caching Strategy
- **Map Explorer**: 30-minute cache for district data
- **Predictions**: No cache (always fresh)
- **Assets**: Browser cache with versioned filenames

### 3. Lazy Loading
- Images: Load on scroll
- Maps: Load on component mount
- Charts: Load when tab is active

### 4. Memoization
- Use `React.memo()` for expensive components
- Use `useMemo()` for expensive calculations
- Use `useCallback()` for event handlers

## 🔒 Security Considerations

### 1. API Security
- CORS configuration
- API key management (env variables)
- Input validation

### 2. XSS Prevention
- React's built-in XSS protection
- Sanitize user inputs
- Avoid `dangerouslySetInnerHTML`

### 3. Data Validation
- Validate coordinates (HP bounds)
- Validate API responses
- Handle errors gracefully

## 📱 Responsive Design

### Breakpoints (Tailwind)
```
sm:  640px  - Mobile landscape
md:  768px  - Tablet
lg:  1024px - Desktop
xl:  1280px - Large desktop
2xl: 1536px - Extra large
```

### Mobile-First Approach
```css
/* Base styles for mobile */
.component { ... }

/* Tablet and up */
@media (min-width: 768px) { ... }

/* Desktop and up */
@media (min-width: 1024px) { ... }
```

## 🧩 Third-Party Libraries

### Core Dependencies
- **React**: UI library
- **React Router**: Routing
- **Leaflet**: Maps
- **Recharts**: Charts (optional)
- **Framer Motion**: Animations
- **Tailwind CSS**: Styling

### Development Dependencies
- **Vite**: Build tool
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixes

## 📈 Future Enhancements

### Planned Features
1. **Offline Support**: Service workers, PWA
2. **Real-time Updates**: WebSocket integration
3. **Advanced Filtering**: Filter districts by risk level
4. **Export Data**: Download predictions as PDF/CSV
5. **User Accounts**: Save favorite locations
6. **Notifications**: Alert system for high-risk areas
7. **Multi-language**: i18n support

### Technical Improvements
1. **Testing**: Jest + React Testing Library
2. **E2E Testing**: Playwright/Cypress
3. **State Management**: Consider Redux Toolkit if complexity grows
4. **Error Boundary**: Global error handling
5. **Analytics**: Track user interactions
6. **Performance Monitoring**: Lighthouse CI

## 📚 Resources

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite Guide](https://vitejs.dev)
- [Leaflet Docs](https://leafletjs.com)
- [Recharts Guide](https://recharts.org)
