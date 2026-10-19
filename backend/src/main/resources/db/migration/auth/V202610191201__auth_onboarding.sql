-- The welcome flow after sign-up: COMPLETED or SKIPPED once answered, empty until then.
ALTER TABLE auth.users
    ADD COLUMN onboarding_state       VARCHAR(20) CHECK (onboarding_state IN ('COMPLETED', 'SKIPPED')),
    ADD COLUMN onboarding_finished_at TIMESTAMPTZ;

-- Accounts that existed before the flow never see it.
UPDATE auth.users SET onboarding_state = 'SKIPPED', onboarding_finished_at = now();
