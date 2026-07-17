# React Client Communication Hub

Real-time client messaging platform built with **React 18**, **.NET 9**, and **SignalR**.

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Realtime | SignalR (WebSockets) |
| Backend  | .NET 9 ASP.NET Core, SignalR Hub |
| Auth     | JWT Bearer tokens |
| Database | SQL Server 2022, EF Core 9 |
| Infra    | Docker, nginx |

## Features

- Real-time chat via SignalR WebSockets
- Conversation management (open / pending / resolved / closed)
- Contact directory
- JWT authentication with role-based access (Admin / Agent)
- Auto-scroll, read receipts, unread badge counts
- Modern SaaS UI (Inter font, clean whites, brand blue)

## Quick Start (Docker)

```bash
docker compose up --build
# App: http://localhost:3000
```

### Seed Credentials
| Role  | Email               | Password  |
|-------|---------------------|-----------|
| Admin | admin@clienthub.dev | Admin@123 |
| Agent | agent@clienthub.dev | Agent@123 |

## Local Development

### Backend
```bash
cd backend

# Start SQL Server
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=ClientHub@123!" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest

# Run migrations (first time only)
dotnet ef migrations add InitialCreate --project ClientHub.API
dotnet ef database update --project ClientHub.API

dotnet run --project ClientHub.API
# API at http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App at http://localhost:3000
```

## Project Structure

```
react-client-hub/
├── frontend/src/
│   ├── components/
│   │   ├── chat/       ConversationList, ChatWindow, MessageBubble, MessageInput
│   │   ├── layout/     Shell, Sidebar
│   │   └── ui/         Avatar, Badge, Spinner
│   ├── hooks/          useSignalR
│   ├── pages/          LoginPage, InboxPage, ContactsPage
│   ├── services/       api.ts (Axios), signalr.ts
│   ├── store/          authStore, chatStore (Zustand)
│   └── types/          Shared TypeScript interfaces
└── backend/ClientHub.API/
    ├── Controllers/    Auth, Conversations, Messages, Contacts
    ├── Hubs/           ChatHub (SignalR)
    ├── Models/         Entities + DTOs
    ├── Services/       Business logic
    └── Data/           AppDbContext + DbSeeder
```
