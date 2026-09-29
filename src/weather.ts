import type { School } from "./schools";
export interface ForecastDay {
  time: number;
  high: number;
  low: number;
  code: number;
  precipitation: number;
  chance: number;
}
export interface Weather {
  precipitation: number;
  humidity: number;
  days: ForecastDay[];
  temperature: number;
  feelsLike: number;
  wind: number;
  code: number;
  high: number;
  low: number;
  rain: number;
  time: number;
}
const cache = new Map<string, { saved: number; weather: Weather }>();
async function json(url: URL, signal: AbortSignal) {
  const response = await fetch(url, { signal, credentials: "omit" });
  if (!response.ok) throw new Error("Weather service is unavailable.");
  return response.json();
}
export async function loadWeather(
  school: School,
  signal: AbortSignal,
  force = false,
): Promise<Weather> {
  const cached = cache.get(school.city);
  if (!force && cached && Date.now() - cached.saved < 15 * 60_000)
    return cached.weather;
  const geo = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geo.search = new URLSearchParams({
    name: school.city,
    count: "20",
    countryCode: "CA",
    language: "en",
    format: "json",
  }).toString();
  const places = await json(geo, signal);
  const place = places.results?.find(
    (p: {
      country_code: string;
      admin1: string;
      latitude: number;
      longitude: number;
    }) =>
      p.country_code === "CA" &&
      p.admin1 === "Ontario" &&
      p.latitude > 43.6 &&
      p.latitude < 44.6 &&
      p.longitude > -80 &&
      p.longitude < -79,
  );
  if (!place)
    throw new Error("School-area weather location could not be found.");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,relative_humidity_2m",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code",
    timezone: "America/Toronto",
    timeformat: "unixtime",
    forecast_days: "7",
  }).toString();
  const data = await json(url, signal);
  const weather = {
    precipitation: data.current?.precipitation,
    humidity: data.current?.relative_humidity_2m,
    temperature: data.current?.temperature_2m,
    feelsLike: data.current?.apparent_temperature,
    wind: data.current?.wind_speed_10m,
    code: data.current?.weather_code,
    high: data.daily?.temperature_2m_max?.[0],
    low: data.daily?.temperature_2m_min?.[0],
    rain: data.daily?.precipitation_probability_max?.[0],
    time: data.current?.time,
  };
  if (
    !Object.values(weather).every(
      (v) => typeof v === "number" && Number.isFinite(v),
    )
  )
    throw new Error("Weather data is incomplete.");
  const days: ForecastDay[] = (data.daily?.time ?? []).map(
    (time: number, i: number) => ({
      time,
      high: data.daily.temperature_2m_max?.[i],
      low: data.daily.temperature_2m_min?.[i],
      code: data.daily.weather_code?.[i],
      precipitation: data.daily.precipitation_sum?.[i],
      chance: data.daily.precipitation_probability_max?.[i],
    }),
  );
  if (
    days.length !== 7 ||
    days.some(
      (day) =>
        !Object.values(day).every(
          (v) => typeof v === "number" && Number.isFinite(v),
        ),
    )
  )
    throw new Error("Forecast data is incomplete.");
  const result = { ...weather, days };
  cache.set(school.city, { saved: Date.now(), weather: result });
  return result;
}
export function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return ["", "Mainly clear", "Partly cloudy", "Overcast"][code];
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Weather conditions";
}
