# UI Mockup - Interactive Geographic Map

## Desktop View (≥1024px)

```
╔════════════════════════════════════════════════════════════════════╗
║                         WAPAR [LOGO]                    [GitHub]   ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║              Application Installations                             ║
║                                                                     ║
║    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          ║
║    │    1,234     │  │     789      │  │     445      │          ║
║    │   Total      │  │ iCloud Docker│  │ HA Bouncie   │          ║
║    └──────────────┘  └──────────────┘  └──────────────┘          ║
║                                                                     ║
╠═══════════════════╦═════════════════════════════════════════════════╣
║                   ║                                                 ║
║ Top 10 Countries  ║                                                 ║
║ ═════════════════ ║            [Interactive World Map]              ║
║                   ║                                                 ║
║ ┌───────────────┐ ║   ┌──────────────────────────────────────┐    ║
║ │ #1  US   450  │ ║   │        North America                 │    ║
║ │      (36.5%)  │ ║   │   ┌─────────┐                        │    ║
║ └───────────────┘ ║   │   │  USA ✓  │  [Highlighted]         │    ║
║                   ║   │   └─────────┘                        │    ║
║ ┌───────────────┐ ║   │                                      │    ║
║ │ #2  GB   200  │ ║   │  Europe        Asia                  │    ║
║ │      (16.2%)  │ ║   │  ┌───┐         ┌────┐               │    ║
║ └───────────────┘ ║   │  │GB │         │CN  │               │    ║
║                   ║   │  └───┘         └────┘               │    ║
║ ┌───────────────┐ ║   │                                      │    ║
║ │ #3  DE   150  │ ║   │    Africa      Australia             │    ║
║ │      (12.2%)  │ ║   │                  ┌────┐              │    ║
║ └───────────────┘ ║   │                  │ AU │              │    ║
║                   ║   │                  └────┘              │    ║
║ ┌───────────────┐ ║   └──────────────────────────────────────┘    ║
║ │ #4  FR   100  │ ║                                                 ║
║ │      (8.1%)   │ ║   Legend:                                      ║
║ └───────────────┘ ║   ██ 0-50     ██ 51-100    ██ 101-200          ║
║                   ║   ██ 201-500  ██ 500+                           ║
║ [...more items]   ║                                                 ║
║                   ║   ✓ = Currently highlighted                    ║
║                   ║   Click any country for details                ║
║                   ║                                                 ║
╠═══════════════════╩═════════════════════════════════════════════════╣
║                Copyright © 2023 Mandar Patil                        ║
╚════════════════════════════════════════════════════════════════════╝
```

## Mobile View (<1024px)

```
╔══════════════════════════════════╗
║   WAPAR [Logo]        [GitHub]   ║
╠══════════════════════════════════╣
║                                  ║
║   Application Installations      ║
║                                  ║
║   ┌────────┐ ┌────────┐         ║
║   │ 1,234  │ │  789   │         ║
║   │ Total  │ │iCloud  │         ║
║   └────────┘ └────────┘         ║
║   ┌────────┐                    ║
║   │  445   │                    ║
║   │ Bouncie│                    ║
║   └────────┘                    ║
║                                  ║
╠══════════════════════════════════╣
║                                  ║
║   [Interactive World Map]        ║
║   ┌────────────────────────┐    ║
║   │    North America       │    ║
║   │   ┌───┐                │    ║
║   │   │USA│                │    ║
║   │   └───┘                │    ║
║   │                        │    ║
║   │  Europe    Asia        │    ║
║   │  ┌──┐     ┌──┐        │    ║
║   │  │GB│     │CN│        │    ║
║   │  └──┘     └──┘        │    ║
║   │                        │    ║
║   │   Africa  Australia    │    ║
║   │           ┌──┐         │    ║
║   │           │AU│         │    ║
║   │           └──┘         │    ║
║   └────────────────────────┘    ║
║                                  ║
║   Tap any country for details   ║
║                                  ║
╠══════════════════════════════════╣
║                                  ║
║      Top 10 Countries            ║
║      ═══════════════             ║
║                                  ║
║   ┌────────────────────────┐    ║
║   │ #1  US     450  (36.5%)│    ║
║   └────────────────────────┘    ║
║                                  ║
║   ┌────────────────────────┐    ║
║   │ #2  GB     200  (16.2%)│    ║
║   └────────────────────────┘    ║
║                                  ║
║   ┌────────────────────────┐    ║
║   │ #3  DE     150  (12.2%)│    ║
║   └────────────────────────┘    ║
║                                  ║
║   [... 7 more items ...]         ║
║                                  ║
╠══════════════════════════════════╣
║ Copyright © 2023 Mandar Patil    ║
╚══════════════════════════════════╝
```

## Country Detail Modal (Appears on Click)

```
┌────────────────────────────────────┐
│  United States (US)             ✕  │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Total Installations:   450  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Percentage of Global: 36.48%│ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Est. Monthly Active:   167  │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Engagement Rate:      37.1% │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  Global Ranking:    #1 of 10 │ │
│  └──────────────────────────────┘ │
│                                    │
│              [Close]               │
│                                    │
└────────────────────────────────────┘
```

## Interaction States

### Country Button (Top 10 List)

**Default State:**

```
┌─────────────────────────┐
│ #3  DE      150  (12.2%)│ ← Soft gray background
└─────────────────────────┘
```

**Hover State:**

```
┌─────────────────────────┐
│ #3  DE      150  (12.2%)│ ← Primary green background
└─────────────────────────┘   Smooth transition
      ↑ Cursor: pointer
```

**Active/Selected State:**

```
╔═════════════════════════╗
║ #3  DE      150  (12.2%)║ ← Filled primary green
╚═════════════════════════╝   + Map highlight active
```

### Map Country

**Default State:**

```
Country colored by installation count
Light red to dark red gradient
```

**Hover State:**

```
Country brightened slightly
Green stroke preview (1.5px)
Cursor: pointer
```

**Selected State:**

```
Bright green stroke (2px)
Increased brightness (1.2x)
All other highlights cleared
Modal displayed
```

## Color Scheme

```
Primary Green:  #0FBA81  ← Used for highlights
Secondary:      #4F46E5
Success:        #84cc16  ← Used for statistics
Background:     Dark theme
Text Primary:   White/Light gray
Text Secondary: #666666

Map Gradient:
Min: #ffb3b3 (light red)
Max: #050000 (near black)
```

## Responsive Breakpoints

```
Mobile:     < 640px   (sm)  - Stacked layout
Tablet:     640-1024  (md)  - Stacked layout
Desktop:    ≥ 1024px  (lg)  - Side-by-side layout

Layout Changes at 1024px:
- Sidebar: 100% → 25% width
- Map: 100% → 75% width
- Order: Map first → Sidebar first
```

## Typography

```
Page Title:     2xl (1.5rem) → 3xl (1.875rem) @ sm
Statistics:     3xl (1.875rem) → 4xl (2.25rem) @ sm
Section Title:  h3 class (1.25rem)
Country Code:   lg (1.125rem)
Percentages:    xs (0.75rem)
Modal Title:    lg (1.125rem)
Modal Content:  base (1rem)
```

## Accessibility Features

- ✓ Semantic HTML (button, heading, main, section)
- ✓ Keyboard navigation for all interactive elements
- ✓ Focus indicators on buttons
- ✓ ARIA labels where needed
- ✓ High contrast text (WCAG AA compliant)
- ✓ Touch-friendly targets (min 44x44px)
- ✓ Screen reader friendly content
- ✓ Modal can be dismissed with keyboard

## Animation/Transitions

```css
Button hover:     0.2s ease     (background-color)
Map hover:        0.2s ease     (filter, stroke)
Highlight change: Instant       (for clarity)
Modal appear:     Default       (Skeleton UI)
```

## Notes

1. **Map Library**: Uses svgmap library (already integrated)
2. **UI Framework**: Skeleton UI components (already integrated)
3. **No Images**: All visual elements are SVG/CSS-based
4. **Data-Driven**: All numbers and countries loaded from API
5. **Performant**: Reactive updates, minimal re-renders
