/**
 * The default day: 08:30 to 18:00, which is 570 minutes.
 *
 * It is a default, not a fact. A short night can lower it, and a lapsed subscription
 * reverts it to this fixed figure — which `readonly` says out loud rather than letting
 * someone notice their day quietly got longer.
 */
export const DEFAULT_DAY_LIMIT_MINUTES = 570;
