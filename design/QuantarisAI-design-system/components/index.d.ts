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
