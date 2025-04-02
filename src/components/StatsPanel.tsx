import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IoClose, IoTrendingUp, IoTime, IoBook, IoSpeedometer, 
  IoCheckmarkCircle, IoTrendingDown, IoAlertCircle, IoStatsChart,
  IoCalendar, IoFlame, IoHeart, IoBarChart, IoHelpCircleOutline,
  IoRocket, IoInformationCircleOutline, IoTrophyOutline, IoArrowForward,
  IoPulseOutline, IoTodayOutline, IoSchoolOutline, IoCalendarOutline,
  IoBookOutline
} from 'react-icons/io5';
import { UserStats } from '../utils/statistics';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function StatsPanel({ isOpen, onClose, stats, colorScheme }: StatsPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'insights'>('overview');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<{
    wpmData: {date: string; wpm: number; percentage: number; improvement: number}[];
    readTimeData: {date: string; minutes: number; percentage: number}[];
  }>({
    wpmData: [],
    readTimeData: []
  });

  // Calculate and format metrics
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(Math.round(num));
  };
  
  const getMotivationalMessage = (stats: UserStats): string => {
    if (!stats.readingSessions.length) {
      return "Ready to improve your reading speed? Start your first session! 🚀";
    }
    
    const trend = stats.readingSessions[0]?.endWPM - stats.readingSessions[0]?.startWPM;
    
    if (trend > 50) return "Incredible progress! You're becoming a speed reading master! 🚀";
    if (trend > 20) return "Great improvement! Keep pushing your limits! 💪";
    if (trend > 0) return "You're making steady progress. Keep it up! 📈";
    if (trend === 0) return "Every practice session brings you closer to your goals! 🎯";
    return "Don't worry about temporary dips. Consistency is key to improvement! 🔄";
  };

  const getStreakCount = (stats: UserStats): number => {
    if (!stats.readingSessions.length) return 0;
    
    let streak = 0;
    const sessions = [...stats.readingSessions].sort((a, b) => b.date - a.date);
    
    // Get dates of sessions, using only the date part (year, month, day)
    const sessionDates = sessions.map(session => {
      const date = new Date(session.date);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    });
    
    // Count consecutive days, starting from today/yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();
    
    // Check if there's a session today or yesterday to start the streak
    let lastDate = sessionDates.includes(todayTime) ? todayTime : 
                   sessionDates.includes(yesterdayTime) ? yesterdayTime : null;
    
    if (!lastDate) return 0;
    
    streak = 1;
    
    // Count backward from lastDate, checking for consecutive days
    for (let i = 1; i <= 60; i++) { // Cap at 60 days for performance
      const prevDate = new Date(lastDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateTime = prevDate.getTime();
      
      if (sessionDates.includes(prevDateTime)) {
        streak++;
        lastDate = prevDateTime;
      } else {
        break; // Streak broken
      }
    }
    
    return streak;
  };

  const getReadingEfficiency = (stats: UserStats): number => {
    if (!stats.readingSessions.length) return 0;
    
    // Calculate reading efficiency score based on multiple factors:
    // 1. Consistency (streak)
    // 2. Improvement rate in WPM
    // 3. Reading volume
    
    const streak = getStreakCount(stats);
    const streakFactor = Math.min(1, streak / 7); // Max streak contribution at 7 days
    
    // Average improvement over sessions
    let avgImprovement = 0;
    if (stats.readingSessions.length > 1) {
      const improvements = [];
      for (let i = 1; i < stats.readingSessions.length; i++) {
        const currentWPM = stats.readingSessions[i].averageWPM;
        const prevWPM = stats.readingSessions[i-1].averageWPM;
        const improvement = (currentWPM - prevWPM) / prevWPM;
        improvements.push(improvement);
      }
      avgImprovement = improvements.reduce((sum, val) => sum + val, 0) / improvements.length;
    }
    const improvementFactor = Math.min(1, Math.max(0, avgImprovement + 0.5));
    
    // Reading volume factor (baseline of 2000 words per day considered good)
    const volumeFactor = Math.min(1, stats.dailyStats.totalWordsRead / 2000);
    
    // Combined score (weighted)
    return Math.round((streakFactor * 0.4 + improvementFactor * 0.4 + volumeFactor * 0.2) * 100);
  };

  const getComprehensionScore = (stats: UserStats): number => {
    // Simulated score based on reading speed and time spent per word
    if (!stats.readingSessions.length) return 75; // Default baseline
    
    const avgWPM = stats.dailyStats.averageWPM;
    
    // Comprehension tends to decrease as speed increases beyond a certain point
    // This is a simplified model - in a real app, this would be based on actual comprehension tests
    if (avgWPM < 200) return 95; // Slow reading generally has high comprehension
    if (avgWPM < 300) return 90;
    if (avgWPM < 400) return 85;
    if (avgWPM < 500) return 80;
    if (avgWPM < 600) return 75;
    if (avgWPM < 700) return 70;
    if (avgWPM < 800) return 65;
    return 60; // Ultra-fast reading may have lower comprehension without training
  };

  const getTooltipContent = (id: string): string => {
    switch (id) {
      case 'wpm':
        return 'Words Per Minute (WPM) is the standard measure of reading speed. The average adult reads at about 250-300 WPM.';
      case 'streak':
        return 'Your reading streak counts consecutive days you\'ve used the app. Maintaining a streak builds reading habits!';
      case 'efficiency':
        return 'Reading efficiency combines speed, consistency, and improvement rate into a single score.';
      case 'comprehension':
        return 'Estimated comprehension based on your reading patterns. As speed increases, maintaining high comprehension requires practice.';
      case 'improvement':
        return 'Shows how your reading speed has changed over time. Consistent practice leads to improvements!';
      case 'time-spent':
        return 'Total time spent reading today. Regular reading, even in short sessions, leads to better results.';
      case 'words-read':
        return 'Total words read today. Reading volume is important for building speed reading skills.';
      default:
        return '';
    }
  };

  // Prepare chart data
  useEffect(() => {
    if (!stats.readingSessions.length) {
      setChartData({
        wpmData: [],
        readTimeData: []
      });
      return;
    }
    
    // Process WPM data
    const sessions = [...stats.readingSessions]
      .sort((a, b) => a.date - b.date)
      .slice(-7); // Last 7 sessions
      
    const maxWPM = Math.max(...sessions.map(s => s.averageWPM));
    const minWPM = Math.min(...sessions.map(s => s.averageWPM));
    const range = maxWPM - minWPM || 1;
    
    const wpmData = sessions.map((session, index) => {
      const prevSession = index > 0 ? sessions[index - 1] : null;
      const improvement = prevSession 
        ? session.averageWPM - prevSession.averageWPM
        : 0;

      return {
        date: new Date(session.date).toLocaleDateString(undefined, { weekday: 'short' }),
        wpm: session.averageWPM,
        percentage: ((session.averageWPM - minWPM) / range) * 100,
        improvement
      };
    });
    
    // Process reading time data
    const readTimeData = sessions.map(session => {
      const minutes = session.duration / 60;
      return {
        date: new Date(session.date).toLocaleDateString(undefined, { weekday: 'short' }),
        minutes,
        percentage: (minutes / 60) * 100 // Normalize to percentage (assuming 60min is max)
      };
    });
    
    setChartData({
      wpmData,
      readTimeData
    });
  }, [stats]);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Handle touch gestures
  useEffect(() => {
    if (!isOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      setTouchStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      setTouchEnd(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;

      const distance = touchEnd - touchStart;
      const isRightSwipe = distance > 50;

      if (isRightSwipe) {
        onClose();
      }

      setTouchStart(null);
      setTouchEnd(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, touchStart, touchEnd, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: { type: 'spring', damping: 30, stiffness: 300 } }}
            exit={{ x: '100%', transition: { type: 'spring', damping: 30, stiffness: 300 } }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 z-50 overflow-hidden flex flex-col"
            style={{ 
              background: colorScheme.background,
              color: colorScheme.text
            }}
          >
            {/* Header with Tabs */}
            <div className="flex flex-col border-b border-current/10 shadow-sm sticky top-0 z-10" 
              style={{ background: colorScheme.background }}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <IoStatsChart size={24} className="opacity-60" />
                  <h2 className="text-lg font-semibold">Reading Statistics</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:opacity-70 transition-opacity"
                >
                  <IoClose size={24} />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-current/10">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 py-2 text-center relative ${activeTab === 'overview' ? 'font-semibold' : 'opacity-60'}`}
                >
                  Overview
                  {activeTab === 'overview' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: colorScheme.highlight }}
                      layoutId="activeTab"
                    />
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('progress')}
                  className={`flex-1 py-2 text-center relative ${activeTab === 'progress' ? 'font-semibold' : 'opacity-60'}`}
                >
                  Progress
                  {activeTab === 'progress' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: colorScheme.highlight }}
                      layoutId="activeTab"
                    />
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('insights')}
                  className={`flex-1 py-2 text-center relative ${activeTab === 'insights' ? 'font-semibold' : 'opacity-60'}`}
                >
                  Insights
                  {activeTab === 'insights' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: colorScheme.highlight }}
                      layoutId="activeTab"
                    />
                  )}
                </button>
              </div>
            </div>

            {/* Content - Overview Tab */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="p-4 space-y-6">
                  {/* Motivational Message */}
                  <div className="text-center p-3 rounded-xl" style={{background: `${colorScheme.highlight}20`}}>
                    <p className="font-medium" style={{ color: colorScheme.highlight }}>
                      {getMotivationalMessage(stats)}
                    </p>
                  </div>

                  {/* Key Stats Overview */}
                  <div>
                    <h3 className="text-sm font-medium opacity-60 mb-2 flex items-center justify-between">
                      <span>Key Performance</span>
                      <span className="text-xs opacity-60">Today</span>
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* WPM Card */}
                      <div className="p-3 rounded-xl relative overflow-hidden" 
                        style={{background: `${colorScheme.highlight}10`}}>
                        <div className="flex items-center gap-1 opacity-70 mb-1.5 text-xs">
                          <IoSpeedometer size={14} />
                          <span>Average Speed</span>
                          <button 
                            className="ml-auto opacity-60 hover:opacity-100"
                            onClick={() => setShowTooltip(showTooltip === 'wpm' ? null : 'wpm')}
                          >
                            <IoHelpCircleOutline size={14} />
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-bold tabular-nums">
                            {formatNumber(stats.dailyStats.averageWPM || 0)}
                          </div>
                          <div className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: `${colorScheme.highlight}40`, color: colorScheme.highlight }}>
                            WPM
                          </div>
                        </div>
                        
                        {/* WPM tooltip */}
                        {showTooltip === 'wpm' && (
                          <motion.div 
                            ref={tooltipRef}
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            className="absolute z-10 left-0 right-0 bottom-0 transform translate-y-full mt-2 p-2 rounded-lg text-xs"
                            style={{background: `${colorScheme.background}`, 
                                  boxShadow: `0 4px 12px ${colorScheme.text}30`,
                                  border: `1px solid ${colorScheme.text}20`}}
                          >
                            {getTooltipContent('wpm')}
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Reading Time Card */}
                      <div className="p-3 rounded-xl relative overflow-hidden" 
                        style={{background: `${colorScheme.highlight}10`}}>
                        <div className="flex items-center gap-1 opacity-70 mb-1.5 text-xs">
                          <IoTime size={14} />
                          <span>Time Spent</span>
                          <button 
                            className="ml-auto opacity-60 hover:opacity-100"
                            onClick={() => setShowTooltip(showTooltip === 'time-spent' ? null : 'time-spent')}
                          >
                            <IoHelpCircleOutline size={14} />
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-2xl font-bold tabular-nums">
                            {formatDuration(stats.dailyStats.totalTimeRead || 0)}
                          </div>
                          <div className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: `${colorScheme.highlight}40`, color: colorScheme.highlight }}>
                            Today
                          </div>
                        </div>
                        
                        {/* Time spent tooltip */}
                        {showTooltip === 'time-spent' && (
                          <motion.div 
                            ref={tooltipRef}
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            className="absolute z-10 left-0 right-0 bottom-0 transform translate-y-full mt-2 p-2 rounded-lg text-xs"
                            style={{background: `${colorScheme.background}`, 
                                  boxShadow: `0 4px 12px ${colorScheme.text}30`,
                                  border: `1px solid ${colorScheme.text}20`}}
                          >
                            {getTooltipContent('time-spent')}
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Words Read Card */}
                      <div className="p-3 rounded-xl relative overflow-hidden" 
                        style={{background: `${colorScheme.highlight}10`}}>
                        <div className="flex items-center gap-1 opacity-70 mb-1.5 text-xs">
                          <IoBook size={14} />
                          <span>Words Read</span>
                          <button 
                            className="ml-auto opacity-60 hover:opacity-100"
                            onClick={() => setShowTooltip(showTooltip === 'words-read' ? null : 'words-read')}
                          >
                            <IoHelpCircleOutline size={14} />
                          </button>
                        </div>
                        <div className="flex flex-col">
                          <div className="text-2xl font-bold tabular-nums mb-1">
                            {formatNumber(stats.dailyStats.totalWordsRead || 0)}
                          </div>
                          {/* Progress toward daily goal (5000 words) */}
                          <div className="w-full h-1 bg-current/10 rounded-full overflow-hidden">
                            <div 
                              className="h-1 rounded-full"
                              style={{
                                width: `${Math.min(100, (stats.dailyStats.totalWordsRead / 5000) * 100)}%`,
                                background: colorScheme.highlight
                              }}
                            />
                          </div>
                          <div className="text-xs mt-1 opacity-60">
                            {formatNumber(Math.max(0, 5000 - stats.dailyStats.totalWordsRead))} words to daily goal
                          </div>
                        </div>
                        
                        {/* Words read tooltip */}
                        {showTooltip === 'words-read' && (
                          <motion.div 
                            ref={tooltipRef}
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            className="absolute z-10 left-0 right-0 bottom-0 transform translate-y-full mt-2 p-2 rounded-lg text-xs"
                            style={{background: `${colorScheme.background}`, 
                                  boxShadow: `0 4px 12px ${colorScheme.text}30`,
                                  border: `1px solid ${colorScheme.text}20`}}
                          >
                            {getTooltipContent('words-read')}
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Reading Streak Card */}
                      <div className="p-3 rounded-xl relative overflow-hidden" 
                        style={{background: `${colorScheme.highlight}10`}}>
                        <div className="flex items-center gap-1 opacity-70 mb-1.5 text-xs">
                          <IoCalendar size={14} />
                          <span>Streak</span>
                          <button 
                            className="ml-auto opacity-60 hover:opacity-100"
                            onClick={() => setShowTooltip(showTooltip === 'streak' ? null : 'streak')}
                          >
                            <IoHelpCircleOutline size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold tabular-nums">
                            {getStreakCount(stats)}
                          </div>
                          <IoFlame 
                            className="ml-1" 
                            size={20} 
                            style={{color: getStreakCount(stats) > 0 ? colorScheme.highlight : undefined}}
                          />
                          <div className="text-xs font-medium ml-auto px-2 py-0.5 rounded-full"
                            style={{ background: `${colorScheme.highlight}40`, color: colorScheme.highlight }}>
                            Days
                          </div>
                        </div>
                        
                        {/* Streak tooltip */}
                        {showTooltip === 'streak' && (
                          <motion.div 
                            ref={tooltipRef}
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            className="absolute z-10 left-0 right-0 bottom-0 transform translate-y-full mt-2 p-2 rounded-lg text-xs"
                            style={{background: `${colorScheme.background}`, 
                                  boxShadow: `0 4px 12px ${colorScheme.text}30`,
                                  border: `1px solid ${colorScheme.text}20`}}
                          >
                            {getTooltipContent('streak')}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div>
                    <h3 className="text-sm font-medium opacity-60 mb-2">Performance Metrics</h3>
                    <div className="space-y-3">
                      {/* Reading Efficiency */}
                      <div className="p-3 rounded-xl relative overflow-hidden" 
                        style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className="flex items-center gap-1 opacity-70 mb-1.5 text-xs">
                          <IoPulseOutline size={14} />
                          <span>Reading Efficiency</span>
                          <button 
                            className="ml-auto opacity-60 hover:opacity-100"
                            onClick={() => setShowTooltip(showTooltip === 'efficiency' ? null : 'efficiency')}
                          >
                            <IoHelpCircleOutline size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center mb-2">
                          <div className="text-xl font-bold tabular-nums mr-2">
                            {getReadingEfficiency(stats)}%
                          </div>
                          <div className="flex-grow h-2 bg-current/10 rounded-full overflow-hidden">
                            <div 
                              className="h-2 rounded-full"
                              style={{
                                width: `${getReadingEfficiency(stats)}%`,
                                background: getReadingEfficiency(stats) > 80 
                                  ? '#22c55e' 
                                  : getReadingEfficiency(stats) > 50 
                                    ? colorScheme.highlight 
                                    : '#eab308'
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="text-xs opacity-60">
                          {getReadingEfficiency(stats) >= 80 
                            ? 'Excellent! You have highly efficient reading habits.' 
                            : getReadingEfficiency(stats) >= 60
                              ? 'Good progress. Keep working on your consistency.'
                              : 'Build regular reading habits to improve this score.'}
                        </div>
                        
                        {/* Efficiency tooltip */}
                        {showTooltip === 'efficiency' && (
                          <motion.div 
                            ref={tooltipRef}
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            className="absolute z-10 left-0 right-0 bottom-0 transform translate-y-full mt-2 p-2 rounded-lg text-xs"
                            style={{background: `${colorScheme.background}`, 
                                  boxShadow: `0 4px 12px ${colorScheme.text}30`,
                                  border: `1px solid ${colorScheme.text}20`}}
                          >
                            {getTooltipContent('efficiency')}
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Comprehension Score */}
                      <div className="p-3 rounded-xl relative overflow-hidden" 
                        style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className="flex items-center gap-1 opacity-70 mb-1.5 text-xs">
                          <IoSchoolOutline size={14} />
                          <span>Estimated Comprehension</span>
                          <button 
                            className="ml-auto opacity-60 hover:opacity-100"
                            onClick={() => setShowTooltip(showTooltip === 'comprehension' ? null : 'comprehension')}
                          >
                            <IoHelpCircleOutline size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center mb-2">
                          <div className="text-xl font-bold tabular-nums mr-2">
                            {getComprehensionScore(stats)}%
                          </div>
                          <div className="flex-grow h-2 bg-current/10 rounded-full overflow-hidden">
                            <div 
                              className="h-2 rounded-full"
                              style={{
                                width: `${getComprehensionScore(stats)}%`,
                                background: getComprehensionScore(stats) > 85 
                                  ? '#22c55e' 
                                  : getComprehensionScore(stats) > 70 
                                    ? colorScheme.highlight 
                                    : '#eab308'
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="text-xs opacity-60">
                          {getComprehensionScore(stats) > 85 
                            ? 'Excellent comprehension at your current speed!' 
                            : getComprehensionScore(stats) > 70 
                              ? 'Good comprehension. Balance speed with understanding.'
                              : 'Consider slowing down to improve comprehension.'}
                        </div>
                        
                        {/* Comprehension tooltip */}
                        {showTooltip === 'comprehension' && (
                          <motion.div 
                            ref={tooltipRef}
                            initial={{opacity: 0, y: 10}}
                            animate={{opacity: 1, y: 0}}
                            className="absolute z-10 left-0 right-0 bottom-0 transform translate-y-full mt-2 p-2 rounded-lg text-xs"
                            style={{background: `${colorScheme.background}`, 
                                  boxShadow: `0 4px 12px ${colorScheme.text}30`,
                                  border: `1px solid ${colorScheme.text}20`}}
                          >
                            {getTooltipContent('comprehension')}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Last Session Summary */}
                  {stats.readingSessions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium opacity-60 mb-2 flex items-center">
                        <IoTodayOutline size={14} className="mr-1" />
                        Last Session Summary
                      </h3>
                      <div className="p-3 rounded-xl space-y-3"
                        style={{background: `${colorScheme.highlight}10`}}>
                        <div className="flex justify-between items-center">
                          <div className="text-sm opacity-70">Date</div>
                          <div className="font-medium">
                            {new Date(stats.readingSessions[0]?.date || Date.now()).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm opacity-70">Duration</div>
                          <div className="font-medium">{formatDuration(stats.readingSessions[0]?.duration || 0)}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm opacity-70">Words Read</div>
                          <div className="font-medium">{formatNumber(stats.readingSessions[0]?.wordsRead || 0)}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm opacity-70">Average Speed</div>
                          <div className="font-medium flex items-center">
                            {formatNumber(stats.readingSessions[0]?.averageWPM || 0)} WPM
                            {stats.readingSessions[0]?.averageWPM > 400 && (
                              <IoRocket className="text-purple-500 ml-1" size={14} />
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm opacity-70">Improvement</div>
                          <div className={`font-medium ${
                            (stats.readingSessions[0]?.endWPM || 0) > (stats.readingSessions[0]?.startWPM || 0)
                              ? 'text-green-500'
                              : (stats.readingSessions[0]?.endWPM || 0) < (stats.readingSessions[0]?.startWPM || 0)
                                ? 'text-yellow-500'
                                : ''
                          }`}>
                            {(stats.readingSessions[0]?.endWPM || 0) - (stats.readingSessions[0]?.startWPM || 0) > 0 ? '+' : ''}
                            {formatNumber((stats.readingSessions[0]?.endWPM || 0) - (stats.readingSessions[0]?.startWPM || 0))} WPM
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Improvement Tips (personalized based on stats) */}
                  <div>
                    <h3 className="text-sm font-medium opacity-60 mb-2">Personalized Tips</h3>
                    <div className="p-3 rounded-xl space-y-2"
                      style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                      
                      {/* Different tips based on user's stats */}
                      {stats.dailyStats.averageWPM < 200 && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 text-green-500 flex-shrink-0"><IoCheckmarkCircle size={16} /></div>
                          <div className="text-sm">Try increasing your WPM by 10% in each session to build speed gradually.</div>
                        </div>
                      )}
                      
                      {stats.dailyStats.averageWPM >= 200 && stats.dailyStats.averageWPM < 400 && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 text-green-500 flex-shrink-0"><IoCheckmarkCircle size={16} /></div>
                          <div className="text-sm">Practice with more complex material to maintain comprehension at higher speeds.</div>
                        </div>
                      )}
                      
                      {stats.dailyStats.averageWPM >= 400 && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 text-green-500 flex-shrink-0"><IoCheckmarkCircle size={16} /></div>
                          <div className="text-sm">Focus on retention exercises to ensure you're absorbing information at high speeds.</div>
                        </div>
                      )}
                      
                      {getStreakCount(stats) < 3 && (
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 text-green-500 flex-shrink-0"><IoCheckmarkCircle size={16} /></div>
                          <div className="text-sm">Set a consistent daily reading time to build a strong reading habit.</div>
                        </div>
                      )}
                      
                      {stats.dailyStats.totalTimeRead < 600 && ( // Less than 10 minutes
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 text-green-500 flex-shrink-0"><IoCheckmarkCircle size={16} /></div>
                          <div className="text-sm">Aim for at least 15 minutes of daily reading practice for best results.</div>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 text-green-500 flex-shrink-0"><IoCheckmarkCircle size={16} /></div>
                        <div className="text-sm">Try different color schemes to reduce eye strain during longer sessions.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Content - Progress Tab */}
              {activeTab === 'progress' && (
                <div className="p-4 space-y-6">
                  {/* Reading Speed Progress */}
                  <div>
                    <h3 className="text-sm font-medium opacity-60 mb-2 flex items-center justify-between">
                      <span>Reading Speed Progress</span>
                      <button 
                        className="opacity-60 hover:opacity-100"
                        onClick={() => setShowTooltip(showTooltip === 'improvement' ? null : 'improvement')}
                      >
                        <IoHelpCircleOutline size={14} />
                      </button>
                    </h3>
                    
                    {/* Chart tooltip */}
                    {showTooltip === 'improvement' && (
                      <motion.div 
                        ref={tooltipRef}
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        className="mb-2 p-2 rounded-lg text-xs"
                        style={{background: `${colorScheme.text}10`}}
                      >
                        {getTooltipContent('improvement')}
                      </motion.div>
                    )}
                    
                    {chartData.wpmData.length > 0 ? (
                      <div className="bg-current/5 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-2xl font-bold tabular-nums" style={{ color: colorScheme.highlight }}>
                            {formatNumber(stats.dailyStats.averageWPM || 0)}
                            <span className="text-sm opacity-60 ml-1">WPM</span>
                          </div>
                        </div>
                        
                        {/* WPM Chart */}
                        <div className="space-y-4">
                          {chartData.wpmData.map((day, index) => (
                            <div
                              key={`wpm-${index}`}
                              className="relative pb-6"
                            >
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="opacity-60">{day.date}</span>
                                <span className="font-medium">{formatNumber(day.wpm)} WPM</span>
                              </div>
                              <div className="h-2 bg-current/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${day.percentage}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full rounded-full"
                                  style={{ 
                                    background: day.improvement > 0 
                                      ? '#22c55e' 
                                      : day.improvement < 0 
                                        ? '#eab308'
                                        : colorScheme.highlight
                                  }}
                                />
                              </div>
                              <div 
                                className={`absolute right-0 bottom-0 text-xs flex items-center gap-1
                                  ${day.improvement > 0 ? 'text-green-500' : day.improvement < 0 ? 'text-yellow-500' : 'text-blue-500'}`}
                              >
                                {day.improvement > 0 ? (
                                  <>
                                    <IoTrendingUp size={12} />
                                    <span>+{formatNumber(day.improvement)}</span>
                                  </>
                                ) : day.improvement < 0 ? (
                                  <>
                                    <IoTrendingDown size={12} />
                                    <span>{formatNumber(day.improvement)}</span>
                                  </>
                                ) : (
                                  <span>No change</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Improvement Summary */}
                        {stats.readingSessions.length > 1 && (
                          <div className="mt-4 pt-3 border-t border-current/10">
                            <div className="flex items-center justify-between">
                              <span className="text-sm opacity-60">Overall Progress</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${
                                  stats.dailyStats.averageWPM > (stats.readingSessions.slice(-1)[0]?.startWPM || 0)
                                    ? 'text-green-500'
                                    : 'text-yellow-500'
                                }`}>
                                  {stats.dailyStats.averageWPM > (stats.readingSessions.slice(-1)[0]?.startWPM || 0) ? '+' : ''}
                                  {Math.round(
                                    ((stats.dailyStats.averageWPM - (stats.readingSessions.slice(-1)[0]?.startWPM || stats.dailyStats.averageWPM)) /
                                      (stats.readingSessions.slice(-1)[0]?.startWPM || 1)) * 100
                                  )}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-current/5 rounded-xl p-6 text-center">
                        <IoBarChart size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Complete your first reading session to see your progress!</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Reading Time Distribution */}
                  <div>
                    <h3 className="text-sm font-medium opacity-60 mb-2">Reading Time Distribution</h3>
                    
                    {chartData.readTimeData.length > 0 ? (
                      <div className="bg-current/5 rounded-xl p-3">
                        <div className="flex items-end justify-between h-32 gap-1 mt-2 mb-2">
                          {chartData.readTimeData.map((day, i) => (
                            <div key={`time-${i}`} className="flex-1 flex flex-col items-center">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${day.percentage}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className="w-full rounded-t"
                                style={{ 
                                  background: `linear-gradient(to top, ${colorScheme.highlight}99, ${colorScheme.highlight}40)`,
                                  minHeight: day.minutes > 0 ? '8px' : '0'
                                }}
                              />
                              <div className="text-xs mt-1 w-full text-center truncate opacity-60">
                                {day.date}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="p-2 text-center bg-current/5 rounded-lg">
                            <div className="text-xs opacity-60">Daily Avg</div>
                            <div className="font-medium">
                              {formatDuration(
                                stats.readingSessions.reduce((sum, s) => sum + s.duration, 0) / 
                                Math.max(1, stats.readingSessions.length)
                              )}
                            </div>
                          </div>
                          <div className="p-2 text-center bg-current/5 rounded-lg">
                            <div className="text-xs opacity-60">Total</div>
                            <div className="font-medium">
                              {formatDuration(
                                stats.readingSessions.reduce((sum, s) => sum + s.duration, 0)
                              )}
                            </div>
                          </div>
                          <div className="p-2 text-center bg-current/5 rounded-lg">
                            <div className="text-xs opacity-60">Sessions</div>
                            <div className="font-medium">
                              {stats.readingSessions.length}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-current/5 rounded-xl p-6 text-center">
                        <IoTime size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Complete your first reading session to see your time distribution!</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Reading Goals Progress */}
                  <div>
                    <h3 className="text-sm font-medium opacity-60 mb-2">Reading Goals</h3>
                    
                    <div className="space-y-3">
                      {/* Speed Goal */}
                      <div className="p-3 rounded-xl" style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <IoSpeedometer size={16} className="opacity-70" />
                            <span className="text-sm font-medium">Speed Goal</span>
                          </div>
                          <div className="text-sm font-medium">
                            {formatNumber(stats.dailyStats.averageWPM || 0)} / 500 WPM
                          </div>
                        </div>
                        
                        <div className="w-full h-2 bg-current/10 rounded-full overflow-hidden">
                          <div 
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, ((stats.dailyStats.averageWPM || 0) / 500) * 100)}%`,
                              background: 
                                (stats.dailyStats.averageWPM || 0) >= 500 
                                  ? '#22c55e'
                                  : (stats.dailyStats.averageWPM || 0) >= 300
                                    ? colorScheme.highlight
                                    : '#eab308'
                            }}
                          />
                        </div>
                        
                        <div className="mt-1 text-xs opacity-60">
                          {(stats.dailyStats.averageWPM || 0) >= 500 
                            ? 'Congratulations! You\'ve reached the advanced reader level.'
                            : (stats.dailyStats.averageWPM || 0) >= 300
                              ? 'Good progress! Keep pushing toward the 500 WPM goal.'
                              : 'Keep practicing to reach the intermediate level of 300+ WPM.'}
                        </div>
                      </div>
                      
                      {/* Consistency Goal */}
                      <div className="p-3 rounded-xl" style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <IoCalendarOutline size={16} className="opacity-70" />
                            <span className="text-sm font-medium">Consistency Goal</span>
                          </div>
                          <div className="text-sm font-medium">
                            {getStreakCount(stats)} / 7 days
                          </div>
                        </div>
                        
                        <div className="w-full h-2 bg-current/10 rounded-full overflow-hidden">
                          <div 
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, (getStreakCount(stats) / 7) * 100)}%`,
                              background: 
                                getStreakCount(stats) >= 7 
                                  ? '#22c55e'
                                  : getStreakCount(stats) >= 3
                                    ? colorScheme.highlight
                                    : '#eab308'
                            }}
                          />
                        </div>
                        
                        <div className="mt-1 text-xs opacity-60">
                          {getStreakCount(stats) >= 7 
                            ? 'Excellent work maintaining your weekly streak!'
                            : getStreakCount(stats) >= 3
                              ? 'Good start! Keep reading daily to reach your 7-day streak.'
                              : getStreakCount(stats) > 0
                                ? `You're on day ${getStreakCount(stats)}. Keep going!`
                                : 'Start your streak today by completing a reading session.'}
                        </div>
                      </div>
                      
                      {/* Volume Goal */}
                      <div className="p-3 rounded-xl" style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <IoBook size={16} className="opacity-70" />
                            <span className="text-sm font-medium">Weekly Volume</span>
                          </div>
                          <div className="text-sm font-medium">
                            {formatNumber(Math.min(35000, 
                              stats.readingSessions
                                .filter(s => s.date > Date.now() - 7 * 24 * 60 * 60 * 1000)
                                .reduce((sum, s) => sum + s.wordsRead, 0)
                            ))} / 35,000 words
                          </div>
                        </div>
                        
                        <div className="w-full h-2 bg-current/10 rounded-full overflow-hidden">
                          <div 
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, (Math.min(35000, 
                                stats.readingSessions
                                  .filter(s => s.date > Date.now() - 7 * 24 * 60 * 60 * 1000)
                                  .reduce((sum, s) => sum + s.wordsRead, 0)
                              ) / 35000) * 100)}%`,
                              background: colorScheme.highlight
                            }}
                          />
                        </div>
                        
                        <div className="mt-1 text-xs opacity-60">
                          Reading approximately 5,000 words daily helps build your skills faster.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Content - Insights Tab */}
              {activeTab === 'insights' && (
                <div className="p-4 space-y-6">
                  {/* Reading Metrics Summary */}
                  <div>
                    <h3 className="text-sm font-medium opacity-60 mb-2">Reading Metrics</h3>
                    
                    {stats.readingSessions.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {/* Speed Range Card */}
                        <div className="p-3 rounded-xl" 
                          style={{background: `${colorScheme.highlight}10`}}>
                          <div className="text-xs opacity-60 mb-1">Speed Range</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-semibold">
                              {formatNumber(
                                Math.min(...stats.readingSessions.map(s => s.averageWPM))
                              )}
                            </span>
                            <span className="text-sm opacity-60">-</span>
                            <span className="text-lg font-semibold">
                              {formatNumber(
                                Math.max(...stats.readingSessions.map(s => s.averageWPM))
                              )}
                            </span>
                            <span className="text-xs opacity-60 ml-1">WPM</span>
                          </div>
                        </div>
                        
                        {/* Longest Session */}
                        <div className="p-3 rounded-xl" 
                          style={{background: `${colorScheme.highlight}10`}}>
                          <div className="text-xs opacity-60 mb-1">Longest Session</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-semibold">
                              {formatDuration(
                                Math.max(...stats.readingSessions.map(s => s.duration))
                              )}
                            </span>
                          </div>
                        </div>
                        
                        {/* Most Words */}
                        <div className="p-3 rounded-xl" 
                          style={{background: `${colorScheme.highlight}10`}}>
                          <div className="text-xs opacity-60 mb-1">Most Words in Session</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-semibold">
                              {formatNumber(
                                Math.max(...stats.readingSessions.map(s => s.wordsRead))
                              )}
                            </span>
                          </div>
                        </div>
                        
                        {/* Total Sessions */}
                        <div className="p-3 rounded-xl" 
                          style={{background: `${colorScheme.highlight}10`}}>
                          <div className="text-xs opacity-60 mb-1">Total Sessions</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-semibold">
                              {stats.readingSessions.length}
                            </span>
                          </div>
                        </div>
                        
                        {/* Total Reading Time */}
                        <div className="p-3 rounded-xl" 
                          style={{background: `${colorScheme.highlight}10`}}>
                          <div className="text-xs opacity-60 mb-1">Total Reading Time</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-semibold">
                              {formatDuration(
                                stats.readingSessions.reduce((sum, s) => sum + s.duration, 0)
                              )}
                            </span>
                          </div>
                        </div>
                        
                        {/* Total Words Read */}
                        <div className="p-3 rounded-xl" 
                          style={{background: `${colorScheme.highlight}10`}}>
                          <div className="text-xs opacity-60 mb-1">Total Words Read</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-semibold">
                              {formatNumber(
                                stats.readingSessions.reduce((sum, s) => sum + s.wordsRead, 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-current/5 rounded-xl p-6 text-center">
                        <IoInformationCircleOutline size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Complete at least one reading session to see your insights!</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Reading Achievements */}
                  <div>
                    <h3 className="text-sm font-medium opacity-60 mb-2">Achievements</h3>
                    
                    <div className="space-y-2">
                      {/* WPM Milestone */}
                      <div className={`p-3 rounded-xl flex items-center ${
                        stats.dailyStats.averageWPM >= 300 ? 'opacity-100' : 'opacity-50'
                      }`} style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          stats.dailyStats.averageWPM >= 300 
                            ? `text-white`
                            : 'bg-current/10'
                        }`} style={{
                          background: stats.dailyStats.averageWPM >= 300 ? colorScheme.highlight : undefined
                        }}>
                          <IoTrophyOutline size={20} />
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-sm">Intermediate Reader</div>
                          <div className="text-xs opacity-60">Reached 300+ WPM reading speed</div>
                        </div>
                        {stats.dailyStats.averageWPM < 300 && (
                          <div className="ml-auto">
                            <IoArrowForward size={16} className="opacity-40" />
                          </div>
                        )}
                      </div>
                      
                      {/* Advanced Reader */}
                      <div className={`p-3 rounded-xl flex items-center ${
                        stats.dailyStats.averageWPM >= 500 ? 'opacity-100' : 'opacity-50'
                      }`} style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          stats.dailyStats.averageWPM >= 500 
                            ? `text-white`
                            : 'bg-current/10'
                        }`} style={{
                          background: stats.dailyStats.averageWPM >= 500 ? colorScheme.highlight : undefined
                        }}>
                          <IoTrophyOutline size={20} />
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-sm">Advanced Reader</div>
                          <div className="text-xs opacity-60">Reached 500+ WPM reading speed</div>
                        </div>
                        {stats.dailyStats.averageWPM < 500 && (
                          <div className="ml-auto">
                            <IoArrowForward size={16} className="opacity-40" />
                          </div>
                        )}
                      </div>
                      
                      {/* Consistency Champion */}
                      <div className={`p-3 rounded-xl flex items-center ${
                        getStreakCount(stats) >= 7 ? 'opacity-100' : 'opacity-50'
                      }`} style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          getStreakCount(stats) >= 7
                            ? `text-white`
                            : 'bg-current/10'
                        }`} style={{
                          background: getStreakCount(stats) >= 7 ? colorScheme.highlight : undefined
                        }}>
                          <IoFlame size={20} />
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-sm">Consistency Champion</div>
                          <div className="text-xs opacity-60">Maintained a 7-day reading streak</div>
                        </div>
                        {getStreakCount(stats) < 7 && (
                          <div className="ml-auto">
                            <IoArrowForward size={16} className="opacity-40" />
                          </div>
                        )}
                      </div>
                      
                      {/* Word Count Milestone */}
                      <div className={`p-3 rounded-xl flex items-center ${
                        stats.readingSessions.reduce((sum, s) => sum + s.wordsRead, 0) >= 100000 
                          ? 'opacity-100' : 'opacity-50'
                      }`} style={{background: colorScheme.background, border: `1px solid ${colorScheme.text}10`}}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          stats.readingSessions.reduce((sum, s) => sum + s.wordsRead, 0) >= 100000
                            ? `text-white`
                            : 'bg-current/10'
                        }`} style={{
                          background: stats.readingSessions.reduce((sum, s) => sum + s.wordsRead, 0) >= 100000 
                            ? colorScheme.highlight : undefined
                        }}>
                          <IoBook size={20} />
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-sm">Bookworm</div>
                          <div className="text-xs opacity-60">Read over 100,000 words</div>
                        </div>
                        {stats.readingSessions.reduce((sum, s) => sum + s.wordsRead, 0) < 100000 && (
                          <div className="ml-auto text-xs opacity-60">
                            {formatNumber(stats.readingSessions.reduce((sum, s) => sum + s.wordsRead, 0))}/100,000
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Reading Sessions History */}
                  <div className="pb-[60px]">
                    <h3 className="text-sm font-medium opacity-60 mb-2 flex justify-between items-center">
                      <span>Recent Sessions</span>
                      {stats.readingSessions.length > 5 && (
                        <button className="text-xs opacity-60 hover:opacity-100 transition-opacity">
                          View All
                        </button>
                      )}
                    </h3>
                    {stats.readingSessions.length > 0 ? (
                      <div className="space-y-2">
                        {stats.readingSessions.slice(0, 5).map((session, index) => (
                          <div
                            key={`session-${index}`}
                            className="p-3 rounded-lg bg-current/5 flex items-center justify-between"
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {new Date(session.date).toLocaleDateString()}
                              </div>
                              <div className="text-xs opacity-60">
                                {formatDuration(session.duration)} • {formatNumber(session.wordsRead)} words
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {formatNumber(session.averageWPM)} WPM
                                {session.averageWPM > 400 && (
                                  <IoRocket className="inline ml-1 text-purple-500" size={14} />
                                )}
                              </div>
                              <div className={`text-xs ${
                                session.endWPM > session.startWPM 
                                  ? 'text-green-500' 
                                  : session.endWPM < session.startWPM
                                  ? 'text-yellow-500'
                                  : 'text-blue-500'
                              }`}>
                                {session.endWPM - session.startWPM > 0 ? '+' : ''}
                                {formatNumber(session.endWPM - session.startWPM)} WPM
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-current/5 rounded-xl p-6 text-center">
                        <IoBookOutline size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No reading sessions found. Start reading to track your progress!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Overall Progress - Fixed at Bottom */}
              <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-current/10 z-10"
                style={{ background: colorScheme.background }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-60">Overall Progress</span>
                  <div className="flex items-center gap-2">
                    {stats.readingSessions.length > 0 && (
                      <>
                        <span className={`text-sm font-medium ${
                          stats.dailyStats.averageWPM > (stats.readingSessions[0]?.startWPM || 0)
                            ? 'text-green-500'
                            : 'text-yellow-500'
                        }`}>
                          {stats.dailyStats.averageWPM > (stats.readingSessions[0]?.startWPM || 0) ? '+' : ''}
                          {Math.round(
                            ((stats.dailyStats.averageWPM - (stats.readingSessions[0]?.startWPM || stats.dailyStats.averageWPM)) /
                              (stats.readingSessions[0]?.startWPM || 1)) * 100
                          )}%
                        </span>
                        {stats.dailyStats.averageWPM > (stats.readingSessions[0]?.startWPM || 0) && (
                          <IoHeart className="text-red-500 animate-pulse" size={16} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}