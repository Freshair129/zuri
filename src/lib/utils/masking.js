/**
 * PII Data Masking Utility (ZDEV-TSK-20260410-024)
 * Designed for Zuri multi-tenant data protection.
 */

const UNRESTRICTED_ROLES = ['OWNER', 'MANAGER', 'DEV'];

/**
 * Mask a single PII value based on type
 * @param {string} value 
 * @param {'phone'|'email'|'id'} type 
 * @returns {string}
 */
export function maskValue(value, type) {
  if (!value || typeof value !== 'string') return value;

  if (type === 'phone') {
    // Standard Thai mobile: 0812345678 -> 081-***-5678
    // E.164 Thai: +66812345678 -> +6681-***-5678
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 9) {
      if (value.startsWith('+66')) {
        return value.replace(/(\+66\d{2})\d{3,4}(\d{4})/, '$1-***-$2');
      }
      return value.replace(/(\d{3})\d{3,4}(\d{4})/, '$1-***-$2');
    }
    return value.replace(/(.{2}).*(.{2})/, '$1***$2');
  }

  if (type === 'email') {
    const [user, domain] = value.split('@');
    if (!domain) return value;
    if (user.length <= 2) return `***@${domain}`;
    return `${user[0]}***${user[user.length - 1]}@${domain}`;
  }

  if (type === 'id') {
    // For LineId or other strings
    if (value.length <= 6) return '******';
    return `${value.slice(0, 3)}***${value.slice(-3)}`;
  }

  return value;
}

/**
 * Deeply mask an object or array based on PII keys
 * @param {any} data - Object or Array to mask
 * @param {string[]} roles - Normalized user roles
 * @returns {any}
 */
export function maskPii(data, roles = []) {
  if (!data) return data;
  
  // If user has unrestrcited roles, return raw data
  const hasAccess = roles.some(r => UNRESTRICTED_ROLES.includes(r.toUpperCase()));
  if (hasAccess) return data;

  // Clone to avoid mutating original source if needed
  // We handle recursion for arrays and nested objects
  if (Array.isArray(data)) {
    return data.map(item => maskPii(item, roles));
  }

  if (typeof data === 'object') {
    const masked = { ...data };
    
    // PII Key Map
    const phoneKeys = ['phone', 'phoneNumber', 'phonePrimary', 'phoneSecondary'];
    const emailKeys = ['email'];
    const idKeys    = ['lineId', 'facebookId'];

    for (const key in masked) {
      const val = masked[key];
      
      if (phoneKeys.includes(key)) {
        masked[key] = maskValue(val, 'phone');
      } else if (emailKeys.includes(key)) {
        masked[key] = maskValue(val, 'email');
      } else if (idKeys.includes(key)) {
        masked[key] = maskValue(val, 'id');
      } else if (typeof val === 'object' && val !== null) {
        // Deep recursion for relations (e.g., customer structure inside order)
        masked[key] = maskPii(val, roles);
      }
    }
    return masked;
  }

  return data;
}
