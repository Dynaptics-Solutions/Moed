import { useState } from 'react';

import { MonthView } from '@/screens/MonthView';
import { WeekView } from '@/screens/WeekView';

/**
 * The Calendar tab. It holds the Day/Week/Month switch, and Day is the Today tab — the
 * two reach the same screen, which is why Day is a jump rather than a third view here.
 *
 * Week and month keep their own state rather than being routes, because switching scale
 * is not navigation: nobody wants a back stack three deep in calendar scales.
 */
export type CalendarScale = 'week' | 'month';

export default function Calendar() {
  const [scale, setScale] = useState<CalendarScale>('week');

  return scale === 'week' ? <WeekView onScale={setScale} /> : <MonthView onScale={setScale} />;
}
