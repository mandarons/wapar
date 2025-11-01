# Contributing to WAPAR

Thank you for your interest in contributing to WAPAR! This document provides guidelines for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [UI/UX Contributions](#uiux-contributions)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Getting Started

### Prerequisites

- **Bun** (not npm/yarn/pnpm) - [Installation Guide](https://bun.sh/docs/installation)
- **Node.js** 20+ (for compatibility)
- **Git**

### Repository Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/mandarons/wapar.git
   cd wapar
   ```

2. Install dependencies:
   ```bash
   # Frontend
   cd app
   bun install
   
   # Backend (if working on server)
   cd ../server
   bun install
   ```

3. Run development server:
   ```bash
   # Frontend
   cd app
   bun dev
   
   # Backend (if needed)
   cd server
   bun run dev
   ```

## Development Workflow

### Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines below

3. **Test your changes**:
   ```bash
   # Run linting
   bun run lint
   
   # Run type checking
   bun run check
   
   # Run tests
   bun run test
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and create a Pull Request**

### Commit Message Convention

Follow conventional commits format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add version analytics component
fix: resolve keyboard navigation issue in map
docs: update UX guidelines with new color tokens
style: format code with prettier
```

## UI/UX Contributions

### **📋 Required Reading: [UX Guidelines](./docs/UX_GUIDELINES.md)**

Before making any UI/UX changes, please review our comprehensive UX Guidelines:

- **Design Tokens**: Use the standardized color palette, spacing, and typography
- **Accessibility**: All components must meet WCAG AA standards
- **Component Library**: Use existing reusable components when possible
- **Testing**: Follow accessibility testing guidelines

### Key Requirements

✅ **Do:**
- Use design tokens from `tailwind.config.ts`
- Create reusable components in `app/src/lib/components/ui/`
- Ensure AA color contrast ratios
- Test keyboard navigation
- Test with screen readers
- Use semantic HTML
- Write descriptive alt text for images

❌ **Don't:**
- Use ad-hoc gradients or inline styles
- Add decorative emojis to UI
- Remove focus indicators
- Use color alone to convey information
- Skip accessibility testing
- Use non-semantic elements for interactive content

### Design Token Usage

```svelte
<!-- ✅ Good: Using design tokens -->
<Card variant="elevated" padding="md">
  <h2 class="text-heading-md text-wapar-gray-900">Title</h2>
  <p class="text-body text-wapar-gray-600">Description</p>
  <Button variant="primary" size="md">Action</Button>
</Card>

<!-- ❌ Bad: Inline styles and bespoke colors -->
<div class="p-6 bg-gradient-to-br from-blue-50 to-blue-100" style="border-radius: 12px;">
  <div class="text-lg font-bold" style="color: #1a1a1a;">
    📊 Title
  </div>
  <div style="color: #666;">Description</div>
  <div class="cursor-pointer" on:click={handleClick}>Action</div>
</div>
```

## Code Style

### Formatting

We use **Prettier** for code formatting:

```bash
# Check formatting
bun run lint

# Auto-fix formatting
bun run format
```

### TypeScript

- Use **TypeScript** for all new code
- Define proper types for component props
- Avoid `any` types when possible

**Example:**
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'flat';
  padding?: 'sm' | 'md' | 'lg';
  testId?: string;
}
```

### Svelte Components

- Use `<script lang="ts">` for TypeScript support
- Export props with proper types
- Add `data-testid` attributes for testing
- Include JSDoc comments for complex components

**Example:**
```svelte
<script lang="ts">
  /**
   * Reusable card component following WAPAR design system
   * @component
   */
  export let variant: 'default' | 'elevated' | 'flat' = 'default';
  export let testId: string | undefined = undefined;
</script>

<div class="rounded-card" data-testid={testId}>
  <slot />
</div>
```

## Testing

### Running Tests

```bash
# All tests
bun run test

# Unit tests only
bun run test:unit

# E2E tests only
bun run test:e2e
```

### Writing Tests

- Add tests for new features
- Update tests for modified features
- Follow existing test patterns in the repository
- Include accessibility tests for UI components

### Accessibility Testing

**Required for all UI changes:**

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus indicators are visible
   - Test common keyboard shortcuts (Enter, Escape, arrows)

2. **Screen Reader Testing**
   - Test with NVDA (Windows) or VoiceOver (macOS)
   - Verify proper announcement of content
   - Check ARIA labels and roles

3. **Color Contrast**
   - Use WebAIM Contrast Checker
   - Ensure all text meets AA requirements (4.5:1 or 3:1 for large text)

4. **Automated Tools**
   - Run axe DevTools in browser
   - Check Lighthouse accessibility score
   - Use WAVE browser extension

## Submitting Changes

### Pull Request Process

1. **Update documentation** if needed
2. **Run all tests** and ensure they pass
3. **Run linting** and fix any issues
4. **Create Pull Request** with clear description
5. **Link related issues** in PR description
6. **Wait for review** and address feedback

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Linting passes (`bun run lint`)
- [ ] Type checking passes (`bun run check`)
- [ ] Tests pass (`bun run test`)
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (if UI change)
- [ ] Color contrast verified (if UI change)

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #123
```

### Code Review

All PRs require:
- Passing CI checks
- Code review approval
- No merge conflicts
- Updated documentation (if needed)

## Questions?

- **UX/Design Questions**: See [UX Guidelines](./docs/UX_GUIDELINES.md)
- **Architecture Questions**: See [WAPAR AI Agent Instructions](./.github/copilot-instructions.md)
- **Environment Setup**: See [Environment Setup](./docs/ENVIRONMENT_SETUP_SUMMARY.md)
- **General Questions**: Open an issue with the `question` label

---

## Additional Resources

- [UX Guidelines](./docs/UX_GUIDELINES.md) - Design system and accessibility standards
- [Frontend Documentation](./app/docs/README.md) - SvelteKit app documentation
- [Backend Documentation](./server/README.md) - Cloudflare Workers API documentation
- [Tailwind Config](./app/tailwind.config.ts) - Design tokens reference

---

Thank you for contributing to WAPAR! 🎉
