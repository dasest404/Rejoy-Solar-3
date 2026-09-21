/**
 * Converts a numerical amount in Indian Rupees to its equivalent in English words
 * using the Indian Numbering System (Lakhs, Crores).
 * Example: 320000 -> "Three Lakh Twenty Thousand Rupees Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return TENS[ten] + (one ? ' ' + ONES[one] : '');
}

function convertThreeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let res = '';
  if (hundred > 0) {
    res += ONES[hundred] + ' Hundred';
    if (remainder > 0) res += ' ';
  }
  if (remainder > 0) {
    res += convertTwoDigits(remainder);
  }
  return res;
}

export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zero Rupees Only';
  }

  const rounded = Math.round(Math.abs(amount));
  let num = rounded;

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num; // 0 to 999

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(numberToIndianWordsInternal(crore) + ' Crore');
  }
  if (lakh > 0) {
    parts.push(convertTwoDigits(lakh) + ' Lakh');
  }
  if (thousand > 0) {
    parts.push(convertTwoDigits(thousand) + ' Thousand');
  }
  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  const words = parts.join(' ').trim();
  return (amount < 0 ? 'Minus ' : '') + words + ' Rupees Only';
}

function numberToIndianWordsInternal(num: number): string {
  if (num < 100) return convertTwoDigits(num);
  return convertThreeDigits(num);
}

export function formatINR(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}
