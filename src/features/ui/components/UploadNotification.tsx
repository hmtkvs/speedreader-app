import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCheckmarkCircle, IoCloseCircle, IoAlertCircle } from 'react-icons/io5';

/**
 * Props for UploadNotification component
 */
export interface UploadNotificationProps {
  /** Type of notification */
  type: 'success' | 'error' | 'warning';
  /** Message to display */
  message: string;
  /** Callback when the notification is closed */
  onClose: () => void;
  /** Color scheme for styling */
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

/**
 * Component displaying a notification for upload events
 */
export function UploadNotification({ 
  type, 
  message, 
  onClose, 
  colorScheme 
}: UploadNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Get the color based on notification type
  const getNotificationColor = () => {
    switch (type) {
      case 'success':
        return '#22c55e'; // green
      case 'error':
        return '#ef4444'; // red
      case 'warning':
        return '#f59e0b'; // amber/yellow
      default:
        return colorScheme.highlight;
    }
  };

  // Get the icon based on notification type
  const NotificationIcon = () => {
    switch (type) {
      case 'success':
        return <IoCheckmarkCircle className="text-green-500" size={24} />;
      case 'error':
        return <IoCloseCircle className="text-red-500" size={24} />;
      case 'warning':
        return <IoAlertCircle className="text-amber-500" size={24} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-4 left-4 z-50"
      >
        <div
          className="rounded-2xl shadow-2xl backdrop-blur-md p-4 flex items-center gap-3"
          style={{ 
            background: `linear-gradient(135deg, 
              ${colorScheme.background}E6, 
              ${colorScheme.background}99
            )`,
            boxShadow: `0 8px 32px -4px ${colorScheme.text}1A`
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle at top left, ${getNotificationColor()}0A, transparent)`,
            }}
          />
          
          <div className="relative z-10">
            <NotificationIcon />
          </div>
          
          <div className="relative z-10 flex-grow">
            <p className="text-sm" style={{ color: colorScheme.text }}>
              {message}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 