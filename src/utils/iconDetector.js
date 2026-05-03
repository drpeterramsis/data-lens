
// Check if string starts with emoji
const startsWithEmoji = (str) => {
  if (!str) return false;
  const emojiRegex = /^\p{Emoji}/u;
  return emojiRegex.test(str.trim());
};

// Extract leading emoji from string
const extractLeadingEmoji = (str) => {
  if (!str) return null;
  const emojiRegex = /^\p{Emoji}+/u;
  const match = str.trim().match(emojiRegex);
  return match ? match[0] : null;
};

// Keyword matching
const getIconFromKeywords = (text) => {
  const lower = text.toLowerCase();
  
  const keywordMap = [
    { keywords: ['report', 'reports', 'analysis', 'analyzer', 'analytics', 'data', 'stats', 'statistics', 'metrics', 'kpi', 'numbers', 'figures'], 
      icon: '📊' },
    { keywords: ['dashboard', 'overview', 'summary', 'monitor', 'monitoring', 'performance'], 
      icon: '📈' },
    { keywords: ['sales', 'sell', 'selling', 'revenue', 'target', 'quota', 'pipeline', 'crm'], 
      icon: '💰' },
    { keywords: ['call', 'calls', 'detailing', 'visit', 'meeting', 'contact', 'phone', 'outreach'], 
      icon: '📞' },
    { keywords: ['route', 'routing', 'map', 'maps', 'location', 'territory', 'zone', 'area', 'navigation', 'geo'], 
      icon: '🗺️' },
    { keywords: ['training', 'learn', 'learning', 'course', 'skill', 'education', 'tutorial', 'guide', 'manual', 'onboarding'], 
      icon: '🎓' },
    { keywords: ['document', 'doc', 'file', 'files', 'pdf', 'presentation', 'sheet', 'excel', 'word', 'form', 'template'], 
      icon: '📄' },
    { keywords: ['tool', 'tools', 'app', 'application', 'software', 'system', 'platform', 'portal'], 
      icon: '🛠️' },
    { keywords: ['hr', 'human resources', 'employee', 'staff', 'people', 'team', 'personnel', 'payroll', 'attendance', 'leave'], 
      icon: '👥' },
    { keywords: ['finance', 'financial', 'budget', 'cost', 'expense', 'invoice', 'payment', 'accounting'], 
      icon: '💵' },
    { keywords: ['operation', 'operations', 'process', 'workflow', 'logistics', 'supply', 'chain'], 
      icon: '⚙️' },
    { keywords: ['news', 'announcement', 'update', 'notice', 'alert', 'bulletin', 'memo'], 
      icon: '📢' },
    { keywords: ['portal', 'link', 'website', 'web', 'url', 'online', 'external', 'access'], 
      icon: '🌐' },
    { keywords: ['image', 'photo', 'picture', 'video', 'media', 'gallery', 'visual'], 
      icon: '🖼️' },
    { keywords: ['calendar', 'schedule', 'event', 'meeting', 'appointment', 'agenda', 'plan', 'planner'], 
      icon: '📅' },
    { keywords: ['task', 'tasks', 'project', 'projects', 'todo', 'checklist', 'milestone', 'tracker'], 
      icon: '✅' },
    { keywords: ['reference', 'resource', 'library', 'knowledge', 'base', 'wiki', 'faq', 'help'], 
      icon: '📚' },
  ];
  
  for (const entry of keywordMap) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.icon;
    }
  }
  return null;
};

// CATEGORY DEFAULT ICONS
const categoryDefaults = {
  'Reports': '📊',
  'Dashboards': '📈',
  'Tools': '🛠️',
  'References': '📚',
  'Training': '🎓',
  'HR': '👥',
  'Finance': '💵',
  'Operations': '⚙️',
  'Other': '🔗',
};

/**
 * Priority:
 * 1. Manual customIcon
 * 2. Leading emoji in name
 * 3. Keyword detection
 * 4. Category default
 * 5. Generic fallback
 */
export const getLinkIcon = (link) => {
  if (!link) return '🔗';

  // Priority 1: Manual custom icon
  if (link.customIcon && link.customIcon.trim() !== '') {
    return link.customIcon;
  }
  
  // Priority 2: Emoji at start of name
  if (startsWithEmoji(link.name)) {
    const extracted = extractLeadingEmoji(link.name);
    if (extracted) return extracted;
  }
  
  // Priority 3: Keyword detection
  const searchText = `${link.name || ''} ${link.description || ''}`;
  const keywordIcon = getIconFromKeywords(searchText);
  if (keywordIcon) return keywordIcon;
  
  // Priority 4: Category default
  if (link.category && categoryDefaults[link.category]) {
    return categoryDefaults[link.category];
  }
  
  // Priority 5: Generic fallback
  return '🔗';
};

export const getQuickIcons = () => [
  '📊', '📈', '💰', '📞', '🗺️', '🎓', '📄', '🛠️', '👥', 
  '💵', '⚙️', '📢', '🌐', '📅', '✅', '📚', '🔗', '🌟'
];
