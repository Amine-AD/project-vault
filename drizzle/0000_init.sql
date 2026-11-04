CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`purpose` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`verified_at` integer,
	`ticket_hash` text,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_email_verifications_email` ON `email_verifications` (`email`,`purpose`);--> statement-breakpoint
CREATE TABLE `locked_vaults` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`salt` text NOT NULL,
	`kdf_algorithm` text NOT NULL,
	`kdf_iterations` integer NOT NULL,
	`kdf_memory_kib` integer NOT NULL,
	`kdf_parallelism` integer NOT NULL,
	`auth_hash` text NOT NULL,
	`encrypted_vault_key` text NOT NULL,
	`recovery_auth_hash` text,
	`recovery_wrapped_key` text,
	`devices` text DEFAULT '[]' NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`item_count` integer NOT NULL,
	`locked_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_locked_vaults_user_id` ON `locked_vaults` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `trusted_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`auth_hash` text NOT NULL,
	`wrapped_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_trusted_devices_user_id` ON `trusted_devices` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`salt` text NOT NULL,
	`auth_hash` text NOT NULL,
	`kdf_algorithm` text NOT NULL,
	`kdf_iterations` integer NOT NULL,
	`kdf_memory_kib` integer NOT NULL,
	`kdf_parallelism` integer NOT NULL,
	`encrypted_vault_key` text NOT NULL,
	`recovery_auth_hash` text,
	`recovery_wrapped_key` text,
	`recovery_created_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vault_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`encrypted_data` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vault_items_user_id` ON `vault_items` (`user_id`);