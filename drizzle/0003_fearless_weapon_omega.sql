CREATE TABLE `ai_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` varchar(100) NOT NULL,
	`month` varchar(7) NOT NULL,
	`callCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_usage_id` PRIMARY KEY(`id`)
);
