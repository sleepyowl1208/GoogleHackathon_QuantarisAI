import theme from "../../../design/v2_full/QuantarisAI-V2-handoff/design-system/handoff/tokens/theme.json";

type Theme = { color: { light: Record<string, string> } };
export const tokens = (theme as Theme).color.light;
