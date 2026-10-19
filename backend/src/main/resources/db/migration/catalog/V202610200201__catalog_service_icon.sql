-- Icon key shown by the apps next to the service ("droplet"); empty means the default icon.
ALTER TABLE catalog.auto_services ADD COLUMN icon VARCHAR(40);

UPDATE catalog.auto_services SET icon = CASE name
    WHEN 'Vidange' THEN 'droplet'
    WHEN 'Freinage' THEN 'disc'
    WHEN 'Pneumatiques' THEN 'tire'
    WHEN 'Batterie' THEN 'battery'
    WHEN 'Suspension' THEN 'suspension'
    WHEN 'Climatisation' THEN 'snowflake'
    WHEN 'Refroidissement' THEN 'thermometer'
    WHEN 'Electricite' THEN 'zap'
END;
