import React from 'react';
import { motion } from 'framer-motion';

interface MobileAppPreviewProps {
  colorScheme?: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function MobileAppPreview({ 
  colorScheme = { background: '#171717', text: '#ffffff', highlight: '#FF3B30' } 
}: MobileAppPreviewProps) {
  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      {/* Phone Frame */}
      <div 
        className="aspect-[9/19] rounded-[40px] overflow-hidden border-[8px] shadow-2xl"
        style={{ 
          borderColor: '#343434',
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
          backgroundImage: `linear-gradient(135deg, ${colorScheme.background}, #262626)`
        }}
      >
        <div className="h-full p-3 flex flex-col">
          {/* Status Bar */}
          <div className="h-6 flex justify-between items-center mb-4 px-2">
            <div className="text-[10px] font-medium text-white/70">9:41</div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-white/70"></div>
              <div className="w-2 h-2 rounded-full bg-white/70"></div>
              <div className="w-2 h-2 rounded-full bg-white/70"></div>
            </div>
          </div>
          
          {/* Settings Bar */}
          <div className="flex justify-end items-center mb-6 px-2">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 flex gap-3">
              <div className="w-6 h-6 rounded-md bg-white/20"></div>
              <div className="w-6 h-6 rounded-md bg-white/20"></div>
              <div className="w-6 h-6 rounded-md bg-white/20"></div>
            </div>
          </div>
          
          {/* Reading Content */}
          <div className="flex-grow flex flex-col items-center justify-center px-2">
            {/* Read Text */}
            <div className="w-full h-2 bg-white/20 rounded-full mb-4"></div>
            
            {/* Current Words */}
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
              className="mb-8 text-center"
            >
              <div className="text-[28px] font-serif inline-block whitespace-nowrap">
                <span className="text-white/70">speed</span>
                <span style={{ color: colorScheme.highlight }}> r</span>
                <span className="text-white/70">eading</span>
              </div>
            </motion.div>
            
            {/* Unread Text */}
            <div className="w-full h-2 bg-white/10 rounded-full mt-4"></div>
            
            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full mt-8">
              <motion.div
                className="h-1 rounded-full"
                style={{ background: colorScheme.highlight }}
                initial={{ width: "0%" }}
                animate={{ width: "65%" }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
              />
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex justify-between mt-6 px-2">
            <div className="w-10 h-10 rounded-xl bg-white/10"></div>
            <div className="w-10 h-10 rounded-xl bg-white/10"></div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-10 h-10 rounded-xl"
              style={{ background: colorScheme.highlight }}
            ></motion.div>
            <div className="w-10 h-10 rounded-xl bg-white/10"></div>
            <div className="w-10 h-10 rounded-xl bg-white/10"></div>
          </div>
        </div>
      </div>
      
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[90px] h-5 bg-black rounded-b-2xl" />
      
      {/* Glow Effect */}
      <div 
        className="absolute -inset-4 -z-10 opacity-50 blur-2xl"
        style={{ 
          background: `radial-gradient(circle at 50% 30%, ${colorScheme.highlight}40, transparent 70%)`,
        }}
      />
    </div>
  );
}