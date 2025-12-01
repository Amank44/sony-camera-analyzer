import React from 'react';

export default function ProgressBar({ progress, message, step }) {
    return (
        <div className="w-full max-w-2xl mx-auto p-4 bg-gray-800 rounded-lg shadow-lg">
            <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-blue-400">{step ? step.toUpperCase() : 'PROCESSING'}</span>
                <span className="text-sm font-medium text-blue-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="mt-2 text-sm text-gray-400 text-center">{message}</p>
        </div>
    );
}
