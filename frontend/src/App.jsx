import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🌍 GeoSafe - Landslide Risk Prediction
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to GeoSafe
          </h2>
          <p className="text-gray-600 mb-6">
            AI-powered landslide risk prediction using real-time satellite data from Google Earth Engine.
          </p>
          
          {/* Test Counter */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
            <h3 className="text-xl font-semibold mb-4">Tailwind CSS Test</h3>
            <p className="mb-4">Count: {count}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setCount(count + 1)}
                className="btn-primary"
              >
                Increment
              </button>
              <button 
                onClick={() => setCount(0)}
                className="btn-secondary"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🛰️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Real-time Data
            </h3>
            <p className="text-gray-600">
              Fetches live satellite data from Google Earth Engine
            </p>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              AI Prediction
            </h3>
            <p className="text-gray-600">
              XGBoost model trained on historical landslide data
            </p>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Interactive Map
            </h3>
            <p className="text-gray-600">
              Click anywhere to get landslide risk assessment
            </p>
          </div>
        </div>

        {/* Status Section */}
        <div className="mt-8 card bg-green-50 border-2 border-green-200">
          <div className="flex items-center gap-3">
            <div className="text-3xl">✅</div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                Tailwind CSS Installed Successfully!
              </h3>
              <p className="text-green-700">
                Your frontend is ready for development. Backend API is running on http://localhost:5000
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
