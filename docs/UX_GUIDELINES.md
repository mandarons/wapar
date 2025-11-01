# WAPAR UX Guidelines

> **Version:** 1.0.0  
> **Last Updated:** November 1, 2025  
> **Maintainer:** WAPAR Development Team

## Table of Contents

1. [Introduction](#introduction)
2. [Design Principles](#design-principles)
3. [Design Tokens](#design-tokens)
4. [Component Library](#component-library)
5. [Typography](#typography)
6. [Color System](#color-system)
7. [Spacing & Layout](#spacing--layout)
8. [Accessibility](#accessibility)
9. [Testing Guidelines](#testing-guidelines)
10. [Best Practices](#best-practices)

---

## Introduction

This document outlines the UX and design guidelines for the WAPAR analytics platform. The design system is built on principles of **simplicity**, **accessibility**, and **consistency**, ensuring a unified user experience across all dashboards and components.

### Goals

- **Accessibility First**: All components meet WCAG AA contrast requirements
- **Consistency**: Shared design tokens ensure visual cohesion
- **Maintainability**: Reusable components reduce code duplication
- **Performance**: Lightweight, semantic HTML with minimal overhead

---

## Design Principles

### 1. Simplicity Over Complexity

- Use clean, minimal designs without unnecessary decorative elements
- Avoid gradients unless they serve a functional purpose
- Remove decorative emojis; use semantic text and icons instead

### 2. Accessible by Default

- All text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Semantic HTML elements for proper screen reader support
- Keyboard navigation support for all interactive elements
- Clear focus indicators for better keyboard navigation

### 3. Data-Driven Design

- Prioritize clarity of data visualization
- Use appropriate chart types for data patterns
- Provide data table alternatives for complex visualizations

---

## Design Tokens

All design tokens are defined in `/app/tailwind.config.ts` and should be used consistently across components.

### Spacing Scale

```typescript
spacing: {
  'section': '2rem',        // Large section spacing
  'section-lg': '3rem',     // Extra large section spacing
  'card-padding': '1.5rem', // Standard card padding
  'card-padding-sm': '1rem' // Small card padding
}
```

**Usage:**
```html
<div class="p-card-padding">...</div>
<section class="py-section">...</section>
```

### Typography Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `heading-xl` | 2rem | 2.5rem | 600 | Page titles |
| `heading-lg` | 1.5rem | 2rem | 600 | Section headers |
| `heading-md` | 1.25rem | 1.75rem | 600 | Card titles |
| `heading-sm` | 1.125rem | 1.5rem | 600 | Subsection headers |
| `body-lg` | 1rem | 1.75rem | 400 | Large body text |
| `body` | 0.875rem | 1.5rem | 400 | Standard body text |
| `body-sm` | 0.75rem | 1.25rem | 400 | Small text, captions |

**Usage:**
```html
<h1 class="text-heading-xl">Dashboard</h1>
<p class="text-body">Description text</p>
```

### Border Radius

```typescript
borderRadius: {
  'card': '0.5rem',    // Card containers
  'button': '0.375rem' // Buttons and inputs
}
```

### Box Shadows

```typescript
boxShadow: {
  'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
}
```

---

## Color System

### Primary Palette (Green/Teal)

Used for primary actions and the Bouncie integration branding.

| Shade | Hex | Contrast on White | Usage |
|-------|-----|-------------------|-------|
| 50 | `#f0fdf4` | - | Backgrounds |
| 100 | `#dcfce7` | - | Light backgrounds |
| 500 | `#22c55e` | ✓ AA | Buttons, links |
| 600 | `#16a34a` | ✓ AA | Primary actions |
| 900 | `#14532d` | ✓ AA | Text on light |

**Usage:**
```html
<button class="bg-wapar-primary-600 text-white">Submit</button>
<div class="bg-wapar-primary-50 border-wapar-primary-200">...</div>
```

### Secondary Palette (Indigo)

Used for secondary actions and the iCloud Docker integration branding.

| Shade | Hex | Contrast on White | Usage |
|-------|-----|-------------------|-------|
| 50 | `#eef2ff` | - | Backgrounds |
| 100 | `#e0e7ff` | - | Light backgrounds |
| 500 | `#6366f1` | ✓ AA | Buttons, links |
| 600 | `#4f46e5` | ✓ AA | Secondary actions |
| 900 | `#312e81` | ✓ AA | Text on light |

### Neutral Palette (Gray)

Used for text, borders, and neutral UI elements.

| Shade | Hex | Contrast on White | Usage |
|-------|-----|-------------------|-------|
| 50 | `#f9fafb` | - | Page backgrounds |
| 100 | `#f3f4f6` | - | Card backgrounds |
| 200 | `#e5e7eb` | - | Borders |
| 500 | `#6b7280` | ✓ AA | Secondary text |
| 600 | `#4b5563` | ✓ AA | Body text |
| 900 | `#111827` | ✓ AA | Headings |

### Semantic Colors

| Color | Shade 600 | Usage |
|-------|-----------|-------|
| Success | `#16a34a` | Success states, positive growth |
| Warning | `#d97706` | Warnings, outdated versions |
| Error | `#dc2626` | Errors, negative states |
| Info | `#2563eb` | Informational messages |

**All semantic colors meet AA contrast requirements on white backgrounds.**

---

## Component Library

### Card Component

Location: `/app/src/lib/components/ui/Card.svelte`

**Variants:**
- `default`: Standard white card with border and shadow
- `elevated`: Card with hover effect
- `flat`: Card without shadow

**Props:**
```typescript
variant?: 'default' | 'elevated' | 'flat'
padding?: 'sm' | 'md' | 'lg'
testId?: string
```

**Example:**
```svelte
<Card variant="elevated" padding="md" testId="my-card">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

### Button Component

Location: `/app/src/lib/components/ui/Button.svelte`

**Variants:**
- `primary`: Primary action button (green)
- `secondary`: Secondary action button (indigo)
- `outline`: Outlined button for tertiary actions
- `ghost`: Minimal button for subtle actions

**Props:**
```typescript
variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
size?: 'sm' | 'md' | 'lg'
disabled?: boolean
type?: 'button' | 'submit' | 'reset'
testId?: string
```

**Example:**
```svelte
<Button variant="primary" size="md" on:click={handleSubmit}>
  Submit
</Button>
```

---

## Typography

### Semantic Headings

Always use semantic HTML heading tags (`<h1>` through `<h6>`) for proper document structure:

```html
<!-- ✅ Correct -->
<h1 class="text-heading-xl">Page Title</h1>
<h2 class="text-heading-lg">Section Title</h2>
<h3 class="text-heading-md">Subsection Title</h3>

<!-- ❌ Incorrect -->
<div class="text-heading-xl">Page Title</div>
```

### Font Weights

- **Headings**: 600 (semibold)
- **Body text**: 400 (normal)
- **Emphasis**: 500 (medium) or 600 (semibold)

### Line Height

- Headings: 1.2-1.4 for better readability
- Body text: 1.5-1.75 for comfortable reading

---

## Spacing & Layout

### Consistent Spacing

Use the spacing scale for consistent vertical rhythm:

```html
<!-- Section spacing -->
<section class="py-section">...</section>

<!-- Card spacing -->
<div class="p-card-padding">...</div>

<!-- Component gaps -->
<div class="space-y-4">...</div>  <!-- 1rem gap -->
<div class="space-y-6">...</div>  <!-- 1.5rem gap -->
```

### Responsive Layout

Use Tailwind's responsive prefixes for adaptive layouts:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Content -->
</div>
```

---

## Accessibility

### Color Contrast

**All text must meet WCAG AA requirements:**
- Normal text (< 18px): 4.5:1 contrast ratio
- Large text (≥ 18px or 14px bold): 3:1 contrast ratio

**Tools for testing:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Browser DevTools Accessibility Inspector

### Keyboard Navigation

**All interactive elements must be keyboard accessible:**

```html
<!-- ✅ Correct: native button with focus styles -->
<button class="focus-visible:ring-2 focus-visible:ring-wapar-primary-500">
  Click me
</button>

<!-- ❌ Incorrect: div with click handler -->
<div on:click={handleClick}>Click me</div>
```

**Focus indicators:**
- Use `focus-visible:ring-2` for visible focus states
- Ensure focus color contrasts with background
- Never remove focus outlines with `outline: none` without replacement

### Screen Readers

**Use ARIA attributes appropriately:**

```html
<!-- Landmark regions -->
<nav aria-label="Main navigation">...</nav>
<main role="main">...</main>

<!-- Button labels -->
<button aria-label="Close dialog">×</button>

<!-- Live regions for dynamic content -->
<div role="status" aria-live="polite">Loading...</div>
```

**Hide decorative elements from screen readers:**
```html
<span aria-hidden="true">→</span>
```

### Alt Text

**Provide meaningful alt text for images:**

```html
<!-- ✅ Descriptive alt text -->
<img src="chart.png" alt="Bar chart showing monthly user growth from January to June 2025" />

<!-- ❌ Generic or missing alt text -->
<img src="chart.png" alt="chart" />
<img src="chart.png" />
```

### Semantic HTML

**Use appropriate HTML elements:**

```html
<!-- ✅ Semantic structure -->
<article>
  <h2>Article Title</h2>
  <p>Content</p>
</article>

<!-- ❌ Non-semantic divs -->
<div class="article">
  <div class="title">Article Title</div>
  <div class="content">Content</div>
</div>
```

---

## Testing Guidelines

### Visual Testing

**Checklist:**
- [ ] Component renders correctly on mobile (320px+)
- [ ] Component renders correctly on tablet (768px+)
- [ ] Component renders correctly on desktop (1024px+)
- [ ] All text is readable and properly sized
- [ ] Colors are consistent with design tokens
- [ ] No layout shift or visual bugs

**Tools:**
- Browser DevTools responsive mode
- `bun run dev` for live preview

### Accessibility Testing

**Automated Tools:**

```bash
# Run existing tests
bun run test

# Unit tests
bun run test:unit

# End-to-end tests
bun run test:e2e
```

**Manual Testing Checklist:**
- [ ] Tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets AA requirements
- [ ] No reliance on color alone for meaning
- [ ] Forms have proper labels
- [ ] Error messages are clear and accessible

**Recommended Tools:**
- **axe DevTools**: Browser extension for accessibility testing
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Built into Chrome DevTools
- **Screen readers**: NVDA (Windows), VoiceOver (macOS), JAWS

### Keyboard Testing

**Test all interactive elements:**

| Key | Expected Behavior |
|-----|-------------------|
| Tab | Move focus forward |
| Shift+Tab | Move focus backward |
| Enter/Space | Activate button/link |
| Escape | Close modal/dialog |
| Arrow keys | Navigate lists/tabs |

### Cross-Browser Testing

**Supported Browsers:**
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

---

## Best Practices

### Do's ✅

- **Use design tokens** for all colors, spacing, and typography
- **Use semantic HTML** elements (`<button>`, `<nav>`, `<main>`, etc.)
- **Provide keyboard navigation** for all interactive elements
- **Write descriptive alt text** for images
- **Test with screen readers** before shipping
- **Use utility classes** over custom CSS when possible
- **Keep components simple** and focused on a single responsibility

### Don'ts ❌

- **Don't use gradients** unless functionally necessary
- **Don't use decorative emojis** in UI (use semantic text/icons)
- **Don't remove focus outlines** without providing alternatives
- **Don't use color alone** to convey meaning
- **Don't create inline styles** (use Tailwind utilities or design tokens)
- **Don't skip semantic headings** (don't jump from `<h2>` to `<h4>`)
- **Don't use non-standard interactive elements** (`<div>` with `onClick`)

### Code Examples

**✅ Good Example:**
```svelte
<Card variant="default" padding="md">
  <h2 class="text-heading-md text-wapar-gray-900 mb-4">
    Installation Overview
  </h2>
  <p class="text-body text-wapar-gray-600">
    View total installations across all integrations.
  </p>
  <Button variant="primary" size="md" on:click={handleViewMore}>
    View Details
  </Button>
</Card>
```

**❌ Bad Example:**
```svelte
<div class="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
  <div class="text-lg font-bold">
    📊 Installation Overview
  </div>
  <div style="color: #666; font-size: 14px;">
    View total installations across all integrations.
  </div>
  <div class="cursor-pointer" on:click={handleViewMore}>
    View Details
  </div>
</div>
```

---

## Resources

### Internal Documentation

- [Design Tokens](/app/tailwind.config.ts)
- [UI Components](/app/src/lib/components/ui/)
- [App Documentation](/app/docs/README.md)

### External Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Accessibility Resources](https://webaim.org/resources/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## Changelog

### Version 1.0.0 (November 1, 2025)

- Initial release of UX guidelines
- Defined design tokens and color system
- Created reusable Card and Button components
- Removed gradients and decorative emojis from components
- Established accessibility standards and testing guidelines

---

## Contributing

When contributing to WAPAR, please:

1. **Review these guidelines** before making UI changes
2. **Use design tokens** from `tailwind.config.ts`
3. **Test accessibility** with keyboard and screen readers
4. **Run linting and tests** before submitting PRs
5. **Document new patterns** in this guide

For questions or suggestions, open an issue in the repository or contact the WAPAR development team.

---

_Maintained by the WAPAR Development Team • Last updated: November 1, 2025_
