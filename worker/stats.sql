SELECT repo, SUM(opens) AS opens_last_7_days, MAX(day) AS last_open_day
FROM repo_open_daily
WHERE day >= date('now', '-6 days')
GROUP BY repo
ORDER BY opens_last_7_days DESC
LIMIT 30;
