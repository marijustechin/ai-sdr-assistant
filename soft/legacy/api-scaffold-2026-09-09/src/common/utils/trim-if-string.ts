export const trimIfString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
