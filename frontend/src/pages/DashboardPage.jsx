import { useState, useEffect } from 'react';

// Custom hook for dashboard data
const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch stats from backend
        const response = await fetch('http://localhost:5000/api/stats');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const statsData = await response.json();
        
        setData({
          stats: {
            total_predictions: statsData.total_predictions || 0,
            avg_risk_score: statsData.avg_risk_score || 0,
            critical_count: statsData.critical_count || 0,
            high_count: statsData.high_count || 0,
            moderate_count: statsData.moderate_count || 0,
            low_count: statsData.low_count || 0,
            highest_risk_location: statsData.highest_risk_location || 'N/A'
          },
          score_distribution: statsData.score_distribution || [],
          trend_7d: statsData.trend_7d || [],
          recent_predictions: statsData.recent_predictions || []
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, color, delay }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <h3 className="text-sm font-medium text-white/60 mb-2">{title}</h3>
      <div className={`text-3xl font-bold mb-1 ${color || 'text-white'}`}>
        {value}
      </div>
      <p className="text-xs text-white/40">{subtitle}</p>
    </div>
  );
};

// Risk Score Distribution Chart
const RiskScoreChart = ({ data }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));
  const chartHeight = 200;
  const barWidth = 60;
  const gap = 20;
  const chartWidth = data.length * (barWidth + gap);

  const colors = ['text-emerald-400', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];
  const fillColors = ['fill-emerald-400', 'fill-green-400', 'fill-yellow-400', 'fill-orange-400', 'fill-red-400'];

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Risk Score Distribution</h3>
      <div className="flex items-end justify-center gap-5 h-64">
        {data.map((item, index) => {
          const barHeight = (item.count / maxCount) * chartHeight;
          return (
            <div key={index} className="flex flex-col items-center gap-2">
              <span className={`text-sm font-semibold ${colors[index]}`}>
                {item.count}
              </span>
              <div
                className={`w-16 ${fillColors[index]} rounded-t-lg transition-all duration-1000 ease-out`}
                style={{
                  height: animated ? `${barHeight}px` : '0px'
                }}
              />
              <span className="text-xs text-white/60 mt-2">{item.range}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Feature Importance Chart
const FeatureImportanceChart = () => {
  const features = [
    { name: 'slope', importance: 31 },
    { name: 'rainfall_30d', importance: 24 },
    { name: 'rainfall_14d', importance: 14 },
    { name: 'soil_type', importance: 10 },
    { name: 'ndvi', importance: 8 },
    { name: 'elevation', importance: 6 },
    { name: 'rainfall_7d', importance: 4 },
    { name: 'ndwi', importance: 2 },
    { name: 'rainfall_3d', importance: 1 },
    { name: 'aspect', importance: 0 }
  ];

  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">XGBoost Feature Importance</h3>
      <div className="space-y-3">
        {features.map((feature, index) => (
          <div key={feature.name} className="flex items-center gap-3">
            <span className="text-sm text-white/80 w-28 text-right">{feature.name}</span>
            <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full ${index < 3 ? 'bg-violet-400' : 'bg-violet-300'} rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2`}
                style={{
                  width: animated ? `${feature.importance}%` : '0%'
                }}
              >
                {animated && feature.importance > 0 && (
                  <span className="text-xs font-semibold text-white">
                    {feature.importance}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 7-Day Trend Chart
const TrendChart = ({ data }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 40, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.avg), 100);
  const minValue = 0;

  const xStep = chartWidth / (data.length - 1);
  
  const getY = (value) => {
    return chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
  };

  const pathData = data.map((point, index) => {
    const x = index * xStep;
    const y = getY(point.avg);
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaPath = `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  const thresholdY = getY(60);

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">7-Day Risk Trend</h3>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Threshold line */}
          <line
            x1="0"
            y1={thresholdY}
            x2={chartWidth}
            y2={thresholdY}
            stroke="rgb(167 139 250 / 0.3)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <text
            x={chartWidth + 5}
            y={thresholdY + 4}
            fill="rgb(167 139 250 / 0.6)"
            fontSize="10"
            className="text-xs"
          >
            High risk
          </text>

          {/* Area under curve */}
          <path
            d={areaPath}
            fill="rgb(167 139 250 / 0.1)"
            className={`transition-opacity duration-1000 ${animated ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Line path */}
          <path
            d={pathData}
            fill="none"
            stroke="rgb(167 139 250)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-1000 ${animated ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x = index * xStep;
            const y = getY(point.avg);
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill="rgb(167 139 250)"
                  className={`transition-all duration-1000 delay-${index * 100} ${
                    animated ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                  }`}
                />
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill="none"
                  stroke="rgb(167 139 250 / 0.3)"
                  strokeWidth="2"
                  className={`transition-all duration-1000 delay-${index * 100} ${
                    animated ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                  }`}
                />
                {/* Value label */}
                <text
                  x={x}
                  y={y - 15}
                  fill="rgb(167 139 250)"
                  fontSize="12"
                  textAnchor="middle"
                  className={`font-semibold transition-all duration-1000 delay-${index * 100} ${
                    animated ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {point.avg}
                </text>
                {/* Date label */}
                <text
                  x={x}
                  y={chartHeight + 20}
                  fill="rgb(255 255 255 / 0.6)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {point.date}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// Recent Predictions Table
const RecentPredictionsTable = ({ predictions, onViewOnMap }) => {
  const getRiskColor = (score) => {
    if (score >= 80) return 'text-red-400';
    if (score >= 60) return 'text-orange-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getLevelBadgeClass = (level) => {
    const classes = {
      CRITICAL: 'bg-red-400/10 text-red-400',
      HIGH: 'bg-orange-400/10 text-orange-400',
      MODERATE: 'bg-yellow-400/10 text-yellow-400',
      LOW: 'bg-emerald-400/10 text-emerald-400'
    };
    return classes[level] || classes.LOW;
  };

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Recent Predictions</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-sm font-medium text-white/60 pb-3 px-4">Location</th>
              <th className="text-left text-sm font-medium text-white/60 pb-3 px-4">Risk Score</th>
              <th className="text-left text-sm font-medium text-white/60 pb-3 px-4">Risk Level</th>
              <th className="text-left text-sm font-medium text-white/60 pb-3 px-4">Top Factor</th>
              <th className="text-left text-sm font-medium text-white/60 pb-3 px-4">Time</th>
              <th className="text-left text-sm font-medium text-white/60 pb-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((pred, index) => (
              <tr
                key={pred.id}
                className={`border-b border-white/5 ${
                  index % 2 === 1 ? 'bg-white/[0.02]' : ''
                } hover:bg-white/[0.05] transition-colors`}
              >
                <td className="py-4 px-4">
                  <div className="text-sm text-white">{pred.location}</div>
                  <div className="text-xs text-white/40">
                    {pred.lat.toFixed(2)}, {pred.lon.toFixed(2)}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`text-lg font-bold ${getRiskColor(pred.score)}`}>
                    {pred.score}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelBadgeClass(
                      pred.level
                    )}`}
                  >
                    {pred.level}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-white/80">{pred.top_factor}</td>
                <td className="py-4 px-4 text-sm text-white/60">{pred.ts}</td>
                <td className="py-4 px-4">
                  <button
                    onClick={() => onViewOnMap(pred.lat, pred.lon)}
                    className="px-3 py-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 hover:bg-violet-400/10 rounded-lg transition-colors border border-violet-400/20 hover:border-violet-400/40"
                  >
                    View on Map
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main Dashboard Component
const DashboardPage = ({ onViewOnMap = () => {} }) => {
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading Himachal Pradesh dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-red-400/10 border border-red-400/20 rounded-2xl p-6 max-w-md">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-white/60 text-sm mb-4">{error}</p>
          <p className="text-white/40 text-xs">Make sure the backend server is running on http://localhost:5000</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">No data available</p>
      </div>
    );
  }

  const { stats, score_distribution, trend_7d, recent_predictions } = data;

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Himachal Pradesh Dashboard</h1>
          <p className="text-white/60">Real-time landslide risk monitoring and analytics</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Predictions"
            value={stats.total_predictions.toLocaleString()}
            subtitle="Since launch"
            delay={0}
          />
          <MetricCard
            title="Avg Risk Score"
            value={stats.avg_risk_score.toFixed(1)}
            subtitle="Out of 100"
            color={getScoreColor(stats.avg_risk_score)}
            delay={100}
          />
          <MetricCard
            title="Critical + High Detections"
            value={(stats.critical_count + stats.high_count).toLocaleString()}
            subtitle="Needs attention"
            color="text-orange-400"
            delay={200}
          />
          <MetricCard
            title="Highest Risk Area"
            value={stats.highest_risk_location}
            subtitle="Current hotspot"
            delay={300}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskScoreChart data={score_distribution} />
          <FeatureImportanceChart />
        </div>

        {/* 7-Day Trend */}
        {trend_7d && trend_7d.length > 0 && <TrendChart data={trend_7d} />}

        {/* Recent Predictions Table */}
        {recent_predictions && recent_predictions.length > 0 && (
          <RecentPredictionsTable predictions={recent_predictions} onViewOnMap={onViewOnMap} />
        )}
        
        {/* Empty state for predictions */}
        {(!recent_predictions || recent_predictions.length === 0) && (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
            <p className="text-white/60 mb-2">No predictions available yet</p>
            <p className="text-white/40 text-sm">Start making predictions to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
