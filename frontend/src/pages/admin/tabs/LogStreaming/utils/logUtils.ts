export const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  if (!obj) return {};
  return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

export const renderFieldValue = (log: any, field: string) => {
  if (field === 'timestamp') return log.timestamp;
  if (field === '_index') return log._index;
  if (field === 'message') return log.message;
  
  const source = log._source || {};
  const value = field.split('.').reduce((o, k) => o?.[k], source);
  return value !== undefined ? String(value) : '-';
};
