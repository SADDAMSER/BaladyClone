# Bina'a Al-Yaman Surveyor - Architecture Plan

## Overview
A high-performance, offline-first Flutter mobile application for field surveyors in Yemen. The app provides comprehensive land surveying capabilities with intuitive Arabic UI and seamless data synchronization.

## Core Features & Implementation Plan

### Phase 1: Foundation & Authentication
1. **Dependencies Setup**: Hive for local storage, connectivity_plus for network detection, flutter_map for mapping
2. **Authentication System**: Login screen with email/password validation
3. **Data Models**: SurveyTask, SurveyPoint, SurveyLine, SurveyPolygon with Hive adapters
4. **Theme Enhancement**: Arabic font support with high-contrast outdoor-optimized colors

### Phase 2: Main Navigation & Tasks
1. **Bottom Navigation**: Three main screens - Tasks (المهام), Field Survey (الرفع الميداني), Settings (الإعدادات)
2. **Tasks Screen**: Filter tabs (New/Completed), task list with citizen info and location
3. **Task Details**: Task information with "Start Survey" button
4. **Sample Data**: Hardcoded realistic survey tasks for Yemen locations

### Phase 3: Core Survey Interface
1. **Map-Centric UI**: Flutter Map with GNSS status panel
2. **Smart Toolbar**: Floating toolbar with Point/Line/Polygon tools
3. **Feature Coding Panel**: Context-sensitive feature codes based on selected tool
4. **Data Capture**: Geometry capture with feature code assignment

### Phase 4: Advanced Survey Features
1. **Smart Snapping**: Visual indicators for precise geometry connections
2. **Polygon Completion**: Close/Save-as-in-progress options
3. **Real-time Preview**: Visual feedback for ongoing survey work

### Phase 5: Data Management & Sync
1. **Offline Storage**: All data stored locally using Hive
2. **Background Sync**: Connectivity monitoring and automatic data sync
3. **Manual Sync**: Force sync option in settings
4. **Backend Simulation**: Mock API endpoints with realistic delays

## Technical Architecture

### Data Layer
- **Local Database**: Hive for offline-first storage
- **Models**: Task, Point, Line, Polygon entities with relationships
- **Sync Service**: Background service for data synchronization

### Presentation Layer
- **Screens**: Login, Tasks, TaskDetails, FieldSurvey, Settings
- **Components**: Reusable widgets for survey tools and status panels
- **Theme**: High-contrast colors with Arabic font support

### Business Logic
- **State Management**: Provider/StatefulWidget for local state
- **Survey Logic**: Geometry capture and validation
- **Sync Logic**: Network detection and data transmission

## File Structure (Max 10-12 files)
```
lib/
├── main.dart
├── theme.dart
├── models/
│   ├── survey_models.dart
│   └── hive_adapters.dart
├── services/
│   ├── database_service.dart
│   └── sync_service.dart
├── screens/
│   ├── login_screen.dart
│   ├── main_navigation.dart
│   ├── tasks_screen.dart
│   ├── task_details_screen.dart
│   ├── field_survey_screen.dart
│   └── settings_screen.dart
└── widgets/
    ├── survey_toolbar.dart
    └── gnss_status_panel.dart
```

## Success Criteria
- 100% offline functionality
- Intuitive Arabic UI with large touch targets
- Smooth map interaction with survey tools
- Reliable data persistence and sync
- Realistic sample data for testing