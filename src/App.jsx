import React, { useState, useEffect, useCallback } from 'react';

// --- Utility: Session ID ---
const getMockUserId = () => {
    let mockId = sessionStorage.getItem('mockUserId');
    if (!mockId) {
        mockId = crypto.randomUUID();
        sessionStorage.setItem('mockUserId', mockId);
    }
    return mockId;
};

// --- Utility: Patient Sorting Logic ---
const sortPatients = (patients) => {
    return [...patients].sort((a, b) => {
        const tags = { 'Immediate (Red)': 3, 'Delayed (Yellow)': 2, 'Minimal (Green)': 1, 'Pending (Black)': 0 };
        return tags[b.triageTag] - tags[a.triageTag];
    });
};

// --- Component: Resource Forecast Panel ---
const ResourceForecastPanel = ({ facility }) => {
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchForecast = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://127.0.0.1:5002/resource_forecast?horizon_hours=24');
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            const data = await res.json();
            setForecast(data.forecast || []);
            setLastUpdate(new Date().toLocaleTimeString());
        } catch (err) {
            setError(`Failed to fetch forecast: ${err.message}. Ensure Flask server is running on port 5002.`);
            setForecast([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForecast();
        const interval = setInterval(fetchForecast, 300000);
        return () => clearInterval(interval);
    }, []);

    const next6Hours = forecast.slice(0, 6);
    const avgIcu = next6Hours.length ? Math.round(next6Hours.reduce((sum, f) => sum + f.icu_demand_forecast, 0) / next6Hours.length) : 0;
    const avgVent = next6Hours.length ? Math.round(next6Hours.reduce((sum, f) => sum + f.ventilator_demand_forecast, 0) / next6Hours.length) : 0;
    const avgOxygen = next6Hours.length ? Math.round(next6Hours.reduce((sum, f) => sum + f.oxygen_demand_forecast, 0) / next6Hours.length) : 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8 border-l-4 border-purple-600">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    Resource Demand Forecast (Next 24h)
                </h2>
                <button
                    onClick={fetchForecast}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition text-sm font-semibold"
                >
                    {loading ? 'Updating...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg mb-4 text-sm">
                    {error}
                </div>
            )}

            {lastUpdate && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Last updated: {lastUpdate}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-blue-800 dark:text-blue-300">ICU Beds</h3>
                        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div className="text-3xl font-extrabold text-blue-900 dark:text-blue-200 mb-1">{avgIcu}</div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Avg demand (6h)</p>
                    <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-600">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            Available: <span className="font-bold">{facility.icuAvailability}</span>
                        </p>
                        {avgIcu > facility.icuAvailability && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">⚠️ Shortage predicted</p>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900 dark:to-teal-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-teal-800 dark:text-teal-300">Ventilators</h3>
                        <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                    </div>
                    <div className="text-3xl font-extrabold text-teal-900 dark:text-teal-200 mb-1">{avgVent}</div>
                    <p className="text-xs text-teal-700 dark:text-teal-300">Avg demand (6h)</p>
                    <div className="mt-2 pt-2 border-t border-teal-300 dark:border-teal-600">
                        <p className="text-sm text-teal-800 dark:text-teal-300">
                            Available: <span className="font-bold">{facility.ventilatorAvailability}</span>
                        </p>
                        {avgVent > facility.ventilatorAvailability && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">⚠️ Shortage predicted</p>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-purple-800 dark:text-purple-300">Oxygen Supply</h3>
                        <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                    </div>
                    <div className="text-3xl font-extrabold text-purple-900 dark:text-purple-200 mb-1">{avgOxygen}</div>
                    <p className="text-xs text-purple-700 dark:text-purple-300">Avg demand (6h)</p>
                    <div className="mt-2 pt-2 border-t border-purple-300 dark:border-purple-600">
                        <p className="text-sm text-purple-800 dark:text-purple-300">
                            Tracking: <span className="font-bold">Active</span>
                        </p>
                    </div>
                </div>
            </div>

            {forecast.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Next 12 Hours Preview</h3>
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                        {forecast.slice(0, 12).map((f, idx) => {
                            const hour = new Date(f.timestamp).getHours();
                            const icuLevel = f.icu_demand_forecast > facility.icuAvailability ? 'high' : 'normal';
                            return (
                                <div key={idx} className="text-center">
                                    <div className={`w-full h-16 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        icuLevel === 'high' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' : 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                                    }`}>
                                        {f.icu_demand_forecast}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{hour}:00</p>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">ICU demand per hour (Red = exceeds capacity)</p>
                </div>
            )}
        </div>
    );
};

// --- Component: Triage Status Indicator ---
const TriageStatusIndicator = ({ level, label, colorClass }) => (
    <div className={`p-4 rounded-xl shadow-lg transition-all duration-300 ${colorClass}`}>
        <p className="text-sm font-semibold text-white uppercase opacity-80">{label}</p>
        <p className="text-3xl font-extrabold text-white mt-1">{level}</p>
    </div>
);

// --- Component: Patient Card ---
const PatientCard = ({ patient, onTriageComplete }) => {
    let colorClass, statusText;
    switch (patient.triageTag) {
        case 'Immediate (Red)':
            colorClass = 'bg-red-600/90 border-red-700';
            statusText = 'CRITICAL';
            break;
        case 'Delayed (Yellow)':
            colorClass = 'bg-yellow-500/90 border-yellow-600';
            statusText = 'URGENT';
            break;
        case 'Minimal (Green)':
            colorClass = 'bg-green-500/90 border-green-600';
            statusText = 'NON-CRITICAL';
            break;
        default:
            colorClass = 'bg-gray-400/90 border-gray-500';
            statusText = 'PENDING';
    }

    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

    return (
        <div className={`p-5 mb-4 rounded-xl shadow-xl border-b-4 ${colorClass} text-white transform hover:scale-[1.01] transition-all duration-200 cursor-pointer`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-black truncate">{patient.name}</h3>
                    <p className="text-xs font-light italic opacity-80 mt-1">ID: {patient.id.substring(0, 8)}</p>
                </div>
                <span className="px-3 py-1 text-sm font-extrabold bg-white text-gray-800 rounded-full shadow-inner tracking-wider">
                    {statusText}
                </span>
            </div>

            <div className="mt-4 text-sm grid grid-cols-2 gap-y-1 gap-x-4 border-t border-white/30 pt-3">
                <p><strong>Age:</strong> {age} yrs</p>
                <p><strong>Location:</strong> {patient.location}</p>
                <p><strong>HR/SpO₂:</strong> {patient.hr} / {patient.spo2}%</p>
                <p><strong>Risk:</strong> {patient.predictedRisk || 'N/A'}</p>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    onClick={() => onTriageComplete(patient)}
                    className="px-5 py-2 text-sm font-bold bg-white text-indigo-700 rounded-lg shadow-md hover:bg-indigo-100 transition duration-150 transform hover:shadow-xl"
                >
                    View & Triage
                </button>
            </div>
        </div>
    );
};

// --- Component: Triage Detail Modal ---
const TriageDetailModal = ({ patient, facility, onClose, removePatient, updatePatient }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState({ ...patient });
    const [rerunning, setRerunning] = useState(false);
    const [error, setError] = useState(null);

    const age = new Date().getFullYear() - new Date(patient.dob).getFullYear();

    const handleProcess = () => {
        removePatient(patient.id);
        onClose();
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setError(null);
        setEditedData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : type === 'number' ? parseFloat(value) : value
        }));
    };

    const preparePayload = (data) => {
        const { hr, spo2, bp, dob, rr, temp, sex, dyspnea, chest_pain, confusion, comorb } = data;
        const [sbpStr, dbpStr] = (bp || '0/0').split('/');
        const sbp = parseFloat(sbpStr);
        const dbp = parseFloat(dbpStr);
        const heartRate = parseFloat(hr);
        const oxygenSat = parseFloat(spo2);
        const respiratoryRate = parseFloat(rr);
        const temperature = parseFloat(temp);

        if (isNaN(sbp) || isNaN(dbp) || isNaN(heartRate) || isNaN(oxygenSat) || isNaN(respiratoryRate) || isNaN(temperature) || sbp <= 0) {
            throw new Error("Invalid vital signs data.");
        }

        const ageCalc = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 30;
        const pulse_pressure = sbp - dbp;
        const map = dbp + (1/3) * (sbp - dbp);
        const shock_index = heartRate / sbp;

        let abnormal_count = 0;
        if (heartRate < 50 || heartRate > 110) abnormal_count++;
        if (sbp < 90 || sbp > 180) abnormal_count++;
        if (oxygenSat < 93) abnormal_count++;
        if (respiratoryRate < 10 || respiratoryRate > 25) abnormal_count++;
        if (temperature < 35.5 || temperature > 38.5) abnormal_count++;
        abnormal_count += (dyspnea || 0) + (chest_pain || 0) + (confusion || 0);

        return {
            age: ageCalc, sex: sex || 1, hr: heartRate, sbp, dbp, rr: respiratoryRate, spo2: oxygenSat, temp: temperature,
            dyspnea: dyspnea || 0, chest_pain: chest_pain || 0, confusion: confusion || 0, comorb: comorb || 0,
            pulse_pressure, map, shock_index, abnormal_count
        };
    };

    const handleRerunPrediction = async () => {
        setRerunning(true);
        setError(null);

        try {
            const payloadData = preparePayload(editedData);
            const apiUrl = "http://127.0.0.1:8000/predict";
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([payloadData])
            });

            if (!res.ok) throw new Error(`API call failed: ${res.status}`);

            const data = await res.json();
            const { risk, intervention } = data[0];

            let newTriageTag = 'Pending (Black)';
            if (risk && risk.toLowerCase().includes('red')) {
                newTriageTag = 'Immediate (Red)';
            } else if (risk && risk.toLowerCase().includes('yellow')) {
                newTriageTag = 'Delayed (Yellow)';
            } else if (risk && (risk.toLowerCase().includes('green') || risk.toLowerCase().includes('low'))) {
                newTriageTag = 'Minimal (Green)';
            }

            const updatedPatient = {
                ...editedData,
                triageTag: newTriageTag,
                predictedRisk: risk.toUpperCase(),
                recommendedIntervention: intervention,
            };

            setEditedData(updatedPatient);
            updatePatient(updatedPatient);
            setIsEditing(false);
        } catch (err) {
            console.error("Prediction failed:", err);
            setError(`Prediction failed: ${err.message}. Ensure FastAPI server is running.`);
        } finally {
            setRerunning(false);
        }
    };

    let headerColor;
    switch (editedData.triageTag) {
        case 'Immediate (Red)':
            headerColor = 'bg-red-600';
            break;
        case 'Delayed (Yellow)':
            headerColor = 'bg-yellow-500';
            break;
        case 'Minimal (Green)':
            headerColor = 'bg-green-600';
            break;
        default:
            headerColor = 'bg-gray-500';
    }

    const inputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm";

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 dark:bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-y-auto max-h-[95vh] transform transition-all duration-300 scale-100">
                
                <div className={`p-6 ${headerColor} text-white relative`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:text-gray-200 transition"
                        title="Close"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h3 className="text-3xl font-extrabold pr-12">{editedData.name}</h3>
                    <p className="text-sm opacity-80">Triage Tag: <span className="font-semibold">{editedData.triageTag}</span></p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm dark:text-white">
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"><strong>Patient ID:</strong> {editedData.id.substring(0, 12)}...</div>
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"><strong>Age:</strong> {age} years</div>
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"><strong>DOB:</strong> {editedData.dob}</div>
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"><strong>Arrival:</strong> {new Date(editedData.timestamp).toLocaleTimeString()}</div>
                    </div>

                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 border-b pb-1 border-gray-200 dark:border-gray-700 flex-1">Vitals & Assessment</h4>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
                        >
                            {isEditing ? 'Cancel Edit' : 'Edit Vitals'}
                        </button>
                    </div>

                    {!isEditing ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm dark:text-white">
                            <div className="text-center p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">HR: <span className="font-bold">{editedData.hr}</span></div>
                            <div className="text-center p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">BP: <span className="font-bold">{editedData.bp}</span></div>
                            <div className="text-center p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">RR: <span className="font-bold">{editedData.rr}</span></div>
                            <div className="text-center p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">Temp: <span className="font-bold">{editedData.temp}°C</span></div>
                            <div className="text-center p-2 bg-blue-100 dark:bg-blue-900 rounded-lg col-span-2">SpO₂: <span className="font-bold">{editedData.spo2}%</span></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-medium dark:text-gray-300">HR</label>
                                    <input type="number" name="hr" value={editedData.hr} onChange={handleEditChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium dark:text-gray-300">SpO₂ (%)</label>
                                    <input type="number" name="spo2" value={editedData.spo2} onChange={handleEditChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium dark:text-gray-300">BP</label>
                                    <input type="text" name="bp" value={editedData.bp} onChange={handleEditChange} className={inputClass} placeholder="120/80" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium dark:text-gray-300">Temp (°C)</label>
                                    <input type="number" name="temp" value={editedData.temp} onChange={handleEditChange} className={inputClass} step="0.1" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium dark:text-gray-300">RR</label>
                                    <input type="number" name="rr" value={editedData.rr} onChange={handleEditChange} className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <label className="flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white cursor-pointer text-xs">
                                    <input type="checkbox" name="dyspnea" checked={editedData.dyspnea === 1} onChange={handleEditChange} className="h-4 w-4 text-teal-600 rounded mr-2" />
                                    Dyspnea
                                </label>
                                <label className="flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white cursor-pointer text-xs">
                                    <input type="checkbox" name="chest_pain" checked={editedData.chest_pain === 1} onChange={handleEditChange} className="h-4 w-4 text-teal-600 rounded mr-2" />
                                    Chest Pain
                                </label>
                                <label className="flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white cursor-pointer text-xs">
                                    <input type="checkbox" name="confusion" checked={editedData.confusion === 1} onChange={handleEditChange} className="h-4 w-4 text-teal-600 rounded mr-2" />
                                    Confusion
                                </label>
                                <label className="flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white cursor-pointer text-xs">
                                    <input type="checkbox" name="comorb" checked={editedData.comorb === 1} onChange={handleEditChange} className="h-4 w-4 text-teal-600 rounded mr-2" />
                                    Comorbidity
                                </label>
                            </div>

                            <button
                                onClick={handleRerunPrediction}
                                disabled={rerunning}
                                className="w-full px-4 py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition disabled:opacity-50"
                            >
                                {rerunning ? 'Recalculating...' : 'Rerun Prediction with Updated Vitals'}
                            </button>

                            {error && (
                                <div className="p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-xs">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-4 border-b pb-1 border-gray-200 dark:border-gray-700">Prediction Results</h4>
                    <div className="space-y-2 dark:text-white">
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg shadow-sm border border-red-300 dark:border-red-700">
                            <strong>Predicted Risk:</strong> <span className='font-bold text-red-700 dark:text-red-300'>{editedData.predictedRisk || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-teal-100 dark:bg-teal-900/50 rounded-lg shadow-sm border border-teal-300 dark:border-teal-700">
                            <strong>Recommended Intervention:</strong> <span className='font-medium text-teal-700 dark:text-teal-300'>{editedData.recommendedIntervention || 'N/A'}</span>
                        </div>
                    </div>

                    <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mt-4 border-b pb-1 border-gray-200 dark:border-gray-700">Symptoms/Notes</h4>
                    <p className="text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg italic">{editedData.symptoms}</p>
                </div>
                
                <div className="p-6 bg-gray-100 dark:bg-gray-700 flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-gray-700 dark:text-gray-300 font-semibold border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        Close View
                    </button>
                    <button
                        onClick={handleProcess}
                        className="px-5 py-2 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition transform hover:scale-105"
                    >
                        Admit/Process Patient
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Component: Patient Form Modal ---
const PatientFormModal = ({ facility, setIsAdding, addPatient }) => {
    const [patientData, setPatientData] = useState({
        name: '', dob: '', hr: 100, spo2: 95, bp: '120/80', temp: 37.0, symptoms: '', location: facility.name || 'Unknown', triageTag: 'Pending (Black)',
        sex: 1, rr: 20, dyspnea: 0, chest_pain: 0, confusion: 0, comorb: 0,
    });
    
    const [predictionResult, setPredictionResult] = useState({ risk: 'N/A', intervention: 'N/A' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setErrorMessage(null);
        setPredictionResult({ risk: 'N/A', intervention: 'N/A' });
        setPatientData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : type === 'number' ? parseFloat(value) : value 
        }));
    };
    
    const preparePayload = (data) => {
        const { hr, spo2, bp, dob, rr, temp, sex, dyspnea, chest_pain, confusion, comorb } = data;
        
        const [sbpStr, dbpStr] = (bp || '0/0').split('/');
        const sbp = parseFloat(sbpStr);
        const dbp = parseFloat(dbpStr);
        const heartRate = parseFloat(hr);
        const oxygenSat = parseFloat(spo2);
        const respiratoryRate = parseFloat(rr);
        const temperature = parseFloat(temp);

        if (isNaN(sbp) || isNaN(dbp) || isNaN(heartRate) || isNaN(oxygenSat) || isNaN(respiratoryRate) || isNaN(temperature) || sbp <= 0) {
            throw new Error("Invalid or incomplete vital sign data for prediction.");
        }
        
        const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 30;
        const pulse_pressure = sbp - dbp;
        const map = dbp + (1/3) * (sbp - dbp);
        const shock_index = heartRate / sbp;
        
        let abnormal_count = 0;
        if (heartRate < 50 || heartRate > 110) abnormal_count++;
        if (sbp < 90 || sbp > 180) abnormal_count++;
        if (oxygenSat < 93) abnormal_count++;
        if (respiratoryRate < 10 || respiratoryRate > 25) abnormal_count++;
        if (temperature < 35.5 || temperature > 38.5) abnormal_count++;
        abnormal_count += dyspnea + chest_pain + confusion;

        return {
            age, sex, hr: heartRate, sbp, dbp, rr: respiratoryRate, spo2: oxygenSat, temp: temperature,
            dyspnea, chest_pain, confusion, comorb, pulse_pressure, map, shock_index, abnormal_count
        };
    };

    const runPrediction = async () => {
        setIsSuggesting(true);
        setErrorMessage(null);

        if (!patientData.name || !patientData.dob || patientData.bp.indexOf('/') === -1) {
             setErrorMessage("Please ensure Patient Name, Date of Birth, and BP are filled correctly.");
             setIsSuggesting(false);
             return;
        }

        try {
            const payloadData = preparePayload(patientData);
            const apiUrl = "http://127.0.0.1:8000/predict";
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([payloadData])
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`API call failed: ${res.status}`);
            }

            const data = await res.json();
            const { risk, intervention } = data[0];

            let newTriageTag = 'Pending (Black)';
            if (risk && risk.toLowerCase().includes('red')) {
                newTriageTag = 'Immediate (Red)';
            } else if (risk && risk.toLowerCase().includes('yellow')) {
                newTriageTag = 'Delayed (Yellow)';
            } else if (risk && (risk.toLowerCase().includes('green') || risk.toLowerCase().includes('low'))) {
                newTriageTag = 'Minimal (Green)';
            }

            setPredictionResult({ risk: risk.toUpperCase(), intervention });
            setPatientData(prev => ({ 
                ...prev, 
                triageTag: newTriageTag,
                pulse_pressure: payloadData.pulse_pressure,
                shock_index: payloadData.shock_index,
                abnormal_count: payloadData.abnormal_count,
            }));

        } catch (err) {
            console.error("Prediction failed:", err);
            setErrorMessage(`Prediction failed. Ensure the FastAPI server is running at http://127.0.0.1:8000. Error: ${err.message}`);
            setPredictionResult({ risk: 'N/A', intervention: 'N/A' });
            setPatientData(prev => ({ ...prev, triageTag: 'Pending (Black)' }));
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (predictionResult.risk === 'N/A' || errorMessage) {
            setErrorMessage("Please run the risk prediction first.");
            return;
        }
        
        setIsSubmitting(true);
        
        const newPatient = {
            ...patientData,
            id: crypto.randomUUID(), 
            timestamp: new Date().toISOString(),
            predictedRisk: predictionResult.risk,
            recommendedIntervention: predictionResult.intervention,
        };

        addPatient(newPatient);
        setIsAdding(false);
        setIsSubmitting(false);
    };

    const inputClass = "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 transition duration-150 bg-white dark:bg-gray-700 dark:text-white";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 dark:bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-2xl w-full overflow-y-auto max-h-[95vh] transform transition-all">
                <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-6">New Patient Intake & Risk Assessment</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Patient Name</label>
                            <input type="text" name="name" value={patientData.name} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>Date of Birth</label>
                            <input type="date" name="dob" value={patientData.dob} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>Sex</label>
                            <select name="sex" value={patientData.sex} onChange={handleChange} className={inputClass} required>
                                <option value={1}>Male (1)</option>
                                <option value={0}>Female (0)</option>
                            </select>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 pt-4 border-t border-gray-200 dark:border-gray-700">Vitals for Prediction</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <label className={labelClass}>HR</label>
                            <input type="number" name="hr" value={patientData.hr} onChange={handleChange} className={inputClass} min="1" step="0.1" required />
                        </div>
                        <div>
                            <label className={labelClass}>SpO₂ (%)</label>
                            <input type="number" name="spo2" value={patientData.spo2} onChange={handleChange} className={inputClass} min="1" max="100" step="0.1" required />
                        </div>
                        <div>
                            <label className={labelClass}>BP (SBP/DBP)</label>
                            <input type="text" name="bp" value={patientData.bp} onChange={handleChange} className={inputClass} placeholder="e.g., 120/80" required />
                        </div>
                        <div>
                            <label className={labelClass}>Temp (°C)</label>
                            <input type="number" name="temp" value={patientData.temp} onChange={handleChange} className={inputClass} step="0.1" min="35" max="43" required />
                        </div>
                        <div>
                            <label className={labelClass}>RR</label>
                            <input type="number" name="rr" value={patientData.rr} onChange={handleChange} className={inputClass} min="5" max="50" step="0.1" required />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 pt-4 border-t border-gray-200 dark:border-gray-700">Symptoms & Comorbidities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white cursor-pointer">
                            <input type="checkbox" name="dyspnea" checked={patientData.dyspnea === 1} onChange={handleChange} className="h-5 w-5 text-teal-600 rounded mr-3" />
                            Dyspnea (SOB)
                        </label>
                        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white cursor-pointer">
                            <input type="checkbox" name="chest_pain" checked={patientData.chest_pain === 1} onChange={handleChange} className="h-5 w-5 text-teal-600 rounded mr-3" />
                            Chest Pain
                        </label>
                        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white cursor-pointer">
                            <input type="checkbox" name="confusion" checked={patientData.confusion === 1} onChange={handleChange} className="h-5 w-5 text-teal-600 rounded mr-3" />
                            AMS/Confusion
                        </label>
                        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white cursor-pointer">
                            <input type="checkbox" name="comorb" checked={patientData.comorb === 1} onChange={handleChange} className="h-5 w-5 text-teal-600 rounded mr-3" />
                            Comorbidity
                        </label>
                    </div>

                    <div>
                        <label className={labelClass}>Symptoms & Notes</label>
                        <textarea name="symptoms" value={patientData.symptoms} onChange={handleChange} className={`${inputClass} h-16`} required></textarea>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={runPrediction}
                            disabled={isSuggesting}
                            className="sm:flex-1 px-6 py-3 bg-teal-500 text-white font-semibold rounded-lg shadow-md hover:bg-teal-600 transition disabled:opacity-50"
                        >
                            {isSuggesting ? 'Calling ML Model...' : '1. Run Risk Prediction'}
                        </button>

                        <div className={`sm:flex-1 text-center p-3 font-bold rounded-xl shadow-inner border-2 ${
                            predictionResult.risk.includes('RED') ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300' :
                            predictionResult.risk.includes('YELLOW') ? 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300' :
                            predictionResult.risk.includes('GREEN') || predictionResult.risk.includes('LOW') ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300' :
                            'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                            <span className='font-normal text-xs block text-gray-500 dark:text-gray-400'>Predicted Risk:</span> 
                            {predictionResult.risk}
                        </div>
                    </div>
                    
                    {predictionResult.intervention !== 'N/A' && (
                        <div className="p-3 mt-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg text-sm dark:text-indigo-200">
                            <span className='font-bold text-indigo-700 dark:text-indigo-400'>Recommended Intervention:</span> {predictionResult.intervention}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg font-medium text-sm border border-red-300 dark:bg-red-900 dark:text-red-300">
                            Error: {errorMessage}
                        </div>
                    )}

                    <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || predictionResult.risk === 'N/A' || !!errorMessage}
                            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-xl hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : '2. Add to Queue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Component: Triage Dashboard ---
const TriageDashboard = ({ facility, patients, userId, setPatients, toggleDarkMode, darkMode }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const redPatients = patients.filter(p => p.triageTag === 'Immediate (Red)');
    const yellowPatients = patients.filter(p => p.triageTag === 'Delayed (Yellow)');
    const greenPatients = patients.filter(p => p.triageTag === 'Minimal (Green)');
    const totalPatients = patients.length;

    const addPatient = useCallback((newPatient) => {
        setPatients(prevPatients => sortPatients([...prevPatients, newPatient]));
    }, [setPatients]);

    const removePatient = useCallback((patientId) => {
        setPatients(prevPatients => prevPatients.filter(p => p.id !== patientId));
    }, [setPatients]);

    return (
        <div className="p-4 sm:p-8 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500 font-sans">
            <header className="mb-8 border-b pb-4 border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-400">
                        Emergency Triage Dashboard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Facility: {facility.name} | Staff ID: <span className="text-sm font-mono bg-gray-200 dark:bg-gray-700 dark:text-white p-1 rounded">{userId.substring(0, 12)}...</span></p>
                    <div className="text-xs text-red-600 font-semibold mt-3 p-2 bg-red-50 dark:bg-red-900 dark:text-red-300 border-l-4 border-red-400 rounded-lg shadow-sm">
                        ⚠️ Warning: In-memory system. Data lost on refresh.
                    </div>
                </div>
                <button
                    onClick={toggleDarkMode}
                    className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                    {darkMode ? '☀️' : '🌙'}
                </button>
            </header>

            <ResourceForecastPanel facility={facility} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                <TriageStatusIndicator level={totalPatients} label="Total in Queue" colorClass="bg-indigo-600" />
                <TriageStatusIndicator level={facility.bedsAvailable} label="Beds Available" colorClass="bg-teal-500" />
                <TriageStatusIndicator level={facility.staffCount} label="Staff On Duty" colorClass="bg-indigo-400" />
                <TriageStatusIndicator level={facility.ventilatorAvailability} label="Ventilators" colorClass="bg-teal-600" />
            </div>

            <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Patient Queue ({totalPatients})</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transform hover:scale-105 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Patient Intake
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="p-4 bg-red-50 dark:bg-red-950 border-t-4 border-red-600 rounded-xl shadow-2xl">
                    <h3 className="text-xl font-black text-red-700 dark:text-red-400 mb-4 flex justify-between items-center">
                        Immediate 
                        <span className="text-3xl font-extrabold">{redPatients.length}</span>
                    </h3>
                    {redPatients.length === 0 ? <p className="text-gray-500 italic p-3 bg-white dark:bg-gray-800 dark:text-gray-400 rounded-lg">No critical patients.</p> : redPatients.map(p => (
                        <PatientCard key={p.id} patient={p} onTriageComplete={setSelectedPatient} />
                    ))}
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border-t-4 border-yellow-500 rounded-xl shadow-2xl">
                    <h3 className="text-xl font-black text-yellow-700 dark:text-yellow-400 mb-4 flex justify-between items-center">
                        Delayed
                        <span className="text-3xl font-extrabold">{yellowPatients.length}</span>
                    </h3>
                    {yellowPatients.length === 0 ? <p className="text-gray-500 italic p-3 bg-white dark:bg-gray-800 dark:text-gray-400 rounded-lg">No urgent patients.</p> : yellowPatients.map(p => (
                        <PatientCard key={p.id} patient={p} onTriageComplete={setSelectedPatient} />
                    ))}
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 border-t-4 border-green-600 rounded-xl shadow-2xl">
                    <h3 className="text-xl font-black text-green-700 dark:text-green-400 mb-4 flex justify-between items-center">
                        Minimal
                        <span className="text-3xl font-extrabold">{greenPatients.length}</span>
                    </h3>
                    {greenPatients.length === 0 ? <p className="text-gray-500 italic p-3 bg-white dark:bg-gray-800 dark:text-gray-400 rounded-lg">Queue clear.</p> : greenPatients.map(p => (
                        <PatientCard key={p.id} patient={p} onTriageComplete={setSelectedPatient} />
                    ))}
                </div>
            </div>

            {isAdding && <PatientFormModal facility={facility} setIsAdding={setIsAdding} addPatient={addPatient} />}
            {selectedPatient && (
                <TriageDetailModal 
                    patient={selectedPatient} 
                    facility={facility} 
                    onClose={() => setSelectedPatient(null)} 
                    removePatient={removePatient}
                />
            )}
        </div>
    );
};

// --- Component: Facility Setup ---
const FacilitySetup = ({ setIsSetupComplete, setFacility, userId, toggleDarkMode, darkMode }) => {
    const [setupData, setSetupData] = useState({
        name: '', bedsAvailable: 10, icuAvailability: 2, ventilatorAvailability: 1, staffCount: 5,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setErrorMessage(null); 
        setSetupData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!setupData.name) {
            setErrorMessage("Please enter a valid Facility Name.");
            return;
        }
        setIsSubmitting(true);
        setFacility({ ...setupData, userId, lastUpdated: new Date().toISOString() });
        setIsSetupComplete(true); 
        setIsSubmitting(false);
    };

    const inputClass = "w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 transition bg-white dark:bg-gray-700 dark:text-white";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <div className="flex items-center justify-center min-h-screen bg-indigo-50 dark:bg-gray-900 transition-colors duration-500 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-2xl shadow-2xl max-w-lg w-full">
                <div className="flex justify-end mb-4">
                    <button onClick={toggleDarkMode} className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white shadow-md hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                </div>
                <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">Facility Setup</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">Define your resource capacity.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className={labelClass}>Facility Name</label>
                        <input type="text" name="name" value={setupData.name} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Total Beds</label>
                            <input type="number" name="bedsAvailable" value={setupData.bedsAvailable} onChange={handleChange} className={inputClass} min="0" required />
                        </div>
                        <div>
                            <label className={labelClass}>ICU Beds</label>
                            <input type="number" name="icuAvailability" value={setupData.icuAvailability} onChange={handleChange} className={inputClass} min="0" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Ventilators</label>
                            <input type="number" name="ventilatorAvailability" value={setupData.ventilatorAvailability} onChange={handleChange} className={inputClass} min="0" required />
                        </div>
                        <div>
                            <label className={labelClass}>Staff Count</label>
                            <input type="number" name="staffCount" value={setupData.staffCount} onChange={handleChange} className={inputClass} min="0" required />
                        </div>
                    </div>
                    {errorMessage && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-300 dark:bg-red-900 dark:text-red-300">
                            {errorMessage}
                        </div>
                    )}
                    <button type="submit" disabled={isSubmitting || !setupData.name} className="w-full py-3 mt-8 bg-teal-500 text-white font-bold rounded-lg shadow-lg hover:bg-teal-600 transition disabled:opacity-50">
                        {isSubmitting ? 'Loading...' : 'Complete Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Main App ---
export default function App() {
    const [userId] = useState(getMockUserId());
    const [view, setView] = useState('loading');
    const [facility, setFacility] = useState(null);
    const [patients, setPatients] = useState([]);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
    
    const toggleDarkMode = () => setDarkMode(prev => !prev);

    useEffect(() => {
        localStorage.setItem('darkMode', darkMode);
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    useEffect(() => {
        if (facility) {
            setView('dashboard');
        } else {
            setView('setup');
        }
    }, [facility]);

    if (view === 'loading' || !userId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-indigo-700 dark:bg-indigo-900">
                <div className="text-white text-2xl font-semibold">Initializing Triage System...</div>
            </div>
        );
    }

    if (view === 'setup') {
        return <FacilitySetup userId={userId} setFacility={setFacility} setIsSetupComplete={() => setView('dashboard')} toggleDarkMode={toggleDarkMode} darkMode={darkMode} />;
    }

    if (view === 'dashboard' && facility) {
  return (
    <div className="p-6 space-y-4">
      <TriageDashboard
        userId={userId}
        facility={facility}
        patients={patients}
        setPatients={setPatients}
        toggleDarkMode={toggleDarkMode}
        darkMode={darkMode}
      />

      {/* Allocation Button */}
      <div className="flex justify-center">
        <button
          onClick={handleAllocation}
          disabled={isAllocating}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-500"
        >
          {isAllocating ? "Allocating..." : "Allocate Patients"}
        </button>
      </div>

      {/* Display Results */}
      {allocationResult.length > 0 && (
        <div className="mt-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-indigo-700 dark:text-indigo-300">
            Allocation Results
          </h3>
          <ul className="space-y-2">
            {allocationResult.map((r, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-200">
                Patient <b>{r.patient_id}</b> → Hospital <b>{r.hospital_id}</b>{" "}
                (Distance: {r.distance}, Severity: {r.severity})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


    return (
        <div className="flex items-center justify-center min-h-screen bg-red-100 dark:bg-red-900">
            <p className="text-xl text-red-700 dark:text-red-300">System initialization error. Please refresh.</p>
        </div>
    );

    const [allocationResult, setAllocationResult] = useState([]);
    const [isAllocating, setIsAllocating] = useState(false);

    async function handleAllocation() {
    setIsAllocating(true);
    try {
        const response = await fetch("http://127.0.0.1:8001/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            patients: patients,
            hospitals: facility ? facility.hospitals : []
        })
    });

    if (!response.ok) throw new Error("Failed to allocate");

    const data = await response.json();
    setAllocationResult(data);
    alert("✅ Patient allocation completed!");
  } catch (err) {
    console.error(err);
    alert("❌ Allocation failed. Check server logs.");
  } finally {
    setIsAllocating(false);
  }
}

}