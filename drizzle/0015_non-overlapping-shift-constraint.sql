CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE shifts ADD CONSTRAINT no_overlapping_shifts
    EXCLUDE USING gist (
        schedule_id WITH =,
        timespan WITH &&
    );
