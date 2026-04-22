import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WeatherProvider } from './context/WeatherContext'
import Layout from './components/layout/Layout'
import './App.css'

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'))
const HomePage = lazy(() => import('./pages/PredictionPage'))
const MapExplorerPage = lazy(() => import('./pages/MapExplorerPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const RiskReportPage = lazy(() => import('./pages/RiskReportPage'))
const HistoricalPage = lazy(() => import('./pages/OtherPages').then(module => ({ default: module.HistoricalPage })))
const DataSourcesPage = lazy(() => import('./pages/OtherPages').then(module => ({ default: module.DataSourcesPage })))
const SettingsPage = lazy(() => import('./pages/OtherPages').then(module => ({ default: module.SettingsPage })))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white/60">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <WeatherProvider>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/map" element={<MapExplorerPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/report" element={<RiskReportPage />} />
              <Route path="/history" element={<HistoricalPage />} />
              <Route path="/sources" element={<DataSourcesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </WeatherProvider>
  )
}

export default App
