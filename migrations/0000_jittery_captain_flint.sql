CREATE TABLE "handles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" varchar(20) NOT NULL,
	"display_name" text,
	"vault_pubkey" text NOT NULL,
	"encrypted_vault_secret" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "handles_handle_unique" UNIQUE("handle"),
	CONSTRAINT "handles_vault_pubkey_unique" UNIQUE("vault_pubkey")
);
