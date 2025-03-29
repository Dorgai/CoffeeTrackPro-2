# CoffeeTrackPro

A full-stack application for tracking coffee supply chain.

## Deployment

This application is configured for deployment on Railway.app. To deploy:

1. Push your code to GitHub
2. Connect your repository to Railway
3. Add the following environment variables in Railway:
   ```
   NODE_ENV=production
   DATABASE_URL=your_database_url
   SESSION_SECRET=your_secure_session_secret
   CORS_ORIGIN=https://coffeetrackpro.railway.app
   ```

## Development

To run locally:

```bash
npm install
npm run dev
```

## Build

To build for production:

```bash
npm run build
``` 