# Accessibility Testing Guide

## Quick Reference

This guide helps verify WCAG 2.2 AA compliance for the WAPAR dashboard.

## Automated Testing (When Network Available)

### Option 1: axe DevTools Browser Extension
1. Install [axe DevTools](https://www.deque.com/axe/devtools/) in Chrome/Firefox
2. Open browser DevTools (F12)
3. Navigate to "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review and fix any Critical or Serious issues

### Option 2: Lighthouse in Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Accessibility" category
4. Click "Analyze page load"
5. Review accessibility score and recommendations

### Option 3: Command Line (requires network)
```bash
# Install pa11y globally
npm install -g pa11y

# Start dev server
npm run dev

# In another terminal, test pages
pa11y http://localhost:5173
```

## Manual Keyboard Testing

### Navigation Checklist
Open the dashboard and verify:

#### Tab Order
- [ ] Press Tab - focus moves to first interactive element
- [ ] Continue Tab - focus moves in logical order (top-to-bottom, left-to-right)
- [ ] Shift+Tab - focus moves backward in reverse order
- [ ] Focus is ALWAYS visible (outline or other indicator)
- [ ] No keyboard traps (can Tab out of every component)

#### Tab Navigation (Dashboard Sections)
- [ ] Arrow Right/Down - moves to next tab
- [ ] Arrow Left/Up - moves to previous tab
- [ ] Home - jumps to first tab
- [ ] End - jumps to last tab
- [ ] Enter/Space - activates focused tab

#### Charts
- [ ] Tab to chart canvas
- [ ] Press Enter or Space - toggles data table
- [ ] Tab to "Show data table" button
- [ ] Enter - toggles table visibility
- [ ] If table visible, Tab into table cells

#### Geographic Map
- [ ] Tab to "Top 10 countries" list items
- [ ] Enter - highlights country on map
- [ ] Tab to map countries (may need many Tabs)
- [ ] Enter - opens country details modal
- [ ] Tab to "Show country data table" button
- [ ] Enter - displays full country table

#### Modal Dialogs
- [ ] Open country details modal
- [ ] Tab - focus stays within modal
- [ ] ESC - closes modal
- [ ] Click outside modal - closes modal
- [ ] After close, focus returns to trigger element

### Screen Reader Testing

Test with one of:
- **NVDA** (Windows, free): https://www.nvaccess.org/
- **JAWS** (Windows, commercial): https://www.freedomscientific.com/products/software/jaws/
- **VoiceOver** (macOS, built-in): Cmd+F5

#### Reading Order Test
1. Turn on screen reader
2. Load dashboard
3. Navigate with Down Arrow (reads next element)
4. Verify reading order matches visual order
5. Verify all content is announced

#### Charts & Images Test  
1. Navigate to MarketShareChart
2. Verify chart purpose is announced (e.g., "Market share distribution chart")
3. Verify data summary is read
4. Tab to data table toggle
5. Activate toggle
6. Verify table data is readable row-by-row

#### Interactive Elements Test
1. Tab to each button
2. Verify button purpose is announced
3. Verify button state if applicable (expanded/collapsed, pressed)
4. Activate buttons with Enter/Space
5. Verify action result is announced

#### Map Test
1. Tab to map countries
2. Verify country name and installation count announced
3. Verify "Press Enter to view details" instruction
4. Activate with Enter
5. Verify modal content is read

### Visual Testing

#### Zoom Test
1. Set browser zoom to 200% (Ctrl/Cmd + Plus)
2. Verify all content is readable
3. Verify no content is cut off or overlaps
4. Verify no horizontal scrolling on desktop

#### Mobile Responsive Test
1. Resize browser to 320px width
2. Verify layout adapts properly
3. Verify no horizontal scrolling
4. Verify touch targets are at least 44x44px

#### Focus Indicators Test
1. Tab through all interactive elements
2. Verify each element shows visible focus indicator
3. Verify focus indicator has sufficient contrast (3:1 minimum)
4. Verify focus indicator is not hidden by other elements

#### Color Contrast Test
Use browser extension or online tool:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

Check key color combinations:
- [ ] Body text (text-gray-900 on white): should be ~15:1 ✅
- [ ] Secondary text (text-gray-600 on white): should be ~8:1 ✅  
- [ ] Link text (text-blue-600 on white): should be ~8.6:1 ✅
- [ ] Success text (text-green-600 on white): should be ~6.3:1 ✅
- [ ] Warning text (text-orange-600 on white): should be ~5.5:1 ✅

#### Reduced Motion Test
1. Enable reduced motion in OS:
   - **Windows**: Settings > Accessibility > Visual effects > Animation effects OFF
   - **macOS**: System Preferences > Accessibility > Display > Reduce motion
2. Reload dashboard
3. Verify no chart animations occur
4. Verify transitions are instant or simplified

### Color Blindness Simulation

Use browser extension to simulate:
- [ChromeLens](https://chrome.google.com/webstore/detail/chromelens/) (Chrome)
- [Color Oracle](https://colororacle.org/) (Desktop app)

Test modes:
- [ ] Deuteranopia (red-green, most common)
- [ ] Protanopia (red-green)
- [ ] Tritanopia (blue-yellow)
- [ ] Grayscale

Verify:
- Status can be determined without color (text labels present)
- Chart legends include text labels
- Buttons have text, not just color indication
- Links are underlined or have other non-color indicators

## Component-Specific Tests

### MarketShareChart
- [ ] Canvas has focus indicator
- [ ] Press Enter/Space toggles data table
- [ ] Data table has proper table semantics
- [ ] Screen reader announces chart summary
- [ ] No animations with prefers-reduced-motion

### TrendChart
- [ ] SVG has role="img"
- [ ] Data points are focusable
- [ ] Hover/focus shows tooltip
- [ ] Enter/Space on data point works
- [ ] Data table toggle button accessible

### Geographic Map
- [ ] Top 10 countries are keyboard-navigable
- [ ] Map countries are keyboard-navigable (Tab)
- [ ] Each country has descriptive label
- [ ] Press Enter opens country modal
- [ ] Country data table is sortable
- [ ] Focus styles visible on countries

### Modals (Country Details)
- [ ] Opens with keyboard activation
- [ ] Focus moves into modal
- [ ] Tab cycles within modal
- [ ] ESC closes modal
- [ ] Focus returns to trigger
- [ ] Screen reader announces modal role

### Status Indicators
- [ ] Growth metrics have text labels (not just emoji)
- [ ] Version badges have text ("Latest", "Outdated")
- [ ] Icons have aria-hidden + sr-only text
- [ ] Color is not the only indicator

## Common Issues & Fixes

### Issue: Focus indicator not visible
**Fix**: Add CSS for `:focus-visible` with high-contrast outline

### Issue: Screen reader doesn't announce chart
**Fix**: Verify `role="img"` and `aria-describedby` are present

### Issue: Keyboard trap in component
**Fix**: Ensure Tab can move out of component, check modal focus trap logic

### Issue: Low contrast text
**Fix**: Use darker text color (minimum text-gray-500 for body text)

### Issue: Interactive element not keyboard-accessible
**Fix**: Add `tabindex="0"` and keyboard event handlers (Enter/Space)

### Issue: Emoji not accessible
**Fix**: Wrap emoji in `<span aria-hidden="true">` and add `<span class="sr-only">` with description

## Reporting Issues

When filing accessibility bugs, include:
1. WCAG criterion violated (e.g., "1.4.3 Contrast (Minimum)")
2. Severity level (Critical, Serious, Moderate, Minor)
3. Steps to reproduce
4. Expected vs actual behavior
5. Assistive technology tested with (if applicable)
6. Screenshot or video

## References

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WebAIM Keyboard Testing](https://webaim.org/articles/keyboard/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
