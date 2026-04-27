import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay, 
  addMonths, 
  subMonths,
  isValid
} from 'date-fns';

export const getDatesInRange = (start, end) => {
  return eachDayOfInterval({ start, end });
};

export const formatDisplayDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = parseISO(dateString);
  return isValid(date) ? format(date, 'MMM dd, yyyy') : dateString;
};

export const getDayName = (dateString) => {
  if (!dateString) return '';
  const date = parseISO(dateString);
  return isValid(date) ? format(date, 'EEEE') : '';
};

export { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay, 
  addMonths, 
  subMonths,
  isValid
};
