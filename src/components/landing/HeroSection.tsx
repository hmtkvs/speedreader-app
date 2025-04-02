import React from 'react';
import { motion } from 'framer-motion';
import { MobileAppPreview } from './MobileAppPreview';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black" />
      
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }}
      />
      
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-30 blur-3xl"
        style={{
          background: 'linear-gradient(to right, #FF3B30, #FF9500)'
        }}
        animate={{
          x: [0, 20, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
      />
      
      <motion.div
        className="absolute top-40 -right-20 w-60 h-60 rounded-full opacity-20 blur-3xl"
        style={{
          background: 'linear-gradient(to right, #007AFF, #5856D6)'
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
      />
      
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-32 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          <div className="lg:w-1/2">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">
                Speed Read
              </span>{' '}
              <br className="hidden sm:block" />
              Anywhere, Anytime
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-300 mb-8 max-w-xl"
            >
              Train your brain to read up to 3x faster with our cutting-edge speed reading technology. Perfect for books, articles, documents, and more.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <button 
                onClick={onGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-lg font-bold shadow-lg transition-all transform hover:scale-105 hover:shadow-xl"
              >
                Start Reading Now
              </button>
              
              <div className="mt-6 flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-gray-400">Free Trial</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span className="text-gray-400">No Credit Card</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-purple-500" />
                  <span className="text-gray-400">Instant Access</span>
                </div>
              </div>
            </motion.div>
          </div>
          
          <motion.div
            className="lg:w-1/2 max-w-sm lg:max-w-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <MobileAppPreview colorScheme={{ 
              background: '#171717', 
              text: '#ffffff', 
              highlight: '#FF3B30'
            }} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}