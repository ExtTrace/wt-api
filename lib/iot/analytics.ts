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
 * Standardized by the World Meteorological Organization (WMO) & NOAA.
 * Formula: alpha = ((17.27 * T) / (237.7 + T)) + ln(RH / 100)
 *          Td = (237.7 * alpha) / (17.27 - alpha)
 * 
 * @param temp Temperature in Celsius (0°C to 60°C)
 * @param hum Relative Humidity in % (0% to 100%)
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
 * Based on ASHRAE Standard 160 & WHO Indoor Air Quality Guidelines:
 * Spore germination occurs when Relative Humidity >= 65.0% and Temperature >= 23.0°C.
 * 
 * @param temp Temperature in Celsius
 * @param hum Relative Humidity in %
 * @returns true if RH >= 65% AND Temp >= 23°C (High Mold Spore Hazard), else false
 */
export function calculateMouldRisk(temp: number, hum: number): boolean {
  return hum >= 65.0 && temp >= 23.0;
}

/**
 * Evaluates indoor environmental comfort status based on:
 * 1. Permenkes RI No. 1077/MENKES/PER/V/2011 (Indoor Air Quality Guidelines)
 * 2. ASHRAE Standard 55 (Thermal Environmental Conditions for Human Occupancy)
 * 
 * @param temp Temperature in Celsius
 * @param hum Relative Humidity in %
 * @returns Environmental status label
 */
export function determineRoomStatus(temp: number, hum: number): string {
  if (hum >= 70.0) {
    return 'LEMBAP / PENGAP';
  }
  if (temp >= 30.0) {
    return 'PANAS / GERAH';
  }
  if (temp < 20.0) {
    return 'DINGIN';
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
