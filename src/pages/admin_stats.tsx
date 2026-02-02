import useSWR from 'swr';
import api from '../api/client';
import { 
  CurrencyDollarIcon, 
  UsersIcon, 
  ChatBubbleLeftRightIcon, 
  CpuChipIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function AdminStatsPage() {
  const { data, isLoading } = useSWR('/admin/stats/overview', fetcher, {
    refreshInterval: 100000, 
  });

  if (isLoading) return <AdminSkeleton />;

  const totalRevenue = Number(data?.total_revenue || 0);
  const totalTokens = Number(data?.total_tokens_consumed || 0);
  const totalAiCost = Number(data?.total_ai_cost || 0);
  const totalUsers = Number(data?.total_users || 0);

  const stats = [
    { 
      name: 'Total Revenue', 
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
      icon: CurrencyDollarIcon, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10' 
    },
    { 
      name: 'Total Users', 
      value: totalUsers.toLocaleString(), 
      icon: UsersIcon, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10' 
    },
    { 
      name: 'AI Tokens', 
      value: totalTokens.toLocaleString(), 
      icon: CpuChipIcon, 
      color: 'text-purple-400', 
      bg: 'bg-purple-500/10' 
    },
    { 
      name: 'AI Cost', 
      value: `$${totalAiCost.toFixed(2)}`,
      icon: ArrowTrendingUpIcon, 
      color: 'text-red-400', 
      bg: 'bg-red-500/10' 
    },
  ];

  const contentBreakdown = [
    { label: 'Images', value: (data?.total_images_generated || 0).toLocaleString(), icon: PhotoIcon },
    { label: 'Audio', value: (data?.total_audio_generated || 0).toLocaleString(), icon: SpeakerWaveIcon },
    { label: 'Videos', value: (data?.total_videos_generated || 0).toLocaleString(), icon: VideoCameraIcon },
    { label: 'Chats', value: (data?.total_chats || 0).toLocaleString(), icon: ChatBubbleLeftRightIcon },
  ];


  return (
    <div className="flex flex-col h-full bg-[#0a0b0f] text-gray-100 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Platform Overview</h1>
              <p className="text-gray-400 mt-1">Real-time metrics and financial performance.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-green-400 uppercase tracking-wider">Live System Feed</span>
            </div>
          </div>

          {/* Top Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-gray-400 text-sm font-medium">{stat.name}</p>
                <h3 className="text-2xl font-bold text-white mt-1 group-hover:scale-105 transition-transform origin-left">
                  {stat.value}
                </h3>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Trend */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-white mb-6">Revenue Trend (30d)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.revenue_trend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#475569" fontSize={12} tickFormatter={(str) => str.split('-').slice(1,3).join('/')} />
                    <YAxis stroke="#475569" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Growth Trend */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-lg font-semibold text-white mb-6">User Acquisition</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.user_growth_trend}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#475569" fontSize={12} tickFormatter={(str) => str.split('-').slice(1,3).join('/')} />
                    <YAxis stroke="#475569" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Lower Content Breakdown */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Content Generation Breakdown</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-800">
              {contentBreakdown.map((item) => (
                <div key={item.label} className="p-6 text-center hover:bg-slate-800/20 transition-colors">
                  <item.icon className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{item.value}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="p-8 space-y-8 bg-[#0a0b0f] h-full animate-pulse">
      <div className="h-10 w-64 bg-slate-800 rounded-lg"></div>
      <div className="grid grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800/50 rounded-2xl"></div>)}
      </div>
      <div className="grid grid-cols-2 gap-8">
        <div className="h-[350px] bg-slate-800/50 rounded-2xl"></div>
        <div className="h-[350px] bg-slate-800/50 rounded-2xl"></div>
      </div>
    </div>
  );
}