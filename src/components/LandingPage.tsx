import React from 'react';
import { HeroSection } from './landing/HeroSection';
import { FeatureShowcase } from './landing/FeatureShowcase';
import { StatsSection } from './landing/StatsSection';
import { LandingPageNav } from './landing/LandingPageNav';
import { IoLogoApple, IoLogoAndroid, IoChevronDownOutline, IoSpeedometerOutline } from 'react-icons/io5';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <LandingPageNav onGetStarted={onGetStarted} />
      
      {/* Hero Section */}
      <HeroSection onGetStarted={onGetStarted} />
      
      {/* Arrow Down */}
      <div className="flex justify-center -mt-8 relative z-10">
        <motion.a
          href="#features"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="text-sm text-gray-400 mb-2">Discover Features</div>
          <IoChevronDownOutline size={24} className="text-orange-500" />
        </motion.a>
      </div>
      
      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-gray-900" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Incredible Features
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Everything you need to master speed reading in one application
            </motion.p>
          </div>
          
          <FeatureShowcase />
        </div>
      </section>
      
      {/* Stats Section */}
      <StatsSection />
      
      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              How Speed Reading Works
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Our scientifically-proven approach trains your brain to process information more efficiently
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: "01",
                title: "Rapid Serial Visual Presentation",
                description: "Words are displayed one at a time in the center of your vision, eliminating the need for eye movement and allowing faster processing."
              },
              {
                number: "02",
                title: "Optimal Recognition Point",
                description: "Each word is highlighted at its optimal recognition point, helping your brain identify and process words more quickly."
              },
              {
                number: "03",
                title: "Progressive Training",
                description: "Begin at your comfortable speed and gradually increase as your brain adapts, improving comprehension along with speed."
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/5"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold text-orange-500/50">
                    {step.number}
                  </div>
                  <div className="h-0.5 flex-grow bg-gray-700" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section id="benefits" className="py-24 px-6 relative bg-black/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Why Use Speed Reader?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Discover the benefits that have made thousands of readers switch to Speed Reader
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-6 rounded-2xl border border-orange-500/20"
            >
              <h3 className="text-xl font-bold mb-4 text-orange-400">Save Time</h3>
              <ul className="space-y-2">
                {[
                  "Read books in half the time",
                  "Process emails and documents faster",
                  "Consume more information in less time",
                  "Finish reading assignments quicker"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange-500 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-6 rounded-2xl border border-blue-500/20"
            >
              <h3 className="text-xl font-bold mb-4 text-blue-400">Improve Comprehension</h3>
              <ul className="space-y-2">
                {[
                  "Enhanced focus and concentration",
                  "Better information retention",
                  "Reduced subvocalization",
                  "Improved mental processing"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-gray-900" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Simple Pricing
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Start free, upgrade when you're ready
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                description: "Perfect for occasional readers",
                features: [
                  "Basic speed reading",
                  "Up to 400 WPM",
                  "5 PDF uploads per month",
                  "Basic statistics"
                ],
                buttonText: "Get Started",
                primary: false
              },
              {
                name: "Pro",
                price: "$4.99",
                period: "/month",
                description: "For serious readers and learners",
                features: [
                  "Unlimited speed reading",
                  "Up to 1000+ WPM",
                  "Unlimited PDF uploads",
                  "Advanced statistics",
                  "Text-to-speech in all languages",
                  "Translation features",
                  "Cloud backup",
                  "Priority support"
                ],
                buttonText: "Start 7-Day Free Trial",
                primary: true
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className={`border rounded-2xl overflow-hidden ${
                  plan.primary 
                    ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-orange-500/30' 
                    : 'bg-gray-900/50 border-white/10'
                }`}
              >
                <div className="p-8">
                  <div className="font-bold text-2xl mb-1">{plan.name}</div>
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-lg text-gray-400">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-gray-400 mb-6">{plan.description}</p>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`${plan.primary ? 'text-orange-500' : 'text-green-500'} mt-1`}>✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button 
                    onClick={onGetStarted}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      plan.primary 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02]' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-20 bg-orange-500/20 rounded-full blur-md"
              style={{ 
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <IoSpeedometerOutline size={48} className="text-orange-500" />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Reading?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of users who have already improved their reading speed by an average of 2.5x.
            </p>
            
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-xl font-bold shadow-lg transition-all transform hover:scale-105 hover:shadow-orange-500/25"
            >
              Start Reading Now
            </button>
            
            <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
              <div className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <IoLogoApple size={24} />
                <span>Coming soon to iOS</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <IoLogoAndroid size={24} />
                <span>Coming soon to Android</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-6 bg-black text-center">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center gap-2 mb-6">
            <IoSpeedometerOutline size={28} className="text-orange-500" />
            <h2 className="text-2xl font-bold">Speed Reader</h2>
          </div>
          
          <p className="text-gray-500 mb-6">© {new Date().getFullYear()} Speed Reader. All rights reserved.</p>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</a>
            <a href="#benefits" className="text-gray-400 hover:text-white transition-colors">Benefits</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
          </div>
          
          <div className="text-sm text-gray-600">
            Designed and built with ❤️ for speed readers everywhere
          </div>
        </div>
      </footer>
    </div>
  );
}