# Interactive Geographic Map Feature

## Feature Overview

This enhancement adds interactive geographic intelligence to the Wapar analytics platform, allowing users to explore country-specific installation data through an intuitive map interface and top countries dashboard.

## User Experience

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Installations                     │
│   [Total: 1234]  [iCloud Docker: 789]  [HA Bouncie: 445]       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐ ┌────────────────────────────────────────────┐
│ Top 10 Countries │ │                                            │
├──────────────────┤ │                                            │
│ #1  US     450   │ │        [Interactive World Map]             │
│         (36.5%)  │ │                                            │
│                  │ │     • Clickable countries                  │
│ #2  GB     200   │ │     • Hover effects                        │
│         (16.2%)  │ │     • Visual highlighting                  │
│                  │ │     • Country details on click             │
│ #3  DE     150   │ │                                            │
│         (12.2%)  │ │                                            │
│                  │ │                                            │
│ [... 7 more]     │ │                                            │
└──────────────────┘ └────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────────────────┐
│   Application Installations         │
│   [Statistics Display]              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     [Interactive World Map]         │
│  • Touch-friendly country clicks    │
│  • Responsive zoom controls         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      Top 10 Countries               │
│  #1  US      450    (36.5%)        │
│  #2  GB      200    (16.2%)        │
│  #3  DE      150    (12.2%)        │
│  [... more countries]               │
└─────────────────────────────────────┘
```

### Country Detail Modal

```
┌─────────────────────────────────────┐
│  United States (US)              ✕  │
├─────────────────────────────────────┤
│                                     │
│  Total Installations:        450    │
│  Percentage of Global:     36.48%   │
│  Est. Monthly Active:        167    │
│  Engagement Rate:          37.1%    │
│  Global Ranking:         #1 of 10   │
│                                     │
│                    [Close]          │
└─────────────────────────────────────┘
```

## Interactions

### 1. Click Country on Map

1. User clicks any colored country on the map
2. Country receives visual highlight (green stroke)
3. Modal appears with detailed country statistics
4. Previous highlights are cleared

### 2. Click Country in Sidebar

1. User clicks a country button in the Top 10 list
2. Map scrolls/pans to that country (if needed)
3. Country receives visual highlight on map
4. Modal appears with detailed statistics

### 3. Hover Effects

- **Map countries**: Subtle brightness increase + green stroke preview
- **Sidebar buttons**: Background color change, smooth transition
- **All interactions**: Pointer cursor indicates clickability

## Statistics Displayed

### Per-Country Modal

1. **Total Installations**
   - Raw count of installations from that country
   - Formatted with thousand separators (1,234)

2. **Percentage of Global**
   - Country's share of total installations
   - Calculated: `(countryInstallations / totalInstallations) × 100`
   - Displayed to 2 decimal places

3. **Est. Monthly Active**
   - Estimated monthly active users from that country
   - Calculated proportionally: `(countryCount / total) × globalMonthlyActive`
   - Rounded to nearest integer

4. **Engagement Rate**
   - Percentage of installations that are monthly active
   - Calculated: `(estimatedMonthlyActive / countryInstallations) × 100`
   - Displayed to 1 decimal place

5. **Global Ranking**
   - Country's position when sorted by installation count
   - Shows "X of Y" format

### Top 10 Sidebar

- Rank (1-10)
- Country code (ISO 2-letter)
- Installation count (formatted)
- Percentage of global (1 decimal place)

## Technical Details

### Component Structure

```svelte
<script>
  // Reactive calculations
  $: sortedCountries = [...data].sort()
  $: top10Countries = sortedCountries.slice(0, 10)

  // Event handlers
  function handleCountryClick(code) { ... }
  function highlightCountryOnMap(code) { ... }
  function showCountryDetails(code) { ... }

  // svgmap initialization with callback
  mapObj = new svgMap({
    ...,
    callback: handleCountryClick
  })
</script>

<!-- Top 10 Sidebar -->
<div class="lg:w-1/4">
  {#each top10Countries as country}
    <button on:click={() => highlightCountryOnMap(...)}>
      <!-- Country card -->
    </button>
  {/each}
</div>

<!-- Interactive Map -->
<div class="lg:w-3/4">
  <div id="svgMap"></div>
</div>
```

### CSS Enhancements

```css
.country-highlighted {
	stroke: #0fba81 !important; /* Primary green */
	stroke-width: 2 !important;
	filter: brightness(1.2);
}

.svgMap-country {
	cursor: pointer;
	transition: all 0.2s ease;
}

.svgMap-country:hover {
	filter: brightness(1.1);
	stroke: #0fba81;
	stroke-width: 1.5;
}
```

### Responsive Breakpoints

- **Mobile** (`< lg`): Stacked vertical layout, sidebar below map
- **Desktop** (`≥ lg`): Side-by-side layout, 25/75 split

## Data Requirements

### Input Data Structure

```typescript
{
  totalInstallations: number,
  monthlyActive: number,
  countryToCount: Array<{
    countryCode: string,  // ISO 2-letter code
    count: number
  }>,
  // ... other fields
}
```

### Supported Country Codes

Currently mapped: US, GB, DE, FR, CA, AU, NL, SE, NO, DK, FI, BE, CH, AT, ES, IT, PL, RU, BR, IN, CN, JP, KR, SG, NZ, IE, PT, GR, CZ, RO, HU

Additional codes display as-is (e.g., "JP" instead of "Japan").

## Browser Support

- Modern browsers with ES6+ support
- Svelte 4 compatible browsers
- CSS Grid and Flexbox support required
- Touch events for mobile devices

## Accessibility

- Keyboard navigable (sidebar buttons)
- Semantic HTML (buttons, headings)
- Screen reader friendly labels
- Focus indicators on interactive elements
- Modal dismissible via close button

## Performance

- Reactive calculations cached by Svelte
- DOM queries scoped to map region
- CSS transitions hardware-accelerated
- Lazy-loaded svgmap library (code splitting)
- No external API calls on interaction

## Testing

Playwright e2e tests cover:

- Top 10 sidebar visibility
- Interactive map presence
- Country item rendering
- Existing functionality preservation

## Future Enhancements

1. **Historical Data**: Show growth trends if API provides historical data
2. **Filters**: Filter by region, app type, or engagement threshold
3. **Export**: Download country statistics as CSV/JSON
4. **Search**: Search bar to find specific countries
5. **Flags**: Replace country codes with flag emojis
6. **Tooltips**: Show quick stats on hover without modal
7. **Analytics**: Track which countries users click most

## Integration Notes

- Uses existing Skeleton UI theme and components
- No new dependencies added
- Works with existing API endpoint structure
- Backward compatible with data without country info
- Gracefully handles missing country data
