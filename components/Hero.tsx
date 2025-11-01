
import React from 'react';
import { IconChart, IconFlask } from './Icons';

export const Hero: React.FC = () => {
    return (
        <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl shadow-gray-900/50 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-4">
                <IconFlask className="w-12 h-12 text-cyan-400" />
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-200">
                    Interactive ODE Analyzer
                </h1>
                <IconChart className="w-12 h-12 text-teal-300" />
            </div>
            <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
                Define, simulate, and analyze complex dynamical systems. Powered by the Runge-Kutta method and Gemini AI for deep insights.
            </p>
        </div>
    );
};
