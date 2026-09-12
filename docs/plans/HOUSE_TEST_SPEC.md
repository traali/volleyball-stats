# Volleyball Stats — 5-point test spec

1. **User Journey:** Parent opens a lentopallo match and reads set scores to 25.
2. **Reason it exists:** Set momentum is the sport; a single total hides the match.
3. **What it tests:** `SportStatsContract`, taso-proxy `/volley`.
4. **When it succeeds:** Finished sets listed; set wins match header.
5. **When it should fail:** Empty fallback when origin JSON is ok; dropped contract fields.
