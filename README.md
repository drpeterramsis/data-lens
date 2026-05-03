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

- **v1.0.513:** Fixed Admin Settings Dashboard Category Add/Edit functionality. Implemented an inline category creator in the Skill-Zaty "Create Course" modal, allowing administrators to add new categories without exiting the course creation flow.
- **v1.0.512:** Fixed `ReferenceError: Trash2 is not defined` in the User Management Tab.
- **v1.0.511:** Introduced the comprehensive Admin Settings Page and dynamic Dashboard Categories system. Migrated the existing user management interface to a new tabbed admin panel. Implemented a GitHub-backed `dashboardConfig.json` engine that allows real-time control over module visibility, categorical grouping, and display settings (column count, descriptions, link visibility). Updated the main dashboard to render dynamically based on this centralized configuration while maintaining strict role-based access control.
- **v1.0.510:** Standardized number formatting application-wide using a new intelligent `formatNumber.js` utility. Successfully removed hundreds of redundant percentage signs across complex analytics tools (Sales Analyzer, Sales Forecast, Call Detailing Analyzer, Routing Analyzer). Optimized the global percentage formatter to automatically handle sign appending, ensuring consistent and precise data presentation.
- **v1.0.508:** Replaced the scrollable MR selection pill buttons in Call Detailing Analyzer with a custom-engineered `MrDropdown` component. The new UI features real-time MR search, an "All Team" quick-selector, and a responsive trigger button that clearly indicates active filtering with distinct amber styling. Improved the overall dashboard layout by reclaiming vertical and horizontal space while maintaining full functionality and filtering logic.
- **v1.0.507:** Implemented global KPI and metric formatting across the entire application. Standardized all numerical displays to show exactly two decimal places using a new centralized `formatNumber.js` utility. Applied fixes to Sales Analyzer (Compare, Summary, Detail views), Call Detailing Analyzer (Forecast, MR Cards, Tooltips), Sales Forecast, Routing Analyzer, and Skill-Zaty portal. Precision-tuned MR calculation logic to maintain accuracy before final display formatting. Updated all version-aware components to v1.0.507.
- **v1.0.506:** Resolved Vercel deployment failure by migrating from `react-quill` to `react-quill-new`, ensuring full compatibility with React 19. Fixed peer dependency conflicts in the build pipeline.
- **v1.0.505:** Resolved critical React Hooks violation in Skill-Zaty portal caused by conditional useMemo calls. Fixed GitHub API 404 error during initial startup by implementing a graceful fallback for the missing `skillzaty.json` data file. Refined data fetching logic to ensure high reliability across project environments.
- **v1.0.504:** Launched **Skill-Zaty Training Center**, a comprehensive learning management tool with full GitHub synchronization. Features include a multi-category course portal, global cross-meta search, and a diverse range of interactive content blocks: Rich Text (Quill integration), Inline PDF (Viewer), Custom Audio, Video (YouTube/Vimeo), and Collapsible Active Cards. Implemented a robust **Admin Course Builder** with drag-and-drop section management, automated folder-based media uploads (thumbs/pdfs/audio/images), and granular user-specific course access controls. Updated global versioning and refined footer labels.
- **v1.0.503:** Implemented Smart Auto-Icon Detection for Library links...
- **v1.0.502:** Fixed Vite build error by refactoring CSS to avoid `@apply` with custom utility classes. Optimized CSS selector structure for better maintainability.
- **v1.0.501:** Standardized button styles across all tool modules (Sales Analyzer, Call Detailing, Routing, Forecast). Implemented strict yellow theme (#FFC300) ONLY for specific "Filters" buttons. Reverted navigation tabs to a clean slate/dark theme (tab-btn) for better visual hierarchy. Updated FilterButton component with robust label detection and refined CSS transitions. Fixed non-conforming yellow "Upload" buttons to match action button standards.
- **v1.0.500:** Fixed global layout overlap issue where sidebar would cover page content; updated main content wrapper to dynamically adjust left margin (80px collapsed / 240px expanded). Fixed "Filters" button styling in Routing Analyzer to match the new global filter style. Refined tab navigation button appearance in index.css with cleaner active borders and removed scale transitions for a more polished UI across all analyzer tools.
- **v1.0.499:** Applied GLOBAL filter button style across Sales Analyzer, Call Detailing, Routing Analyzer, and Sales Forecast tools. Standardized primary (yellow/red) and active (brighter yellow/deep red) states for all filter pills and tags. Updated month indicators in Routing Analyzer with the new `filter-tag` consistent styling.
- **v1.0.482:** Fixed `CartesianGrid` reference error in `AtRiskAnalysisTab`.
- **v1.0.481:** Fixed missing icon imports (`TrendingUp`, `Cell`) in `Navbar` and `SalesForecast` components.
- **v1.0.480:** Implemented the **Sales Forecast Tool**. Added automated .xlsx / .csv parsing for sales targets and achievement data. Added 6 analysis tabs: Performance Overview, Forecast & Projection, Rankings, Gap Analysis, At Risk Analysis, and Drill Down. Implemented period-based projections (MTD to Month-end), Risk Matrix scatter plot, and 4-level deep Drill Down (Line → DM → MR → Product). Integrated cross-tab navigation and global filters.
- **v1.0.479:** Refined ATR Sales Analyzer By Customer search to include Product, Line, MR, Supervisor, and Branch fields. Updated Trend Analysis charts to match the high-fidelity style of the Compare tool (axis-less, custom tooltips, and smooth line aesthetics). Synchronized global versioning to v1.0.479 across all UI modules.
- **v1.0.467:** Enhanced Compare tool: Quick Month picker is now single row, added inactive dates note, fixed period creation absolute dates, added Save/Load period preset manager handling data availability validation, and added period description editing field within the card.
- **v1.0.466:** Overhauled the Compare Tool tab in SalesAnalyzer: removed default periods, added empty and single-period states, implemented compact month cards in the Quick Month Picker, hid already added months, and ensured instant calculation.
- **v1.0.451:** Fixed missing Search icon import in ReportsTab.jsx.
- **v1.0.450:** Implemented drill-down feature for Reports table cells. Clicking a cell now opens a detailed invoice list modal for data verification.
- **v1.0.449:** Added structured CSV and XLSX export options in Reports with layout preservation (merged cells, multi-level headers). Updated versioning strategy.
- **v1.0.448:** Added filters summary to Reports fullscreen mode and fixed dropdown overlay issues by adjusting Z-index and relative positioning.
- **v1.0.447:** Expanded Drilldown invoice list width, added Fullscreen option to Reports, hid Average/Month for monthly intervals.
- **v1.0.446:** Re-added the Reports tab dynamically, made Drilldown Modal full-screen per User Request.
- **v1.0.445:** Fixed import error for ReportsTab in SalesAnalyzer and imported missing React hooks into ReportsTab.jsx. Updated versioning across all modules.
- **v1.0.440:** Routing Analyzer UI Overhaul: Implemented a compact, fixed layout with fixed header, KPIs, and tabs sections. The content area is now independently scrollable. Improved UI density and refined the collapsible sidebar for better user experience.
- **v1.0.438:** Routing Analyzer UI Fixes: Overhauled sticky header hierarchy with opaque backgrounds (white/solid) to prevent table row bleed-through during scroll; implemented dynamic `top` positioning for Info Bar, Month Selector, KPI Cards, and Tabs based on multi-month state; transitioned `itemsPerPage` to stateful control with new "Show [10-200]" selector integrated into pagination; removed rigid table max-heights to support natural page-wide sticky behaviors.
- **v1.0.436:** Routing Analyzer Multi-Month Optimization: Fixed major data redundancy by implementing cross-month deduplication logic (customerId + month unique keys); added dynamic column visibility to hide MR Name when redundant and show Month badges in aggregate view; moved status toggle controls into table scope for scroll-locked efficiency; overhauled Z-index layering stack for sticky headers and info bars across all screen heights.
- **v1.0.435:** User Management System Overhaul: Integrated account deletion protocol with dual-confirmation modal; implemented safety triggers to prevent self-deletion and orphan administrative states (last admin safeguard); added responsive SVG delete controls to supervisor nodes.
- **v1.0.434:** Routing Analyzer Enhancements: Added Multi-Month batch upload and merging; implemented "Select All/None" for sidebar filters; added month detection preview in upload modal; enabled sticky header backdrop-blur and scroll-sync transitions; improved customer list with cross-month merged data breakdown.
- **v1.0.433:** Routing Analyzer Refinement: Implemented sortable table columns with frozen headers; added MR-specific search within filter sidebar; updated analysis engine to respond dynamically to all active filters; overhauled table rows for maximum density and ergonomic data reading.
- **v1.0.432:** Routing Analyzer Optimization: Unified KPI statistics engine from raw dataset; implemented search across all metadata fields (MR, Specialty, Grade, Type); refined quick-toggle behaviors based on "Customer List" tab context; improved UI ergonomics with consistent layout padding and "IDE-style" sidebar spacing.
- **v1.0.431:** Routing Analyzer Overhaul: Implemented robust local storage for dataset persistence between sessions; added multi-file processing with 'Replace' and 'Append' modes; complete UI/UX transformation with a sticky "IDE-style" filter sidebar and new batch upload modal; enhanced KPI engine with improved visual design and target-based visit progress tracking; refined Header with real-time dataset context.
- **v1.0.430:** Advanced Routing Analysis Engine update. Improved filtering and sorting.
- **v1.0.429:** Routing Analyzer Intelligence Node update.
- **v1.0.428:** Routing Analyzer Initial Release.
- **v1.0.427:** Fixed syntax errors in `Footer.jsx` caused by manual edits. Restored and unified branding highlights using specific yellow (`#F5C518`) for developer name and version numbers.
- **v1.0.426:** Refined footer branding with high-contrast yellow (`#F5C518`) for developer name and version identifiers. Optimized padding in `Sales Analyzer`.
- **v1.0.425:** Updated footer branding with high-contrast yellow highlights for developer name and version identifiers. Incremented global versioning across config and components.
- **v1.0.424:** Increased bottom padding in `Sales Analyzer` (main content and side filters) to 200px to prevent footer overlap and improve scroll clarity.
- **v1.0.423:** Refined KPI cards in `CoachingSection` (compact row grid). Fixed Coaching Day logic to count HCP-only sessions (>= 4). Added sorting to all tables in `Sales Analyzer`. Improved filter logic for comparison tool. Finalized footer overlap fixes and state safety guards.
- **v1.0.422:** Fixed critical `TypeError: Cannot read properties of undefined (reading 'length')` in `CoachingSection` and `InlineCalendar` components by implementing advanced null-safety guards. Improved data resilience in `InlineCalendar` month initialization and hardened string manipulation in `CoachingSection` search filters.
- **v1.0.421:** Added "Avg HCP Coaching / Day" KPI card with logic for approved days (>= 4 HCP visits). Fixed footer overlapping content by adding bottom padding to main content and sidebar, adjusted footer z-index to 30.
- **v1.0.412:** Removed click/hover functionality from the "X d coached" tag in MR cards.
- **v1.0.411:** Removed status labels from MR cards. Cleaner Team Overview table with color-coded rates and coaching indicators based on targets. Added disableHover support for tooltip component and applied it to MR card coaching tags.
- **v1.0.410:** Removed status column from Team Overview. Added target-based coloring for rates. Highlighted coaching days with color. Removed hover effect on status labels.
- **v1.0.404:** Fixed critical bug preventing "Clear Data" and "Upload New File" operations where CSVUploader's local storage backup overrode intentionally cleared states. Ensured full isolation of caching strategies between analysis modules and correctly plumbed fileName downstream to metadata.
- **v1.0.403:** Implemented a new multi-month filtering system for the Call Detailing Analyzer. Added an interactive month selector, tooltip summaries, calendar multi-month default sorting, period banner reflection for selected months, and localized persistent storage. Fixed target calculations in the Forecast Table with a dedicated "Required Rate" column and updated table layout formatting.
- **v1.0.402:** Fixed a critical rendering issue in the User Management and Dashboard screens where newly initialized administrative users that did not have specific platform modules assigned in their data configuration caused sudden application failures on tool parsing. Applied graceful fallbacks to the map iterations.
- **v1.0.401:** Data Lens Branding update: Refactored Call Detailing local storage caching logic to use `datalens_rows` and `datalens_meta`, updated Daily Card Calendar Modals with full customer visit breakdown, and implemented Collapsible Type Sections filtering per visit type (HCO, Pharmacy, HCP). Set app name to "Data Lens" and tagline to "Pharma Analytics Portal" with a 🔍 icon.
- **v1.0.383:** Fixed "Clear Data" and "Upload New File" issues by syncing unique cache storage keys for each tool (Call Detailing vs Sales Analyzer); enhanced table date display using localized helpers; further hardened CSV header normalization.
- **v1.0.382:** Removed auto-login system and restored full authentication requirements (Login page + Protected Routes) to resolve session corruption issues.
- **v1.0.381:** Fixed Logout functionality by adding explicit session tracking; implemented multi-format CSV date parsing (supporting M/D/YYYY) and auto-delimiter detection; enabled "Clear Data" to fully reset local storage cache; streamlined "Upload New File" with a modal overlay for faster tool switching.
- **v1.0.038:** Expanded the centralized `dateHelpers` system to core logic files, including `periodRules.js`, `forecastEngine.js`, and `insightGenerator.js`, eliminating all direct `toLocaleDateString` calls and manual date constructions that triggered `RangeError`.
- **v1.0.037:** Fixed `Uncaught RangeError: Invalid time value` by implementing a centralized `safeFormatDate` utility with error boundaries for all date parsing and formatting operations; further hardened CSV date normalization to handle various input formats reliably.
- **v1.0.036:** Critical fix for CSV data loading: implemented fuzzy header matching (removing spaces), relaxed ID length constraints, added multi-format date normalization (supporting YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY), and enabled case-insensitive InteractionType validation.
- **v1.0.035:** Data Lens v3.5: Implemented robust CSV data cleaning with deduplication by InteractionId, unified date filtering from a single allRows source, rebuilt MR statistics engine with detailed visit tracking for calendar intelligence, and launched a multi-view MR Activity Calendar with inline search and daily visit detail panels.
- **v1.0.033:** Data Lens v3.4: Fixed "Full Period" button logic with all-rows derivation, implemented compact responsive KPI cards with individual accent borders, and updated MR Cards with clickable header expand/collapse and real-time date filtering.
- **v1.0.032:** Resolved "Maximum update depth exceeded" infinite loop bug by stabilizing `onDataLoaded` dependencies via `useCallback` and hardening the `IntersectionObserver` scroll-tab synchronization with state update guards and fixed-height layout.
- **v1.0.031:** Fixed `Uncaught RangeError: Invalid time value` by adding safety guards to date parsing utilities in `periodRules.js`, `forecastEngine.js`, and components.
- **v1.0.479:** Refined ATR Sales Analyzer By Customer search to include Product, Line, MR, Supervisor, and Branch fields. Updated Trend Analysis charts to match the high-fidelity style of the Compare tool (axis-less, custom tooltips, and smooth line aesthetics). Synchronized global versioning to v1.0.479 across all UI modules.
- **v1.0.478:** Expanded Compare Tool fullscreen header to display all active filters (periods, products, lines, customers, supervisors, and dates) for better analytical context during deep dives.
- **v1.0.477:** Enhanced Compare Tool fullscreen mode. The header now dynamically displays the currently compared periods with their respective color markers for immediate analytical context.
- **v1.0.476:** Set 'X-Large' as the default font size for the Compare Tool results.
- **v1.0.475:** Set 'Product' as the default dimension for Performance Analysis in Compare Tool.
- **v1.0.474:** Added interactive row selection to Performance Analysis in Compare Tool. Users can now click table rows to dynamically filter the chart, with dedicated controls for Select All, Clear Selection, and a "Reset to Top 10" shortcut.
- **v1.0.473:** Enhanced Compare Tool visuals. In Metrics Comparison, the 'Best' column tag now dynamically matches the period's specific accent color. Restructured Performance Analysis Line Chart to plot top dimensions as individual lines over the period timeline for clearer trend visualization.
- **v1.0.472:** Optimized Compare Tool UI. Replaced Expand/Collapse buttons with a single smart toggle icon, added font control icons, and fixed "Clear All" logic to reset month selections. Added Bar/Line chart toggle for Performance Analysis top-10 visualization.
- **v1.0.471:** Fixed `ReferenceError: CartesianGrid is not defined` in SalesAnalyzer Performance Analysis section by adding missing recharts imports. Unified global versioning across config, SalesAnalyzer, and footer.
- **v1.0.470:** Added 'Expand All' and 'Collapse All' buttons to Compare Tool Period Management for quick results toggling. Added a 'Top 10' Performance Chart visualization bridging the gap between Performance Analysis dimensions and periodic tracking metrics.
- **v1.0.469:** Enhanced Compare Tool within SalesAnalyzer. Implemented collapsible sections across all results cards (Metrics Comparison, PoP Shift, Insights, Charts, Performance Analysis). Adjusted table row heights dynamically to match content and implemented global font size controls. Refined empty-state logic to prevent calculations unless exactly two or more periods are selected, and added a specific "Clear All" configuration option for custom periods alongside period quick selection.
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
© 2026 Data Lens Analytics | version 1.0.513
