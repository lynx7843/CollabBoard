# SyncSpace

A real-time, collaborative Kanban-style task board designed for seamless team productivity. SyncSpace features a clean, high-contrast monochrome interface to eliminate distractions and keep the focus entirely on your work.

## Features

* **Real-Time Collaboration:** See teammates' changes update instantly across the board using WebSockets.
* **Offline Support:** Client-side caching ensures you never lose in-progress work during brief network drops.
* **Smart Conflict Resolution:** Detects concurrent edits and alerts users rather than silently overwriting data.
* **Secure Authentication:** JWT-based user registration and login system with protected routes.
* **Automated Testing & CI:** Fully tested frontend and backend, with a continuous integration pipeline ensuring stability on every push.

## Tech Stack

* **Frontend:** React, Jest, React Testing Library
* **Backend:** Node.js, Express, Jest, Supertest
* **Database:** MongoDB (via Mongoose)
* **Real-Time Communications:** Socket.io
* **DevOps:** Docker, Docker Compose, GitHub Actions

## Architecture Summary

The application is organized into a decoupled client and server:
* **Client:** Built with React and organized into highly reusable UI components.
* **Server:** Follows a standard `routes -> controllers -> models` structure for clear separation of concerns.
* **Data Persistence:** Uses MongoDB with a sensible schema balancing embedding and referencing.

## Local Setup

### Prerequisites
* Docker and Docker Compose installed.

### Running with Docker (Recommended)
1. Clone the repository:
   ```bash
   git clone https://github.com/lynx7843/SyncSpace.git
   cd SyncSpace
   ```
2. Start the application:
   ```bash
   docker-compose up --build
   ```
3. Open `http://localhost:3000` in your browser. The API will run on `http://localhost:5000`

## Known Limitations

- Offline Syncing Delay: Reconnecting after a long offline period may take a few seconds to merge complex conflicts.
- Mobile View: The drag-and-drop interface is currently optimized for desktop web browsers.

