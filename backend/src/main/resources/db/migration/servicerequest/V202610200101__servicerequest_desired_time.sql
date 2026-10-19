-- The time the client would like (a booking slot); empty for requests made before slots existed.
ALTER TABLE servicerequest.service_requests ADD COLUMN desired_time TIME;

CREATE INDEX service_requests_org_date_idx
    ON servicerequest.service_requests (organization_id, desired_date, desired_time);
