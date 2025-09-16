# Scout - Sports Team Management App

**Connect. Compete. Conquer.**

Scout is a comprehensive React Native app built with Expo that provides sports team management functionality similar to SportsEngine. The app serves coaches, parents, and players with role-based features and modern UI/UX design.

## Features

### 🔐 Authentication System
- Role-based login (Coach, Parent, Player)
- Secure user registration and authentication
- Persistent login sessions

### 👥 Team Management
- Create and manage teams
- Choose subscription levels (Basic, Pro, Premium)
- Sport and age group categorization
- Team roster management

### 💬 Messaging System
- Real-time messaging between coaches and parents
- Group conversations for team communication
- Message history and notifications

### 👤 Player Profiles
- Public player profiles with stats and achievements
- Customizable bio and personal information
- Season statistics tracking
- Achievement badges and awards

### 📱 Home Feed
- Team-related announcements and updates
- Achievement highlights
- Event notifications
- Personalized content based on user role

### 💳 Subscription Management
- Three-tier subscription system for coaches:
  - **Basic ($9.99/month)**: Team roster, basic messaging, schedule sharing
  - **Pro ($19.99/month)**: Advanced analytics, video sharing, parent portal
  - **Premium ($39.99/month)**: Live streaming, custom branding, priority support

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **State Management**: React Context API
- **Storage**: AsyncStorage for local data persistence
- **UI Components**: Custom components with Expo Vector Icons
- **Styling**: React Native StyleSheet with modern design patterns

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ScoutApp
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
- **iOS Simulator**: Press `i`
- **Android Emulator**: Press `a`
- **Web Browser**: Press `w`
- **Physical Device**: Scan QR code with Expo Go app

## Project Structure

```
ScoutApp/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React Context providers
│   │   └── AuthContext.js  # Authentication state management
│   ├── navigation/         # Navigation configuration
│   │   └── AppNavigator.js # Main navigation setup
│   ├── screens/           # App screens
│   │   ├── LoginScreen.js
│   │   ├── HomeScreen.js
│   │   ├── CreateTeamScreen.js
│   │   ├── MessagesScreen.js
│   │   └── ProfileScreen.js
│   ├── services/          # API and external services
│   └── utils/             # Utility functions
├── assets/                # Images, fonts, and other assets
├── App.js                 # Main app component
├── app.json              # Expo configuration
└── package.json          # Dependencies and scripts
```

## User Roles & Features

### 🏃‍♂️ Coach
- Create and manage teams
- Choose subscription plans
- Send messages to parents and players
- Post team announcements
- Manage team roster and schedules

### 👨‍👩‍👧‍👦 Parent
- View team updates and announcements
- Message coaches directly
- Access player statistics and achievements
- Receive notifications about games and events

### ⚽ Player
- Create public profiles with stats
- View personal achievements and awards
- Access team feed and updates
- Track season statistics

## Key Features Implemented

✅ **Role-based Authentication**: Secure login system with three user types
✅ **Team Creation**: Full team setup with sport selection and subscription plans
✅ **Messaging System**: Real-time communication between users
✅ **Player Profiles**: Comprehensive profile management with stats
✅ **Home Feed**: Personalized content feed with team updates
✅ **Modern UI/UX**: Beautiful, responsive design with smooth navigation
✅ **Subscription Plans**: Three-tier pricing model for coaches

## Development Notes

- The app uses mock data for demonstration purposes
- Authentication is simulated - integrate with real backend API for production
- All user data is stored locally using AsyncStorage
- The app is optimized for both iOS and Android platforms

## Future Enhancements

- Real-time messaging with WebSocket integration
- Push notifications for important updates
- Photo and video sharing capabilities
- Calendar integration for game schedules
- Payment processing for subscriptions
- Advanced analytics and reporting
- Live game streaming features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

---

**Scout** - Empowering sports teams to connect, compete, and conquer together! 🏆
