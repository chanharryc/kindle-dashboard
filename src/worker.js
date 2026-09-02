// Cloudflare Worker：即時代理 KMB 234B ETA 同 Open-Meteo 逐小時預報，
// 取代之前用 GitHub Actions 定時（cron）寫死檔案落 repo 嘅做法。
// GitHub Actions 嘅 schedule cron 唔保證準時（觀察到實際可以隔幾個鐘先
// 執行一次），呢個 Worker 就冇呢個問題：Kindle 每次 fetch 呢兩個 API，
// Worker 即刻去問返上游即時資料，有幾新問幾新，完全唔使等排程。

const KMB_ETA_URL =
  'https://data.etabus.gov.hk/v1/transport/kmb/eta/B069D9C12F89AAFA/234B/1';

const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=22.371&longitude=114.115' +
  '&hourly=temperature_2m,precipitation,weathercode,is_day' +
  '&timezone=Asia%2FHong_Kong&forecast_days=2';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store'
};

async function handleKmbEta() {
  const upstream = await fetch(KMB_ETA_URL, { cf: { cacheTtl: 0 } });
  const body = await upstream.text();
  return new Response(body, { status: upstream.status, headers: JSON_HEADERS });
}

async function handleHourlyForecast() {
  const upstream = await fetch(OPEN_METEO_URL, { cf: { cacheTtl: 0 } });
  const raw = await upstream.json();
  const h = raw.hourly;
  const hourly = h.time.map((t, i) => ({
    time: t,
    temp: h.temperature_2m[i],
    precip: h.precipitation[i],
    code: h.weathercode[i],
    isDay: h.is_day[i]
  }));
  const out = {
    source: 'open-meteo',
    generated: raw.generationtime_ms,
    hourly: hourly
  };
  return new Response(JSON.stringify(out), { headers: JSON_HEADERS });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/kmb-eta') return await handleKmbEta();
      if (url.pathname === '/api/hourly-forecast') return await handleHourlyForecast();
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 502,
        headers: JSON_HEADERS
      });
    }
    return new Response('Not found', { status: 404 });
  }
};
