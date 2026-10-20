import { AppState } from 'react-native';
import { useEntitlementStore } from './store';

/**
 * Asks the store about Pro at launch and whenever the app comes back to the
 * front, so a renewal keeps Pro and a cancelled or refunded subscription ends
 * it. Waits for the saved state to load first, or that load would overwrite
 * the fresher answer.
 */
export function startEntitlementSync(): () => void {
  const run = () => void useEntitlementStore.getState().sync();
  const { persist } = useEntitlementStore;
  const unsubHydration = persist.hasHydrated() ? (run(), () => undefined) : persist.onFinishHydration(run);
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') run();
  });
  return () => {
    unsubHydration();
    appState.remove();
  };
}
