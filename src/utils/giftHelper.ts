import penImg from "../assets/images/ieee_gift_pen_1789315873443.jpg";
import stickersImg from "../assets/images/ieee_gift_stickers_1789315888071.jpg";
import cupImg from "../assets/images/ieee_gift_cup_1789315916851.jpg";

export interface GiftTier {
  id: "cup" | "pen" | "stickers" | "none";
  name: string;
  shortName: string;
  threshold: number;
  conditionText: string;
  tag: string;
  description: string;
  image?: string;
  criteriaLabel: string;
}

export const GIFT_TIERS: GiftTier[] = [
  {
    id: "cup",
    name: "IEEE Ceramic Coffee Mug",
    shortName: "Coffee Mug",
    threshold: 90,
    conditionText: "Score 90% or above",
    criteriaLabel: "90% or above",
    tag: "Limited Edition Ceramic",
    description: "Glossy white heavy ceramic coffee mug with vibrant electric-blue IEEE emblem and ergonomic comfort handle.",
    image: cupImg,
  },
  {
    id: "pen",
    name: "Executive IEEE Metallic Pen",
    shortName: "Executive Pen",
    threshold: 80,
    conditionText: "Above 80% and below 90%",
    criteriaLabel: "Above 80% Mark",
    tag: "Exclusive Branch Stationery",
    description: "Premium chrome-accented executive rollerball pen with smooth-glide gel ink and laser-etched IEEE emblem.",
    image: penImg,
  },
  {
    id: "stickers",
    name: "IEEE Tech Sticker Pack",
    shortName: "IEEE Stickers",
    threshold: 75,
    conditionText: "Above 75% and up to 80%",
    criteriaLabel: "Above 75% Mark",
    tag: "Engineering Decal Pack",
    description: "High-grade waterproof vinyl stickers featuring IEEE circuits, robotics, computing icons, and emblem.",
    image: stickersImg,
  },
];

/**
 * Returns the single earned gift according to user criteria:
 * - Above 75% (and up to 80%): only get sticker
 * - Above 80% (and below 90%): only get pen
 * - 90% or above: get coffee mug
 * - 75% or below: no gift
 */
export function getEarnedGift(percentage: number): GiftTier {
  if (percentage >= 90) {
    return GIFT_TIERS.find((g) => g.id === "cup")!;
  }
  if (percentage > 80) {
    return GIFT_TIERS.find((g) => g.id === "pen")!;
  }
  if (percentage > 75) {
    return GIFT_TIERS.find((g) => g.id === "stickers")!;
  }
  return {
    id: "none",
    name: "No Gift Awarded",
    shortName: "No Gift",
    threshold: 75,
    conditionText: "Score 75% or below",
    criteriaLabel: "75% or below",
    tag: "Milestone Pending",
    description: "Score above 75% to qualify for an official IEEE physical merchandise gift.",
  };
}
