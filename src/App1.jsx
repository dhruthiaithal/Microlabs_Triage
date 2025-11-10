import React, { useState, useEffect } from 'react';
// Note: In a real React project, you would import Firebase packages here,
// but for the single-file Canvas environment, we rely on the injected globals.

/**
 * Main application component using React Hooks and Tailwind CSS.
 * This component manages navigation between the Home screen and the Diagnostic Chatbot.
 */
const App = () => {
  // --- Global Variable Initialization (Mandatory for Canvas Environment) ---
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  // const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  // const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
  
  // State for internal routing (Home or Diagnostic Tool)
  const [currentPage, setCurrentPage] = useState('home'); 

  // --- Auth State Placeholder (Required boilerplate for the environment) ---
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Basic setup for userId/auth readiness, even if Firestore isn't used
    // In a full application, this would contain Firebase auth logic (signInWithCustomToken/onAuthStateChanged)
    setUserId(crypto.randomUUID()); 
    setIsAuthReady(true);
  }, []); 

  // -----------------------------------------------------------------------

  const navigateToDiagnostic = () => setCurrentPage('diagnostic');
  const navigateToHome = () => setCurrentPage('home');

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <header className="w-full bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-700 tracking-tight">
            AI Health Diagnostic
          </h1>
          <button 
            onClick={currentPage === 'home' ? navigateToDiagnostic : navigateToHome}
            className="px-4 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition duration-150 shadow-md"
          >
            {currentPage === 'home' ? 'Launch Tool' : 'Go Home'}
          </button>
        </div>
      </header>
      
      <main className="flex-grow w-full max-w-4xl p-4 sm:p-6">
        {currentPage === 'home' ? (
          <HomeView onNavigate={navigateToDiagnostic} userId={userId} appId={appId} />
        ) : (
          <DiagnosticView onBack={navigateToHome} />
        )}
      </main>

      {/* Footer is optional but good for presentation */}
      <footer className="w-full bg-gray-100 p-3 text-center text-sm text-gray-500 border-t">
        <p>Canvas App ID: {appId}</p>
      </footer>
    </div>
  );
};

// --- Home View Component ---
const HomeView = ({ onNavigate, userId, appId }) => (
  <div className="text-center py-16 sm:py-24 bg-white rounded-xl shadow-lg mt-8">
    <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
      Intelligent Fever Management Assistant
    </h2>
    <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
      Submit your symptoms to receive educational advice on potential fever types and recommended immediate care steps, powered by the Gemini AI.
    </p>
    
    <div className="mt-8">
      <button
        onClick={onNavigate}
        className="px-8 py-4 bg-indigo-600 text-white font-semibold text-xl rounded-xl shadow-xl hover:bg-indigo-700 transform hover:scale-105 transition duration-300"
      >
        Start Symptom Analysis
      </button>
    </div>
    
    <div className="mt-12 p-4 text-left border-t border-gray-200 pt-8 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-gray-700 mb-2">Disclaimer</h3>
      <p className="text-sm text-red-600">
        This tool provides information for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified health provider with any questions you may have regarding a medical condition.
      </p>
    </div>
  </div>
);

// --- Diagnostic View (Chatbot) Component ---
const DiagnosticView = ({ onBack }) => {
  const [symptoms, setSymptoms] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- API Configuration FIX ---
  // Ensure the apiKey variable is locally scoped and used explicitly in the URL
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const analysisSystemInstruction = `
    You are an AI-powered health information assistant. Your goal is to provide non-diagnostic, educational advice on managing common types of fevers based on reported symptoms. You MUST use markdown formatting in your response.

    Analyze the user's input and provide a structured response that includes:
    1. **Identified Potential Fever Type(s):** Based on the symptoms (e.g., flu, common cold, dehydration, mild infection), which types of fever might be indicated? Use bullet points.
    2. **Immediate Management Steps:** Provide clear, actionable advice on immediate care for fever (e.g., hydration, rest, OTC medication guidance). Use bullet points.
    3. **When to See a Doctor:** List 3 critical 'red flags' or severe symptoms that necessitate immediate medical attention. Use bullet points and emphasize urgency.

    Maintain a supportive and non-medical-professional tone. Stress clearly that this is NOT a diagnosis and they should consult a doctor.
  `;

  const fetchDiagnostic = async () => {
    if (!symptoms.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const userPrompt = `User Symptoms: ${symptoms}`;

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: analysisSystemInstruction }] },
      // Note: Not using Google Search grounding since this is educational advice based on general knowledge.
    };
    
    // Simple retry mechanism for transient errors (like 503 Overloaded)
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        const fetchResponse = await fetch(geminiApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!fetchResponse.ok) {
          const errorBody = await fetchResponse.json();
          // Check for transient 503 error to retry
          if (errorBody.error?.code === 503 && attempt < MAX_RETRIES) {
            console.warn(`Attempt ${attempt} failed with 503. Retrying in ${attempt}s...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue; // Skip to the next loop iteration
          }
          throw new Error(errorBody.error?.message || `API request failed with status ${fetchResponse.status}`);
        }

        const result = await fetchResponse.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText) {
          setResponse(generatedText);
        } else {
          setError("Received an empty response from the AI.");
        }
        break; // Success, break the loop
        
      } catch (e) {
        if (attempt === MAX_RETRIES) {
            setError(`Final API request failed after ${MAX_RETRIES} attempts: ${e.message}`);
        }
      }
    }
    
    setIsLoading(false);
  };

  const ResponseDisplay = ({ content }) => {
    // Converts basic markdown (like **bold** and newlines) to React elements
    if (!content) return null;

    const formattedContent = content.split('\n').map((line, index) => {
        // Simple heuristic for handling bold titles and list items for display
        if (line.trim().startsWith('**')) {
          return <p key={index} className="mt-3 text-lg font-bold text-indigo-600">{line.replace(/([*]{2}|[**])/g, '')}</p>;
        }
        if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
          // Handling list items
          return <li key={index} className="ml-5 list-disc text-gray-700">{line.replace(/([*]|-)\s*/, '')}</li>;
        }
        
        return <p key={index} className="mt-1 text-gray-700">{line}</p>;
    });

    return (
      <div className="mt-6 p-5 bg-white border border-gray-200 rounded-lg shadow-inner">
        <h3 className="text-xl font-bold text-indigo-700 mb-3 border-b pb-2">AI Guidance</h3>
        {formattedContent}
        <p className="mt-4 text-sm text-red-500 font-semibold">
          Disclaimer: This is not a diagnosis. Consult a medical professional for any health concerns.
        </p>
      </div>
    );
  };


  return (
    <div className="p-4 bg-white rounded-xl shadow-lg flex flex-col h-full min-h-[70vh]">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-3xl font-bold text-indigo-700">Symptom Analyzer</h2>
      </div>

      <div className="flex flex-col flex-grow">
        <label htmlFor="symptoms" className="text-lg font-medium text-gray-700 mb-2">
          Describe Your Symptoms (e.g., temperature, duration, other issues)
        </label>
        <textarea
          id="symptoms"
          rows="5"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="I have a temperature of 101.5°F, body aches, and a sore throat. This started 2 days ago."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
          disabled={isLoading}
        ></textarea>

        <button
          onClick={fetchDiagnostic}
          disabled={isLoading || symptoms.trim() === ''}
          className={`mt-4 w-full sm:w-auto px-6 py-3 font-semibold rounded-lg transition duration-300 ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-500 text-white hover:bg-green-600 shadow-md transform hover:scale-[1.01]'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Analyzing Symptoms...
            </div>
          ) : (
            'Get Management Advice'
          )}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="flex-grow mt-6 overflow-y-auto">
          {response && <ResponseDisplay content={response} />}
        </div>
      </div>
    </div>
  );
};

export default App;