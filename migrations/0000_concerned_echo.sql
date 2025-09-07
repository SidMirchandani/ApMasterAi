CREATE TABLE "user_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"units" integer NOT NULL,
	"difficulty" text NOT NULL,
	"exam_date" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"last_studied" timestamp,
	"date_added" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "waitlist_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"signed_up_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;