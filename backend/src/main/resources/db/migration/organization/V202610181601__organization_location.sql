ALTER TABLE organization.organizations
    ADD COLUMN latitude  DOUBLE PRECISION,
    ADD COLUMN longitude DOUBLE PRECISION,
    ADD CONSTRAINT ck_organizations_location CHECK ((latitude IS NULL) = (longitude IS NULL));
