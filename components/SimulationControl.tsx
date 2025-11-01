
import React from 'react';
import type { SimulationParams } from '../types';
import { IconAnalyze, IconPlay } from './Icons';


interface SimulationControlProps {
    simulationParams: SimulationParams;
    setSimulationParams: (params: SimulationParams) => void;
    variableNames: string[];
    onRun: () => void;
    onAnalyzeEquilibrium: () => void;
    isLoading: boolean;
}

const InputField: React.FC<{ label: string; value: number; onChange: (value: number) => void; step?: number }> = ({ label, value, onChange, step = 0.01 }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            step={step}
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-200 font-mono"
        />
    </div>
);


export const SimulationControl: React.FC<SimulationControlProps> = ({
    simulationParams,
    setSimulationParams,
    variableNames,
    onRun,
    onAnalyzeEquilibrium,
    isLoading,
}) => {
    const handleInitialConditionChange = (index: number, value: number) => {
        const newConditions = [...simulationParams.initialConditions];
        newConditions[index] = value;
        setSimulationParams({ ...simulationParams, initialConditions: newConditions });
    };

    return (
        <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">2. Configure & Run</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Initial Conditions</label>
                    <div className="grid grid-cols-2 gap-2">
                        {variableNames.map((name, index) => (
                            <div key={name}>
                                <label className="block text-xs font-mono text-gray-500 mb-1">{name}(0)</label>
                                <input
                                    type="number"
                                    value={simulationParams.initialConditions[index] ?? ''}
                                    onChange={(e) => handleInitialConditionChange(index, parseFloat(e.target.value))}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-200 font-mono"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <InputField label="Start Time" value={simulationParams.t_start} onChange={v => setSimulationParams({...simulationParams, t_start: v})} />
                    <InputField label="End Time" value={simulationParams.t_end} onChange={v => setSimulationParams({...simulationParams, t_end: v})} />
                    <InputField label="Step Size (h)" value={simulationParams.stepSize} onChange={v => setSimulationParams({...simulationParams, stepSize: v})} step={0.001} />
                    <InputField label="Transient Time" value={simulationParams.transient} onChange={v => setSimulationParams({...simulationParams, transient: v})} />
                </div>
                 <div className="pt-2 space-y-3">
                    <button
                        onClick={onRun}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                    >
                       {isLoading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : <IconPlay className="w-5 h-5" />}
                        Run Simulation
                    </button>
                     <button
                        onClick={onAnalyzeEquilibrium}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                    >
                       {isLoading ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : <IconAnalyze className="w-5 h-5" />}
                        Analyze Equilibrium
                    </button>
                </div>
            </div>
        </div>
    );
};
