# TaskPulse - Real-time Task Management

A high-performance task management application built with React, Tailwind CSS, and Express.

## Features
- **CRUD Operations**: Create, Read, Update, and Delete tasks.
- **Priority Management**: Color-coded priority levels (Low, Medium, High).
- **Status Tracking**: To-do, In Progress, and Completed states.
- **Search & Filtering**: Instant search and status-based filtering.
- **Responsive Design**: Optimized for both mobile and desktop screens.
- **Full-Stack Structure**: Express backend ready for API integration.
- **Animations**: Fluid transitions using Motion (formerly Framer Motion).

## Getting Started (Local & VS Code)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- VS Code (optional but recommended)

### Local Setup
1. **Clone or Download** the project to your local machine.
2. **Open in VS Code**:
   ```bash
   code .
   ```
3. **Install Dependencies**:
   Open a terminal in VS Code and run:
   ```bash
   npm install
   ```
4. **Environment Variables**:
   Create a `.env` file in the root and add:
   ```env
   JWT_SECRET="your-own-secure-secret-here"
   ```
5. **Run in Development**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

### Why this works in VS Code
- **Full-Stack Integrated**: The project includes a custom Node.js/Express server (`server.ts`) that handles both the API and the React frontend simultaneously.
- **Auto-Bundling**: We use `tsx` to run the TypeScript server directly without a separate "build" step for the backend, and Vite handles the frontend assets.
- **Port 3000**: Pre-configured to run on port 3000 for standard local development.

## Project Structure
- `server.ts`: The Express/Node.js backend.
- `src/`: The React/TypeScript frontend.
- `package.json`: Integrated scripts for one-command startup (`npm run dev`).
