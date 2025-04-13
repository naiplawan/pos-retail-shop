# Price Tracker

A comprehensive retail price tracking solution with both web and desktop interfaces, built with Next.js and Electron.

![Price Tracker Dashboard](public/placeholder.svg)

## Features

- **Dashboard Overview**: Visual representation of price trends and summaries
- **Price Management**: Add and track product prices over time
- **Daily & Monthly Reports**: Analyze price changes on daily and monthly basis
- **Checklist Management**: Organize tasks and shopping lists with checklist functionality
- **Data Export**: Export price data to PDF and other formats
- **Cross-Platform**: Available as a web application or desktop application (Windows, macOS, Linux)

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS, Radix UI components
- **Charts**: Chart.js, Recharts for data visualization
- **PDF Export**: React-PDF, jsPDF for document generation
- **Database**: Prisma with Supabase
- **Desktop App**: Electron
- **Form Handling**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Bun package manager
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/price-tracker.git
   cd price-tracker
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```
   DATABASE_URL="your-database-connection-string"
   ```

4. Run the development server:

   ```bash
   bun run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Running the Desktop App

1. Start the development server:

   ```bash
   bun run dev
   ```

2. In a new terminal, run the Electron app:
   ```bash
   bun run electron
   ```

## Building for Production

### Web Application

```bash
bun run build
bun run start
```

### Desktop Application

```bash
bun run build
bun run electron-build
```

After building, you can find the packaged desktop application in the `dist` directory.

## Project Structure

```
app/                  # Next.js app directory with pages and API routes
  api/                # API routes for data operations
  checklist/          # Checklist feature pages
components/           # Reusable React components
  ui/                 # UI component library
electron/             # Electron-specific code for desktop app
hooks/                # Custom React hooks
lib/                  # Utility functions and database logic
  migrations/         # Database migrations
public/               # Static assets
types/                # TypeScript type definitions
```

## API Routes

The application provides the following API endpoints:

- `/api/prices` - Manage product prices
- `/api/checklist` - Manage checklist items and sheets
- `/api/summary` - Get summarized data for dashboards

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Electron](https://www.electronjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Chart.js](https://www.chartjs.org/)
