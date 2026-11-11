// Compatibility surface for the visual components. Local visits have no analytics client.
import { useRef } from 'react';
import { t as shallowEqual } from './shallow-D10MTZ8f.js';

const analytics = Object.freeze({ trackers: null, pageViewToken: '', store: { isReady: false } });
const untrackedRef = [() => {}];
export const p = (select = state => state) => select(analytics);
p.getState = () => analytics;
export const m = () => untrackedRef;

export function P(select) {
  const previous = useRef();
  return state => {
    const next = select(state);
    if (!shallowEqual(previous.current, next)) previous.current = next;
    return previous.current;
  };
}
