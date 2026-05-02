CREATE TABLE `progress_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`weightKg` float,
	`bodyFatEstimate` float,
	`progressRating` varchar(20),
	`summary` text,
	`analysisJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `progress_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progress_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weightKg` float,
	`bodyFatPercent` float,
	`note` text,
	`source` varchar(20) NOT NULL DEFAULT 'manual',
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `progress_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetBodyFat` float NOT NULL,
	`imageUrl` text,
	`description` text,
	`originalPhotoUrl` text,
	`originalBodyFat` float,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`plan` enum('free','basic','pro') NOT NULL DEFAULT 'free',
	`billingCycle` enum('monthly','annual') NOT NULL DEFAULT 'monthly',
	`status` enum('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid') NOT NULL DEFAULT 'active',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`)
);
