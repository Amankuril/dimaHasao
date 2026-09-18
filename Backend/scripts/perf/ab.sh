#!/usr/bin/env bash
# Interleaved A/B for a working-tree change.
#
# Comparing a run taken now against a baseline taken an hour ago measures the
# machine, not the change: a background build or a second dev server moves
# untouched endpoints by more than most optimisations do. So this stashes and
# unstashes between every reading, alternating within one session, and takes
# two passes of each side.
#
# Always include at least one endpoint whose code did NOT change as a control.
# If the control moves as much as the target, the run says nothing.
#
# Usage: scripts/perf/ab.sh "<grep pattern for the endpoints to report>" [passes]
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BACKEND="$REPO/Backend"
PATTERN="${1:?pass a grep pattern, e.g. 'hotel bookings|taxi rides'}"
PASSES="${2:-2}"
SETTLE="${SETTLE:-7}"   # seconds to let the dev server reload after a stash

measure() {
  ( cd "$BACKEND" && node scripts/perf/measure.js --samples 9 --only "$PATTERN" 2>/dev/null \
      | grep -E "$PATTERN" | sed "s/^/  $1 /" )
}

for pass in $(seq 1 "$PASSES"); do
  echo "### PASS $pass"
  ( cd "$REPO" && git stash -q ) || { echo "stash failed"; exit 1; }
  sleep "$SETTLE"
  measure "BEFORE"
  ( cd "$REPO" && git stash pop -q ) || { echo "STASH POP FAILED — changes are in the stash"; exit 1; }
  sleep "$SETTLE"
  measure "AFTER "
done

echo "### working tree restored:"
( cd "$REPO" && git status --short Backend/src )
