# Registration Feature Documentation

## Overview
Comprehensive registration system for Scout app groups that allows team administrators to create and manage registrations for seasons, clinics, camps, events, and tournaments.

## Features Implemented

### 1. Registration Creation Flow
- **Onboarding-style process** with 14 steps
- Progress bar showing current step
- Skip functionality for optional steps
- Back navigation support

### 2. Registration Types
- **Season**: Full season registration
- **Clinic**: Skills clinic or training
- **Camp**: Sports camp or retreat
- **Event**: Single event or game
- **Tournament**: Multi-day tournament

### 3. Core Information Collection

#### Basic Information (Steps 1-2)
- Registration type selection with visual cards
- Registration name
- Sport selection

#### Dates & Location (Steps 3-4)
- Start and end date pickers
- Location/venue information

#### Details (Step 5)
- Description
- Additional details

#### Capacity & Pricing (Steps 6-7)
- Maximum number of registrations (optional)
- Registration fee (supports $0 for free)

### 4. Advanced Features

#### Custom Forms (Step 8)
- Add multiple custom forms
- Each form can have multiple fields
- Reorderable forms

#### Participant Information (Step 9)
Pre-built participant fields:
- T-Shirt Size
- Roommate Preference
- Jersey Number
- Emergency Contact
- Allergies/Dietary Restrictions
- Experience Level

#### Medical Waivers & Forms (Step 10)
- Add required waivers
- Medical consent forms
- Liability waivers
- Photo release forms
- Code of conduct agreements

#### PDF Attachments (Step 11)
- Attach schedules
- Rules and regulations
- Information packets
- Other documents

#### Optional Purchase Items (Step 12)
- Add optional items participants can purchase
- Set prices and quantities
- Examples: Team gear, photos, extra sessions

#### Custom Fields (Step 13)
Flexible field types:
- Text input
- Text area
- Dropdown select
- Checkboxes
- Toggle switches
- Date pickers
- Number inputs

#### Review & Create (Step 14)
- Summary of all registration details
- Final review before creation

## Database Schema

### Main Tables
1. **registrations** - Core registration data
2. **registration_forms** - Custom forms
3. **registration_form_fields** - Form questions
4. **registration_participant_fields** - Participant info fields
5. **registration_waivers** - Medical/legal waivers
6. **registration_attachments** - PDF documents
7. **registration_optional_items** - Optional purchases
8. **registration_custom_fields** - Custom field definitions
9. **registration_submissions** - Participant registrations
10. **registration_submission_responses** - Form responses
11. **registration_waiver_signatures** - Signed waivers
12. **registration_item_purchases** - Item purchases

### Security
- Row Level Security (RLS) enabled on all tables
- Group leaders can create/edit registrations
- Group members can view registrations
- Users can submit and view their own registrations
- Leaders can view all submissions for their registrations

## Access Control
- **Group Leaders Only**: Can create and manage registrations
- Accessible via Group Options menu → "Create Registration"
- Shows as second option in the menu (after Edit Cover Photo)

## User Interface

### Design Features
- Clean, modern onboarding flow
- Visual type selection with icons
- Progress indicator
- Contextual help text
- Skip buttons for optional steps
- Responsive layouts
- Dark mode support

### Navigation
- Back button to previous step
- Next button to advance
- Skip button for optional steps (steps 3-12)
- Final "Create Registration" button on review step

## Installation Requirements

**No additional dependencies required!** 

The registration feature uses only built-in React Native and Expo components that are already part of your project.

## Database Setup

Run the following SQL file in your Supabase SQL editor:
```
database/registrations_schema.sql
```

This will create:
- All registration tables
- Indexes for performance
- RLS policies for security
- Triggers for timestamp updates

## Future Enhancements

### Phase 2 (Recommended)
1. **Registration Management Screen**
   - View all registrations for a group
   - Edit existing registrations
   - Close/cancel registrations
   - View submission statistics

2. **Submission Management**
   - View all submissions
   - Approve/reject submissions
   - Export to CSV/PDF
   - Send notifications to registrants

3. **Payment Integration**
   - Stripe integration
   - Payment tracking
   - Refund management
   - Receipt generation

4. **Participant Registration Flow**
   - Public registration form
   - Multi-step submission process
   - Payment processing
   - Confirmation emails

5. **Analytics & Reporting**
   - Registration statistics
   - Revenue tracking
   - Participant demographics
   - Custom reports

### Phase 3 (Advanced)
1. **Waitlist Management**
   - Automatic waitlist when capacity reached
   - Waitlist notifications
   - Automatic promotion from waitlist

2. **Early Bird Pricing**
   - Time-based pricing tiers
   - Discount codes
   - Group discounts

3. **Team/Group Registrations**
   - Register multiple participants at once
   - Family discounts
   - Bulk registration management

4. **Communication Tools**
   - Email all registrants
   - SMS notifications
   - Automated reminders

## Usage Example

### Creating a Registration

1. Navigate to a group
2. Tap the menu icon (three dots)
3. Select "Create Registration"
4. Follow the onboarding flow:
   - Select registration type
   - Enter basic information
   - Set dates and location
   - Add description and details
   - Set capacity and pricing
   - Add custom forms (optional)
   - Select participant fields
   - Add waivers (optional)
   - Attach PDFs (optional)
   - Add optional items (optional)
   - Add custom fields (optional)
   - Review and create

### Example Use Cases

**Youth Soccer Season**
- Type: Season
- Fee: $150
- Participant Fields: T-shirt size, jersey number, emergency contact
- Waivers: Medical consent, liability waiver
- Optional Items: Team photo ($10), extra training sessions ($25)

**Basketball Camp**
- Type: Camp
- Fee: $300
- Participant Fields: Experience level, roommate preference, dietary restrictions
- Waivers: Medical consent, photo release
- Attachments: Camp schedule PDF, packing list PDF

**Tournament Registration**
- Type: Tournament
- Fee: $50
- Participant Fields: Jersey number, emergency contact
- Custom Fields: Previous tournament experience (dropdown)
- Optional Items: Tournament t-shirt ($15)

## Testing Checklist

- [ ] Create registration with all fields filled
- [ ] Create registration with minimal required fields
- [ ] Skip optional steps
- [ ] Navigate back and forth between steps
- [ ] Test date picker functionality
- [ ] Add and remove custom forms
- [ ] Add and remove participant fields
- [ ] Add and remove waivers
- [ ] Add and remove optional items
- [ ] Review screen shows all data correctly
- [ ] Registration saves to database
- [ ] Only group leaders can access
- [ ] Dark mode displays correctly

## Notes

- The feature is currently set up for creation only
- Submission flow (participant registration) needs to be implemented separately
- Payment processing requires additional integration
- PDF picker functionality is placeholder (needs implementation)
- Navigation to sub-screens (AddCustomForm, AddWaiver, etc.) needs implementation

## Support

For questions or issues with the registration feature, refer to:
- Database schema: `database/registrations_schema.sql`
- Main screen: `src/screens/CreateRegistrationScreen.js`
- Navigation: `src/navigation/AppNavigator.js`
- Access point: `src/components/GroupOptionsModal.js`
