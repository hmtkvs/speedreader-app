import React from 'react';
import { motion } from 'framer-motion';

export function StatsSection() {
  const stats = [
    { value: '300%', label: 'Avg. reading speed increase' },
    { value: '82%', label: 'Improved comprehension' },
    { value: '5.2M', label: 'Words read daily' },
    { value: '12K+', label: 'Active users' }
  ];
  
  return (
    <section className="py-16 px-6 bg-black/40 relative overflow-hidden">
      {/* Background elements */}
      <div 
        className="absolute inset-0 opacity-10 blur-xl"
        style={{
          backgroundImage: 'linear-gradient(45deg, #FF3B30 25%, transparent 25%), linear-gradient(-45deg, #FF3B30 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #FF3B30 75%), linear-gradient(-45deg, transparent 75%, #FF3B30 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      />
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            By the Numbers
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-gray-300 max-w-2xl mx-auto"
          >
            Join thousands of readers already transforming how they consume content
          </motion.p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="relative inline-block">
                <div
                  className="absolute -inset-4 rounded-full opacity-20 blur-lg"
                  style={{ 
                    background: `conic-gradient(from ${index * 90}deg, #FF3B30, #FF9500, #5856D6, #007AFF, #FF3B30)` 
                  }}
                />
                <div className="text-4xl md:text-5xl font-bold mb-2 relative">
                  {stat.value}
                </div>
              </div>
              <p className="text-sm md:text-base text-gray-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}