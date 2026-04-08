Robot Rescue

A fast, lightweight frontend web application focused on interactive UI experiences and a client-side messaging system.

------------------------------------------------------------

Overview

Robot Rescue is a modern frontend application built with React and Vite. It is designed to provide a clean, responsive interface with a focus on simplicity, performance, and user interaction.

The application was originally structured as a full-stack project but has been intentionally simplified into a frontend-only architecture for static deployment. This ensures faster load times, easier hosting, and reduced system complexity.

The core feature of the application is a client-side messaging interface that allows users to interact with a dynamic UI built entirely using React state management.

------------------------------------------------------------

Features

- Fast, modern frontend built with React and Vite
- Responsive UI optimized for desktop and mobile devices
- Client-side messaging system using React state
- Lightweight architecture with no backend dependency
- Static deployment ready
- Modular component-based structure

------------------------------------------------------------

Current MVP Scope

- Interactive messaging interface (client-side only)
- Component-based UI structure
- Local state management using React hooks
- Basic navigation and layout system
- Static deployment compatibility

The application does not include backend services, authentication, or persistent storage in its current form.

------------------------------------------------------------

How It Works

1. The user opens the application in the browser.
2. The UI loads as a fully static React application.
3. The messaging interface operates using in-memory React state.
4. User interactions update the UI dynamically without server communication.
5. On refresh, state resets due to lack of backend persistence.

------------------------------------------------------------

Tech Stack

Frontend: React, Vite
Styling: CSS / Tailwind (if applicable)
State: React Hooks (useState, useContext)
Build Tool: Vite

------------------------------------------------------------

Project Structure

/
src/
  components/
  pages/
  assets/
  App.jsx
  main.jsx

public/
  index.html

package.json
vite.config.js

------------------------------------------------------------

Setup Instructions

Prerequisites:
- Node.js 18+
- npm

Installation:
git clone https://github.com/your-username/robot-rescue.git
cd robot-rescue
npm install

Run Development Server:
npm run dev

App runs at:
http://localhost:5173

Build for Production:
npm run build

Output is generated in:
dist/

Preview Production Build:
npm run preview

------------------------------------------------------------

Deployment

This project is designed for static deployment.

Build command:
npm run build

Output directory:
dist

------------------------------------------------------------

Design Decisions

Robot Rescue was simplified into a frontend-only application to prioritize speed, simplicity, and deployment stability.

- Backend removed to reduce complexity
- Messaging system implemented using local state only
- Focus on UI responsiveness and user experience
- Static deployment chosen for portability

------------------------------------------------------------

Future Improvements

- Persistent messaging using localStorage or backend
- Authentication system
- Real-time messaging features
- Improved UI animations and polish
- Dark mode support

------------------------------------------------------------

License

This project is licensed under the MIT License.

------------------------------------------------------------

Author

Aashik Ilangovan, Peyton Charest, Chloe Dvojmoc, Haifa Afzal, Richard Nghiem

------------------------------------------------------------

Open Source

This repository is released under the MIT License.
