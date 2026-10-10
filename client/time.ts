const hourInSaoPaulo = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' });
export function isNightInSaoPaulo(date = new Date()): boolean {
  const hour = Number(hourInSaoPaulo.format(date));
  return hour < 6 || hour >= 18;
}
