import type { BracketStage } from "@/generated/prisma/client";

export const BRACKET_STAGES: BracketStage[] = [
	"ROUND_OF_32",
	"ROUND_OF_16",
	"QUARTER_FINAL",
	"SEMI_FINAL",
	"FINAL",
	"CHAMPION",
];

export const STAGE_LABEL: Record<BracketStage, string> = {
	ROUND_OF_32: "Round of 32",
	ROUND_OF_16: "Round of 16",
	QUARTER_FINAL: "Quarter-finals",
	SEMI_FINAL: "Semi-finals",
	FINAL: "Final",
	CHAMPION: "Champion",
};

export const STAGE_LIMIT: Record<BracketStage, number> = {
	ROUND_OF_32: 32,
	ROUND_OF_16: 16,
	QUARTER_FINAL: 8,
	SEMI_FINAL: 4,
	FINAL: 2,
	CHAMPION: 1,
};

export const STAGE_POINTS: Record<BracketStage, number> = {
	ROUND_OF_32: 1,
	ROUND_OF_16: 2,
	QUARTER_FINAL: 4,
	SEMI_FINAL: 8,
	FINAL: 12,
	CHAMPION: 20,
};
