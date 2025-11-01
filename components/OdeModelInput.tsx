
import React from 'react';
import type { Parameter } from '../types';
import { IconX, IconPlus } from './Icons';

interface OdeModelInputProps {
    odeString: string;
    setOdeString: (value: string) => void;
    variableNames: string[];
    setVariableNames: (names: string[]) => void;
    parameters: Parameter[];
    setParameters: (params: Parameter[]) => void;
}

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-200 font-mono"
    />
);

export const OdeModelInput: React.FC<OdeModelInputProps> = ({
    odeString,
    setOdeString,
    variableNames,
    setVariableNames,
    parameters,
    setParameters,
}) => {
    const handleParamChange = (index: number, field: 'name' | 'value', value: string | number) => {
        const newParams = [...parameters];
        if (field === 'value') {
            newParams[index][field] = Number(value);
        } else {
            newParams[index][field] = String(value);
        }
        setParameters(newParams);
    };

    const addParameter = () => {
        setParameters([...parameters, { name: `p${parameters.length + 1}`, value: 1 }]);
    };

    const removeParameter = (index: number) => {
        setParameters(parameters.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-gray-800/60 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">1. Define Model</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">ODE System Equations</label>
                    <textarea
                        value={odeString}
                        onChange={(e) => setOdeString(e.target.value)}
                        rows={5}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-200 font-mono text-sm"
                        placeholder="e.g., dx/dt = sigma * (y - x)"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">State Variables (comma-separated)</label>
                    <InputField
                        type="text"
                        value={variableNames.join(', ')}
                        onChange={(e) => setVariableNames(e.target.value.split(',').map(s => s.trim()))}
                        placeholder="e.g., x, y, z"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Parameters</label>
                    <div className="space-y-2">
                        {parameters.map((param, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <InputField
                                    type="text"
                                    value={param.name}
                                    onChange={(e) => handleParamChange(index, 'name', e.target.value)}
                                    placeholder="Name"
                                />
                                <InputField
                                    type="number"
                                    value={param.value}
                                    onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                                    placeholder="Value"
                                />
                                <button
                                    onClick={() => removeParameter(index)}
                                    className="p-2 bg-gray-700 hover:bg-red-800/50 rounded-md transition duration-200 text-gray-400 hover:text-red-300"
                                >
                                    <IconX className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={addParameter}
                        className="mt-2 flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition duration-200"
                    >
                        <IconPlus className="w-4 h-4" />
                        Add Parameter
                    </button>
                </div>
            </div>
        </div>
    );
};
