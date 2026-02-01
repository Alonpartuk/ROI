import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InformationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getMetricInfo } from '../constants/metricGlossary';

/**
 * MetricTooltip Component
 * Global tooltip system for metric definitions, formulas, and time frames
 *
 * Features:
 * - Portal-based rendering for proper z-index stacking
 * - High z-index (z-[9999]) to appear above all content
 * - Shows definition, formula, and time frame from METRIC_GLOSSARY
 * - Mobile tap support (tap to open, tap outside to close)
 * - Hover support for desktop
 * - High contrast design for readability
 *
 * Layout:
 * - Top: Definition (Title Case)
 * - Middle: Logic/Formula (Monospace font, subtle color)
 * - Bottom: Time Frame: [Value] (Bold, brand color #00CBC0)
 */
const MetricTooltip = ({
  metricKey,
  children,
  iconSize = 'sm',
  showIcon = true,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Get metric info from glossary
  const metricInfo = getMetricInfo(metricKey);

  // Calculate tooltip position
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = rect.left + scrollX + rect.width / 2;
      let y = rect.top + scrollY;

      // Adjust for position
      if (position === 'top') {
        y -= 8;
      } else if (position === 'bottom') {
        y = rect.bottom + scrollY + 8;
      }

      // Keep tooltip within viewport bounds
      const tooltipWidth = 320; // max-w-xs = 320px
      if (x - tooltipWidth / 2 < 10) {
        x = tooltipWidth / 2 + 10;
      } else if (x + tooltipWidth / 2 > viewportWidth - 10) {
        x = viewportWidth - tooltipWidth / 2 - 10;
      }

      setCoords({ x, y });
    }
  };

  const handleShow = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleHide = () => {
    setIsVisible(false);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isVisible) {
      handleHide();
    } else {
      handleShow();
    }
  };

  // Close tooltip when clicking outside on mobile
  useEffect(() => {
    if (isVisible && isMobile) {
      const handleClickOutside = (e) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target) &&
          tooltipRef.current &&
          !tooltipRef.current.contains(e.target)
        ) {
          handleHide();
        }
      };

      // Use timeout to avoid immediate close
      const timer = setTimeout(() => {
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('click', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isVisible, isMobile]);

  // Update position on scroll/resize
  useEffect(() => {
    if (isVisible) {
      const handleUpdate = () => updatePosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isVisible]);

  // Icon size classes
  const iconSizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={!isMobile ? handleShow : undefined}
        onMouseLeave={!isMobile ? handleHide : undefined}
        onClick={isMobile ? handleToggle : handleToggle}
        onTouchStart={isMobile ? handleToggle : undefined}
        className={`inline-flex items-center cursor-help ${className}`}
      >
        {children}
        {showIcon && (
          <InformationCircleIcon
            className={`${iconSizeClasses[iconSize]} text-gray-400 hover:text-[#809292] transition-colors ml-1 flex-shrink-0`}
          />
        )}
      </span>

      {isVisible && createPortal(
        <AnimatePresence>
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: position === 'top' ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'top' ? 8 : -8 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9999] pointer-events-auto"
            style={{
              left: coords.x,
              top: position === 'top' ? coords.y : coords.y,
              transform: `translate(-50%, ${position === 'top' ? '-100%' : '0'})`,
            }}
          >
            <div className="px-4 py-3 bg-slate-900 rounded-xl shadow-2xl max-w-xs border border-slate-700">
              {/* Definition - Top Section */}
              <p className="text-sm text-white leading-relaxed mb-3">
                {metricInfo.definition}
              </p>

              {/* Formula - Middle Section */}
              <div className="pt-2 border-t border-slate-700 mb-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Formula
                </p>
                <p className="text-xs text-slate-300 font-mono leading-relaxed">
                  {metricInfo.formula}
                </p>
              </div>

              {/* Time Frame - Bottom Section (Bold, Brand Color) */}
              <div className="pt-2 border-t border-slate-700">
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="h-3.5 w-3.5 text-[#00CBC0]" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Time Frame:
                  </span>
                  <span className="text-xs font-bold text-[#00CBC0]">
                    {metricInfo.timeFrame}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-slate-700 ${
                  position === 'top'
                    ? '-bottom-1.5 border-r border-b'
                    : '-top-1.5 border-l border-t'
                }`}
              />
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

/**
 * MetricInfoIcon - Standalone info icon with tooltip
 * Use next to titles where you don't want to wrap the entire title
 */
export const MetricInfoIcon = ({
  metricKey,
  size = 'sm',
  className = '',
}) => {
  return (
    <MetricTooltip
      metricKey={metricKey}
      iconSize={size}
      showIcon={false}
      className={className}
    >
      <InformationCircleIcon
        className={`${
          size === 'xs' ? 'h-3 w-3' :
          size === 'sm' ? 'h-4 w-4' :
          size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
        } text-gray-400 hover:text-[#809292] transition-colors cursor-help`}
      />
    </MetricTooltip>
  );
};

/**
 * MetricDefinitionBanner - Full definition display for modals/detail views
 * Shows definition, formula, and time frame in an expanded format
 */
export const MetricDefinitionBanner = ({ metricKey, className = '' }) => {
  const metricInfo = getMetricInfo(metricKey);

  return (
    <div className={`p-4 bg-slate-50 rounded-xl border border-slate-100 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#809292]/10 rounded-lg flex-shrink-0">
          <InformationCircleIcon className="h-5 w-5 text-[#809292]" />
        </div>
        <div className="flex-1">
          {/* Definition */}
          <p className="text-sm text-slate-700 leading-relaxed">
            {metricInfo.definition}
          </p>

          {/* Formula */}
          <div className="mt-2 pt-2 border-t border-slate-200">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
              Calculation
            </p>
            <p className="text-xs text-slate-500 font-mono">
              {metricInfo.formula}
            </p>
          </div>

          {/* Time Frame */}
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <ClockIcon className="h-3.5 w-3.5 text-[#00CBC0]" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Time Frame:
              </span>
              <span className="text-xs font-bold text-[#00CBC0]">
                {metricInfo.timeFrame}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricTooltip;
