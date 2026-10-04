import type * as React from 'react';
export type Tone = 'opportunity' | 'system' | 'positive' | 'assumption' | 'risk' | 'inactive';
export type EvidenceKind = 'fact' | 'assumption' | 'calculation' | 'inference' | 'simulation' | 'recommendation';
export interface LogoProps { size?: number; variant?: 'full' | 'mark'; tone?: 'default' | 'reverse'; descriptor?: string; className?: string }
export declare function Logo(props: LogoProps): React.ReactElement;
export interface AppNavProps { items: Array<{ id: string; label: string; index?: string; href?: string } | { section: string }>; active?: string; onSelect?(id: string): void; className?: string }
export declare function AppNav(props: AppNavProps): React.ReactElement;
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'md' | 'sm'; icon?: React.ReactNode }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface StatusTagProps { tone?: Tone; children?: React.ReactNode; className?: string }
export declare function StatusTag(props: StatusTagProps): React.ReactElement;
export interface EvidenceTagProps { kind: EvidenceKind; children?: React.ReactNode; className?: string }
export declare function EvidenceTag(props: EvidenceTagProps): React.ReactElement;
export interface MetricTileProps { label: string; value: string; unit?: string; delta?: string; deltaTone?: 'positive' | 'risk' | 'opportunity' | 'neutral'; deltaArrow?: string; note?: string; evidence?: EvidenceKind; className?: string }
export declare function MetricTile(props: MetricTileProps): React.ReactElement;
export interface ChakraRingProps { value?: number; spinning?: boolean; tone?: 'system' | 'positive' | 'opportunity'; size?: number; showValue?: boolean; caption?: string; label?: string; className?: string }
export declare function ChakraRing(props: ChakraRingProps): React.ReactElement;
export interface MissionComposerProps { value?: string; defaultValue?: string; onChange?(v: string): void; onSubmit?(v: string): void; params?: Array<{ label: string; value: string }>; eyebrow?: string; placeholder?: string; actionLabel?: string; className?: string }
export declare function MissionComposer(props: MissionComposerProps): React.ReactElement;
export interface StageRailProps { current: number; stages?: string[]; positive?: number[]; className?: string }
export declare function StageRail(props: StageRailProps): React.ReactElement;
export interface Site { id: string; name: string; lat: number; lon: number; kind?: 'candidate' | 'cluster' | 'raw' | 'port' | 'risk'; selected?: boolean; note?: string; label?: boolean }
export interface SiteMapProps { sites: Site[]; links?: Array<{ from: string; to: string; selected?: boolean }>; illustrative?: boolean; label?: string; width?: number; height?: number; className?: string }
export declare function SiteMap(props: SiteMapProps): React.ReactElement;
export interface FlowNodeData { id?: string; label: string; meta?: string; tone?: 'current' | 'waste' | 'positive' | 'risk' }
export interface ProcessFlowProps { nodes: FlowNodeData[]; branch?: { from: string; nodes: FlowNodeData[] }; label?: string; className?: string }
export declare function ProcessFlow(props: ProcessFlowProps): React.ReactElement;
export interface ImpactBarsProps { rows: Array<{ label: string; baseline: number; scenario: number; unit?: string; better?: 'lower' | 'higher'; tone?: 'positive' | 'risk' | 'opportunity' }>; baselineLabel?: string; className?: string }
export declare function ImpactBars(props: ImpactBarsProps): React.ReactElement;
export interface CircularityPathProps { state?: 'neutral' | 'analysing' | 'discovered'; source?: string; sourceSub?: string; waste?: string; wasteSub?: string; steps?: string[]; value?: string; valueSub?: string; discoveredText?: string; className?: string }
export declare function CircularityPath(props: CircularityPathProps): React.ReactElement;
export interface EvidenceDrawerProps { title?: string; items: Array<{ kind: EvidenceKind; claim: string; source?: string; confidence?: number }>; onClose?(): void; className?: string }
export declare function EvidenceDrawer(props: EvidenceDrawerProps): React.ReactElement;
export interface StateViewProps { kind: 'loading' | 'empty' | 'error'; title: string; body?: string; action?: string; onAction?(): void; className?: string }
export declare function StateView(props: StateViewProps): React.ReactElement;

/* ---------- Spatial intelligence layer (v2) ---------- */
export type SceneKind = 'map' | 'ecosystem' | 'factory';
export type DiscoveryKind = 'opportunity' | 'constraint' | 'bottleneck' | 'simulation' | 'improvement' | 'circular' | 'verify' | 'risk' | 'location' | 'expansion' | 'changed';
export interface Scene3DProps { kind: SceneKind; state?: Record<string, unknown>; height?: number | string; onPick?(id: string | null): void; mode?: 'current' | 'simulated'; motion?: 'live' | 'paused'; orbit?: boolean; illustrative?: boolean; label?: string; children?: React.ReactNode; className?: string }
export declare function Scene3D(props: Scene3DProps): React.ReactElement;
export interface SceneLabelProps { anchor?: string; tone?: 'selected' | 'positive' | 'muted'; meta?: string; children?: React.ReactNode; style?: React.CSSProperties; onClick?(): void; className?: string }
export declare function SceneLabel(props: SceneLabelProps): React.ReactElement;
export interface DiscoveryMarkerProps { kind: DiscoveryKind; anchor?: string; label?: string; active?: boolean; onClick?(): void; className?: string }
export declare function DiscoveryMarker(props: DiscoveryMarkerProps): React.ReactElement;
export interface DiscoveryAction { label: string; icon?: string; variant?: 'primary' | 'secondary' | 'ghost'; onClick?(): void }
export interface DiscoveryCardProps { kind: DiscoveryKind; eyebrow?: string; metric?: string; unit?: string; title?: string; body?: string; evidence?: EvidenceKind | EvidenceKind[]; confidence?: number; actions?: DiscoveryAction[]; anchor?: string; onDismiss?(): void; className?: string }
export declare function DiscoveryCard(props: DiscoveryCardProps): React.ReactElement;
export interface ConstructionFeedProps { steps?: Array<{ label: string; detail?: string; result?: string }>; current: number; compact?: boolean; className?: string }
export declare function ConstructionFeed(props: ConstructionFeedProps): React.ReactElement;
export type A2UIControl = 'CapacitySelector' | 'RegionSelector' | 'MaterialSelector' | 'ConstraintSelector' | 'PrioritySelector' | 'ScenarioComparison' | 'SimulationControls';
export interface ClarifyCardProps { control: A2UIControl; reason: string; question?: string; options: Array<{ value: string; label: string; hint?: string; estimate?: boolean }>; value?: string; onSelect?(value: string): void; footnote?: string; className?: string }
export declare function ClarifyCard(props: ClarifyCardProps): React.ReactElement;
export interface SimParam { id: string; label: string; current: number; min: number; max: number; step?: number; unit?: string; format?(v: number): string }
export interface SimulationPanelProps { params: SimParam[]; values?: Record<string, number>; onChange?(id: string, value: number): void; onReset?(): void; results?: Array<{ label: string; current: number; simulated: number; unit?: string; better?: 'lower' | 'higher' }>; recommendation?: { text: string; changed?: boolean } | null; className?: string }
export declare function SimulationPanel(props: SimulationPanelProps): React.ReactElement;
export interface LevelPathProps { current: number; levels?: string[]; onSelect?(index: number): void; free?: boolean; className?: string }
export declare function LevelPath(props: LevelPathProps): React.ReactElement;
export interface ProcessInspectorProps { process: { label: string; stage?: string; status?: { tone: Tone; label: string }; metrics: Array<{ label: string; value: string; unit?: string; bar?: number; tone?: 'risk' | 'positive' | 'waste' }>; resources?: Array<{ kind: 'material' | 'energy' | 'renewable' | 'water' | 'waste'; label: string }> }; onEvidence?(): void; onSimulate?(): void; children?: React.ReactNode; className?: string }
export declare function ProcessInspector(props: ProcessInspectorProps): React.ReactElement;
export interface LayerPanelProps { layers: Array<{ id: string; label: string; glyph?: string; swatch?: string; count?: number; disabled?: boolean }>; active: string[]; onToggle?(id: string): void; title?: string; className?: string }
export declare function LayerPanel(props: LayerPanelProps): React.ReactElement;
