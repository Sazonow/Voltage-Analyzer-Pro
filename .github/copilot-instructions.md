# Copilot Instructions for Voltage-Analyzer-Pro

## Project Overview

Voltage Analyzer Pro is a React-based web application for analyzing voltage data from OCPP (Open Charge Point Protocol) logs. The application parses log files, extracts three-phase voltage measurements (L1, L2, L3), and provides visualization, analysis, and AI-powered insights for power quality assessment.

## Tech Stack

- **Frontend Framework**: React 18.2.0 with TypeScript
- **Build Tool**: Vite 5.0
- **Charting Library**: Recharts 2.12.7
- **AI Integration**: Google GenAI (@google/genai ^0.2.1)
- **Styling**: Tailwind CSS (via inline classes)
- **Language**: TypeScript 5.0+ with strict type checking

## Project Structure

```
/
├── App.tsx                 # Main application component
├── index.tsx              # Application entry point
├── index.html             # HTML template
├── types.ts               # TypeScript type definitions
├── components/            # React components
│   ├── AIAssistant.tsx    # AI-powered analysis assistant
│   ├── AnalysisReport.tsx # Statistics dashboard
│   ├── DataTable.tsx      # Tabular data display
│   ├── FileUploader.tsx   # File upload interface
│   ├── MediaStudio.tsx    # Media handling component
│   ├── ReportGenerator.tsx # PDF/report generation
│   ├── SettingsModal.tsx  # Settings configuration
│   └── VoltageChart.tsx   # Main voltage visualization
└── services/
    └── parser.ts          # Log file parsing and data extraction
```

## Development Commands

- **Install dependencies**: `npm install`
- **Development server**: `npm run dev` (runs on port 3000)
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

## Code Conventions and Best Practices

### TypeScript

- Use strict TypeScript typing throughout the codebase
- Define interfaces in `types.ts` for shared types
- Prefer explicit type annotations for function parameters and return values
- Use union types for language support: `'ru' | 'en' | 'uk'`

### React Patterns

- Use functional components with hooks (useState, useMemo, etc.)
- Extract expensive computations into `useMemo` hooks
- Use descriptive prop names and destructure them in component definitions
- Follow the pattern: `const Component: React.FC<Props> = ({ prop1, prop2 }) => { ... }`

### State Management

- Use `useState` for local component state
- Use `useMemo` for derived/computed values to optimize performance
- Pass state down via props (no global state management library)
- Settings are managed in a centralized `GlobalSettings` object

### Component Organization

- Components should be self-contained with clear responsibilities
- Break down large components into smaller, reusable pieces
- Use semantic HTML and accessibility attributes where appropriate
- Modal components should accept `onClose` callback prop

### Styling

- Use Tailwind CSS utility classes inline
- Follow the existing color scheme:
  - Background: `bg-background`, `bg-surface`
  - Text: `text-textMain`, `text-textMuted`
  - Accent: `text-accent` (blue theme)
  - Danger: `text-danger` (red theme)
- Use responsive classes (sm:, md:, lg:) for mobile-first design
- Prefer `backdrop-blur-md` for glassmorphism effects

### Data Processing

- All voltage data is stored in `VoltageTriplet` format with L1, L2, L3 phases
- Timestamps are stored as Unix timestamps in milliseconds
- Parse log files in `services/parser.ts` using the `parseLogFile` function
- Evaluate voltage status using `evaluateStatus` function with vmin/vmax thresholds
- Track parsing errors in `FileData.parsingErrors` array for data quality monitoring

### Multi-language Support

- Support three languages: Ukrainian ('uk'), Russian ('ru'), English ('en')
- Store translations inline as objects with language keys
- Format: `const t = { key: lang === 'uk' ? 'Текст' : lang === 'ru' ? 'Текст' : 'Text' }`
- Pass `lang` prop to child components that need localization

### Performance Considerations

- Use `useMemo` for expensive calculations (data aggregation, statistics)
- Filter enabled files before processing: `files.filter(f => f.enabled)`
- Sort data by timestamp for chronological display
- Limit rendering of large datasets (use pagination or virtualization)

### Error Handling

- Track parsing errors separately in `FileData.parsingErrors`
- Display user-friendly error messages via alerts or UI notifications
- Log errors to console for debugging: `console.error(e)`
- Validate data integrity (check for suspicious timestamps like year 2000)

### Voltage Analysis Domain

- **Normal Range**: Between vmin (default 207V) and vmax (default 253V)
- **Status Types**: 'ok', 'under', 'over', 'imbalance'
- **Phase Balance**: Track delta (max voltage difference between phases)
- **Risk Levels**: 'low', 'medium', 'high' based on violation counts and deep dips
- **Deep Dip**: Voltage drops below 190V (critical event)
- **Session Context**: Track OCPP session data (sessionId, idTag, chargePoint info)

### AI Integration

- Google GenAI is used for intelligent analysis and insights
- API key must be set in `.env.local` as `GEMINI_API_KEY`
- AI features are optional and gracefully degrade if unavailable

## Testing

Currently, there is no formal test infrastructure in this repository. When adding tests:
- Follow React Testing Library patterns if implementing unit tests
- Test critical parsing logic in `services/parser.ts`
- Validate voltage evaluation and statistics calculations

## Environment Variables

- `GEMINI_API_KEY`: Required for AI assistant features (set in `.env.local`)

## Git Workflow

- Work on feature branches
- Keep commits focused and descriptive
- Ensure the application builds successfully before committing: `npm run build`

## Common Tasks

### Adding a New Component

1. Create component file in `/components/`
2. Define props interface at the top of the file
3. Use TypeScript for type safety
4. Follow functional component pattern with `React.FC`
5. Import and use in `App.tsx` or parent component

### Adding New Voltage Metrics

1. Update `AnalysisStats` interface in `types.ts`
2. Modify calculation logic in `App.tsx` useMemo hook
3. Display in `AnalysisReport.tsx` component
4. Update AI assistant prompts if needed

### Modifying Parsing Logic

1. Edit `services/parser.ts`
2. Update `parseLogFile` or `evaluateStatus` functions
3. Test with sample OCPP log files
4. Handle edge cases and add to `parsingErrors` array

### Updating Voltage Thresholds

1. Modify in `SettingsModal.tsx` UI
2. Values are stored in `GlobalSettings` interface
3. Pass to components via props
4. Re-evaluation happens automatically via useMemo

## Important Notes

- The app processes OCPP log files containing JSON-formatted voltage measurements
- Data is processed client-side; no backend server required
- Files can be large; optimize for performance with useMemo and efficient filtering
- Support for multiple file uploads and comparison
- Timezone handling is important for accurate timestamp display
- The app is designed for Ukraine/Eastern Europe power grid standards (230V nominal)

## Future Enhancements

When extending the application:
- Maintain backward compatibility with existing log file formats
- Keep the UI responsive and performant with large datasets
- Preserve multi-language support in new features
- Follow existing patterns for modal dialogs and overlays
- Consider accessibility (a11y) for new interactive elements
