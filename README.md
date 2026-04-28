# data-lens 🔍

**Your data, crystal clear.**

Data-lens is a powerful, multi-tool CSV analyzer platform designed specifically for supervisors. It provides an intuitive interface to upload, analyze, and manage field force activities and sales performance data directly in the browser.

## Features

- **Authenticated Access:** Secure login system with role-based tool restrictions.
- **CSV Analysis Engine:**
  - **Call Detailing Analyzer:** Deep dive into field force call connectivity.
  - **Sales Analyzer:** Revenue tracking and product performance metrics.
- **Dynamic Data Explorer:** Powerful tables with sorting, searching, and pagination (powered by TanStack Table).
- **Visualization:** Quick summary cards and detailed column-by-column numeric/string analysis.
- **Storage & Export:** Save progress to local browser storage or export processed data to CSV.
- **Admin Suite:** Comprehensive user management for platform administrators.

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS (Custom Black & Golden Yellow theme)
- **Routing:** React Router v6
  - **Data Processing:** PapaParse
- **Tables:** TanStack Table v8
- **Export:** FileSaver.js
- **Animations:** Motion
- **Icons:** Lucide React

## Theme Palette

- **Background:** #0A0A0A (Pure Dark)
- **Surface:** #1A1A1A (Panels & Cards)
- **Accent:** #F5C518 (Golden Yellow)
- **Border:** #2A2A2A

## Setup & Local Development

1. Clone the repository.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the app at `http://localhost:3000`

## Version History

- **v1.0.030:** Fixed over-expanded UI scaling, implemented sticky navigation tabs below navbar, corrected 'Full Period' date range logic, and rebuilt forecast engine for total period accuracy.
- **v1.0.029:** Fixed ReferenceError for working day utility functions in `csvAnalyzer.js` and `TeamOverviewTable.jsx`.
- **v1.0.028:** Data Lens v3.2 Updates Phase 2: Added Collapsible MR Cards, updated the Forecast Calculator formula logic and styling, and implemented a newly rebuilt Full Calendar View for MR activities with inline detailing details.
- **v1.0.027:** Data Lens v3.2 Update: Full rebuild of the Forecast Calculator including DM Meetings and MR Personal Vacations. Updated Daily Card Calendar Modals with full customer visit breakdown. Realigned KPI cards removing 'Total Interactions'. Upgraded period calculation logic correctly handling Thursday PM off states. Added custom CSS overrides to enforce Black & Yellow styling in the footer.
- **v1.0.026:** Data Lens v3.1 Update: Implemented Vercel routing fix, complete redesign of KPI summary cards and CSV Uploader, advanced period rules logic (AM/PM, holidays, weekends), highly accurate Forecast Calculator, dense Team Overview data table, interactive Target configuration panel, and sticky Date Range Filter.
- **v1.0.025:** Data Lens v3.0 Update: Collapsible Sidebar, Local Storage cache for recent CSVs, Target Call Rate Configuration, MRCards Grid with Popup Calendar, Forecast Tool, Team Overview, and re-structured automated AI insights.
- **v1.0.024:** Critical stabilization of `VirtualTable`. Hardened `react-window` integration with robust import recovery and render-time safety guards. Fixed 'Element type is invalid' crash in high-volume data views.
- **v1.0.023:** Implemented auto-detection for CSV delimiters (Comma and Pipe). Fixed "0 rows loaded" issue when uploading standard comma-delimited export files.
- **v1.0.022:** Critical fix for `.split()` crashes on malformed CSV data. Implemented robust PapaParse configuration to handle quoted newlines and escaped characters. Added secondary data sanitization layer in `safeCSV` and `csvAnalyzer` to guarantee `undefined` safety during processing.
- **v1.0.021:** Refactored analyzer to focus on Field Force performance and coaching. Removed product analysis sections and transitioned to a core behavioral metrics model. Hardened insight generation logic.
- **v1.0.020:** Hardened data ingestion layer with `safeCSV` utilities. Implemented comprehensive header cleaning (BOM/whitespace) and safe string/product parsing to prevent `.split()` crashes on malformed CSV exports. Revised `CSVUploader` with real-time processing logs.
- **v1.0.019:** Implemented `src/utils/csvParser.js` for safe data ingestion and hardened parsing logs. Fixed critical `.split()` crashes across all components using optional chaining and guarded parser utilities. Updated Navbar and Login branding.
- **v1.0.015:** Professional Header redesign, forced Dark Mode enforcement, and advanced Call Detailing Smart Analysis with pipe-delimiter support.
- **v1.0.014:** Fixed missing Info icon import in UserManagement.
- **v1.0.013:** Added centralized Footer component with specialized supervisor signature and versioning.
- **v1.0.012:** Technical Dashboard transformation and design layout refinements.
- **v1.0.001:** Initial release. Authentication, CSV parsing, Analysis tools, and Admin panel implemented.

---
© 2026 data-lens Analytics | version 1.0.030
