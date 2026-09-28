-- V1 free-first schema. Binaries stay OUT of Postgres (§5). Single-user OK; user_id kept for future.
create extension if not exists "pgcrypto";

create table if not exists candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text default '',
  city text default '', state text default '', country text default '',
  work_authorization text default '', sponsorship text default '',
  linkedin text default '', github text default '', portfolio text default '',
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  role_family text not null check (role_family in ('PM','SDE','Data','Design','Marketing','Other')),
  version int not null default 1,
  storage_provider text not null default 'local',
  storage_key text not null,
  mime_type text default 'application/pdf',
  file_size int default 0,
  active boolean default true,
  is_default boolean default false,
  keywords text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  company text not null, title text not null, location text default '',
  url text not null unique, source text default 'manual',
  external_id text default '', platform text default 'generic',
  description text default '', created_at timestamptz default now()
);

create table if not exists job_analysis (
  job_id uuid primary key references jobs(id) on delete cascade,
  role_family text not null, seniority text default '',
  employment_type text default '', confidence numeric default 0,
  requirements jsonb default '[]', preferred_skills jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  job_id uuid references jobs(id) on delete cascade,
  resume_id uuid references resumes(id),
  status text not null default 'DISCOVERED',
  verification text default '',
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  agent_run_id uuid,
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, application_id uuid,
  status text default 'running', stage text default '',
  created_at timestamptz default now(), ended_at timestamptz
);

create table if not exists answer_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  pattern text not null, answer text not null,
  category text default 'FACTUAL', approved boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists application_policies (
  user_id uuid primary key,
  policy jsonb not null default '{"enabledRoleFamilies":["PM","SDE"],"allowedEmploymentTypes":["Internship","Full-time"],"maxExperienceYears":2,"allowedLocations":[],"minConfidence":0.7,"maxPerDay":25,"maxPerHour":5,"maxPerCompanyPerDay":2,"killSwitch":false}',
  updated_at timestamptz default now()
);

create table if not exists settings (
  user_id uuid primary key,
  kill_switch boolean default false,
  evidence_retention_days int default 30,
  updated_at timestamptz default now()
);
