CREATE TABLE `body_scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`photoUrl` text,
	`estimatedBodyFat` float,
	`confidenceLow` float,
	`confidenceHigh` float,
	`muscleMassEstimate` varchar(50),
	`analysisNotes` text,
	`transformationsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `body_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fitness_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planType` enum('workout','meal') NOT NULL,
	`goal` varchar(50),
	`workoutStyle` varchar(50),
	`dietaryPreference` varchar(50),
	`planJson` text NOT NULL,
	`insight` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fitness_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`mealType` varchar(50),
	`calories` int,
	`protein` float,
	`carbs` float,
	`fat` float,
	`photoUrl` text,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meal_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progress_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`note` text,
	`aiCommentary` text,
	`isBaseline` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `progress_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`age` int,
	`gender` varchar(20),
	`heightCm` float,
	`weightKg` float,
	`goal` varchar(50),
	`workoutStyle` varchar(50),
	`dietaryPreference` varchar(50),
	`currentBodyFat` float,
	`targetBodyFat` float,
	`units` varchar(20) DEFAULT 'metric',
	`daysPerWeek` int DEFAULT 4,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int,
	`dayName` varchar(50),
	`focus` varchar(100),
	`completedExercisesJson` text,
	`durationMinutes` int,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workout_sessions_id` PRIMARY KEY(`id`)
);
