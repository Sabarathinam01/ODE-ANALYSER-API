
import type { SimulationResult } from '../types';

type OdeFunction = (t: number, y: number[], params: Record<string, number>) => number[];

/**
 * Performs one step of the RK4 method.
 * @param f The ODE function dy/dt = f(t, y, params).
 * @param t The current time.
 * @param y The current state vector.
 * @param h The step size.
 * @param params The parameters for the ODE.
 * @returns The new state vector y(t+h).
 */
function rk4Step(f: OdeFunction, t: number, y: number[], h: number, params: Record<string, number>): number[] {
    const n = y.length;
    
    const k1 = f(t, y, params);
    
    const y_k2 = y.map((yi, i) => yi + 0.5 * h * k1[i]);
    const k2 = f(t + 0.5 * h, y_k2, params);

    const y_k3 = y.map((yi, i) => yi + 0.5 * h * k2[i]);
    const k3 = f(t + 0.5 * h, y_k3, params);

    const y_k4 = y.map((yi, i) => yi + h * k3[i]);
    const k4 = f(t + h, y_k4, params);

    const y_new = y.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    
    return y_new;
}

/**
 * Solves a system of ODEs using the fourth-order Runge-Kutta method.
 * @param odeFunction The function defining the system of ODEs.
 * @param initialConditions The initial values for the state variables.
 * @param t_start The start time of the simulation.
 * @param t_end The end time of the simulation.
 * @param stepSize The step size (h) for the integration.
 * @param params An object containing the parameters for the ODE.
 * @returns An object containing the time points and the series of state variable values.
 */
export function rungeKutta4(
    odeFunction: OdeFunction,
    initialConditions: number[],
    t_start: number,
    t_end: number,
    stepSize: number,
    params: Record<string, number>
): SimulationResult {
    const n_vars = initialConditions.length;
    let t = t_start;
    let y = [...initialConditions];

    const time: number[] = [t];
    const series: number[][] = Array.from({ length: n_vars }, (_, i) => [initialConditions[i]]);

    const num_steps = Math.floor((t_end - t_start) / stepSize);

    for (let i = 0; i < num_steps; i++) {
        y = rk4Step(odeFunction, t, y, stepSize, params);
        t += stepSize;
        
        time.push(t);
        for (let j = 0; j < n_vars; j++) {
            series[j].push(y[j]);
        }
    }

    return { time, series };
}
