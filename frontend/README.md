# Trust-First Census System - Frontend

A Progressive Web App (PWA) frontend for the Trust-First Caste Census Management System, built with Next.js 15, TypeScript, and Tailwind CSS.

## Design Philosophy

### Constitutional Minimalism Theme

This is a governance-grade application designed with a calm, institutional aesthetic that reflects trust, ethics, and restraint. The design language is inspired by constitutional documents and government institutions.

**Core Design Principles:**
- **Solid Typography**: Merriweather for headings (authority), Inter for body (clarity)
- **Institutional Palette**: Navy/charcoal/off-white with muted gold accents
- **Clear Spacing**: Generous whitespace for readability and gravitas
- **Accessibility First**: WCAG AA compliant, mobile-first responsive design
- **Privacy Indicators**: Clear disclaimers and visual cues for privacy-protected data

### Color Palette

| Color | Usage | Hex |
|-------|-------|-----|
| Navy 900 | Primary text, headers | `#102a43` |
| Navy 700 | Primary buttons, accents | `#334e68` |
| Charcoal 700 | Body text | `#434343` |
| Cream 100 | Page background | `#fdfcfa` |
| Gold 500 | Heritage accents | `#c9a84e` |
| Success | Positive status | `#3d7a5f` |
| Warning | Caution status | `#b8860b` |
| Error | Negative status | `#8b3a3a` |

## Project Structure

```
frontend/
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── icons/             # App icons (various sizes)
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── page.tsx       # Landing page
│   │   ├── principles/    # Principles page
│   │   ├── architecture/  # Architecture page
│   │   ├── login/         # Login page
│   │   ├── submit/        # Submission page
│   │   ├── analytics/     # Analytics dashboard
│   │   ├── system-status/ # Status board
│   │   └── offline/       # Offline fallback
│   ├── components/
│   │   ├── ui/            # Reusable UI components
│   │   └── layout/        # Layout components
│   └── lib/               # Utility functions
├── tailwind.config.ts     # Tailwind configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## PWA Features

### Installation

The app can be installed as a Progressive Web App:

1. **Desktop (Chrome/Edge)**: Click the install icon in the address bar
2. **Mobile (Android)**: Tap "Add to Home Screen" in browser menu
3. **Mobile (iOS)**: Tap Share → "Add to Home Screen"

### Offline Support

- Static pages are cached for offline viewing
- The `/submit` page supports offline data entry (syncs when online)
- Offline status indicator shows connection state

### Service Worker

The service worker (`public/sw.js`) provides:
- Static asset caching
- Navigation request caching
- Background sync for submissions
- Offline fallback page

## Components

### UI Components

| Component | Description |
|-----------|-------------|
| `Button` | Primary, secondary, ghost, and danger variants |
| `Card` | Content containers with various styles |
| `Input` | Text input with label, error, and hint support |
| `Select` | Dropdown select with accessibility |
| `Badge` | Status indicators |
| `Disclaimer` | Info, warning, and privacy notices |
| `DataDisplay` | Privacy-protected data presentation |

### Layout Components

| Component | Description |
|-----------|-------------|
| `Header` | Navigation with responsive mobile menu |
| `Footer` | Site footer with links and privacy notice |
| `OfflineIndicator` | Connection status banner |

## Pages

### Public Pages

- `/` - Landing page with principles and how-it-works
- `/principles` - Detailed trust-first principles
- `/architecture` - System architecture and data flow
- `/login` - Authentication (UI only)

### Protected Pages (UI Shell)

- `/submit` - Consent and submission flow
- `/analytics` - Read-only analytics dashboard
- `/system-status` - System health and status

## Backend Integration

**Current Status:** UI Shell Only

All pages are functional UI demonstrations. Backend integration points are marked with `// TODO: Integrate with backend` comments.

### Integration Points

1. **Authentication** (`/login`)
   - POST `/auth/login` with username/password
   - Store JWT token for subsequent requests

2. **Consent** (`/submit`)
   - POST `/consent/capture` to create consent record
   - GET `/consent/verify/:receiptId` to verify consent

3. **Submission** (`/submit`)
   - POST `/submissions` with consent receipt ID
   - Returns submission receipt (no data echo)

4. **Analytics** (`/analytics`)
   - GET `/analytics/aggregates/state` for state data
   - GET `/analytics/aggregates/national` for national data
   - All responses include privacy disclaimers

## Privacy Constraints

The frontend is designed to respect backend privacy constraints:

### What the UI Does NOT Do

- ❌ No export or download buttons
- ❌ No raw data display
- ❌ No district/village level analytics
- ❌ No personal identifier fields
- ❌ No data caching beyond session

### What the UI DOES Do

- ✅ Clear privacy disclaimers on all data
- ✅ Write-only submission flow
- ✅ Consent verification before submission
- ✅ Role-based UI visibility
- ✅ Offline-first for field workers

## Accessibility

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Color contrast ratios ≥ 4.5:1
- Screen reader compatible

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding New Components

1. Create component in `src/components/ui/`
2. Export from `src/components/ui/index.ts`
3. Follow existing patterns for props and styling

### Styling Guidelines

- Use Tailwind utility classes
- Reference design tokens from `tailwind.config.ts`
- Use `cn()` utility for conditional classes
- Follow mobile-first responsive design

## License

This project is part of the Trust-First Census System. All rights reserved.

---

**Note:** This frontend is a UI demonstration. It does not collect or store any real data. For the complete system, see the main project documentation.
