import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getGlossaryEntry } from '../context/GlossaryContext';

/**
 * MetricInfo Component
 * Global Overlay Strategy for metric tooltips
 *
 * Features:
 * - Simple circular '?' button with brand teal color (#00CBC0)
 * - Uses createPortal to render tooltip at document.body level (avoids z-index issues)
 * - Shows Definition, Logic, and Time Frame
 * - Mobile tap support + desktop hover
 * - Small delay on hover enter for sleek UX
 *
 * Usage (id-based - recommended):
 * <MetricInfo id="Stage Leakage" />
 *
 * Usage (inline props - for quick tooltips):
 * <MetricInfo title="My Metric" description="What this metric means" />
 */
const MetricInfo = ({ id, title, description }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Get glossary entry (from id) or use inline props
  const glossaryEntry = id ? getGlossaryEntry(id) : null;
  const entry = glossaryEntry || {
    definition: description || 'No description available.',
    logic: null,
    timeFrame: null,
  };

  // Use title prop as fallback for display
  const displayTitle = title || id;

  // Calculate tooltip position
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const viewportWidth = window.innerWidth;

      let x = rect.left + scrollX + rect.width / 2;
      let y = rect.top + scrollY - 8;

      // Keep tooltip within viewport bounds
      const tooltipWidth = 300;
      if (x - tooltipWidth / 2 < 10) {
        x = tooltipWidth / 2 + 10;
      } else if (x + tooltipWidth / 2 > viewportWidth - 10) {
        x = viewportWidth - tooltipWidth / 2 - 10;
      }

      setPosition({ x, y });
    }
  }, []);

  // Handle open with small delay for sleek hover UX
  const handleOpen = useCallback(() => {
    // Clear any pending close timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Small delay (150ms) for sleek entrance
    hoverTimeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 150);
  }, [updatePosition]);

  // Handle close
  const handleClose = useCallback(() => {
    // Clear any pending open timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsOpen(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle toggle (for mobile)
  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [isOpen, handleOpen, handleClose]);

  // Close on click outside
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e) => {
        if (
          buttonRef.current &&
          !buttonRef.current.contains(e.target) &&
          tooltipRef.current &&
          !tooltipRef.current.contains(e.target)
        ) {
          handleClose();
        }
      };

      // Delay to avoid immediate close
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 50);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen, handleClose]);

  // Update position on scroll/resize
  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => updatePosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen, updatePosition]);

  // Tooltip content rendered via portal
  const tooltipContent = isOpen ? createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[99999] pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="px-4 py-3 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 w-[300px]">
        {/* Definition */}
        <div className={entry.logic || entry.timeFrame ? 'mb-3' : ''}>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">
            Definition
          </p>
          <p className="text-sm text-white leading-relaxed">
            {entry.definition}
          </p>
        </div>

        {/* Logic - only show if available */}
        {entry.logic && (
          <div className={`pt-2 border-t border-slate-700 ${entry.timeFrame ? 'mb-3' : ''}`}>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">
              Logic
            </p>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              {entry.logic}
            </p>
          </div>
        )}

        {/* Time Frame - only show if available */}
        {entry.timeFrame && (
          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-[#00CBC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Time Frame:
              </span>
              <span className="text-sm font-bold text-[#00CBC0]">
                {entry.timeFrame}
              </span>
            </div>
          </div>
        )}

        {/* Arrow pointing down */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-slate-900 rotate-45 border-r border-b border-slate-700" />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* The Info Button - Brand Teal #00CBC0 */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#00CBC0] hover:bg-[#00b3a9] text-white text-xs font-bold cursor-help transition-all duration-150 shadow-sm hover:shadow-md ml-2 flex-shrink-0"
        style={{ fontSize: '11px', lineHeight: 1 }}
        aria-label={`Info about ${displayTitle || 'this metric'}`}
        type="button"
      >
        ?
      </button>

      {/* Tooltip rendered at body level */}
      {tooltipContent}
    </>
  );
};

export default MetricInfo;
