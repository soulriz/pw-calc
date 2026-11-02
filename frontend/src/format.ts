const nfI = new Intl.NumberFormat('uk-UA');
export const nf = (n: number) => nfI.format(n);
export const dec = (n: number, d: number) => Number(n).toLocaleString('uk-UA', { minimumFractionDigits: d, maximumFractionDigits: d });
export const norm = (s: string) => String(s).toLowerCase().replace(/['ʼ`‘]/g, '’').replace(/\s+/g, ' ').trim();

/** first number of a formatted value ("4 971–5 577" -> 4971) */
export const firstNum = (t: string) => {
  const m = String(t).replace(/[\s  ]/g, '').replace(',', '.').match(/^-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};
