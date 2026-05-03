import {
  Phone,
  BarChart3,
  TrendingUp,
  Map,
  Link2,
  GraduationCap,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  PieChart,
  Activity,
  Target,
  Briefcase,
  Globe,
  Star,
  Zap,
  Database,
  FolderOpen,
} from 'lucide-react'

// Map icon name -> Lucide component
const ICON_MAP = {
  // Common names
  phone:          Phone,
  call:           Phone,
  bar_chart:      BarChart3,
  barchart:       BarChart3,
  chart:          BarChart3,
  trending_up:    TrendingUp,
  trending:       TrendingUp,
  forecast:       TrendingUp,
  map:            Map,
  routing:        Map,
  link:           Link2,
  library:        Link2,
  school:         GraduationCap,
  graduation:     GraduationCap,
  training:       GraduationCap,
  settings:       Settings,
  shield:         ShieldCheck,
  admin:          ShieldCheck,
  dashboard:      LayoutDashboard,
  home:           LayoutDashboard,
  users:          Users,
  team:           Users,
  book:           BookOpen,
  file:           FileText,
  pie:            PieChart,
  activity:       Activity,
  target:         Target,
  briefcase:      Briefcase,
  globe:          Globe,
  star:           Star,
  zap:            Zap,
  database:       Database,
  folder:         FolderOpen,
}

// Emoji -> icon name fallback map
const EMOJI_TO_ICON = {
  '📞': 'phone',
  '📊': 'bar_chart',
  '📈': 'trending_up',
  '🗺️': 'map',
  '🔗': 'link',
  '🎓': 'school',
  '⚙️': 'settings',
  '🛡️': 'shield',
  '📊': 'dashboard', // Note: duplicate key, doesn't matter here
  '👥': 'users',
  '📚': 'book',
  '🎯': 'target',
  '⚡': 'zap',
}

// Default colors per icon (matches your dashboard settings)
const ICON_COLORS = {
  phone:        { icon: '#3B82F6', bg: '#EFF6FF' },
  bar_chart:    { icon: '#8B5CF6', bg: '#F5F3FF' },
  trending_up:  { icon: '#10B981', bg: '#ECFDF5' },
  map:          { icon: '#F59E0B', bg: '#FFFBEB' },
  link:         { icon: '#EC4899', bg: '#FDF2F8' },
  school:       { icon: '#06B6D4', bg: '#ECFEFF' },
  settings:     { icon: '#64748B', bg: '#F1F5F9' },
  shield:       { icon: '#EF4444', bg: '#FEF2F2' },
  dashboard:    { icon: '#3B82F6', bg: '#EFF6FF' },
  default:      { icon: '#6366F1', bg: '#EEF2FF' },
}

export const ModuleIcon = ({
  icon,           // from config: string emoji OR icon name
  color,          // optional override color
  bgColor,        // optional override bg
  size = 24,
}) => {

  // Resolve icon name from emoji or string
  let iconName = icon

  // If it's an emoji, convert to name
  if (EMOJI_TO_ICON[icon]) {
    iconName = EMOJI_TO_ICON[icon]
  }

  // Normalize: lowercase, remove spaces/dashes
  iconName = iconName?.toLowerCase()
    ?.replace(/[-\s]/g, '_') || 'dashboard'

  // Get the Lucide component
  const IconComponent = ICON_MAP[iconName] || LayoutDashboard

  // Get colors
  const colors = ICON_COLORS[iconName] || ICON_COLORS.default
  const iconColor = color || colors.icon
  const iconBg    = bgColor || colors.bg

  return (
    <div
      className="module-icon-wrap"
      style={{
        backgroundColor: iconBg,
        width:  size * 2,
        height: size * 2,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <IconComponent
        size={size}
        color={iconColor}
        strokeWidth={1.8}
      />
    </div>
  )
}
