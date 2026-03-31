export {};

declare global {
  interface Window {
    Widget?: new (
      containerId: string,
      uuid: string,
      config: Record<string, unknown>
    ) => unknown;
    /** Calendario OrbiRent v2 (Hostfully). */
    orbiwidget?: new (
      containerId: string,
      config: Record<string, unknown>
    ) => unknown;
  }
}
