# Copilot Instructions for Voltage Analyzer Pro

## Project Overview

Voltage Analyzer Pro is a React/TypeScript web application for analyzing EV charger logs, visualizing voltage stability, detecting phase imbalances, and generating health reports. The application processes log files containing voltage measurements across three phases (L1, L2, L3) and provides interactive charts, data tables, and AI-powered analysis.

## Technology Stack

- **Frontend Framework**: React 18.2.0 with TypeScript
- **Build Tool**: Vite 5.x
- **UI Components**: Custom components with Tailwind-like utility classes
- **Charts**: Recharts 2.12.7
- **AI Integration**: Google Gemini AI (@google/genai)
- **Language Support**: Multilingual (Ukrainian, Russian, English)

## Project Structure

```
/
├── App.tsx                 # Main application component
├── index.tsx              # Application entry point
├── types.ts               # TypeScript type definitions
├── components/            # React components
│   ├── AIAssistant.tsx
│   ├── AnalysisReport.tsx
│   ├── DataTable.tsx
│   ├── FileUploader.tsx
│   ├── ReportGenerator.tsx
│   ├── SettingsModal.tsx
│   └── VoltageChart.tsx
├── services/              # Business logic and utilities
│   └── parser.ts          # Log file parsing logic
└── package.json
```

## Build and Development Commands

- **Install dependencies**: `npm install`
- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build` (runs TypeScript compiler then Vite build)
- **Preview production build**: `npm run preview`

## Code Style and Conventions

### TypeScript
- Use strict TypeScript types - avoid `any` where possible
- Define interfaces in `types.ts` for data structures
- Use functional components with hooks (React.FC)
- Prefer `const` over `let`

### React
- Use functional components with hooks exclusively
- Use `useMemo` for expensive computations
- Use `useState` for local component state
- Keep component files focused and single-purpose
- Extract reusable logic into custom hooks if needed

### Naming Conventions
- **Components**: PascalCase (e.g., `VoltageChart.tsx`)
- **Functions**: camelCase (e.g., `parseLogFile`)
- **Types/Interfaces**: PascalCase (e.g., `VoltageTriplet`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Variables**: camelCase

### File Organization
- Place React components in `/components` directory
- Place business logic and utilities in `/services` directory
- Keep type definitions in `types.ts`
- One component per file

### Styling
- Use inline Tailwind-like utility classes
- Follow existing color scheme:
  - Background: dark theme with `bg-background`
  - Accent color: blue (`accent`)
  - Danger/Error: red (`danger`)
  - Text: `text-textMain` and `text-textMuted`
- Maintain responsive design with breakpoints (e.g., `md:`, `lg:`)

### State Management
- Use React hooks for state management
- Pass state as props when needed
- Use context sparingly, only for truly global state
- Compute derived state with `useMemo`

## Domain-Specific Knowledge

### Voltage Analysis
- **Voltage Range**: Normal voltage is between `vmin` (default 207V) and `vmax` (default 253V)
- **Three Phases**: L1, L2, L3 represent the three electrical phases
- **Status Types**:
  - `ok`: All voltages within range
  - `under`: One or more phases below vmin
  - `over`: One or more phases above vmax
  - `imbalance`: Phase difference (delta) exceeds threshold
- **Deep Dip**: Voltage drops below 190V (critical issue)
- **Risk Levels**: low, medium, high (based on violation counts and severity)

### Data Structures
- **VoltageTriplet**: Contains timestamp, L1/L2/L3 voltages, status, delta, and metadata
- **FileData**: Represents uploaded log file with parsed triplets and errors
- **AnalysisStats**: Aggregated statistics including violation counts and risk level

### Parsing Logic
- Log files are parsed in `/services/parser.ts`
- Handle corrupted timestamps and invalid data gracefully
- Track parsing errors in `parsingErrors` array
- Support for timezone conversion

## Localization

The application supports three languages:
- Ukrainian (`uk`) - default
- Russian (`ru`)
- English (`en`)

When adding new user-facing text:
- Provide translations for all three languages
- Use ternary operators for language selection: `lang === 'uk' ? 'Текст' : lang === 'ru' ? 'Текст' : 'Text'`
- Keep translation logic consistent with existing patterns

## AI Integration

- The application uses Google Gemini AI for analysis assistance
- API key should be stored in `.env.local` as `GEMINI_API_KEY`
- **IMPORTANT**: Ensure `.env.local` is listed in `.gitignore` to prevent accidental commits of sensitive data
- AI features are optional and should degrade gracefully if unavailable

## Important Considerations

### Performance
- Use `useMemo` for expensive computations (especially when processing large datasets)
- Implement virtualization for large lists if needed
- Optimize re-renders by proper dependency management in hooks

### Error Handling
- Log parsing errors should be tracked and displayed to users
- Handle file upload errors gracefully
- Provide meaningful error messages in appropriate language

### Accessibility
- Maintain keyboard navigation support
- Use semantic HTML elements
- Provide appropriate ARIA labels for interactive elements

### Testing
- Currently, there are no automated tests in the repository
- Manual testing should focus on:
  - File upload and parsing
  - Chart interactions (zoom, selection)
  - Data table navigation
  - Settings modifications
  - Report generation

## Common Tasks

### Adding a New Component
1. Create file in `/components` directory with PascalCase name
2. Import necessary types from `types.ts`
3. Use functional component with TypeScript types
4. Follow existing styling patterns
5. Export default component

### Modifying Voltage Thresholds
- Update `GlobalSettings` interface if needed
- Modify default values in `App.tsx` (currently vmin: 207, vmax: 253)
- Update validation logic in `/services/parser.ts`

### Adding New Statistics
1. Update `AnalysisStats` interface in `types.ts`
2. Modify computation logic in `App.tsx` (useMemo block)
3. Update display components (`AnalysisReport.tsx`, `ReportGenerator.tsx`)
4. Consider localization for new labels

## Security Considerations

- Never commit API keys or sensitive data
- Use environment variables (`.env.local`) for secrets
- Sanitize user input when processing log files
- Be cautious with `eval()` or dynamic code execution

## Dependencies

### Core Dependencies
- `react` and `react-dom`: UI framework
- `recharts`: Charting library for voltage visualization
- `@google/genai`: Google Gemini AI integration

### Dev Dependencies
- `typescript`: Type checking
- `vite`: Build tool and dev server
- `@vitejs/plugin-react`: React support for Vite

Keep dependencies up to date but test thoroughly after updates, especially for `recharts` and `react`.

## Best Practices

1. **Type Safety**: Leverage TypeScript's type system fully
2. **Immutability**: Avoid mutating state directly; use spread operators or proper React state updates
3. **Component Composition**: Break down large components into smaller, reusable pieces
4. **Performance**: Profile and optimize render cycles for large datasets
5. **User Experience**: Provide loading states, error messages, and feedback
6. **Documentation**: Comment complex logic, especially in parsing algorithms
7. **Consistency**: Follow existing patterns in the codebase
