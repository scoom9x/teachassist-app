// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import { schools, findSchool, schoolFromDocument } from "../src/schools";
import { loadWeather, weatherLabel } from "../src/weather";
it("matches all schools and their abbreviated directory names", () => {
  expect(schools).toHaveLength(33);
  for (const school of schools) {
    expect(findSchool(school.name)).toBe(school);
    expect(
      findSchool(
        school.name
          .replace("High School", "H.S.")
          .replace("Secondary School", "S.S.")
          .replace("Collegiate Institute", "C.I."),
      ),
    ).toBe(school);
  }
  expect(findSchool("Dr. G. W. Williams S.S.")?.city).toBe("Aurora");
  expect(findSchool("Huron Heights High School")?.city).toBe("Newmarket");
  expect(findSchool("Markham D.H.S.")?.city).toBe("Markham");
});
it("finds schools outside headings and ignores scripts, styles and ambiguous pages", () => {
  const parse = (s: string) =>
    schoolFromDocument(new DOMParser().parseFromString(s, "text/html"));
  expect(
    parse("<h2>Calendar</h2><div>School: <span>Bayview</span> S.S.</div>"),
  ).toBe("Bayview Secondary School");
  expect(
    parse("<script>Bayview Secondary School</script><h4>Newmarket H.S.</h4>"),
  ).toBe("Newmarket High School");
  expect(parse("<p>Unknown school</p>")).toBe("");
  expect(parse("<h2>Bayview S.S.</h2><h2>Newmarket H.S.</h2>")).toBe("");
});
afterEach(() => vi.unstubAllGlobals());
it("uses Ontario locations, metric weather and caches successful responses", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            country_code: "US",
            admin1: "Georgia",
            latitude: 31,
            longitude: -81,
          },
          {
            country_code: "CA",
            admin1: "Ontario",
            latitude: 43.87,
            longitude: -79.44,
          },
        ],
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 18,
          precipitation: 0.2,
          relative_humidity_2m: 70,
          apparent_temperature: 17,
          wind_speed_10m: 12,
          weather_code: 2,
          time: 1000,
        },
        daily: {
          time: Array.from({ length: 7 }, (_, i) => 1000 + i * 86400),
          weather_code: Array(7).fill(2),
          precipitation_sum: Array(7).fill(1.5),
          temperature_2m_max: Array(7).fill(20),
          temperature_2m_min: Array(7).fill(10),
          precipitation_probability_max: Array(7).fill(30),
        },
      }),
    });
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  const weather = await loadWeather(schools[0], signal);
  expect(weather.temperature).toBe(18);
  expect(weather.precipitation).toBe(0.2);
  expect(weather.days).toHaveLength(7);
  expect(weather.days[6]).toMatchObject({ precipitation: 1.5, chance: 30 });
  expect(String(fetcher.mock.calls[1][0])).toContain("forecast_days=7");
  expect(String(fetcher.mock.calls[1][0])).toContain("latitude=43.87");
  expect(String(fetcher.mock.calls[1][0])).toContain(
    "timezone=America%2FToronto",
  );
  expect(fetcher.mock.calls[0][1].credentials).toBe("omit");
  await loadWeather(schools[0], signal);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("rejects unavailable or incomplete weather rather than showing zeroes", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(
    loadWeather(schools[1], new AbortController().signal),
  ).rejects.toThrow();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              country_code: "CA",
              admin1: "Ontario",
              latitude: 44,
              longitude: -79.46,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: {}, daily: {} }),
      }),
  );
  await expect(
    loadWeather(schools[1], new AbortController().signal),
  ).rejects.toThrow("incomplete");
  expect(weatherLabel(75)).toBe("Snow");
});
