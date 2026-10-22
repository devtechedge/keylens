/**
 * Mock mode helper. MOCK_MODE defaults to true so the scaffold runs with
 * zero external credentials.
 */
export function isMockMode(): boolean {
  return process.env.MOCK_MODE !== "false";
}
