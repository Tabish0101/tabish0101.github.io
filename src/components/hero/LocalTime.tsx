'use client';

import { useEffect, useState } from 'react';
import { clockAt, zoneOffset } from '@/lib/time';

/** When to re-derive the offset with Intl: long after load, off the critical path. */
const CONFIRM_AFTER = 30_000;

/**
 * Local time where the work happens — useful for scheduling. Monospace, so no layout shift.
 *
 * The zone's UTC offset arrives from the server (`offset`, computed when the page was
 * rendered), so ticking is plain arithmetic: no Intl time-zone data loads during hydration.
 * A daylight-saving change since the build is picked up by one Intl check, later.
 */
export function LocalTime({ timeZone, offset }: { timeZone: string; offset: number }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    let minutes = offset;
    const update = () => setTime(clockAt(minutes));
    update();
    const tick = window.setInterval(update, 15_000);
    const confirm = window.setTimeout(() => {
      minutes = zoneOffset(timeZone);
      update();
    }, CONFIRM_AFTER);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(confirm);
    };
  }, [timeZone, offset]);

  return <time className="tabular-nums">{time ?? '--:--'}</time>;
}
