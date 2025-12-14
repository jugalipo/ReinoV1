import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { Book as BookIcon, Plus, X, Trash2, Save, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReadingListProps {
  books: Book[];
  onUpdate: (books: Book[]) => void;
}

export const ReadingList: React.FC<ReadingListProps> = ({ books, onUpdate }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTotal, setNewTotal] = useState('');
  
  // Modal State
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [editPage, setEditPage] = useState('');

  // Update local edit state when a book is selected
  useEffect(() => {
    if (selectedBook) {
        setEditPage(selectedBook.currentPage.toString());
    }
  }, [selectedBook]);

  const addBook = () => {
    if (!newTitle.trim() || !newTotal) return;
    const total = parseInt(newTotal);
    if (isNaN(total) || total <= 0) return;

    const newBook: Book = {
      id: Date.now().toString(),
      title: newTitle,
      currentPage: 0,
      totalPages: total,
      completed: false
    };

    onUpdate([...books, newBook]);
    setNewTitle('');
    setNewTotal('');
    setShowAdd(false);
  };

  const saveProgress = () => {
    if (!selectedBook) return;
    const page = parseInt(editPage);
    if (isNaN(page)) return;

    const updated = books.map(b => {
      if (b.id === selectedBook.id) {
        const newCurrent = Math.min(Math.max(0, page), b.totalPages);
        return {
          ...b,
          currentPage: newCurrent,
          completed: newCurrent >= b.totalPages
        };
      }
      return b;
    });

    onUpdate(updated);
    setSelectedBook(null);
  };

  const deleteBook = () => {
    if (!selectedBook) return;
    if (window.confirm("¿Dejar de leer este libro?")) {
        onUpdate(books.filter(b => b.id !== selectedBook.id));
        setSelectedBook(null);
    }
  };

  const adjustPage = (delta: number) => {
      if (!selectedBook) return;
      const current = parseInt(editPage) || 0;
      const newVal = Math.min(Math.max(0, current + delta), selectedBook.totalPages);
      setEditPage(newVal.toString());
  };

  return (
    <div className="bg-stone-900 rounded-2xl shadow-sm p-6 w-full mt-6 border border-stone-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <BookIcon className="w-6 h-6 text-stone-400" />
            <h2 className="text-xl font-bold text-stone-200">Lectura</h2>
        </div>
        <button 
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 hover:bg-stone-800 rounded-full text-stone-500 hover:text-stone-300 transition-colors"
        >
            {showAdd ? <X className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      {showAdd && (
          <div className="mb-6 p-4 bg-stone-950 rounded-xl border border-stone-800 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-3">
                  <input
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-200 text-sm focus:border-stone-600 outline-none"
                      placeholder="Título del libro..."
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                  />
                  <div className="flex gap-2">
                      <input
                          type="number"
                          className="flex-1 bg-stone-900 border border-stone-800 rounded-lg p-2 text-stone-200 text-sm focus:border-stone-600 outline-none"
                          placeholder="Páginas totales..."
                          value={newTotal}
                          onChange={e => setNewTotal(e.target.value)}
                      />
                      <button 
                          onClick={addBook}
                          className="bg-stone-200 text-stone-950 font-bold px-4 rounded-lg text-sm hover:bg-white"
                      >
                          Añadir
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="space-y-3">
        {books.length === 0 && !showAdd && (
             <p className="text-stone-600 text-center italic py-2 text-sm">Ningún libro en la mesa.</p>
        )}
        
        {books.map(book => {
            const progress = (book.currentPage / book.totalPages) * 100;
            
            return (
                <div 
                    key={book.id} 
                    onClick={() => setSelectedBook(book)}
                    className="relative h-12 w-full rounded-xl overflow-hidden cursor-pointer border border-stone-800 shadow-sm active:scale-95 transition-transform"
                >
                    {/* Background (Empty part) */}
                    <div className="absolute inset-0 bg-stone-950" />
                    
                    {/* Fill (Progress part) */}
                    <div 
                        className={`absolute inset-0 transition-all duration-500 ${book.completed ? 'bg-emerald-900/80 border-r border-emerald-700/50' : 'bg-indigo-900/60 border-r border-indigo-700/50'}`}
                        style={{ width: `${progress}%` }}
                    />

                    {/* Text Label Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                        <span className="font-bold text-stone-200 drop-shadow-md truncate w-full text-center relative z-10 text-sm">
                            {book.title}
                        </span>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Modal View for Editing */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950">
                    <h3 className="font-bold text-stone-200 truncate pr-4">{selectedBook.title}</h3>
                    <button onClick={() => setSelectedBook(null)} className="p-1 hover:bg-stone-800 rounded-full">
                        <X className="w-5 h-5 text-stone-400" />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col items-center gap-6">
                    {/* Circular Progress Indicator */}
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64" cy="64" r="60"
                                stroke="#1c1917" strokeWidth="8" fill="none"
                            />
                            <circle
                                cx="64" cy="64" r="60"
                                stroke={selectedBook.completed ? "#10b981" : "#6366f1"}
                                strokeWidth="8" fill="none"
                                strokeDasharray={2 * Math.PI * 60}
                                strokeDashoffset={2 * Math.PI * 60 * (1 - (selectedBook.currentPage / selectedBook.totalPages))}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                             <span className="text-3xl font-bold text-stone-100">{Math.round((parseInt(editPage || '0') / selectedBook.totalPages) * 100)}%</span>
                        </div>
                    </div>

                    {/* Page Controls */}
                    <div className="w-full">
                        <div className="flex justify-between items-center text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
                            <span>Página Actual</span>
                            <span>Total: {selectedBook.totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => adjustPage(-10)} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <input 
                                type="number" 
                                className="flex-1 bg-stone-950 border border-stone-700 rounded-xl py-3 text-center text-xl font-bold text-stone-200 outline-none focus:border-stone-500"
                                value={editPage}
                                onChange={(e) => setEditPage(e.target.value)}
                            />
                            <button onClick={() => adjustPage(10)} className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full mt-2">
                        <button 
                            onClick={deleteBook}
                            className="p-3 rounded-xl border border-red-900/30 text-red-600 hover:bg-red-950/20 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={saveProgress}
                            className="flex-1 p-3 rounded-xl bg-stone-100 text-stone-900 font-bold hover:bg-white flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" /> Actualizar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};