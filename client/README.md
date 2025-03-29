# Coffee Track Pro Client

A modern web application for managing coffee roasting and retail operations.

## Features

- User authentication
- Coffee inventory management
- Roasting batch tracking
- Retail order management
- Analytics and reporting
- Settings management

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- React Query
- React Router
- Axios

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```
   VITE_API_URL=http://localhost:3000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Development

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── contexts/      # React contexts
  ├── hooks/         # Custom hooks
  ├── lib/           # Utility functions and API client
  ├── pages/         # Page components
  └── types/         # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 