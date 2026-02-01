import React from 'react';
import { motion } from 'framer-motion';
import {
  RocketLaunchIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

/**
 * LayerToggle Component
 * Supplementary navigation for the 4-Layer Focus Framework
 *
 * Layers:
 * 1. Pace Control - Are we on pace? (Exec View)
 * 2. Gap Analysis - Where is the gap? (Stage/Time)
 * 3. Accountability - Who owns the gap? (Rep View)
 * 4. Action Center - What fixes it? (Deal/Contact)
 *
 * Octup Colors: #809292 (primary), #00CBC0 (cyan), #FF3489 (pink)
 */

const layers = [
  {
    id: 'pace',
    label: 'Pace',
    fullLabel: 'Pace Control',
    description: 'Are we on track?',
    icon: RocketLaunchIcon,
    color: '#00CBC0',
    bgColor: 'bg-cyan-50',
    activeColor: 'bg-cyan-500',
  },
  {
    id: 'gaps',
    label: 'Gaps',
    fullLabel: 'Gap Analysis',
    description: 'Where is the gap?',
    icon: MagnifyingGlassIcon,
    color: '#FF3489',
    bgColor: 'bg-pink-50',
    activeColor: 'bg-pink-500',
  },
  {
    id: 'reps',
    label: 'Reps',
    fullLabel: 'Accountability',
    description: 'Who owns it?',
    icon: UserGroupIcon,
    color: '#809292',
    bgColor: 'bg-gray-100',
    activeColor: 'bg-gray-600',
  },
  {
    id: 'action',
    label: 'Action',
    fullLabel: 'Action Center',
    description: 'What fixes it?',
    icon: BoltIcon,
    color: '#f59e0b',
    bgColor: 'bg-amber-50',
    activeColor: 'bg-amber-500',
  },
];

const LayerToggle = ({ activeLayer, onLayerChange, variant = 'auto', className = '' }) => {
  const handleLayerClick = (layerId) => {
    onLayerChange(layerId);

    // Scroll to layer section
    const element = document.getElementById(layerId);
    if (element) {
      const headerOffset = 80; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Desktop View - Floating vertical sidebar on right
  const DesktopView = () => (
    <div className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 ${className}`}>
      <div className="flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50">
        {layers.map((layer) => {
          const isActive = activeLayer === layer.id;
          const Icon = layer.icon;

          return (
            <motion.button
              key={layer.id}
              onClick={() => handleLayerClick(layer.id)}
              className={`
                relative flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm
                transition-all duration-200 ease-out min-w-[100px]
                ${isActive
                  ? 'text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
              whileHover={{ scale: isActive ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeLayerBgDesktop"
                  className={`absolute inset-0 rounded-xl ${layer.activeColor}`}
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{layer.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  // Mobile/Tablet View - Horizontal pills
  const MobileView = () => (
    <div className="flex items-center gap-1 p-1 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50">
      {layers.map((layer) => {
        const isActive = activeLayer === layer.id;
        const Icon = layer.icon;

        return (
          <motion.button
            key={layer.id}
            onClick={() => handleLayerClick(layer.id)}
            className={`
              relative flex items-center justify-center p-2.5 rounded-lg
              transition-all duration-200
              ${isActive
                ? 'text-white'
                : 'text-gray-500'
              }
            `}
            whileTap={{ scale: 0.95 }}
          >
            {isActive && (
              <motion.div
                layoutId="activeLayerBgMobile"
                className={`absolute inset-0 rounded-lg ${layer.activeColor}`}
                initial={false}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon className="relative h-5 w-5" />
          </motion.button>
        );
      })}
    </div>
  );

  if (variant === 'desktop') return <DesktopView />;
  if (variant === 'mobile') return <MobileView />;

  // Auto variant - show based on screen size
  return (
    <>
      <div className="hidden lg:block"><DesktopView /></div>
      <div className="lg:hidden"><MobileView /></div>
    </>
  );
};

/**
 * LayerSection Component
 * Wrapper for layer sections with optional dimming effect
 */
export const LayerSection = ({
  id,
  activeLayer,
  children,
  className = ''
}) => {
  const isActive = activeLayer === id || activeLayer === 'all';

  return (
    <section
      id={id}
      className={`
        transition-opacity duration-300 scroll-mt-20
        ${isActive ? 'opacity-100' : 'opacity-40'}
        ${className}
      `}
    >
      {children}
    </section>
  );
};

/**
 * LayerHeader Component
 * Section header for each layer
 */
export const LayerHeader = ({ layer }) => {
  const layerConfig = layers.find(l => l.id === layer);
  if (!layerConfig) return null;

  const Icon = layerConfig.icon;

  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className={`p-2 rounded-lg ${layerConfig.bgColor}`}
        style={{ color: layerConfig.color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{layerConfig.fullLabel}</h2>
        <p className="text-sm text-gray-500">{layerConfig.description}</p>
      </div>
    </div>
  );
};

export { layers };
export default LayerToggle;
