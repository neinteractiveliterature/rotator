import { useSyncExternalStore } from "react";

// copied from remix-utils
function subscribe() {
  return () => {};
}

// copied from remix-utils
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
