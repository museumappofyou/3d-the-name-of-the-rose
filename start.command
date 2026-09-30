#!/bin/sh
cd "$(dirname "$0")" || exit 1
ABBEY_PORT=8000
while lsof -nP -iTCP:"$ABBEY_PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  ABBEY_PORT=$((ABBEY_PORT + 1))
done
(sleep 1; open "http://localhost:$ABBEY_PORT") &
python3 scripts/serve.py --port "$ABBEY_PORT"
