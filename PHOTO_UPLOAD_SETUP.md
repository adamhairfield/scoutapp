# Photo Upload Setup Guide

This guide explains how to set up photo upload functionality for the Scout app using Supabase Storage.

## 1. Database Schema Updates

First, run the SQL script to add photo support to your database:

```sql
-- Run this in Supabase SQL Editor
-- File: database/add_photo_support.sql
```

This script will:
- Add `photo_url` and `photo_urls` columns to the posts table
- Create indexes for better performance
- Add comments for documentation

## 2. Create Supabase Storage Bucket

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create Bucket**
4. Set the following configuration:
   - **Bucket name**: `group-photos`
   - **Public**: `false` (requires authentication)
   - **File size limit**: `10MB`
   - **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

### Option B: Using the PhotoUploadService

The `PhotoUploadService` includes a `createBucket()` method that can be called programmatically:

```javascript
import { photoUploadService } from '../services/PhotoUploadService';

// Call this once during app initialization
const setupStorage = async () => {
  const result = await photoUploadService.createBucket();
  console.log('Bucket creation result:', result);
};
```

## 3. Storage Policies (RLS)

The SQL script includes Row Level Security (RLS) policies for the storage bucket. These policies ensure:

- Users can only upload photos to groups they belong to
- Users can only view photos from groups they're members of
- Users can only delete their own uploaded photos

If you created the bucket manually, run the RLS policy creation part of the SQL script:

```sql
-- Run the RLS policies section from add_photo_support.sql
```

## 4. App Permissions

The app automatically requests camera and photo library permissions when users try to upload photos. Make sure your `app.json` includes the necessary permissions:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you share them with your team.",
          "cameraPermission": "The app accesses your camera to let you take photos to share with your team."
        }
      ]
    ]
  }
}
```

## 5. Features Implemented

### Photo Upload
- Single photo upload
- Multiple photo upload (up to 5 photos)
- Camera capture
- Photo library selection
- Photo preview before posting
- Upload progress indication

### Photo Display
- Single photo display in posts
- Multiple photo horizontal scroll
- Proper aspect ratio handling
- Loading states

### Storage Management
- Automatic file naming with timestamps
- Organized folder structure by group ID
- Metadata tracking (uploader, group, original filename)
- Error handling and retry logic

## 6. Usage

### For Users
1. Open a group's Feed tab
2. Tap the "Photo" button in the "Say something..." input
3. Choose "Camera" or "Photo Library"
4. Select/take photos (up to 5)
5. Add optional text content
6. Tap "Post" to share

### For Developers
The photo upload functionality is modular and can be extended:

```javascript
// Upload a single photo
const result = await photoUploadService.uploadPhoto(imageAsset, groupId, userId);

// Upload multiple photos
const result = await photoUploadService.uploadMultiplePhotos(imageAssets, groupId, userId);

// Create a photo post
const result = await feedService.createPhotoPost({
  group_id: groupId,
  author_id: userId,
  content: 'Optional text content',
  photo_urls: ['url1', 'url2'], // or photo_url: 'single_url'
});
```

## 7. File Structure

```
src/
├── services/
│   ├── PhotoUploadService.js     # Core photo upload logic
│   └── database.js               # Updated with photo post support
├── components/
│   └── CreatePostInput.js        # Updated with photo UI
└── screens/
    └── GroupDetailsScreen.js     # Updated to display photos

database/
└── add_photo_support.sql         # Database schema updates
```

## 8. Testing

1. Ensure you have the Supabase bucket created
2. Run the database migration
3. Test on a physical device (camera functionality requires real device)
4. Try both single and multiple photo uploads
5. Verify photos display correctly in the feed
6. Test permissions and error handling

## 9. Troubleshooting

### Common Issues

**Photos not uploading:**
- Check Supabase bucket exists and is named `group-photos`
- Verify RLS policies are applied
- Check network connectivity
- Ensure user is authenticated

**Permissions denied:**
- Check app.json has proper permissions
- Test on physical device (simulator has limited camera access)
- Verify user granted permissions in device settings

**Photos not displaying:**
- Check photo URLs are valid
- Verify storage bucket is accessible
- Check network connectivity
- Ensure RLS policies allow read access

### Debug Mode

Enable debug logging in PhotoUploadService by uncommenting console.log statements to track upload progress and errors.

## 10. Security Considerations

- Photos are stored in a private bucket (requires authentication)
- RLS policies restrict access to group members only
- File size limits prevent abuse (10MB max)
- MIME type restrictions ensure only images are uploaded
- Automatic file naming prevents path traversal attacks

## Next Steps

Consider implementing:
- Photo compression before upload
- Thumbnail generation
- Photo deletion functionality
- Photo editing capabilities
- Offline upload queue
- Progress indicators for large uploads
