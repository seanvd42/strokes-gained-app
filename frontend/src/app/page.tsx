'use client'

import Link from 'next/link'
import { TrendingUp, Target, BarChart3, Lock, Zap, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 via-white to-sage-50">
      {/* Header */}
      <header className="border-b border-sage-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-8 h-8 text-golf-fairway" />
            <span className="text-2xl font-display font-bold text-sage-900">
              Strokes Gained
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/signin" 
              className="text-sage-700 hover:text-golf-fairway font-display font-semibold transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="btn-primary"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center stagger-children">
          <h1 className="text-5xl lg:text-7xl font-display font-black text-sage-900 mb-6 leading-tight">
            Transform Your Golf Game with{' '}
            <span className="text-golf-fairway">Data-Driven Insights</span>
          </h1>
          <p className="text-xl lg:text-2xl text-sage-600 mb-10 font-body leading-relaxed max-w-2xl mx-auto">
            Professional-grade strokes gained analysis at your fingertips. 
            Understand exactly where you're gaining—and losing—strokes on the course.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-primary text-lg px-8 py-4">
              Start Analyzing Free
            </Link>
            <Link href="#features" className="btn-outline text-lg px-8 py-4">
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-display font-bold text-center mb-4 text-sage-900">
            Everything You Need to Improve
          </h2>
          <p className="text-xl text-sage-600 text-center mb-16 font-body">
            Professional analytics, designed for every golfer
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card group hover:border-golf-green-200">
              <div className="w-14 h-14 bg-golf-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-golf-green-100 transition-colors">
                <TrendingUp className="w-7 h-7 text-golf-fairway" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-sage-900">
                Strokes Gained Analysis
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                See exactly where you gain and lose strokes compared to PGA Tour, 
                scratch, and bogey golfer benchmarks.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card group hover:border-golf-green-200">
              <div className="w-14 h-14 bg-golf-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-golf-green-100 transition-colors">
                <BarChart3 className="w-7 h-7 text-golf-fairway" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-sage-900">
                Interactive Dashboard
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                Visualize your performance with beautiful charts, detailed shot 
                tables, and comprehensive summary metrics.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card group hover:border-golf-green-200">
              <div className="w-14 h-14 bg-golf-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-golf-green-100 transition-colors">
                <Zap className="w-7 h-7 text-golf-fairway" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-sage-900">
                Garmin Integration
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                Seamlessly import shot data from your Garmin devices. 
                Support for Approach S70, CT10 sensors, and more.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card group hover:border-golf-green-200">
              <div className="w-14 h-14 bg-golf-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-golf-green-100 transition-colors">
                <Lock className="w-7 h-7 text-golf-fairway" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-sage-900">
                Secure & Private
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                Your data is protected with enterprise-grade security. 
                Row-level isolation ensures your stats stay yours.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card group hover:border-golf-green-200">
              <div className="w-14 h-14 bg-golf-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-golf-green-100 transition-colors">
                <Target className="w-7 h-7 text-golf-fairway" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-sage-900">
                Smart Filtering
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                Filter by date ranges, benchmarks, and clubs to identify 
                specific areas for improvement.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card group hover:border-golf-green-200">
              <div className="w-14 h-14 bg-golf-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-golf-green-100 transition-colors">
                <Globe className="w-7 h-7 text-golf-fairway" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 text-sage-900">
                Cloud-Ready
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                Access your data anywhere. Built on modern cloud infrastructure 
                for reliability and performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-display font-bold text-center mb-16 text-sage-900">
            Three Steps to Better Golf
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-golf-fairway text-white rounded-full flex items-center justify-center text-2xl font-display font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-display font-bold mb-3 text-sage-900">
                Import Your Data
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                Upload shot data from your Garmin device or manually enter 
                your rounds.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-golf-fairway text-white rounded-full flex items-center justify-center text-2xl font-display font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-display font-bold mb-3 text-sage-900">
                Analyze Performance
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                Our engine calculates strokes gained for every shot against 
                professional benchmarks.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-golf-fairway text-white rounded-full flex items-center justify-center text-2xl font-display font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-display font-bold mb-3 text-sage-900">
                Improve Your Game
              </h3>
              <p className="text-sage-600 font-body leading-relaxed">
                Identify weaknesses, track progress, and make data-driven 
                practice decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-golf-green-600 to-golf-green-700 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-display font-bold text-white mb-6">
            Ready to Lower Your Scores?
          </h2>
          <p className="text-xl text-golf-green-50 mb-10 font-body max-w-2xl mx-auto">
            Join golfers who are using data to gain strokes on every round.
          </p>
          <Link 
            href="/signup" 
            className="inline-block bg-white text-golf-fairway hover:bg-sage-50 font-display font-bold text-lg px-10 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sage-900 text-sage-100 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Target className="w-6 h-6 text-golf-green-400" />
              <span className="text-xl font-display font-bold">Strokes Gained</span>
            </div>
            <div className="text-sage-400 font-body">
              © 2024 Strokes Gained. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
