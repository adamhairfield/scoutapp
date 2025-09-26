# SportsEngine Migration Backend Setup

This guide will help you set up the backend service that handles SportsEngine data scraping for the Scout app migration feature.

## Overview

The backend service uses web scraping with Puppeteer to:
- Authenticate users with their SportsEngine credentials
- Extract organization, team, and roster data
- Provide a secure API for the mobile app to access this data

## Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- **Google Chrome browser** installed (required for web scraping)
- Basic understanding of web scraping and security considerations

## Setup Instructions

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
# Skip Chrome download during install (we'll use system Chrome)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
```

This will install:
- **Express**: Web server framework
- **Puppeteer**: Web scraping and browser automation
- **Cheerio**: Server-side HTML parsing
- **JWT**: Token-based authentication
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Rate limiting**: API protection

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Security - CHANGE THIS IN PRODUCTION!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration (adjust for your mobile app)
ALLOWED_ORIGINS=http://localhost:19006,exp://localhost:19000

# Rate Limiting
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60

# Puppeteer Configuration
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
```

### 4. Update Mobile App Configuration

In your main Scout app, update the backend URL in the scraping service:

```javascript
// src/services/SportsEngineScrapingService.js
this.backendUrl = 'http://localhost:3001'; // For development
// this.backendUrl = 'https://your-production-domain.com'; // For production
```

### 5. Start the Backend Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on the configured port (default: 3001).

## API Endpoints

The backend provides the following endpoints:

### Authentication
- `POST /api/sportsengine/authenticate` - Authenticate with SportsEngine credentials
- `POST /api/sportsengine/validate` - Validate credentials without creating session
- `GET /api/sportsengine/test` - Test existing session

### Data Extraction
- `GET /api/sportsengine/organizations` - Get user's organizations
- `GET /api/sportsengine/organizations/:orgId/teams` - Get teams for organization
- `GET /api/sportsengine/teams/:teamId/roster` - Get roster for team
- `GET /api/sportsengine/migration-preview` - Get complete migration preview

### Health Check
- `GET /health` - Server health status

## Security Considerations

### 🔒 Important Security Notes

1. **Credential Handling**: User credentials are only used for authentication and are not stored permanently
2. **Session Management**: Sessions are stored in memory with JWT tokens and automatic expiry
3. **Rate Limiting**: API endpoints are protected against abuse
4. **CORS**: Configured to only allow requests from your mobile app
5. **Input Validation**: All inputs are validated and sanitized

### Production Security Checklist

- [ ] Change the default JWT secret to a strong, unique value
- [ ] Use HTTPS in production
- [ ] Set up proper firewall rules
- [ ] Configure rate limiting based on your needs
- [ ] Monitor for suspicious activity
- [ ] Regular security updates for dependencies

## Deployment Options

### Option 1: Local Development Server
- Run on your development machine
- Good for testing and development
- Mobile app connects to `http://localhost:3001`

### Option 2: Cloud Deployment (Recommended for Production)

#### Heroku Deployment
```bash
# Install Heroku CLI
# Create Heroku app
heroku create scout-sportsengine-backend

# Set environment variables
heroku config:set JWT_SECRET=your-production-jwt-secret
heroku config:set NODE_ENV=production
heroku config:set ALLOWED_ORIGINS=https://your-app-domain.com

# Deploy
git add .
git commit -m "Deploy backend"
git push heroku main
```

#### AWS/DigitalOcean/Other Cloud Providers
1. Create a server instance
2. Install Node.js and dependencies
3. Set up environment variables
4. Configure reverse proxy (nginx)
5. Set up SSL certificate
6. Configure firewall and security groups

## Troubleshooting

### Common Issues

1. **Puppeteer Installation Fails**
   ```bash
   # Try installing with specific flags
   npm install puppeteer --unsafe-perm=true --allow-root
   ```

2. **Browser Launch Fails**
   - Add more Puppeteer args in `.env`:
   ```env
   PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
   ```

3. **CORS Errors**
   - Ensure your mobile app URL is in `ALLOWED_ORIGINS`
   - Check that the mobile app is making requests to the correct backend URL

4. **Authentication Fails**
   - Verify SportsEngine credentials are correct
   - Check if SportsEngine has changed their login flow
   - Review browser console logs for errors

5. **Memory Issues**
   - Puppeteer can use significant memory
   - Consider implementing browser instance pooling for high traffic
   - Monitor memory usage and restart service if needed

### Debug Mode

Enable verbose logging:
```env
NODE_ENV=development
DEBUG=true
```

### Monitoring

For production, consider adding:
- Application monitoring (e.g., New Relic, DataDog)
- Error tracking (e.g., Sentry)
- Uptime monitoring
- Log aggregation

## Performance Optimization

### Browser Management
- Reuse browser instances when possible
- Implement connection pooling
- Set appropriate timeouts
- Clean up resources properly

### Caching
- Cache organization/team data temporarily
- Implement session-based caching
- Consider Redis for distributed caching

### Rate Limiting
- Adjust rate limits based on SportsEngine's tolerance
- Implement exponential backoff for retries
- Monitor for rate limit violations

## Legal and Ethical Considerations

### ⚖️ Important Legal Notes

1. **Terms of Service**: Ensure compliance with SportsEngine's Terms of Service
2. **Rate Limiting**: Respect SportsEngine's servers and implement appropriate delays
3. **User Consent**: Only access data with explicit user permission
4. **Data Privacy**: Handle user data according to privacy laws (GDPR, CCPA, etc.)
5. **Fair Use**: Use scraping responsibly and only for legitimate migration purposes

### Best Practices
- Implement delays between requests
- Use respectful scraping patterns
- Monitor for changes in SportsEngine's structure
- Provide clear user consent flows
- Implement data retention policies

## Maintenance

### Regular Tasks
- Update dependencies regularly
- Monitor for SportsEngine website changes
- Review and update scraping selectors
- Check for security vulnerabilities
- Monitor server performance and logs

### SportsEngine Changes
If SportsEngine updates their website:
1. Update selectors in `SportsEngineService.js`
2. Test authentication flow
3. Verify data extraction accuracy
4. Update error handling as needed

## Support and Updates

### Getting Help
- Check server logs for detailed error information
- Test individual endpoints using tools like Postman
- Verify SportsEngine website structure hasn't changed
- Review browser automation best practices

### Updating the Service
When updating the backend:
1. Test in development environment first
2. Backup current configuration
3. Update dependencies carefully
4. Test all endpoints thoroughly
5. Monitor after deployment

## Example Usage

### Testing with curl

```bash
# Health check
curl http://localhost:3001/health

# Authenticate (replace with real credentials)
curl -X POST http://localhost:3001/api/sportsengine/authenticate \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get organizations (use token from authentication)
curl http://localhost:3001/api/sportsengine/organizations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This backend service provides a secure, scalable way to migrate SportsEngine data without requiring users to set up developer accounts or deal with complex OAuth flows.
