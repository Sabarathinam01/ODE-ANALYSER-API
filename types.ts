
export interface Parameter {
    name: string;
    value: number;
}

export interface SimulationParams {
    initialConditions: number[];
    t_start: number;
    t_end: number;
    stepSize: number;
    transient: number;
}

export interface SimulationResult {
    time: number[];
    series: number[][]; // Array of series, where each inner array is for one variable
}

export interface PlotDataPoint {
    [key: string]: number | string;
}

export interface EquilibriumPoint {
    coordinates: Record<string, number>;
    eigenvalues: (string | number)[];
    stability: string;
}
