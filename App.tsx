import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Question } from './types';
import { TOTAL_QUESTIONS, GAME_DURATION_SECONDS } from './constants';
import { generateQuestions } from './services/geminiService';
import { ClockIcon, LoadingSpinner, CheckIcon, CrossIcon, TrophyIcon } from './components/icons';

const StartScreen: React.FC<{ onStart: () => void; loading: boolean }> = ({ onStart, loading }) => (
  <div className="text-center text-game-light p-8 animate-fade-in">
    <h1 className="text-7xl md:text-9xl font-display text-game-yellow drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]">Avanti un Altro</h1>
    <h2 className="text-3xl md:text-5xl font-display text-white mt-2 mb-8">Il Gioco Finale</h2>
    <div className="max-w-2xl mx-auto bg-game-blue/50 p-6 rounded-xl shadow-lg border-2 border-game-yellow/50">
        <h3 className="text-2xl font-bold text-game-yellow mb-4">REGOLE DEL GIOCO</h3>
        <ul className="text-lg text-left space-y-3 list-disc list-inside">
            <li>L'obiettivo è rispondere a <strong>{TOTAL_QUESTIONS} domande</strong> di fila dando la <strong>risposta SBAGLIATA</strong>.</li>
            <li>Hai <strong>{GAME_DURATION_SECONDS} secondi</strong> di tempo totale.</li>
            <li>Se dai la risposta giusta... <strong>si ricomincia da capo!</strong></li>
            <li>Se il tempo scade... <strong>hai perso!</strong></li>
        </ul>
    </div>
    <button
      onClick={onStart}
      disabled={loading}
      className="mt-10 bg-game-yellow text-game-dark font-bold text-3xl py-4 px-12 rounded-full shadow-2xl transform hover:scale-105 transition-transform duration-300 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
    >
      {loading ? <LoadingSpinner className="w-8 h-8 mr-4" /> : null}
      {loading ? 'CARICAMENTO...' : 'INIZIA IL GIOCO!'}
    </button>
  </div>
);

const EndScreen: React.FC<{ status: 'won' | 'lost'; onRestart: () => void; error?: string }> = ({ status, onRestart, error }) => (
  <div className="text-center text-white p-8 animate-fade-in">
    {status === 'won' && (
      <>
        <TrophyIcon className="w-32 h-32 mx-auto text-game-yellow animate-ping-once" />
        <h1 className="text-8xl font-display text-game-yellow mt-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]">HAI VINTO!</h1>
        <p className="text-2xl mt-4">Complimenti! Hai superato la sfida finale!</p>
      </>
    )}
    {status === 'lost' && (
      <>
        <h1 className="text-8xl font-display text-game-red mt-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]">{error ? 'ERRORE' : 'HAI PERSO!'}</h1>
        <p className="text-2xl mt-4">{error ? error : "Il tempo è scaduto o hai dato troppe risposte giuste. Peccato!"}</p>
      </>
    )}
    <button
      onClick={onRestart}
      className="mt-12 bg-game-yellow text-game-dark font-bold text-2xl py-3 px-10 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300"
    >
      Gioca Ancora
    </button>
  </div>
);

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
    const percentage = (current / total) * 100;
    return (
        <div className="w-full bg-game-blue/50 rounded-full h-8 border-2 border-game-yellow/70 shadow-inner">
            <div
                className="bg-game-yellow h-full rounded-full text-right transition-all duration-500 ease-out flex items-center justify-end pr-3"
                style={{ width: `${percentage}%` }}
            >
              <span className="font-black text-game-dark text-sm">{current}/{total}</span>
            </div>
        </div>
    );
};

const FeedbackOverlay: React.FC<{ type: 'correct' | 'incorrect' | null }> = ({ type }) => {
    if (!type) return null;

    const isCorrect = type === 'correct';
    const bgColor = isCorrect ? 'bg-green-500/80' : 'bg-red-500/80';
    const text = isCorrect ? 'SBAGLIATO! Avanti!' : 'GIUSTO! Si ricomincia!';
    const Icon = isCorrect ? CheckIcon : CrossIcon;

    return (
        <div key={Date.now()} className={`absolute inset-0 flex flex-col items-center justify-center ${bgColor} animate-fade-in`}>
            <Icon className="w-24 h-24 text-white" />
            <p className="text-5xl font-display text-white mt-4">{text}</p>
        </div>
    );
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    if (gameState !== GameState.Playing) return;

    if (timeLeft <= 0) {
      setGameState(GameState.Lost);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameState, timeLeft]);

  const handleStartGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedQuestions = await generateQuestions();
      setQuestions(fetchedQuestions);
      setCurrentQuestionIndex(0);
      setTimeLeft(GAME_DURATION_SECONDS);
      setGameState(GameState.Playing);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
      setGameState(GameState.Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRestartGame = useCallback(() => {
    setGameState(GameState.Start);
    setIsLoading(false);
    setError(null);
  }, []);
  
  const showFeedbackAndProceed = useCallback((type: 'correct' | 'incorrect', action: () => void) => {
      setFeedback(type);
      setIsAnswering(true);
      setTimeout(() => {
          action();
          setFeedback(null);
          setIsAnswering(false);
      }, 1200);
  }, []);

  const handleAnswerSelection = useCallback((selectedAnswer: string) => {
    if (isAnswering) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isAnswerTheRealCorrectOne = selectedAnswer === currentQuestion.correctAnswer;
    
    // Player fails if they pick the real correct answer
    if (isAnswerTheRealCorrectOne) {
        showFeedbackAndProceed('incorrect', () => {
            setCurrentQuestionIndex(0);
        });
    } else { // Player succeeds by picking the wrong answer
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex >= TOTAL_QUESTIONS) {
            showFeedbackAndProceed('correct', () => {
                setGameState(GameState.Won);
            });
        } else {
            showFeedbackAndProceed('correct', () => {
                setCurrentQuestionIndex(nextIndex);
            });
        }
    }
  }, [isAnswering, currentQuestionIndex, questions, showFeedbackAndProceed]);

  const currentOptions = useMemo(() => {
    if (gameState !== GameState.Playing || questions.length === 0 || !questions[currentQuestionIndex]) {
      return [];
    }
    const { correctAnswer, incorrectAnswer } = questions[currentQuestionIndex];
    return [correctAnswer, incorrectAnswer].sort(() => Math.random() - 0.5);
  }, [currentQuestionIndex, questions, gameState]);


  const renderContent = () => {
    switch (gameState) {
      case GameState.Start:
        return <StartScreen onStart={handleStartGame} loading={isLoading} />;
      case GameState.Error:
        return <EndScreen status="lost" onRestart={handleRestartGame} error={error ?? "Errore sconosciuto"} />;
      case GameState.Won:
        return <EndScreen status="won" onRestart={handleRestartGame} />;
      case GameState.Lost:
        return <EndScreen status="lost" onRestart={handleRestartGame} />;
      case GameState.Playing:
        if (questions.length === 0 || isLoading) {
          return <div className="flex justify-center items-center h-full"><LoadingSpinner className="w-16 h-16 text-game-yellow" /></div>
        }
        return (
          <div className="w-full max-w-4xl mx-auto p-4 md:p-8 relative animate-slide-in-up">
            <header className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div className="w-full md:w-auto">
                    <ProgressBar current={currentQuestionIndex} total={TOTAL_QUESTIONS} />
                </div>
                <div className="flex items-center gap-2 bg-game-blue text-white font-black text-4xl rounded-lg px-4 py-2 border-2 border-game-yellow">
                    <ClockIcon className="w-8 h-8"/>
                    <span>{timeLeft}</span>
                </div>
            </header>
            
            <main className="bg-game-blue/70 p-8 rounded-2xl shadow-2xl border-4 border-game-yellow/80 min-h-[300px] flex flex-col justify-center">
                 <p className="text-game-yellow font-bold text-xl mb-4">Domanda {currentQuestionIndex + 1}/{TOTAL_QUESTIONS}</p>
                 <h2 className="text-white font-bold text-3xl md:text-4xl text-center">
                    {questions[currentQuestionIndex]?.question}
                 </h2>
            </main>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentOptions.map((option, index) => (
                    <button 
                        key={index}
                        onClick={() => handleAnswerSelection(option)}
                        disabled={isAnswering}
                        className="bg-game-red text-white font-bold text-2xl p-6 rounded-lg shadow-lg hover:bg-red-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-game-yellow/50 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        {option}
                    </button>
                ))}
            </div>
            
            <FeedbackOverlay type={feedback} />
          </div>
        );
      default:
        return <StartScreen onStart={handleStartGame} loading={isLoading} />;
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center" style={{backgroundImage: "url('https://picsum.photos/seed/avanti/1920/1080')"}}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div className="relative w-full h-full flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;
