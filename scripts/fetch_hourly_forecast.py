#!/usr/bin/env python3
"""喺 GitHub Actions 度執行：向 Open-Meteo 攞荃灣一帶嘅逐小時天氣預報，
重新整理成一個精簡嘅 JSON 快取檔（hourly_forecast.json），畀 Kindle 頁面
讀取。之所以喺伺服器端攞而唔喺 Kindle 個瀏覽器度直接 call，係因為之前
發現舊版瀏覽器直接 call 第三方 API 唔穩定（見 kmb_eta.json 嘅做法）。"""

import json
import sys
import urllib.request

URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=22.371&longitude=114.115"
    "&hourly=temperature_2m,precipitation,weathercode,is_day"
    "&timezone=Asia%2FHong_Kong&forecast_days=2"
)

OUT_PATH = "hourly_forecast.json"


def main():
    with urllib.request.urlopen(URL, timeout=20) as resp:
        raw = json.load(resp)

    h = raw["hourly"]
    hourly = [
        {
            "time": h["time"][i],  # 香港本地時間 "YYYY-MM-DDTHH:MM"，非 UTC
            "temp": h["temperature_2m"][i],
            "precip": h["precipitation"][i],
            "code": h["weathercode"][i],
            "isDay": h["is_day"][i],
        }
        for i in range(len(h["time"]))
    ]

    out = {
        "source": "open-meteo",
        "generated": raw.get("generationtime_ms"),
        "hourly": hourly,
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Failed to fetch hourly forecast: {e}", file=sys.stderr)
        sys.exit(1)
