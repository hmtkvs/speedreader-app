import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../utils/subscription';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (planId: string) => void;
  trialDaysLeft: number | null;
  colorScheme: {
    background: string;
    text: string;
    highlight: string;
  };
}

export function SubscriptionModal({
  isOpen,
  onClose,
  onSubscribe,
  trialDaysLeft,
  colorScheme
}: SubscriptionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="max-w-2xl w-full rounded-2xl overflow-hidden"
            style={{ background: colorScheme.background }}
          >
            {/* Header */}
            <div className="p-6 text-center border-b border-current/10">
              <h2 className="text-2xl font-bold mb-2">Upgrade to Pro</h2>
              {trialDaysLeft !== null && (
                <p className="text-sm opacity-60">
                  {trialDaysLeft} days left in your trial
                </p>
              )}
            </div>

            {/* Plans */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="border border-current/10 rounded-xl p-6 flex flex-col"
                >
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-4">
                    ${plan.price}
                    <span className="text-sm opacity-60">/{plan.interval}</span>
                  </div>
                  <ul className="space-y-2 flex-grow mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onSubscribe(plan.id)}
                    className="w-full py-2 rounded-lg font-medium transition-colors"
                    style={{
                      background: colorScheme.highlight,
                      color: colorScheme.background
                    }}
                  >
                    Choose {plan.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-current/10 text-center">
              <button
                onClick={onClose}
                className="text-sm opacity-60 hover:opacity-100 transition-opacity"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}