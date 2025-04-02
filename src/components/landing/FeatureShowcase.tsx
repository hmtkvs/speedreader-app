import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IoSpeedometerOutline, 
  IoBookOutline, 
  IoVolumeHighOutline,
  IoLanguageOutline,
  IoColorPaletteOutline,
  IoStatsChartOutline,
  IoCloudUploadOutline
} from 'react-icons/io5';

interface Feature {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  colorClass: string;
  demo?: React.ReactNode;
}

export function FeatureShowcase() {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  
  const features: Feature[] = [
    {
      id: 'speed',
      icon: <IoSpeedometerOutline size={28} />,
      title: 'Adjustable Reading Speed',
      description: 'Customize from 100 to 1000+ WPM to match your skill level and gradually improve.',
      colorClass: 'orange-500',
      demo: (
        <div className="p-4 bg-gray-900 rounded-lg text-center">
          <div className="flex justify-between mb-6 text-sm">
            <div>
              <div className="mb-1 opacity-70">100 WPM</div>
              <div className="h-10 w-10 bg-gray-800 rounded-lg"></div>
            </div>
            <div>
              <div className="mb-1 opacity-70">300 WPM</div>
              <div className="h-10 w-10 bg-orange-500 rounded-lg"></div>
            </div>
            <div>
              <div className="mb-1 opacity-70">500 WPM</div>
              <div className="h-10 w-10 bg-gray-800 rounded-lg"></div>
            </div>
          </div>
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl font-medium"
          >
            Adjust to your comfort level
          </motion.div>
        </div>
      )
    },
    {
      id: 'pdf',
      icon: <IoCloudUploadOutline size={28} />,
      title: 'PDF & Document Support',
      description: 'Upload PDFs, paste text, or import content from other sources to read faster.',
      colorClass: 'blue-500',
      demo: (
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-16 bg-blue-500/20 rounded-lg border border-blue-500/30 flex items-center justify-center">
              <IoBookOutline size={24} className="text-blue-500" />
            </div>
            <div>
              <div className="font-medium">Project Report.pdf</div>
              <div className="text-xs opacity-60">2.4 MB • 12 pages</div>
            </div>
          </div>
          <div className="h-1 bg-gray-800 rounded-full">
            <motion.div 
              className="h-1 bg-blue-500 rounded-full" 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
          <div className="mt-2 text-xs opacity-70 text-center">Uploading...</div>
        </div>
      )
    },
    {
      id: 'tts',
      icon: <IoVolumeHighOutline size={28} />,
      title: 'Text-to-Speech',
      description: 'Listen to your content with natural-sounding voices in multiple languages.',
      colorClass: 'green-500',
      demo: (
        <div className="p-4 bg-gray-900 rounded-lg text-center">
          <div className="inline-block mb-4 relative">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <IoVolumeHighOutline size={28} className="text-green-500" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-green-500 opacity-50"
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              {['af_bella', 'bm_daniel'].map((voice, i) => (
                <div 
                  key={i} 
                  className={`text-xs px-2 py-1 rounded-full flex-1 ${i === 0 ? 'bg-green-500 text-black' : 'bg-gray-800'}`}
                >
                  {voice}
                </div>
              ))}
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full">
              <motion.div 
                className="h-1 bg-green-500 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: '60%' }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'translate',
      icon: <IoLanguageOutline size={28} />,
      title: 'Translation Features',
      description: 'Instantly translate words with context while reading, perfect for language learning.',
      colorClass: 'purple-500',
      demo: (
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="mb-3 text-center font-medium">understanding</div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-lg"
          >
            <div className="text-sm font-medium text-purple-400">comprensión</div>
            <div className="text-xs opacity-70 mt-1 italic">
              "La comprensión es clave para el aprendizaje efectivo."
            </div>
            <div className="mt-2 text-xs bg-gray-800 rounded-full px-2 py-0.5 inline-block">
              <span className="opacity-70">ES</span>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      id: 'themes',
      icon: <IoColorPaletteOutline size={28} />,
      title: 'Customizable Themes',
      description: 'Personalize your reading experience with different color schemes and font options.',
      colorClass: 'yellow-500',
      demo: (
        <div className="grid grid-cols-3 gap-2 p-4 bg-gray-900 rounded-lg">
          {[
            { bg: '#171717', text: '#ffffff' },
            { bg: '#ffffff', text: '#171717' },
            { bg: '#f5f5dc', text: '#171717' },
            { bg: '#1e3a8a', text: '#ffffff' },
            { bg: '#dbeafe', text: '#171717' },
            { bg: '#374151', text: '#ffffff' },
          ].map((theme, i) => (
            <div 
              key={i} 
              className={`h-12 rounded-lg flex items-center justify-center text-sm ${i === 0 ? 'ring-2 ring-yellow-500' : ''}`}
              style={{ background: theme.bg, color: theme.text }}
            >
              Aa
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'stats',
      icon: <IoStatsChartOutline size={28} />,
      title: 'Reading Statistics',
      description: 'Track your progress with detailed analytics on speed, comprehension, and reading habits.',
      colorClass: 'red-500',
      demo: (
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between text-xs mb-2">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
          </div>
          <div className="flex items-end justify-between h-20 gap-1">
            {[30, 45, 60, 40, 70].map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 1, delay: i * 0.1 }}
                className="flex-1 bg-gradient-to-t from-red-900/60 to-red-500 rounded"
              />
            ))}
          </div>
          <div className="mt-3 text-center text-xs">
            <span className="opacity-70">Avg. Speed:</span> <span className="font-medium text-red-400">320 WPM</span>
          </div>
        </div>
      )
    }
  ];

  const handleFeatureClick = (featureId: string) => {
    if (selectedFeature === featureId) {
      setSelectedFeature(null);
    } else {
      setSelectedFeature(featureId);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature) => (
        <motion.div
          key={feature.id}
          className={`
            bg-gradient-to-br from-gray-800 to-gray-900 
            rounded-2xl border border-white/5 overflow-hidden
            cursor-pointer hover:border-${feature.colorClass}/30 transition-all
            ${selectedFeature === feature.id ? `ring-2 ring-${feature.colorClass}` : ''}
          `}
          onClick={() => handleFeatureClick(feature.id)}
          whileHover={{ y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className={`p-6 ${selectedFeature === feature.id ? 'pb-3' : ''}`}>
            <div className={`flex items-start justify-between`}>
              <div className="flex-grow">
                <div className={`mb-4 text-${feature.colorClass}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
              
              <div className={`w-6 h-6 rounded-full 
                border border-${feature.colorClass} flex items-center justify-center
                ${selectedFeature === feature.id ? `bg-${feature.colorClass} text-black` : 'text-white'}`}
              >
                {selectedFeature === feature.id ? '−' : '+'}
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {selectedFeature === feature.id && feature.demo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6"
              >
                <div className={`mt-2 border-t border-${feature.colorClass}/20 pt-3`}>
                  {feature.demo}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}