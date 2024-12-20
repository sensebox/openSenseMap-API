CREATE TABLE IF NOT EXISTS "token_blacklist" (
	"hash" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
