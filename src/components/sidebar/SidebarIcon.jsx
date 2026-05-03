import React from 'react';
import {
  LayoutDashboard,
  Phone,
  BarChart2,
  TrendingUp,
  Map as MapIcon,
  Link as LinkIcon,
  GraduationCap,
  Settings as SettingsIcon,
  Shield,
  FolderOpen,
  Users
} from 'lucide-react';

const ICON_MAP = {
  dashboard: LayoutDashboard,
  phone: Phone,
  bar_chart: BarChart2,
  trending_up: TrendingUp,
  map: MapIcon,
  link: LinkIcon,
  school: GraduationCap,
  settings: SettingsIcon,
  shield: Shield,
  folder: FolderOpen,
  users: Users,
};

export const SidebarIcon = ({ name, size = 18, strokeWidth = 1.8 }) => {
  const Icon = ICON_MAP[name] || FolderOpen;
  return <Icon size={size} strokeWidth={strokeWidth} />;
};
