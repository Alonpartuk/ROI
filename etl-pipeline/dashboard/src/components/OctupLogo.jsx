import React from 'react';

/**
 * OctupLogo Component
 * Official Octup Partner logo with gradient colors
 *
 * Variants:
 * - full: Complete logo with icon + "Octup" + "partner"
 * - compact: Icon + "Octup" only
 * - icon: Just the animated ring icon
 *
 * Sizes: sm, md, lg, xl
 */
const OctupLogo = ({ variant = 'full', size = 'md', animate = false, className = '' }) => {
  // Size configurations
  const sizes = {
    sm: { icon: 24, text: 'text-sm', partner: 'text-xs' },
    md: { icon: 32, text: 'text-lg', partner: 'text-sm' },
    lg: { icon: 48, text: 'text-2xl', partner: 'text-lg' },
    xl: { icon: 64, text: 'text-4xl', partner: 'text-2xl' },
  };

  const config = sizes[size] || sizes.md;

  // Ring icon with gradient
  const RingIcon = ({ iconSize }) => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 473 474"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animate ? 'animate-spin-slow' : ''}
    >
      <defs>
        <linearGradient id={`ringGradient-${size}`} x1="360.902" y1="451.829" x2="118.339" y2="31.6898" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00C8C0"/>
          <stop offset="1" stopColor="#743CF7"/>
        </linearGradient>
      </defs>
      <path
        d="M236.984 473.404C203.324 473.404 169.692 466.246 138.683 452.162C89.1563 429.658 48.5842 390.361 24.4438 341.501C-33.3424 224.465 14.8515 82.231 131.873 24.4448C248.909 -33.3414 391.129 14.8524 448.929 131.874C462.608 159.579 470.664 189.124 472.838 219.698C473.403 227.682 467.404 234.609 459.42 235.188C451.437 235.782 444.51 229.754 443.931 221.77C442.017 194.964 434.947 169.027 422.934 144.698C372.234 42.0067 247.416 -0.28971 144.711 50.4254C42.0058 101.141 -0.290674 225.957 50.4244 328.664C93.5468 415.98 193.239 462.03 287.481 438.149C295.234 436.179 303.116 440.874 305.087 448.64C307.057 456.393 302.363 464.275 294.596 466.246C275.715 471.028 256.342 473.404 236.97 473.404H236.984ZM443.424 269.065C433.933 273.37 429.73 284.556 434.034 294.047C438.337 303.538 449.523 307.739 459.014 303.436C468.505 299.132 472.708 287.946 468.404 278.455C464.101 268.964 452.915 264.762 443.424 269.065ZM408.908 328.648C395.056 334.937 388.912 351.268 395.2 365.134C401.489 378.987 417.819 385.13 431.686 378.842C445.539 372.553 451.682 356.223 445.394 342.356C439.105 328.489 422.775 322.36 408.908 328.648ZM341.616 384.378C324.46 392.158 316.867 412.387 324.648 429.542C332.43 446.699 352.657 454.291 369.814 446.511C386.97 438.729 394.563 418.502 386.782 401.345C379 384.189 358.772 376.596 341.616 384.378Z"
        fill={`url(#ringGradient-${size})`}
      />
    </svg>
  );

  // "Octup" text
  const OctupText = () => (
    <span className={`font-bold text-[#333333] ${config.text}`}>
      Octup
    </span>
  );

  // "partner" text with gradient
  const PartnerText = () => (
    <span
      className={`font-semibold ${config.partner}`}
      style={{
        background: 'linear-gradient(90deg, #733DF7 0%, #FF3489 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      partner
    </span>
  );

  if (variant === 'icon') {
    return (
      <div className={className}>
        <RingIcon iconSize={config.icon} />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <RingIcon iconSize={config.icon} />
        <OctupText />
      </div>
    );
  }

  // Full variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <RingIcon iconSize={config.icon} />
      <div className="flex flex-col leading-tight">
        <OctupText />
        <PartnerText />
      </div>
    </div>
  );
};

export default OctupLogo;
