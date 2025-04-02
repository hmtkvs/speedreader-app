import React from 'react';
import { motion } from 'framer-motion';
import { IoChevronForward } from 'react-icons/io5';

interface SlideIndicatorProps {
  direction: 'left' | 'right';
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
  onClick: () => void;
}

export function SlideIndicator({ direction, colorScheme, onClick }: SlideIndicatorProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`fixed ${direction === 'left' ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 z-40
        w-8 h-16 ${direction === 'left' ? 'rounded-r-xl' : 'rounded-l-xl'} flex items-center justify-center
        hover:opacity-80 active:scale-95 transition-all
        touch-manipulation sm:hidden`}
      style={{ 
        background: direction === 'left'
          ? `linear-gradient(90deg, ${colorScheme.background}E6, ${colorScheme.background}99)`
          : `linear-gradient(270deg, ${colorScheme.background}E6, ${colorScheme.background}99)`,
        color: colorScheme.text
      }}
      onClick={onClick}
    >
      <motion.div
        animate={{ x: direction === 'left' ? [0, 4, 0] : [0, -4, 0] }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <IoChevronForward 
          size={20} 
          style={{ transform: direction === 'right' ? 'rotate(180deg)' : undefined }}
        />
      </motion.div>
    </motion.button>
  );
}