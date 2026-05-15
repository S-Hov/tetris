CREATE INDEX IF NOT EXISTS idx_site_visit_events_source
    ON site_visit_events(source);

CREATE INDEX IF NOT EXISTS idx_site_visit_events_path_occurred_at
    ON site_visit_events(path, occurred_at);

CREATE INDEX IF NOT EXISTS idx_site_visit_events_source_occurred_at
    ON site_visit_events(source, occurred_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_status_last_seen_at
    ON user_sessions(status, last_seen_at);
