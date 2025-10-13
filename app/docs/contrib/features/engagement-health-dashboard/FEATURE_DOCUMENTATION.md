# Engagement Health Dashboard

## Overview

The Engagement Health Dashboard provides a visual representation of application engagement health by calculating and displaying the ratio of monthly active users to total installations with color-coded health indicators.

## Feature Description

### Purpose

- Provide at-a-glance engagement health assessment
- Help identify engagement trends and potential issues
- Offer actionable insights through visual health indicators

### Calculation

```
Engagement Ratio = (Monthly Active / Total Installations) × 100
```

### Health Indicators

| Indicator | Ratio Range | Status          | Description              |
| --------- | ----------- | --------------- | ------------------------ |
| 🟢        | >50%        | Excellent       | High user engagement     |
| 🟡        | 25-50%      | Good            | Moderate user engagement |
| 🔴        | <25%        | Needs Attention | Low user engagement      |

## User Interface

### Dashboard Components

1. **Header Section**
   - Title: "Engagement Health"
   - Subtitle: "Monthly active vs total installations"

2. **Health Card**
   - Background color matches health status (green/yellow/red tint)
   - Centered layout with maximum width of 2xl
   - Rounded corners and shadow for depth

3. **Health Indicator**
   - Large emoji (🟢/🟡/🔴) - 6xl text size
   - Provides immediate visual feedback

4. **Engagement Ratio Display**
   - Large percentage (e.g., "60.0%") - 5xl bold text
   - Color-coded to match health status
   - One decimal precision

5. **Status Label**
   - Text label (Excellent/Good/Needs Attention)
   - Medium text size with color coding
   - Descriptive subtext explaining the status

6. **Breakdown Section**
   - Shows calculation breakdown
   - Format: "Monthly Active ÷ Total Installations"
   - Displays actual numbers with thousand separators

## Technical Implementation

### Files Modified

- `app/src/routes/+page.svelte` - Main UI component
- `app/tests/test.ts` - Test coverage

### Key Code Elements

#### Reactive Calculations

```typescript
$: engagementRatio =
	data.totalInstallations > 0 ? (data.monthlyActive / data.totalInstallations) * 100 : 0;

$: healthStatus =
	engagementRatio > 50
		? {
				color: 'text-green-600',
				bgColor: 'bg-green-100',
				indicator: '🟢',
				label: 'Excellent',
				description: 'High user engagement'
			}
		: engagementRatio >= 25
			? {
					color: 'text-yellow-600',
					bgColor: 'bg-yellow-100',
					indicator: '🟡',
					label: 'Good',
					description: 'Moderate user engagement'
				}
			: {
					color: 'text-red-600',
					bgColor: 'bg-red-100',
					indicator: '🔴',
					label: 'Needs Attention',
					description: 'Low user engagement'
				};
```

#### Test IDs

- `engagement-health-dashboard` - Main dashboard container
- `health-indicator` - Emoji indicator
- `engagement-ratio` - Percentage display
- `health-status` - Status label
- `monthly-active-count` - Monthly active users count
- `total-installations-count` - Total installations count

## Test Coverage

### Test Scenarios

1. Dashboard visibility test
2. Health indicator emoji validation
3. Engagement ratio format validation
4. Health status label validation
5. Breakdown metrics visibility

### Edge Cases Handled

- Zero installations (prevents division by zero)
- Boundary conditions (exactly 25%, exactly 50%)
- Large numbers with thousand separators

## Design Decisions

### Color Scheme

- **Green (Excellent)**: `text-green-600` / `bg-green-100`
- **Yellow (Good)**: `text-yellow-600` / `bg-yellow-100`
- **Red (Needs Attention)**: `text-red-600` / `bg-red-100`

### Layout

- Centered design with max-width constraint
- Responsive spacing using Tailwind utilities
- Consistent with existing app design patterns

### Typography

- Large, bold percentage for emphasis
- Clear hierarchy with varying text sizes
- Readable font weights

## Usage

The dashboard automatically displays on the main page after the statistics section and before the map section. No user interaction is required - it reactively updates based on the data loaded from the API.

## Future Enhancements (Not in Scope)

- Historical trend comparison
- Per-country engagement breakdown
- Configurable threshold values
- Export/sharing capabilities
- Engagement alerts/notifications

## Accessibility

- Semantic HTML structure
- Color coding supplemented with text labels
- High contrast ratios for readability
- Emoji indicators provide visual redundancy

## Performance

- Reactive calculations are efficient and cached by Svelte
- No additional API calls required
- Minimal DOM updates on data changes
- Lightweight implementation (~65 lines of code)
