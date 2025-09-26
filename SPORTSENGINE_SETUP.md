# SportsEngine Integration Setup Guide

This guide will help you set up the SportsEngine migration feature in your Scout app.

## Prerequisites

1. A SportsEngine account with access to organizations/teams
2. SportsEngine Developer Account (required for API access)

## Setup Steps

### 1. Register Your App with SportsEngine

1. Go to [SportsEngine Developer Portal](https://developer.sportsengine.com/)
2. Sign in with your SportsEngine credentials
3. Create a new application:
   - **Application Name**: Scout App Migration
   - **Description**: Mobile app for migrating SportsEngine data to Scout
   - **Application Type**: Mobile Application
   - **Redirect URI**: `scout://sportsengine-callback` (or your custom scheme)

### 2. Get Your API Credentials

After registering your app, you'll receive:
- **Client ID**: A unique identifier for your app
- **Client Secret**: A secret key for authentication

### 3. Configure Your App

#### Option A: Environment Variables (Recommended)
Create a `.env` file in your project root:

```env
EXPO_PUBLIC_SPORTSENGINE_CLIENT_ID=your_client_id_here
EXPO_PUBLIC_SPORTSENGINE_CLIENT_SECRET=your_client_secret_here
EXPO_PUBLIC_APP_SCHEME=scout
```

#### Option B: Direct Configuration
Edit `src/config/sportsengine.js` and replace the placeholder values:

```javascript
export const SPORTSENGINE_CONFIG = {
  CLIENT_ID: 'your_actual_client_id',
  CLIENT_SECRET: 'your_actual_client_secret',
  // ... rest of config
};
```

### 4. Update App Configuration

Add the custom URL scheme to your `app.json`:

```json
{
  "expo": {
    "scheme": "scout",
    "ios": {
      "bundleIdentifier": "com.scout.sportsapp"
    },
    "android": {
      "package": "com.scout.sportsapp"
    }
  }
}
```

### 5. Install Dependencies

Run the following command to install required packages:

```bash
npm install expo-web-browser expo-linking
```

### 6. Database Setup

Run the migration SQL script in your Supabase dashboard:

```sql
-- Execute the contents of database/add_migration_support.sql
```

## Testing the Integration

1. **Start your development server**:
   ```bash
   npm start
   ```

2. **Test the connection**:
   - Open the app
   - Go to Settings → "Import from SportsEngine"
   - Tap "Connect SportsEngine"
   - You should be redirected to SportsEngine's login page

3. **Verify data access**:
   - After successful authentication, you should see a preview of your organizations and teams
   - Select the data you want to migrate
   - Run a test migration

## Troubleshooting

### Common Issues

1. **"Configuration incomplete" error**:
   - Verify your Client ID and Client Secret are correctly set
   - Check that environment variables are loaded properly

2. **"Authentication cancelled or failed"**:
   - Ensure your redirect URI matches exactly what's configured in SportsEngine
   - Check that your app scheme is properly configured

3. **"No organizations found"**:
   - Verify your SportsEngine account has access to organizations
   - Check that your API credentials have the correct permissions

4. **GraphQL errors**:
   - Review the SportsEngine API documentation for query limits
   - Check if your queries are too complex (complexity score too high)

### Debug Mode

Enable debug logging by adding this to your environment:

```env
EXPO_PUBLIC_DEBUG_SPORTSENGINE=true
```

## Security Notes

⚠️ **Important Security Considerations**:

1. **Client Secret**: In production, the client secret should be handled server-side, not in the mobile app
2. **Token Storage**: Tokens are stored securely using AsyncStorage, but consider additional encryption for sensitive data
3. **User Consent**: Always ensure users understand what data is being migrated and obtain proper consent

## Production Deployment

For production deployment:

1. **Server-side OAuth**: Implement OAuth flow on your backend server
2. **Secure Token Handling**: Store and refresh tokens server-side
3. **Rate Limiting**: Implement proper rate limiting for API requests
4. **Error Handling**: Add comprehensive error handling and user feedback

## API Limits and Best Practices

- **Complexity Scores**: SportsEngine queries have complexity limits (typically 101)
- **Rate Limits**: Respect API rate limits to avoid being blocked
- **Pagination**: Use pagination for large datasets
- **Batch Processing**: Process migrations in batches to avoid timeouts

## Support

If you encounter issues:

1. Check the [SportsEngine API Documentation](https://help.sportsengine.com/en/sections/8225304-api)
2. Review the [SportsEngine Developer Community](https://developer.sportsengine.com/)
3. Contact SportsEngine support for API-specific issues

## Data Mapping

The migration maps SportsEngine data to Scout as follows:

| SportsEngine | Scout | Notes |
|--------------|-------|-------|
| Organization | Group (type: organization) | Top-level container |
| Team | Group (type: team) | Child of organization |
| Player | Group Member (role: player) | Includes jersey number |
| Staff | Group Member (role: coach/staff) | Includes title/position |
| Events | Future enhancement | Not currently migrated |

## Next Steps

After successful setup:

1. Test with a small dataset first
2. Provide user training on the migration process
3. Set up monitoring for migration success/failure rates
4. Consider implementing incremental sync for ongoing updates
