# VapeCommander
Android APK to control your Storz &amp; Bickel Crafty, Crafty +, and Mighty 

Disclaimer: This is a community project, NOT THE OFFICIAL APP RELEASED BY STORZ&BICKEL --- YOU MAY LOOSE WARRANTY RIGHTS IF YOU USE THE APP

## Features Implemented

### 1. Sleek Circular Temperature Slider
- **Component**: `SleekCircularSlider` from `sleek_circular_slider` package
- **Range**: Configurable temperature range (default: 160°C - 210°C)
- **Visual Design**: 
  - Custom gradient colors (orange to deep red)
  - Shadow effects with opacity animation
  - Progress visualization with smooth transitions
  - Real-time temperature feedback

### 2. Dual Glassmorphism Temperature Displays
- **Component**: `GlassmorphicContainer` from `glassmorphism` package
- **Live Temperature Display** (Upper overlay):
  - Translucent glass effect with white transparency
  - Live temperature reading using custom Nasalization font
  - Positioned at top of circular slider
  - Real-time updates from device
- **Target Temperature Display** (Lower overlay):
  - Orange-tinted glass effect
  - Shows target temperature setpoint
  - Positioned below live temperature
  - Updates when slider is adjusted

### 3. Settings Button with Range Configuration
- **Component**: Settings gear icon in the app bar
- **Functionality**: Opens a dialog with `SfRangeSlider` from Syncfusion
- **Range**: 160°C - 210°C (adjustable)
- **Features**:
  - Dual-handle range slider for min/max temperature setting
  - Visual ticks and labels (10°C intervals)
  - Tooltip support
  - Real-time range preview
  - Applies to main circular slider

### 4. Dark Theme as Default
- **Theme**: Material 3 dark theme with deep orange accent
- **Colors**: Carefully selected color palette for temperature control
- **Typography**: Custom Nasalization font integration
- **Consistency**: Unified dark theme across all UI components

### 5. Boost Temperature Control
- **Component**: `SfSlider` from Syncfusion in glassmorphic container
- **Range**: 0°C - 20°C boost temperature
- **Features**:
  - Visual slider with ticks and labels (5°C intervals)
  - Real-time display of boost value in Nasalization font
  - Automatic device synchronization
  - Enable tooltip for precise control
- **Engage Boost Button**:
  - Fire icon for visual recognition
  - Light blue accent color
  - Disabled when boost is 0°C
  - Confirms boost engagement with snackbar

### 6. Modern UI Components
- **Status Cards**: Glassmorphic containers showing battery and target temperature
- **Control Buttons**: Elevated buttons with proper styling (Turn On, Engage Boost)
- **Switch Controls**: Material design switches for charge indicator
- **Animations**: Pulse animations and smooth transitions

