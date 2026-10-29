#!/usr/bin/env bash
# Run OpenTripPlanner locally with Java (21+), no Docker needed.
#   scripts/otp.sh <city> build   # build the graph from data/<city>/ and save graph.obj (~5-10 min)
#   scripts/otp.sh <city> serve   # load the saved graph and serve on http://localhost:8080
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CITY="${1:?usage: otp.sh <city> build|serve}"
CMD="${2:?usage: otp.sh <city> build|serve}"
JAR="$ROOT/services/otp/otp-shaded-2.10.0.jar"
DIR="$ROOT/data/$CITY"
MEM="${OTP_MEMORY:-8g}"

[[ -f "$JAR" ]] || { echo "Missing $JAR; run scripts/fetch_data.py cities/$CITY.yaml first"; exit 1; }

case "$CMD" in
  build) exec java -Xmx"$MEM" -jar "$JAR" --build --save "$DIR" ;;
  serve) exec java -Xmx"$MEM" -jar "$JAR" --load --serve "$DIR" ;;
  *) echo "unknown command: $CMD"; exit 1 ;;
esac
