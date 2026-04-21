import { useState } from 'react'
import { WeatherProvider } from './context/WeatherContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import MapExplorerPage from './pages/MapExplorerPage'
import { RiskReportPage, HistoricalPage, DataSourcesPage, SettingsPage } from './pages/OtherPages'
import './App.css'

function AppContent() {
  const [activePage, setActivePage] = useState('home')

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage onNavigate={setActivePage} />
      case 'map':
        return <MapExplorerPage />
      case 'dashboard':
        return <DashboardPage />
      case 'report':
        return <RiskReportPage onNavigate={setActivePage} />
      case 'history':
        return <HistoricalPage />
      case 'sources':
        return <DataSourcesPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <HomePage onNavigate={setActivePage} />
    }
  }

  return (
    <Layout active={activePage} onNav={setActivePage}>
      {renderPage()}
    </Layout>
  )
}

function App() {
  return (
    <WeatherProvider>
      <AppContent />
    </WeatherProvider>
  )
}

export default App
