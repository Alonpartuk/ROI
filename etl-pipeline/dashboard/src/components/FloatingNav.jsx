import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Users,
  Phone,
  TrendingDown,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import OctupLogo from './OctupLogo';

/**
 * FloatingNav Component
 * Glassmorphism-style floating navigation for long-form dashboard
 *
 * Desktop: Floating pill nav at top (hides on scroll down)
 * Mobile: Fixed bottom bar (always visible, compact)
 *
 * Uses Octup brand colors
 * Admin link only visible to alon@octup.com
 */
const FloatingNav = ({ onAdminClick }) => {
  const { isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState('exec');
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const navItems = [
    { id: 'exec', label: 'Executive', shortLabel: 'Exec', icon: Sparkles, color: 'octup-primary' },
    { id: 'forecast', label: 'Forecast', shortLabel: 'Forecast', icon: TrendingUp, color: 'octup-secondary' },
    { id: 'risk', label: 'Risk Center', shortLabel: 'Risk', icon: ShieldAlert, color: 'octup-accent' },
    { id: 'performance', label: 'Performance', shortLabel: 'Reps', icon: Users, color: 'octup-primary' },
    { id: 'sdr', label: 'SDR Hub', shortLabel: 'SDR', icon: Phone, color: 'octup-warning' },
    { id: 'leakage', label: 'Leakage', shortLabel: 'Flow', icon: TrendingDown, color: 'octup-dark' },
  ];

  // Track scroll position to highlight active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Show/hide desktop nav based on scroll direction (mobile always visible)
      if (scrollY > lastScrollY && scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(scrollY);

      // Determine active section
      const sections = navItems.map(item => ({
        id: item.id,
        element: document.getElementById(item.id),
      }));

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, navItems]);

  // Smooth scroll to section with offset
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Different offset for mobile vs desktop
      const isMobile = window.innerWidth < 1024;
      const offset = isMobile ? 20 : 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Get active item style - Desktop
  const getActiveStyleDesktop = (itemId, color) => {
    const isActive = activeSection === itemId;

    if (isActive) {
      if (color === 'octup-primary') return 'bg-gradient-to-r from-[#809292] to-[#6a7a7a] text-white shadow-lg shadow-[#809292]/30';
      if (color === 'octup-secondary') return 'bg-gradient-to-r from-[#00CBC0] to-[#00a89e] text-white shadow-lg shadow-[#00CBC0]/30';
      if (color === 'octup-accent') return 'bg-gradient-to-r from-[#FF3489] to-[#d92d73] text-white shadow-lg shadow-[#FF3489]/30';
      if (color === 'octup-warning') return 'bg-gradient-to-r from-[#F9BD63] to-[#e5a84d] text-gray-900 shadow-lg shadow-[#F9BD63]/30';
      if (color === 'octup-dark') return 'bg-gradient-to-r from-[#282831] to-[#3a3a45] text-white shadow-lg shadow-[#282831]/30';
    }
    return 'text-gray-600 hover:bg-white/80 hover:text-gray-900 hover:shadow-md';
  };

  // Get active item color for mobile (simpler)
  const getMobileActiveColor = (color) => {
    if (color === 'octup-primary') return '#809292';
    if (color === 'octup-secondary') return '#00CBC0';
    if (color === 'octup-accent') return '#FF3489';
    if (color === 'octup-warning') return '#F9BD63';
    if (color === 'octup-dark') return '#282831';
    return '#809292';
  };

  return (
    <>
      {/* Logo Badge - Fixed top left, responsive sizing */}
      <div className="fixed top-2 left-2 sm:top-4 sm:left-4 z-50">
        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/80 backdrop-blur-2xl border border-white/50 shadow-xl">
          {/* Mobile: icon only, Desktop: full logo */}
          <div className="sm:hidden">
            <OctupLogo variant="icon" size="sm" />
          </div>
          <div className="hidden sm:block">
            <OctupLogo variant="full" size="sm" />
          </div>
        </div>
      </div>

      {/* Progress indicator - Octup gradient */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-[#809292] via-[#00CBC0] to-[#FF3489] transition-all duration-300"
          style={{
            width: `${(navItems.findIndex(item => item.id === activeSection) + 1) / navItems.length * 100}%`,
          }}
        />
      </div>
    </>
  );
};

export default FloatingNav;
