const defaultOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

export default function format(
  date: string | number | Date,
  options = defaultOptions
) {
  if (typeof date === 'string') date = new Date(date);
  return new Intl.DateTimeFormat('en-US', options).format(date);
}
