#!/bin/bash
set -eu
PORT=3001 npm --prefix backend start &
backend_pid=$!
PORT=3000 npm --prefix frontend start &
frontend_pid=$!
trap 'kill "$backend_pid" "$frontend_pid" 2>/dev/null || true' TERM INT
wait -n "$backend_pid" "$frontend_pid"
exit_code=$?
kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
wait || true
exit "$exit_code"
