export interface TelemetryInput {
  device_id: string;
  temperature: number;
  humidity: number;
}

export interface AnalyticsResult {
  dewPoint: number;
  mouldRisk: boolean;
  roomStatus: string;
}

/**
 * Calculates Dew Point using the Magnus-Tetens formula.
 * @param temp Temperature in Celsius
 * @param hum Relative Humidity in %
 * @returns Dew Point in Celsius (rounded to 1 decimal place)
 */
export function calculateDewPoint(temp: number, hum: number): number {
  if (hum <= 0) return 0;
  const alpha = ((17.27 * temp) / (237.7 + temp)) + Math.log(hum / 100.0);
  const dewPoint = (237.7 * alpha) / (17.27 - alpha);
  return Math.round(dewPoint * 10) / 10;
}

/**
 * Determines Mould Risk threshold.
 * @param temp Temperature in Celsius
 * @param hum Relative Humidity in %
 * @returns true if humidity > 70.0 AND temperature > 25.0, else false
 */
export function calculateMouldRisk(temp: number, hum: number): boolean {
  return hum > 70.0 && temp > 25.0;
}

/**
 * Evaluates non-AC room environmental comfort status.
 * @param temp Temperature in Celsius
 * @param hum Relative Humidity in %
 * @returns Environmental status label
 */
export function determineRoomStatus(temp: number, hum: number): string {
  if (hum > 75.0) {
    return 'LEMBAP / PENGAP';
  }
  if (temp > 30.0) {
    return 'PANAS / GERAH';
  }
  if (temp >= 22.0 && temp <= 28.0 && hum >= 40.0 && hum <= 65.0) {
    return 'IDEAL / NYAMAN';
  }
  return 'NORMAL';
}

/**
 * Computes complete analytics payload for sensor input.
 */
export function computeAnalytics(temp: number, hum: number): AnalyticsResult {
  return {
    dewPoint: calculateDewPoint(temp, hum),
    mouldRisk: calculateMouldRisk(temp, hum),
    roomStatus: determineRoomStatus(temp, hum),
  };
}
