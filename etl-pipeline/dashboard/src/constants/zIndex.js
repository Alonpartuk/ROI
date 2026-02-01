/**
 * Z-Index Constants for UI Layering
 * ================================
 * Use these constants to maintain consistent z-index layering across the app.
 * Higher numbers appear above lower numbers.
 *
 * Hierarchy (bottom to top):
 * 1. Base content (default, no z-index)
 * 2. Sticky elements (headers, nav)
 * 3. Dropdowns and popovers
 * 4. Modals and overlays
 * 5. Tooltips (always on top)
 */

export const Z_INDEX = {
  // Base layer - sticky headers, nav elements
  statusBar: 20,
  nav: 40,
  floatingNav: 50,
  progressBar: 50,

  // Dropdown layer - select menus, popovers
  dropdown: 100,
  popover: 200,

  // Modal layer - dialogs, slide-overs
  modalBackdrop: 800,
  modal: 900,
  slideOver: 910,

  // Secondary modal (modal on top of modal)
  secondaryModal: 950,

  // Tooltip layer - always visible
  tooltip: 1000,
  metricInfo: 1100,

  // Maximum - for critical UI (loading overlays, etc)
  max: 9999,
};

/**
 * Tailwind class helpers
 * Use these to apply z-index in className
 */
export const Z_CLASS = {
  statusBar: 'z-20',
  nav: 'z-40',
  floatingNav: 'z-50',
  progressBar: 'z-50',
  dropdown: 'z-[100]',
  popover: 'z-[200]',
  modalBackdrop: 'z-[800]',
  modal: 'z-[900]',
  slideOver: 'z-[910]',
  secondaryModal: 'z-[950]',
  tooltip: 'z-[1000]',
  metricInfo: 'z-[1100]',
  max: 'z-[9999]',
};

export default Z_INDEX;
