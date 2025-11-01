import React, { useState, useMemo, useCallback } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter } from 'recharts';
import type { SimulationResult, PlotDataPoint, EquilibriumPoint, Parameter, SimulationParams } from '../types';
import { rungeKutta4 } from '../services/odeSolver';
import { generateOdeFunction } from '../services/geminiService';
import { IconChart, IconFlask, IconSigma, IconTimeline } from './Icons';

interface AnalysisDashboardProps {
    result: SimulationResult | null;
    variableNames: string[];
    equilibriumData: { points: EquilibriumPoint[]; error: string | null };
    isLoading: boolean;
    odeString: string;
    parameters: Parameter[];
    simulationParams: SimulationParams;
}

const tabStyles = {
    active: "bg-gray-700 text-cyan-300 border-cyan-400",
    inactive: "text-gray-400 border-transparent hover:bg-gray-700/50 hover:text-gray-200"
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 p-3 rounded-lg shadow-lg">
                <p className="label font-bold text-cyan-400">{`Time: ${label}`}</p>
                {payload.map((pld: any) => (
                    <p key={pld.name} style={{ color: pld.color }} className="intro font-mono">{`${pld.name} : ${pld.value.toFixed(4)}`}</p>
                ))}
            </div>
        );
    }
    return null;
};

const PlotPlaceholder: React.FC<{ title: string }> = ({ title }) => (
    <div className="w-full h-96 bg-gray-800/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-700">
        <IconChart className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-semibold text-gray-500">{title}</h3>
        <p className="text-gray-600">Run a simulation to generate data.</p>
    </div>
);

const Loader: React.FC = () => (
    <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10 rounded-xl">
        <div className="flex flex-col items-center">
            <div className="animate-spin h-10 w-10 border-4 border-cyan-400 border-t-transparent rounded-full mb-4"></div>
            <p className="text-lg text-cyan-300">Calculating...</p>
        </div>
    </div>
);

type Tab = 'time' | 'phase' | 'equilibrium' | 'bifurcation';

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, variableNames, equilibriumData, isLoading, odeString, parameters, simulationParams }) => {
    const [activeTab, setActiveTab] = useState<Tab>('time');
    
    // Time Series State
    const [timeSeriesVar, setTimeSeriesVar] = useState<string>(variableNames[0]);

    // Phase Portrait State
    const [phaseVarX, setPhaseVarX] = useState<string>(variableNames[0]);
    const [phaseVarY, setPhaseVarY] = useState<string>(variableNames[1] || variableNames[0]);

    // Bifurcation State
    const [bifurcationParam, setBifurcationParam] = useState<string>(parameters.length > 0 ? parameters[0].name : '');
    const [bifurcationVar, setBifurcationVar] = useState<string>(variableNames[0]);
    const [paramRange, setParamRange] = useState({ min: 0, max: 50, steps: 100 });
    const [bifurcationData, setBifurcationData] = useState<PlotDataPoint[]>([]);
    const [isBifurcationLoading, setIsBifurcationLoading] = useState(false);

    const timeSeriesData: PlotDataPoint[] = useMemo(() => {
        if (!result) return [];
        const varIndex = variableNames.indexOf(timeSeriesVar);
        if (varIndex === -1) return [];
        return result.time.map((t, i) => ({
            time: t.toFixed(2),
            [timeSeriesVar]: result.series[varIndex][i]
        }));
    }, [result, timeSeriesVar, variableNames]);

    const phasePortraitData: PlotDataPoint[] = useMemo(() => {
        if (!result) return [];
        const xIndex = variableNames.indexOf(phaseVarX);
        const yIndex = variableNames.indexOf(phaseVarY);
        if (xIndex === -1 || yIndex === -1) return [];
        // downsample for performance
        const step = Math.max(1, Math.floor(result.series[0].length / 2000));
        const data: PlotDataPoint[] = [];
        for (let i = 0; i < result.series[0].length; i += step) {
            data.push({
                x: result.series[xIndex][i],
                y: result.series[yIndex][i]
            });
        }
        return data;
    }, [result, phaseVarX, phaseVarY, variableNames]);

    const handleRunBifurcation = useCallback(async () => {
        setIsBifurcationLoading(true);
        setBifurcationData([]);
        
        try {
            const bifurcationVarIndex = variableNames.indexOf(bifurcationVar);
            if (bifurcationVarIndex === -1) throw new Error("Selected variable for bifurcation not found.");

            const functionString = await generateOdeFunction(odeString, variableNames, parameters.map(p => p.name));
            const odeFunction = new Function('t', '__y_vec', 'params', `
                const [${variableNames.join(',')}] = __y_vec;
                const {${parameters.map(p => p.name).join(',')}} = params;
                ${functionString}
            `) as (t: number, y: number[], params: Record<string, number>) => number[];
            
            const baseParams = parameters.reduce((acc, p) => ({ ...acc, [p.name]: p.value }), {});
            
            const data: PlotDataPoint[] = [];
            const step = (paramRange.max - paramRange.min) / paramRange.steps;

            for (let i = 0; i <= paramRange.steps; i++) {
                const paramValue = paramRange.min + i * step;
                const currentParams = { ...baseParams, [bifurcationParam]: paramValue };
                
                const simResult = rungeKutta4(odeFunction, simulationParams.initialConditions, 0, 200, 0.05, currentParams);
                
                const transientSteps = Math.floor(100 / 0.05); // Fixed transient for bifurcation
                const series = simResult.series[bifurcationVarIndex].slice(transientSteps);
                
                // Get local maxima
                for (let j = 1; j < series.length - 1; j++) {
                    if (series[j] > series[j - 1] && series[j] > series[j + 1]) {
                        data.push({ x: paramValue, y: series[j] });
                    }
                }
            }
            setBifurcationData(data);
        } catch (error) {
            console.error("Bifurcation failed:", error);
        } finally {
            setIsBifurcationLoading(false);
        }
    }, [odeString, variableNames, parameters, simulationParams, bifurcationParam, bifurcationVar, paramRange]);

    const renderContent = () => {
        if (isLoading) return <Loader />;
        
        switch (activeTab) {
            case 'time':
                return (
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <label className="text-gray-400">Variable:</label>
                            <select value={timeSeriesVar} onChange={e => setTimeSeriesVar(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {variableNames.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        {result ? (
                             <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                    <XAxis dataKey="time" stroke="#A0AEC0" name="Time" />
                                    <YAxis stroke="#A0AEC0" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line type="monotone" dataKey={timeSeriesVar} stroke="#2dd4bf" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : <PlotPlaceholder title="Time Series Plot" />}
                    </div>
                );

            case 'phase':
                return (
                     <div>
                        <div className="flex items-center gap-4 mb-4">
                            <label className="text-gray-400">X-Axis:</label>
                            <select value={phaseVarX} onChange={e => setPhaseVarX(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {variableNames.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <label className="text-gray-400">Y-Axis:</label>
                            <select value={phaseVarY} onChange={e => setPhaseVarY(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {variableNames.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        {result ? (
                             <ResponsiveContainer width="100%" height={400}>
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                    <XAxis type="number" dataKey="x" name={phaseVarX} stroke="#A0AEC0" />
                                    <YAxis type="number" dataKey="y" name={phaseVarY} stroke="#A0AEC0" />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4A5568' }} />
                                    {/* Fix: Changed shape from "dot" to "circle" as "dot" is not a valid shape type for the Scatter component. */}
                                    <Scatter name="Trajectory" data={phasePortraitData} fill="#2dd4bf" shape="circle" strokeWidth={0.1} r={0.5} />
                                </ScatterChart>
                            </ResponsiveContainer>
                        ) : <PlotPlaceholder title="Phase Portrait" />}
                    </div>
                );
            case 'equilibrium':
                return (
                    <div className="p-4">
                        {equilibriumData.error && <p className="text-red-400 mb-4">{equilibriumData.error}</p>}
                        {equilibriumData.points.length > 0 ? (
                            <div className="space-y-4">
                                {equilibriumData.points.map((point, index) => (
                                    <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                                        <h4 className="text-lg font-bold text-cyan-400">Equilibrium Point {index + 1}</h4>
                                        <p className="font-mono text-sm text-gray-300">
                                            {/* Fix: Cast coordinate value to number before calling toFixed to resolve TypeScript error. */}
                                            Coordinates: ({Object.entries(point.coordinates).map(([k,v]) => `${k}=${(v as number).toFixed(3)}`).join(', ')})
                                        </p>
                                        <p className="font-mono text-sm text-gray-300">
                                            Eigenvalues: [{point.eigenvalues.join(', ')}]
                                        </p>
                                        <p className="mt-2">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${point.stability.toLowerCase().includes('stable') ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                                                {point.stability}
                                            </span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <IconFlask className="w-12 h-12 mx-auto mb-2"/>
                                <p>No equilibrium points calculated yet.</p>
                                <p>Click 'Analyze Equilibrium' to find them.</p>
                            </div>
                        )}
                    </div>
                );
             case 'bifurcation':
                return (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-gray-800 rounded-lg">
                            <div>
                                <label className="text-sm text-gray-400">Parameter:</label>
                                <select value={bifurcationParam} onChange={e => setBifurcationParam(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1 mt-1 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                    {parameters.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Variable:</label>
                                <select value={bifurcationVar} onChange={e => setBifurcationVar(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1 mt-1 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                    {variableNames.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-sm text-gray-400">Min:</label>
                                    <input type="number" value={paramRange.min} onChange={e => setParamRange({...paramRange, min: +e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1 mt-1 text-gray-200 font-mono" />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Max:</label>
                                    <input type="number" value={paramRange.max} onChange={e => setParamRange({...paramRange, max: +e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1 mt-1 text-gray-200 font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Steps:</label>
                                <input type="number" value={paramRange.steps} onChange={e => setParamRange({...paramRange, steps: +e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-1 mt-1 text-gray-200 font-mono" />
                            </div>
                             <div className="col-span-full">
                                <button onClick={handleRunBifurcation} disabled={isBifurcationLoading} className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
                                    {isBifurcationLoading ? 'Generating...' : 'Generate Bifurcation Diagram'}
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            {isBifurcationLoading && <Loader />}
                             {bifurcationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                        <XAxis type="number" dataKey="x" name={bifurcationParam} stroke="#A0AEC0" />
                                        <YAxis type="number" dataKey="y" name={bifurcationVar} stroke="#A0AEC0" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4A5568' }} />
                                        {/* Fix: Changed shape from "dot" to "circle" as "dot" is not a valid shape type for the Scatter component. */}
                                        <Scatter name="Attractor values" data={bifurcationData} fill="#a855f7" shape="circle" r={0.5} />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            ) : <PlotPlaceholder title="Bifurcation Diagram" />}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700/50 shadow-lg relative min-h-[500px]">
            <div className="mb-4 border-b border-gray-700">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('time')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'time' ? tabStyles.active : tabStyles.inactive}`}>
                        <IconTimeline className="w-5 h-5"/> Time Series
                    </button>
                    <button onClick={() => setActiveTab('phase')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'phase' ? tabStyles.active : tabStyles.inactive}`}>
                        <IconChart className="w-5 h-5"/> Phase Portrait
                    </button>
                    <button onClick={() => setActiveTab('equilibrium')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'equilibrium' ? tabStyles.active : tabStyles.inactive}`}>
                       <IconFlask className="w-5 h-5"/> Equilibrium
                    </button>
                     <button onClick={() => setActiveTab('bifurcation')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'bifurcation' ? tabStyles.active : tabStyles.inactive}`}>
                       <IconSigma className="w-5 h-5"/> Bifurcation
                    </button>
                </nav>
            </div>
            {renderContent()}
        </div>
    );
};