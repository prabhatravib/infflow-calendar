import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error-handler';
import { eventsRouter } from './routes/events';
import { echoRouter } from './routes/echo';
import { weatherRouter } from './routes/weather';
import { icsRouter } from './routes/ics';
import { seedRouter } from './routes/seed';
import { AssetService } from './services/asset-service';
import { Env } from './types';
import { protectedHexaRouter } from './protectedHexa/routes';

const app = new Hono<{ Bindings: Env }>();

app.route('/', protectedHexaRouter);

// Middleware
app.use('*', corsMiddleware);
app.use('*', errorHandler);

// API Routes
app.route('/', eventsRouter);
app.route('/', echoRouter);
app.route('/', weatherRouter);
app.route('/', icsRouter);
app.route('/', seedRouter);

// Static asset handler - must be last to catch all non-API routes
app.get('*', async (c) => {
  try {
    // Validate the request URL
    if (!c.req.url) {
      console.error('No request URL provided');
      return c.notFound();
    }

    // Validate ASSETS binding
    if (!c.env.ASSETS) {
      console.error('ASSETS binding not available');
      return c.notFound();
    }

    const url = new URL(c.req.url);
    const path = url.pathname;
    
    // Skip API routes
    if (path.startsWith('/api/')) {
      return c.notFound();
    }
    
    const assetService = new AssetService(c.env.ASSETS);
    return await assetService.serveAsset(path);
  } catch (error) {
    console.error('Error in static asset handler:', error);
    return c.notFound();
  }
});

export default app;
