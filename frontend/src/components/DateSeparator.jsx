import { format, isToday, isYesterday, isSameYear } from 'date-fns';

const DateSeparator = ({ date }) => {
  const messageDate = new Date(date);

  const getDateLabel = () => {
    if (isToday(messageDate)) {
      return 'Today';
    } else if (isYesterday(messageDate)) {
      return 'Yesterday';
    } else if (isSameYear(messageDate, new Date())) {
      return format(messageDate, 'EEEE, MMMM dd');
    } else {
      return format(messageDate, 'EEEE, MMMM dd, yyyy');
    }
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex items-center gap-4 px-4 py-2 bg-base-200 rounded-full">
        <div className="h-px bg-base-300 flex-1"></div>
        <span className="text-xs font-medium text-base-content/70 whitespace-nowrap">
          {getDateLabel()}
        </span>
        <div className="h-px bg-base-300 flex-1"></div>
      </div>
    </div>
  );
};

export default DateSeparator;