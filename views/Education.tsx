
import React, { useState } from 'react';
import { ChevronLeft, Search, BookOpen, Apple, Activity, Baby, Play, Bookmark } from 'lucide-react';

interface EducationViewProps {
  onBack: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
  { id: 'exercise', label: 'Exercise', icon: Activity },
  { id: 'development', label: 'Development', icon: Baby },
];

const ARTICLES = [
  {
    id: 1,
    category: 'development',
    title: 'Your Baby at 32 Weeks',
    excerpt: 'Your baby is now the size of a squash! Learn about sleep cycles and movement patterns.',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&q=80',
    featured: true
  },
  {
    id: 2,
    category: 'nutrition',
    title: 'Iron-Rich Foods for Pregnancy',
    excerpt: 'Top 10 locally available foods to boost your iron levels and prevent anemia.',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1606923829579-0cb9d4af244d?auto=format&fit=crop&q=80',
    featured: false
  },
  {
    id: 3,
    category: 'exercise',
    title: 'Safe Stretches for Back Pain',
    excerpt: 'Gentle yoga movements to relieve lower back tension safely during the third trimester.',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&q=80',
    featured: false
  },
  {
    id: 4,
    category: 'development',
    title: 'Warning Signs: When to Call',
    excerpt: 'Understanding the difference between Braxton Hicks and real labor contractions.',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1531983412531-1f49a365ffed?auto=format&fit=crop&q=80',
    featured: false
  }
];

export const EducationView: React.FC<EducationViewProps> = ({ onBack }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filteredArticles = ARTICLES.filter(article => {
    const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
    const matchesSearch = article.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = filteredArticles.find(a => a.featured);
  const regularArticles = filteredArticles.filter(a => !a.featured);

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-3 rounded-full bg-white dark:bg-[#1c1c1e] text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-sm border border-slate-100 dark:border-slate-800 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Library</h1>
      </div>

      {/* Search & Categories */}
      <div className="space-y-6 mb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search articles, topics..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-transparent focus:border-brand-500/50 outline-none focus:ring-4 focus:ring-brand-500/10 text-slate-900 dark:text-white font-medium shadow-sm transition-all"
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all
                ${activeCategory === cat.id 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg scale-105' 
                  : 'bg-white dark:bg-[#1c1c1e] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}
              `}
            >
              {cat.icon && <cat.icon size={16} />}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="space-y-8">
        
        {/* Featured Card */}
        {featuredArticle && activeCategory === 'all' && !search && (
           <div className="relative h-[400px] rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-pointer transition-transform hover:scale-[1.01]">
              <img src={featuredArticle.image} alt="Featured" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 md:p-10 text-white max-w-2xl">
                 <span className="inline-block px-3 py-1 rounded-lg bg-brand-500/90 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">Featured Update</span>
                 <h2 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{featuredArticle.title}</h2>
                 <p className="text-lg text-slate-200 line-clamp-2 mb-4">{featuredArticle.excerpt}</p>
                 <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
                    <span className="flex items-center gap-1"><BookOpen size={14} /> {featuredArticle.readTime}</span>
                 </div>
              </div>
           </div>
        )}

        <h3 className="text-xl font-bold text-slate-900 dark:text-white px-2">
           {search ? 'Search Results' : activeCategory !== 'all' ? `${CATEGORIES.find(c => c.id === activeCategory)?.label} Articles` : 'Latest Articles'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {regularArticles.map(article => (
             <div key={article.id} className="bg-white dark:bg-[#1c1c1e] p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="h-48 rounded-2xl overflow-hidden mb-4 relative">
                   <img src={article.image} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                   <button className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-colors">
                      <Bookmark size={16} />
                   </button>
                </div>
                <div className="px-2 pb-2">
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">{article.category}</span>
                      <span className="text-xs font-medium text-slate-400">{article.readTime}</span>
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-brand-600 transition-colors">{article.title}</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{article.excerpt}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
