CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  username varchar(40) UNIQUE NOT NULL,
  rating integer NOT NULL DEFAULT 1200,
  max_rating integer NOT NULL DEFAULT 1200,
  streak_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS problems (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  time_limit_ms integer NOT NULL CHECK (time_limit_ms BETWEEN 100 AND 2000),
  memory_limit_mb integer NOT NULL CHECK (memory_limit_mb BETWEEN 16 AND 256),
  statement_md text NOT NULL,
  editorial_md text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS test_cases (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  problem_id integer NOT NULL REFERENCES problems(id),
  ordinal integer NOT NULL,
  input_url text NOT NULL,
  expected_output_url text NOT NULL,
  is_sample boolean NOT NULL DEFAULT false,
  UNIQUE (problem_id,ordinal)
);
ALTER TABLE problems ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'practice' CHECK (kind IN ('practice','decode'));
ALTER TABLE problems ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}';
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS explanation text;
CREATE TABLE IF NOT EXISTS contests (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL CHECK (end_time > start_time)
);
CREATE TABLE IF NOT EXISTS contest_problems (
  contest_id integer REFERENCES contests(id),
  problem_id integer REFERENCES problems(id),
  ordinal integer NOT NULL,
  PRIMARY KEY (contest_id,problem_id),
  UNIQUE (contest_id,ordinal)
);
CREATE TABLE IF NOT EXISTS contest_participants (
  contest_id integer REFERENCES contests(id),
  user_id uuid REFERENCES users(id),
  score integer NOT NULL DEFAULT 0,
  penalty_minutes integer NOT NULL DEFAULT 0,
  PRIMARY KEY (contest_id,user_id)
);
CREATE INDEX IF NOT EXISTS leaderboard ON contest_participants (contest_id,score DESC,penalty_minutes ASC,user_id);
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  problem_id integer NOT NULL REFERENCES problems(id),
  contest_id integer REFERENCES contests(id),
  language text NOT NULL CHECK (language IN ('cpp','python')),
  code text NOT NULL,
  custom_input text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPILING','RUNNING','FINISHED')),
  verdict text CHECK (verdict IN ('AC','WA','TLE','MLE','RE','CE','SYSTEM_ERROR','RUN_OK')),
  current_case integer NOT NULL DEFAULT 0,
  total_cases integer NOT NULL DEFAULT 0,
  execution_time_ms integer,
  output text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'FINISHED') = (verdict IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS submission_history ON submissions(user_id,problem_id,created_at DESC);
CREATE INDEX IF NOT EXISTS contest_submission_history ON submissions(contest_id,user_id,problem_id,created_at,id);
CREATE INDEX IF NOT EXISTS submission_unfinished ON submissions(created_at) WHERE verdict IS NULL;
CREATE INDEX IF NOT EXISTS submission_acceptances ON submissions(user_id,problem_id) WHERE verdict='AC' AND custom_input IS NULL;
