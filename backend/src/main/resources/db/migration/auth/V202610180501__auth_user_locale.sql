-- Language of the e-mails a user receives. Existing users keep French.
ALTER TABLE auth.users
    ADD COLUMN locale VARCHAR(5) NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr', 'en'));
