import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { ModeToggle } from '../components/mode-toggle';
import { 
  RocketLaunchIcon, 
  ChatBubbleBottomCenterTextIcon, 
  PhotoIcon, 
  SpeakerWaveIcon, 
  VideoCameraIcon, 
  ArrowRightIcon, 
  CheckCircleIcon, 
  BoltIcon 
} from '@heroicons/react/24/outline';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-dvh w-full app-surface font-sans selection:bg-blue-500/30 overflow-x-hidden">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0a0b0f]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/20">
              <RocketLaunchIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white truncate">
              MultiAiModel
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ModeToggle />
            
            {isAuthenticated ? (
              <Link 
                to="/dashboard" 
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/10 active:scale-95 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Go to</span> Dashboard
                <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 sm:inline-block sm:text-sm dark:text-gray-300 dark:hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-xs sm:text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-28 pb-12 sm:pt-40 sm:pb-24 relative">
        {/* Background Glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] sm:w-[800px] h-[300px] sm:h-[500px] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-semibold mb-6 sm:mb-8 border border-blue-200 dark:border-blue-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Now supporting GPT-5.2 Pro & Claude 4.5 Opus
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 leading-tight">
            The Ultimate <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
              Generative AI Suite
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 px-2">
            Access the world's most powerful models in one unified workspace. 
            Generate text, code, images, voice, and video without switching tabs.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-4 px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <Link 
              to={isAuthenticated ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-base sm:text-lg font-bold rounded-2xl hover:-translate-y-1 transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 flex items-center justify-center gap-2"
            >
              <BoltIcon className="w-5 h-5" />
              Start Creating
            </Link>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-white text-base sm:text-lg font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
            >
              Explore Features
            </a>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section id="features" className="py-16 sm:py-20 bg-white dark:bg-[#0f1117]/50 border-t border-slate-200 dark:border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">Everything you need to create</h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm sm:text-base">Four powerful studios packed into one platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <FeatureCard 
              icon={<ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-blue-500" />}
              title="Smart Chat"
              desc="Switch between GPT-5.2 Pro, Gemini Pro, and Claude instantly. Context-aware conversations with code execution."
              delay={0}
            />
            <FeatureCard 
              icon={<PhotoIcon className="w-6 h-6 text-pink-500" />}
              title="Image Studio"
              desc="Generate stunning 8K visuals using DALL-E 3 and Stable Diffusion XL. Perfect for marketing and art."
              delay={100}
            />
            <FeatureCard 
              icon={<SpeakerWaveIcon className="w-6 h-6 text-purple-500" />}
              title="Neural Voice"
              desc="Convert text to lifelike human speech with emotional depth using Google Neural2 and ElevenLabs."
              delay={200}
            />
            <FeatureCard 
              icon={<VideoCameraIcon className="w-6 h-6 text-emerald-500" />}
              title="AI Avatars"
              desc="Create talking head videos from text scripts. Powered by D-ID for realistic lip-sync and movement."
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* Value Proposition / Credits */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative bg-gradient-to-br from-slate-900 to-blue-900 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl p-6 sm:p-12 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
              <div className="max-w-2xl text-center lg:text-left">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
                  Stop paying for unused subscriptions.
                </h2>
                <div className="space-y-4 inline-block text-left">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-100 text-base sm:text-lg">One credit system for all models.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-100 text-base sm:text-lg">No expiring credits. Keep what you buy.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-100 text-base sm:text-lg">Access Enterprise-grade models without monthly seats.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/20 w-full lg:w-auto min-w-[280px] sm:min-w-[320px] text-center">
                <p className="text-blue-200 text-xs sm:text-sm uppercase tracking-widest font-semibold mb-2">Starter Pack</p>
                <div className="flex items-baseline justify-center gap-1 mb-6">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white">$10</span>
                  <span className="text-blue-200 text-sm sm:text-base">/ one-time</span>
                </div>
                <Link
                  to={isAuthenticated ? "/dashboard/billing" : "/signup"}
                  className="block w-full py-3 bg-white text-blue-900 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg active:scale-95 text-sm sm:text-base"
                >
                  Get Credits
                </Link>
                <p className="text-[10px] sm:text-xs text-blue-200 mt-4">Includes ~500 images or 1M text tokens</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0b0f] text-center">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
           <RocketLaunchIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
           <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">MultiAiModel</span>
        </div>
        <p className="text-slate-500 dark:text-gray-500 text-xs sm:text-sm">
          &copy; {new Date().getFullYear()} MultiAiModel Platform. All rights reserved.
        </p>
      </footer>

    </div>
  );
}

// Subcomponent for Feature Cards
function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
  return (
    <div 
      className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-500 dark:text-gray-400 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}