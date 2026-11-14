"""Download everything OTP needs for a city into data/<city>/.

Usage (from the repo root, using the planner venv for PyYAML):
    services/planner/.venv/bin/python scripts/fetch_data.py cities/seattle.yaml

Downloads the OTP jar (once), the city's OSM extract and GTFS feeds, and
writes OTP's router-config.json with the city's GBFS feeds as rental updaters.
"""

import argparse
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
OTP_VERSION = "2.10.0"
OTP_JAR_URL = (
    f"https://repo1.maven.org/maven2/org/opentripplanner/otp-shaded/{OTP_VERSION}/otp-shaded-{OTP_VERSION}.jar"
)
OTP_JAR = ROOT / "services" / "otp" / f"otp-shaded-{OTP_VERSION}.jar"
USER_AGENT = "multimodal-router/0.1 (dev)"


def download(url: str, dest: Path, force: bool) -> None:
    if dest.exists() and not force:
        print(f"✓ {dest.relative_to(ROOT)} (already downloaded)")
        return
    print(f"↓ {url}")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(req) as r, open(tmp, "wb") as f:
        shutil.copyfileobj(r, f)
    tmp.rename(dest)
    print(f"  saved {dest.relative_to(ROOT)} ({dest.stat().st_size / 1e6:.1f} MB)")


def check_gtfs(path: Path) -> None:
    required = {"agency.txt", "stops.txt", "routes.txt", "trips.txt", "stop_times.txt"}
    with zipfile.ZipFile(path) as z:
        missing = required - set(z.namelist())
    if missing:
        raise SystemExit(f"{path.name} is missing {sorted(missing)}; is it really a GTFS feed?")


def write_otp_config(out: Path, gbfs_urls: list[str]) -> None:
    template = ROOT / "services" / "otp"
    shutil.copy(template / "build-config.json", out / "build-config.json")
    router = json.loads((template / "router-config.json").read_text())
    router["updaters"] = [
        {"type": "vehicle-rental", "sourceType": "gbfs", "url": url, "frequency": "1m"} for url in gbfs_urls
    ]
    (out / "router-config.json").write_text(json.dumps(router, indent=2) + "\n")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("city", type=Path, help="cities/<city>.yaml")
    p.add_argument("--force", action="store_true", help="re-download files that already exist")
    args = p.parse_args()

    city = yaml.safe_load(args.city.read_text())
    data = city["data"]
    out = ROOT / "data" / args.city.stem
    out.mkdir(parents=True, exist_ok=True)

    download(OTP_JAR_URL, OTP_JAR, force=False)
    download(data["osm"], out / f"{args.city.stem}.osm.pbf", args.force)
    for i, url in enumerate(data["gtfs"]):
        dest = out / f"gtfs-{i}.zip"  # OTP picks up any zip whose name contains "gtfs"
        download(url, dest, args.force)
        check_gtfs(dest)
    write_otp_config(out, data.get("gbfs", []))
    print(f"Done. Next: scripts/otp.sh {args.city.stem} build")


if __name__ == "__main__":
    main()
