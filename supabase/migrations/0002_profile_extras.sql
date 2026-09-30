-- Single-user profile extras: skills + experience for real matching.
alter table candidate_profiles add column if not exists skills text default '';
alter table candidate_profiles add column if not exists experience_years text default '0';
