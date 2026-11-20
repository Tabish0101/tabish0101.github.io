/**
 * The UTC offset of an IANA time zone at a given instant, in minutes (Asia/Karachi → 300).
 * Uses Intl, which loads ICU time-zone data on first use — tens of milliseconds on a phone —
 * so the client only calls it once the page has long settled (see LocalTime).
 */
export function zoneOffset(timeZone: string, at: Date = new Date()): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

/** "HH:MM" on a 24-hour clock at a fixed UTC offset — plain arithmetic, no Intl. */
export function clockAt(offsetMinutes: number, now: number = Date.now()): string {
  const local = new Date(now + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}
