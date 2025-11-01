
import { GoogleGenAI, Type } from "@google/genai";
import type { EquilibriumPoint } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Generates a JavaScript function body from a string of ODE equations.
 * @param odeString The multiline string of ODE equations.
 * @param varNames Array of state variable names.
 * @param paramNames Array of parameter names.
 * @returns A string containing the body of the JavaScript function.
 */
export async function generateOdeFunction(odeString: string, varNames: string[], paramNames: string[]): Promise<string> {
    const prompt = `
        Convert the following system of Ordinary Differential Equations (ODEs) into the body of a JavaScript function.
        The function will receive arguments (t, y, params).
        'y' is an array of state variables: [${varNames.join(', ')}].
        'params' is an object of parameters: {${paramNames.join(', ')}}.

        The function must return an array of the derivatives in the correct order: [d(${varNames[0]})/dt, d(${varNames[1]})/dt, ...].
        Use standard JavaScript Math functions (e.g., Math.pow, Math.sin).
        Do not include the function definition, only the return statement and any necessary calculations.

        Here are the equations:
        ---
        ${odeString}
        ---

        Example for "dx/dt = a * x":
        return [params.a * y[0]];
        
        Example for "dx/dt = y; dy/dt = -x":
        const [x, y] = y;
        return [y, -x];
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating ODE function with Gemini:", error);
        throw new Error("Failed to parse the ODE model. Please check the syntax.");
    }
}

/**
 * Analyzes the ODE system to find equilibrium points and their stability.
 * @param odeString The multiline string of ODE equations.
 * @param params An object of parameters and their values.
 * @returns A promise that resolves to an array of equilibrium points.
 */
export async function analyzeEquilibriumPoints(odeString: string, params: Record<string, number>): Promise<EquilibriumPoint[]> {
    const paramString = Object.entries(params).map(([key, value]) => `${key} = ${value}`).join(', ');

    const prompt = `
        Analyze the following system of Ordinary Differential Equations to find its equilibrium points.
        For each equilibrium point, calculate the Jacobian matrix and its eigenvalues to determine the stability.

        The system is:
        ${odeString}

        The parameter values are:
        ${paramString}

        Please provide the response as a JSON object that I can parse directly with JSON.parse().
        The JSON should be an array of objects, where each object represents an equilibrium point and has the following keys:
        - "coordinates": An object where keys are the variable names and values are their numerical coordinates at the equilibrium point.
        - "eigenvalues": An array of the eigenvalues, as numbers or strings for complex numbers (e.g., "0.5 + 1.2i").
        - "stability": A string describing the stability (e.g., "Stable Node", "Unstable Saddle Point", "Stable Spiral", "Unstable Center").
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Use Pro for better analytical capabilities
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);
        
        if (!Array.isArray(parsedResponse)) {
            throw new Error("Gemini response is not a valid JSON array.");
        }
        
        return parsedResponse as EquilibriumPoint[];

    } catch (error) {
        console.error("Error analyzing equilibrium points with Gemini:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the analysis from AI. The model may have returned a non-JSON response.");
        }
        throw new Error("Failed to analyze equilibrium points. The model might be unable to solve the system analytically.");
    }
}
