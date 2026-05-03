import {
  LayoutDashboard,
  BarChart2, BarChart,
  BarChartHorizontal,
  Folder, FolderOpen,
  Settings, Settings2,
  Shield, ShieldCheck,
  Users, User, UserCheck,
  FileText, File, Files,
  Home,
  Map, MapPin,
  Phone, PhoneCall,
  TrendingUp, TrendingDown,
  PieChart, LineChart,
  BookOpen, Book,
  Bell, BellRing,
  Star, StarHalf,
  Grid2X2,
  List,
  Package, PackageOpen,
  Boxes,
  Megaphone,
  ClipboardList, Clipboard,
  Calendar, CalendarDays,
  Search,
  Filter,
  Database,
  Globe,
  Link,
  MessageSquare,
  Layers,
  Layout,
  Monitor,
  Cpu,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  Circle,
  Zap,
  Target,
  Award,
  Flag,
  Tag, Tags,
  Wrench,
  Lock, Unlock,
  Eye,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import React from 'react';

// ── Complete icon name → component map ──
const ICON_MAP = {

  // ── Dashboard / Home ──
  'dashboard':          LayoutDashboard,
  'LayoutDashboard':    LayoutDashboard,
  'layout_dashboard':   LayoutDashboard,
  'home':               Home,
  'Home':               Home,
  'monitor':            Monitor,
  'Monitor':            Monitor,

  // ── Charts / Analytics ──
  'bar_chart':          BarChart2,
  'bar_chart_2':        BarChart2,
  'BarChart':           BarChart2,
  'BarChart2':          BarChart2,
  'BarChartHorizontal': BarChartHorizontal,
  'analytics':          BarChart2,
  'Analytics':          BarChart2,
  'trending_up':        TrendingUp,
  'TrendingUp':         TrendingUp,
  'trending_down':      TrendingDown,
  'TrendingDown':       TrendingDown,
  'pie_chart':          PieChart,
  'PieChart':           PieChart,
  'line_chart':         LineChart,
  'LineChart':          LineChart,
  'activity':           Activity,
  'Activity':           Activity,

  // ── Folder / Files ──
  'folder':             Folder,
  'Folder':             Folder,
  'folder_open':        FolderOpen,
  'FolderOpen':         FolderOpen,
  'file':               File,
  'File':               File,
  'file_text':          FileText,
  'FileText':           FileText,
  'files':              Files,
  'Files':              Files,
  'clipboard':          Clipboard,
  'Clipboard':          Clipboard,
  'clipboard_list':     ClipboardList,
  'ClipboardList':      ClipboardList,

  // ── Settings / Admin ──
  'settings':           Settings,
  'Settings':           Settings,
  'settings_2':         Settings2,
  'Settings2':          Settings2,
  'wrench':             Wrench,
  'Wrench':             Wrench,
  'admin':              Settings,
  'Admin':              Settings,
  'gear':               Settings,

  // ── Shield / Security ──
  'shield':             Shield,
  'Shield':             Shield,
  'shield_check':       ShieldCheck,
  'ShieldCheck':        ShieldCheck,
  'lock':               Lock,
  'Lock':               Lock,
  'unlock':             Unlock,
  'Unlock':             Unlock,

  // ── Users / People ──
  'users':              Users,
  'Users':              Users,
  'user':               User,
  'User':               User,
  'user_check':         UserCheck,
  'UserCheck':          UserCheck,
  'person':             User,
  'Person':             User,

  // ── Phone / Communication ──
  'phone':              Phone,
  'Phone':              Phone,
  'phone_call':         PhoneCall,
  'PhoneCall':          PhoneCall,
  'mail':               MessageSquare,
  'Mail':               MessageSquare,
  'message':            MessageSquare,
  'MessageSquare':      MessageSquare,
  'bell':               Bell,
  'Bell':               Bell,
  'bell_ring':          BellRing,
  'BellRing':           BellRing,
  'megaphone':          Megaphone,
  'Megaphone':          Megaphone,

  // ── Map / Location ──
  'map':                Map,
  'Map':                Map,
  'map_pin':            MapPin,
  'MapPin':             MapPin,
  'globe':              Globe,
  'Globe':              Globe,

  // ── Book / Resources ──
  'book':               BookOpen,
  'Book':               BookOpen,
  'book_open':          BookOpen,
  'BookOpen':           BookOpen,
  'library':            BookOpen,

  // ── Package / Products ──
  'package':            Package,
  'Package':            Package,
  'package_open':       PackageOpen,
  'PackageOpen':        PackageOpen,
  'boxes':              Boxes,
  'Boxes':              Boxes,
  'layers':             Layers,
  'Layers':             Layers,

  // ── Misc ──
  'search':             Search,
  'Search':             Search,
  'filter':             Filter,
  'Filter':             Filter,
  'calendar':           Calendar,
  'Calendar':           Calendar,
  'calendar_days':      CalendarDays,
  'CalendarDays':       CalendarDays,
  'database':           Database,
  'Database':           Database,
  'grid':               Grid2X2,
  'Grid':               Grid2X2,
  'Grid2X2':            Grid2X2,
  'list':               List,
  'List':               List,
  'target':             Target,
  'Target':             Target,
  'award':              Award,
  'Award':              Award,
  'zap':                Zap,
  'Zap':                Zap,
  'flag':               Flag,
  'Flag':               Flag,
  'tag':                Tag,
  'Tag':                Tag,
  'tags':               Tags,
  'Tags':               Tags,
  'star':               Star,
  'Star':               Star,
  'eye':                Eye,
  'Eye':                Eye,
  'info':               Info,
  'Info':               Info,
  'check_circle':       CheckCircle,
  'CheckCircle':        CheckCircle,
  'alert':              AlertCircle,
  'AlertCircle':        AlertCircle,
  'layout':             Layout,
  'Layout':             Layout,
  'cpu':                Cpu,
  'Cpu':                Cpu,
  'link':               Link,
  'Link':               Link,
  'chevron_right':      ChevronRight,
  'ChevronRight':       ChevronRight,
  'arrow_right':        ArrowRight,
  'ArrowRight':         ArrowRight,
}

/**
 * Resolve an icon name string to a React JSX element.
 *
 * @param {string|React.Component} iconName
 * @param {number} size - icon size in px (default 16)
 * @param {string} className - optional CSS class
 * @returns {JSX.Element}
 */
export const resolveIcon = (
  iconName,
  size = 16,
  className = ''
) => {
  // Nothing provided
  if (!iconName) {
    return <Circle size={size} className={className} />
  }

  // Already a React component (not a string)
  if (typeof iconName !== 'string') {
    const IconComp = iconName
    return <IconComp size={size} className={className} />
  }

  // Exact match
  let IconComponent = ICON_MAP[iconName]

  // Case-insensitive fallback
  if (!IconComponent) {
    const lower = iconName.toLowerCase()
    const found = Object.entries(ICON_MAP).find(
      ([key]) => key.toLowerCase() === lower
    )
    if (found) IconComponent = found[1]
  }

  // Partial match fallback
  if (!IconComponent) {
    const lower = iconName.toLowerCase()
    const found = Object.entries(ICON_MAP).find(
      ([key]) => key.toLowerCase().includes(lower) ||
                 lower.includes(key.toLowerCase())
    )
    if (found) IconComponent = found[1]
  }

  if (IconComponent) {
    return (
      <IconComponent size={size} className={className} />
    )
  }

  // Unknown: log warning, show placeholder
  console.warn(
    `iconResolver: Unknown icon "${iconName}"`,
    '— showing placeholder'
  )
  return <Circle size={size} className={className} />
}

// ── Also export as default ──
export default resolveIcon
