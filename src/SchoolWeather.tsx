import { useEffect, useState } from "react";
import {
  Wind,
  Droplets,
  Umbrella,
  Thermometer,
  CloudLightning,
  CloudSun,
  CloudRain,
  Sun,
  Cloud,
  Snowflake,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { findSchool } from "./schools";
import { loadWeather, weatherLabel, type Weather } from "./weather";
import { Modal } from "./Modal";
function WeatherIcon({ code, size = 36 }: { code: number; size?: number }) {
  const Icon = [95, 96, 99].includes(code)
    ? CloudLightning
    : code === 0
      ? Sun
      : code <= 2
        ? CloudSun
        : code === 3 || code === 45 || code === 48
          ? Cloud
          : [71, 73, 75, 77, 85, 86].includes(code)
            ? Snowflake
            : CloudRain;
  return <Icon size={size} aria-hidden="true" />;
}
export function SchoolWeather({
  schoolName,
  refreshToken = 0,
}: {
  schoolName: string;
  refreshToken?: number;
}) {
  const school = findSchool(schoolName);
  const [open, setOpen] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    setWeather(null);
    setError("");
    if (!school) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => controller.abort(), 15000);
    let active = true;
    loadWeather(school, controller.signal, attempt > 0 || refreshToken > 0)
      .then((value) => {
        if (active) setWeather(value);
      })
      .catch(() => {
        if (active)
          setError(
            "Weather is unavailable. Check your connection and try again.",
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [school?.name, attempt, refreshToken]);
  return (
    <>
      <button
        className="dashboard-tile school-tile"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="tile-top">
          <span className="eyebrow">01 / SCHOOL</span>
          <ArrowUpRight size={30} />
        </span>
        <h2>{school?.name ?? (schoolName || "Your school")}</h2>
        <div className="school-glance" aria-live="polite">
          {weather ? (
            <>
              <WeatherIcon code={weather.code} size={56} />
              <div>
                <strong>{Math.round(weather.temperature)}°C</strong>
                <span>{weatherLabel(weather.code)}</span>
              </div>
            </>
          ) : (
            <span>
              {loading
                ? "Loading weather…"
                : school
                  ? "Weather unavailable"
                  : "School location unavailable"}
            </span>
          )}
        </div>
        <span className="tile-bottom">
          {school?.city ?? "School information"}
          <span>
            Explore weather <ArrowUpRight size={17} />
          </span>
        </span>
      </button>
      {open && (
        <Modal
          title={school?.name ?? "School weather"}
          label="LOCAL WEATHER / 7-DAY OUTLOOK"
          onClose={() => setOpen(false)}
        >
          <div className="weather-body">
            <p>
              {school
                ? `${school.address} · ${school.city}, ON`
                : "Your school could not be matched to the directory."}
            </p>
            {school && (
              <p className="weather-note">
                Forecast for the school’s municipality.
              </p>
            )}
            {loading && <p role="status">Loading forecast…</p>}
            {error && <p role="status">{error}</p>}
            {weather && (
              <>
                <div className="weather-current">
                  <WeatherIcon code={weather.code} size={64} />
                  <strong>{Math.round(weather.temperature)}°C</strong>
                  <div>
                    <h3>{weatherLabel(weather.code)}</h3>
                    <span>Feels like {Math.round(weather.feelsLike)}°C</span>
                  </div>
                </div>
                <div className="weather-metrics">
                  <div>
                    <span>
                      <CloudRain size={18} aria-hidden="true" /> Precipitation ·
                      last 15 min
                    </span>
                    <strong>{weather.precipitation} mm</strong>
                  </div>
                  <div>
                    <span>
                      <CloudRain size={18} aria-hidden="true" /> Today’s
                      precipitation
                    </span>
                    <strong>{weather.days[0].precipitation} mm</strong>
                  </div>
                  <div>
                    <span>
                      <Umbrella size={18} aria-hidden="true" /> Precipitation
                      chance today
                    </span>
                    <strong>{weather.rain}%</strong>
                  </div>
                  <div>
                    <span>
                      <Droplets size={18} aria-hidden="true" /> Humidity
                    </span>
                    <strong>{weather.humidity}%</strong>
                  </div>
                  <div>
                    <span>
                      <Wind size={18} aria-hidden="true" /> Wind
                    </span>
                    <strong>{Math.round(weather.wind)} km/h</strong>
                  </div>
                  <div>
                    <span>
                      <Thermometer size={18} aria-hidden="true" /> Today’s high
                      / low
                    </span>
                    <strong>
                      {Math.round(weather.high)}° / {Math.round(weather.low)}°
                    </strong>
                  </div>
                </div>
                <h3 className="forecast-title">The week ahead</h3>
                <div className="forecast-list">
                  {weather.days.map((day, i) => (
                    <article className="forecast-day" key={day.time}>
                      <div>
                        <h4>
                          {i === 0
                            ? "Today"
                            : new Date(day.time * 1000).toLocaleDateString([], {
                                weekday: "short",
                                timeZone: "America/Toronto",
                              })}
                        </h4>
                        <small>
                          {new Date(day.time * 1000).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            timeZone: "America/Toronto",
                          })}
                        </small>
                      </div>
                      <WeatherIcon code={day.code} size={26} />
                      <span className="forecast-condition">
                        {weatherLabel(day.code)}
                      </span>
                      <strong>
                        {Math.round(day.high)}° / {Math.round(day.low)}°
                      </strong>
                      <span className="forecast-rain">
                        {day.precipitation} mm{" "}
                        <small>{day.chance}% chance</small>
                      </span>
                    </article>
                  ))}
                </div>
                <p className="weather-note">
                  Precipitation includes rain and the water equivalent of snow.
                  Amounts are forecasts.
                </p>
                <p className="weather-note">
                  Updated{" "}
                  {new Date(weather.time * 1000).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/Toronto",
                  })}{" "}
                  ·{" "}
                  <a
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Weather by Open-Meteo
                  </a>
                </p>
              </>
            )}
            {school && (
              <button
                className="secondary"
                disabled={loading}
                onClick={() => retry((v) => v + 1)}
              >
                <RefreshCw size={17} />
                Refresh weather
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
