# AI Cover Photo Storage Fix

## Problem
When users generated AI cover photos for their groups, the external Replicate URLs were being stored directly in the database without uploading the images to the Supabase `group-covers` bucket. This meant:
- Images were hosted on external servers (Replicate)
- No control over image availability/persistence
- Inconsistent storage approach compared to manually uploaded photos

## Solution
Implemented automatic download and upload of AI-generated images to Supabase Storage.

## Changes Made

### 1. Enhanced `imageUploadService` (`src/services/imageUpload.js`)

Added two new methods:

#### `downloadAndUploadImage(externalUrl, bucket, path)`
- Downloads an image from an external URL
- Uploads it to a specified Supabase Storage bucket
- Returns the Supabase public URL
- Handles file extension detection automatically
- Includes comprehensive error handling and logging

#### `uploadAIGeneratedCover(aiImageUrl, groupId)`
- Convenience method specifically for AI-generated cover photos
- Uses naming convention: `covers/ai-{groupId}-{timestamp}`
- Uploads to the `group-covers` bucket

### 2. Updated `GroupOptionsModal` (`src/components/GroupOptionsModal.js`)

Modified `updateGroupCoverPhotoFromUrl()` function:
- **Before**: Stored external Replicate URL directly in database
- **After**: Downloads AI image and uploads to Supabase Storage first, then stores Supabase URL

### 3. Updated `CreateGroupScreen` (`src/screens/CreateGroupScreen.js`)

Enhanced `handleCreateGroup()` function:
- Detects if cover image is an external URL (AI-generated) or local file
- **For AI images**: Uses `uploadAIGeneratedCover()` to download and upload to Supabase
- **For local images**: Uses existing `uploadGroupCover()` method
- Maintains backward compatibility with manually uploaded photos

## Benefits

1. **Consistent Storage**: All group cover photos now stored in Supabase `group-covers` bucket
2. **Reliability**: Images persist in your own storage, not dependent on external services
3. **Control**: Full control over image lifecycle and management
4. **Performance**: Images served from your Supabase CDN
5. **Security**: Images subject to your RLS policies and access controls

## File Naming Convention

AI-generated covers are stored with the prefix `ai-` for easy identification:
```
covers/ai-{groupId}-{timestamp}.{ext}
```

Regular uploaded covers use:
```
covers/{groupId}-{timestamp}.{ext}
```

## Testing

To test the fix:
1. Create a new group and generate an AI cover photo
2. Check Supabase Storage `group-covers` bucket - image should be there
3. Edit an existing group and generate a new AI cover photo
4. Verify the database stores Supabase URLs, not Replicate URLs

## Logging

The implementation includes comprehensive console logging:
- 📥 Downloading image from external URL
- 📤 Uploading to Supabase Storage
- ✅ Successfully uploaded to Supabase
- ❌ Error messages with details
