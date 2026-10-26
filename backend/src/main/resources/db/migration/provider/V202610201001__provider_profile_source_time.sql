-- When the organization change copied into this row happened: an older event arriving late is ignored.
ALTER TABLE provider.provider_profiles ADD COLUMN source_changed_at TIMESTAMPTZ;
