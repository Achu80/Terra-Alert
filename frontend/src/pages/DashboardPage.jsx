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

// Metric Card Component - Enhanced Version
const MetricCard = ({ title, value, subtitle, color, delay, icon, trend }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Animated counter
  useEffect(() => {
    if (isVisible && typeof value === 'number') {
      const duration = 1000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [isVisible, value]);

  const displayValue = typeof value === 'number' ? count : value;

  return (
    <div
      className={`group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 transition-all duration-700 hover:border-white/30 hover:shadow-2xl hover:scale-105 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/0 group-hover:from-violet-500/10 group-hover:to-purple-500/10 rounded-2xl transition-all duration-500" />
      
      <div className="relative">
        {/* Icon and Trend */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-violet-400">
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 
              trend < 0 ? 'bg-red-500/20 text-red-400' : 
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              <span>{trend > 0 ? '↗' : trend < 0 ? '↘' : '→'}</span>
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-white/60 mb-2">{title}</h3>
        
        {/* Value */}
        <div className={`text-4xl font-bold mb-2 ${color || 'text-white'} transition-all group-hover:scale-110`}>
          {displayValue}
        </div>
        
        {/* Subtitle */}
        <p className="text-xs text-white/40">{subtitle}</p>

        {/* Progress Bar (optional) */}
        {typeof value === 'number' && value <= 100 && (
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${color === 'text-red-400' ? 'from-red-500 to-red-600' : color === 'text-orange-400' ? 'from-orange-500 to-orange-600' : 'from-violet-500 to-purple-600'} transition-all duration-1000`}
              style={{ width: isVisible ? `${value}%` : '0%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Risk Score Distribution Chart - Enhanced Version
const RiskScoreChart = ({ data }) => {
  const [animated, setAnimated] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Risk Score Distribution</h3>
        <div className="flex items-center justify-center h-64 text-white/40">
          <p>No data available yet. Make predictions to see distribution.</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  const riskData = [
    { range: '0–20', label: 'Very Low', color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
    { range: '21–40', label: 'Low', color: 'green', gradient: 'from-green-500 to-green-600' },
    { range: '41–60', label: 'Moderate', color: 'yellow', gradient: 'from-yellow-500 to-yellow-600' },
    { range: '61–80', label: 'High', color: 'orange', gradient: 'from-orange-500 to-orange-600' },
    { range: '81–100', label: 'Critical', color: 'red', gradient: 'from-red-500 to-red-600' }
  ];

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Risk Score Distribution</h3>
        <span className="text-sm text-white/60">{totalCount} total predictions</span>
      </div>
      
      <div className="grid grid-cols-5 gap-4">
        {data.map((item, index) => {
          const percentage = totalCount > 0 ? (item.count / totalCount * 100) : 0;
          const heightPercentage = maxCount > 0 ? (item.count / maxCount * 100) : 0;
          const isHovered = hoveredIndex === index;
          const config = riskData[index];

          return (
            <div
              key={index}
              className="relative group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Bar Container */}
              <div className="relative h-48 bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all">
                {/* Animated Bar */}
                <div
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${config.gradient} transition-all duration-1000 ease-out rounded-t-xl`}
                  style={{
                    height: animated ? `${heightPercentage}%` : '0%',
                    opacity: isHovered ? 1 : 0.8
                  }}
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${config.gradient} opacity-50 blur-xl`} />
                </div>

                {/* Count Badge */}
                <div className={`absolute top-2 left-1/2 -translate-x-1/2 transition-all duration-300 ${
                  animated && item.count > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}>
                  <div className={`bg-gradient-to-br ${config.gradient} text-white text-lg font-bold px-3 py-1 rounded-full shadow-lg`}>
                    {item.count}
                  </div>
                </div>

                {/* Percentage on Hover */}
                {isHovered && item.count > 0 && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {percentage.toFixed(1)}%
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="mt-3 text-center">
                <div className={`text-2xl mb-1 transition-transform ${isHovered ? 'scale-125' : 'scale-100'}`}>
                  {config.icon}
                </div>
                <div className="text-xs font-semibold text-white/80">{config.label}</div>
                <div className="text-xs text-white/50">{item.range}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-6 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-red-500" />
            <span>Risk increases →</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Total: {totalCount} predictions</span>
          </div>
        </div>
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

// 7-Day Trend Chart - Enhanced with Recharts
const TrendChart = ({ data }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">7-Day Risk Trend</h3>
        <div className="flex items-center justify-center h-64 text-white/40">
          <p>Make predictions across multiple days to see trends</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.avg), 100);
  const minValue = 0;

  // Calculate trend direction
  const firstValue = data[0]?.avg || 0;
  const lastValue = data[data.length - 1]?.avg || 0;
  const trendDirection = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'stable';
  const trendPercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue * 100).toFixed(1) : 0;

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">7-Day Risk Trend</h3>
          <p className="text-sm text-white/60">Average risk score over time</p>
        </div>
        
        {/* Trend Indicator */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          trendDirection === 'up' ? 'bg-red-500/20 text-red-400' :
          trendDirection === 'down' ? 'bg-emerald-500/20 text-emerald-400' :
          'bg-yellow-500/20 text-yellow-400'
        }`}>
          <span className="text-2xl">
            {trendDirection === 'up' ? '↗' : trendDirection === 'down' ? '↘' : '→'}
          </span>
          <div className="text-right">
            <div className="text-xs font-medium">
              {trendDirection === 'up' ? 'Increasing' : trendDirection === 'down' ? 'Decreasing' : 'Stable'}
            </div>
            <div className="text-xs opacity-80">
              {Math.abs(trendPercentage)}%
            </div>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 bg-white/5 rounded-xl p-4 border border-white/10">
        {/* Grid Lines */}
        <div className="absolute inset-4 flex flex-col justify-between">
          {[100, 75, 50, 25, 0].map((value, i) => (
            <div key={i} className="flex items-center">
              <span className="text-xs text-white/40 w-8">{value}</span>
              <div className="flex-1 h-px bg-white/5 ml-2" />
            </div>
          ))}
        </div>

        {/* Threshold Line (High Risk = 60) */}
        <div 
          className="absolute left-12 right-4 border-t-2 border-dashed border-violet-400/30"
          style={{ top: `${4 + (1 - 60/100) * (256 - 32)}px` }}
        >
          <span className="absolute -top-2 right-0 text-xs text-violet-400/60 bg-slate-900 px-2">
            High Risk (60)
          </span>
        </div>

        {/* Data Points and Line */}
        <svg className="absolute inset-4" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Area Fill */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(167, 139, 250)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {animated && (
            <>
              {/* Area */}
              <path
                d={`
                  M 0 ${100 - (data[0].avg / maxValue * 100)}
                  ${data.map((point, i) => 
                    `L ${(i / (data.length - 1)) * 100} ${100 - (point.avg / maxValue * 100)}`
                  ).join(' ')}
                  L 100 100
                  L 0 100
                  Z
                `}
                fill="url(#areaGradient)"
                className="transition-all duration-1000"
              />
              
              {/* Line */}
              <path
                d={`
                  M 0 ${100 - (data[0].avg / maxValue * 100)}
                  ${data.map((point, i) => 
                    `L ${(i / (data.length - 1)) * 100} ${100 - (point.avg / maxValue * 100)}`
                  ).join(' ')}
                `}
                fill="none"
                stroke="rgb(167, 139, 250)"
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-1000"
              />
            </>
          )}
        </svg>

        {/* Data Points */}
        <div className="absolute inset-4">
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - (point.avg / maxValue * 100);
            
            return (
              <div
                key={index}
                className="absolute group"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Point */}
                <div className={`w-3 h-3 rounded-full bg-violet-400 border-2 border-slate-900 transition-all duration-1000 ${
                  animated ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                }`} style={{ transitionDelay: `${index * 100}ms` }}>
                  {/* Pulse Effect */}
                  <div className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-75" />
                </div>

                {/* Tooltip on Hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-slate-900 border border-violet-400/30 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                    <div className="text-xs text-white/60">{point.date}</div>
                    <div className="text-sm font-bold text-violet-400">{point.avg}</div>
                  </div>
                  <div className="w-2 h-2 bg-slate-900 border-r border-b border-violet-400/30 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45" />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="absolute bottom-0 left-12 right-4 flex justify-between text-xs text-white/60">
          {data.map((point, index) => (
            <span key={index}>{point.date}</span>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-white/60 mb-1">Average</div>
          <div className="text-lg font-bold text-white">
            {(data.reduce((sum, d) => sum + d.avg, 0) / data.length).toFixed(1)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-white/60 mb-1">Highest</div>
          <div className="text-lg font-bold text-orange-400">
            {Math.max(...data.map(d => d.avg)).toFixed(1)}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xs text-white/60 mb-1">Lowest</div>
          <div className="text-lg font-bold text-emerald-400">
            {Math.min(...data.map(d => d.avg)).toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Recent Predictions Table - Enhanced Version
const RecentPredictionsTable = ({ predictions, onViewOnMap }) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  const getRiskColor = (score) => {
    if (score >= 80) return 'text-red-400';
    if (score >= 60) return 'text-orange-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getRiskGradient = (score) => {
    if (score >= 80) return 'from-red-500/20 to-red-600/20';
    if (score >= 60) return 'from-orange-500/20 to-orange-600/20';
    if (score >= 40) return 'from-yellow-500/20 to-yellow-600/20';
    return 'from-emerald-500/20 to-emerald-600/20';
  };

  const getLevelBadgeClass = (level) => {
    const classes = {
      CRITICAL: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/50',
      HIGH: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/50',
      MODERATE: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/50',
      LOW: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/50'
    };
    return classes[level] || classes.LOW;
  };

  const getLevelIcon = (level) => {
    const icons = {
      CRITICAL: '🔴',
      HIGH: '🟠',
      MODERATE: '🟡',
      LOW: '🟢'
    };
    return icons[level] || '○';
  };

  if (!predictions || predictions.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Predictions Yet</h3>
        <p className="text-white/60 mb-4">Start making predictions to see them here</p>
        <div className="inline-flex items-center gap-2 text-sm text-violet-400">
          <span>→</span>
          <span>Go to Map Explorer or Prediction page</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Recent Predictions</h3>
          <p className="text-sm text-white/60">{predictions.length} latest predictions</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live updates</span>
        </div>
      </div>

      <div className="space-y-3">
        {predictions.map((pred, index) => {
          const isHovered = hoveredRow === index;
          
          return (
            <div
              key={pred.id}
              className={`relative group rounded-xl border transition-all duration-300 ${
                isHovered 
                  ? 'border-white/30 bg-white/10 scale-[1.02] shadow-xl' 
                  : 'border-white/10 bg-white/5 hover:bg-white/8'
              }`}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-r ${getRiskGradient(pred.score)} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative p-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Index */}
                  <div className="col-span-1 text-center">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold text-white/80">
                      {index + 1}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getLevelIcon(pred.level)}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{pred.location}</div>
                        <div className="text-xs text-white/50">
                          {pred.lat.toFixed(4)}, {pred.lon.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Score */}
                  <div className="col-span-2 text-center">
                    <div className={`text-2xl font-bold ${getRiskColor(pred.score)} transition-all ${
                      isHovered ? 'scale-110' : 'scale-100'
                    }`}>
                      {pred.score}
                    </div>
                    <div className="text-xs text-white/50">Risk Score</div>
                  </div>

                  {/* Risk Level Badge */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getLevelBadgeClass(pred.level)} transition-all ${
                      isHovered ? 'scale-110' : 'scale-100'
                    }`}>
                      {pred.level}
                    </span>
                  </div>

                  {/* Top Factor */}
                  <div className="col-span-2">
                    <div className="text-xs text-white/60 mb-1">Top Factor</div>
                    <div className="text-sm text-white/90 font-medium truncate">
                      {pred.top_factor}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="col-span-1 text-center">
                    <div className="text-xs text-white/60 mb-1">Time</div>
                    <div className="text-sm text-white/80">{pred.ts}</div>
                  </div>

                  {/* Action Button */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => onViewOnMap(pred.lat, pred.lon)}
                      className={`p-2 rounded-lg transition-all ${
                        isHovered
                          ? 'bg-violet-500 text-white scale-110 shadow-lg shadow-violet-500/50'
                          : 'bg-white/10 text-violet-400 hover:bg-white/20'
                      }`}
                      title="View on Map"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      {predictions.length >= 8 && (
        <div className="mt-6 text-center">
          <button className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20 hover:border-white/40">
            View All Predictions →
          </button>
        </div>
      )}
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
          <p className="text-white/60">Loading Analytical Dashboard...</p>
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
          <h1 className="text-4xl font-bold text-white mb-2">Analytical Dashboard</h1>
          <p className="text-white/60">Real-time landslide risk monitoring and analytics</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Predictions"
            value={stats.total_predictions}
            subtitle="All time predictions"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            }
            delay={0}
          />
          <MetricCard
            title="Avg Risk Score"
            value={stats.avg_risk_score.toFixed(1)}
            subtitle="Out of 100"
            color={getScoreColor(stats.avg_risk_score)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            }
            delay={100}
          />
          <MetricCard
            title="High Risk Detections"
            value={stats.critical_count + stats.high_count}
            subtitle="Needs attention"
            color="text-orange-400"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            }
            delay={200}
          />
          <MetricCard
            title="Highest Risk Area"
            value={stats.highest_risk_location || 'No data yet'}
            subtitle={stats.highest_risk_score ? `Score: ${stats.highest_risk_score.toFixed(1)}` : 'Make predictions to see data'}
            color="text-red-400"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            }
            delay={300}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskScoreChart data={score_distribution} />
          <FeatureImportanceChart />
        </div>

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
