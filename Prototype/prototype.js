import React, { useState, useEffect } from 'react';
import { 
  Home, Search, PlusSquare, Heart, User, 
  MoreHorizontal, MessageCircle, Repeat, Bookmark, 
  Download, Share2, Wand2, Sparkles, X, Check
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_POSTS = [
  {
    id: 1,
    author: { username: 'data.artist', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
    title: 'The Psychology of Color in UI',
    imageUrl: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=800&q=80',
    likes: 1243,
    comments: 89,
    saved: false,
    liked: false,
    isIterated: false,
    description: 'A visual breakdown of how colors affect user decisions and emotional responses in digital interfaces. 🎨✨ #UIDesign #Infographedia'
  },
  {
    id: 2,
    author: { username: 'eco_metrics', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80' },
    title: 'Global Carbon Timeline',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    likes: 8492,
    comments: 312,
    saved: true,
    liked: true,
    isIterated: true,
    originalAuthor: 'climate.viz',
    description: 'Iterated on @climate.viz\'s original chart to include projected data for 2050 based on current reduction pledges. 🌍📉 #ClimateAction'
  },
  {
    id: 3,
    author: { username: 'neuro_mapper', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
    title: 'Dopamine Fasting Explained',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    likes: 302,
    comments: 14,
    saved: false,
    liked: false,
    isIterated: false,
    description: 'Resetting the brain\'s reward system. Here is the biological mechanism behind dopamine fasting and why it works. 🧠⚡ #Neuroscience #MentalHealth'
  }
];

// --- REUSABLE STYLES ---
const GLASS_PANEL = "bg-neutral-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl";
const GLASS_BUTTON = "hover:bg-white/10 active:bg-white/5 transition-all duration-200 rounded-xl flex items-center gap-3 p-3 text-neutral-300 hover:text-white";

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [isIterateModalOpen, setIsIterateModalOpen] = useState(false);
  const [iteratingPost, setIteratingPost] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Simple Toast Notification system
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLike = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 };
      }
      return post;
    }));
  };

  const handleSave = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const isSaved = !post.saved;
        if (isSaved) showToast("Saved to your collection");
        return { ...post, saved: isSaved };
      }
      return post;
    }));
  };

  const openIterateModal = (post) => {
    setIteratingPost(post);
    setIsIterateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-white/30 relative overflow-hidden flex justify-center">
      
      {/* Ambient Background Lights for Glassmorphism Depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-white/5 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-white/5 rounded-full blur-[150px]"></div>
      </div>

      {/* Main Layout Container */}
      <div className="flex w-full max-w-6xl relative z-10">
        
        {/* --- DESKTOP SIDEBAR --- */}
        <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 py-8 px-6 border-r border-white/5">
          <div className="mb-10 px-2 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${GLASS_PANEL}`}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Infographedia</h1>
          </div>

          <nav className="flex flex-col gap-2 flex-grow">
            <button onClick={() => setActiveTab('home')} className={`${GLASS_BUTTON} ${activeTab === 'home' ? 'bg-white/10 text-white font-medium' : ''}`}>
              <Home className="w-6 h-6" /> <span className="hidden lg:block text-lg">Home</span>
            </button>
            <button onClick={() => setActiveTab('search')} className={`${GLASS_BUTTON} ${activeTab === 'search' ? 'bg-white/10 text-white font-medium' : ''}`}>
              <Search className="w-6 h-6" /> <span className="hidden lg:block text-lg">Search</span>
            </button>
            <button onClick={() => openIterateModal(null)} className={`${GLASS_BUTTON} ${activeTab === 'create' ? 'bg-white/10 text-white font-medium' : ''}`}>
              <PlusSquare className="w-6 h-6" /> <span className="hidden lg:block text-lg">Create</span>
            </button>
            <button onClick={() => setActiveTab('activity')} className={`${GLASS_BUTTON} ${activeTab === 'activity' ? 'bg-white/10 text-white font-medium' : ''}`}>
              <Heart className="w-6 h-6" /> <span className="hidden lg:block text-lg">Activity</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`${GLASS_BUTTON} ${activeTab === 'profile' ? 'bg-white/10 text-white font-medium' : ''}`}>
              <User className="w-6 h-6" /> <span className="hidden lg:block text-lg">Profile</span>
            </button>
          </nav>

          {/* User Mini Profile */}
          <div className={`mt-auto p-4 rounded-2xl flex items-center gap-3 cursor-pointer ${GLASS_PANEL} hover:bg-white/5 transition-colors`}>
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/20 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80" alt="You" className="w-full h-full object-cover" />
            </div>
            <div className="hidden lg:block flex-grow">
              <p className="text-sm font-semibold text-white">alex.design</p>
              <p className="text-xs text-neutral-400">View Profile</p>
            </div>
            <MoreHorizontal className="w-5 h-5 text-neutral-500 hidden lg:block" />
          </div>
        </aside>

        {/* --- MAIN FEED (MOBILE & DESKTOP) --- */}
        <main className="flex-grow max-w-xl mx-auto w-full pb-24 md:pb-0 min-h-screen">
          
          {/* Mobile Header */}
          <header className="md:hidden sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
             <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <h1 className="text-lg font-bold tracking-tight">Infographedia</h1>
             </div>
             <button onClick={() => openIterateModal(null)} className="p-2 text-neutral-300">
               <PlusSquare className="w-6 h-6" />
             </button>
          </header>

          <div className="py-6 px-0 sm:px-4 flex flex-col gap-10">
            {posts.map(post => (
              <article key={post.id} className="flex flex-col gap-3">
                
                {/* Post Header */}
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-neutral-600 to-neutral-300">
                      <div className="w-full h-full rounded-full border-2 border-neutral-950 overflow-hidden">
                        <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm text-white group-hover:text-neutral-300 transition-colors">{post.author.username}</span>
                        {post.isIterated && (
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <Repeat className="w-3 h-3" /> from @{post.originalAuthor}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500 block">2 hours ago</span>
                    </div>
                  </div>
                  <button className="text-neutral-500 hover:text-white transition-colors p-2">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Infographic Content (The colorful part) */}
                <div className="relative group w-full bg-neutral-900 sm:rounded-2xl overflow-hidden border-y sm:border border-white/5 aspect-[4/5]">
                  <img 
                    src={post.imageUrl} 
                    alt={post.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Glass Watermark */}
                  <div className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${GLASS_PANEL}`}>
                    <Sparkles className="w-3 h-3 text-white/70" />
                    <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase">Infographedia</span>
                  </div>
                </div>

                {/* Actions & Glass Toolbar */}
                <div className="px-4 sm:px-0">
                  <div className={`flex items-center justify-between p-2 rounded-2xl ${GLASS_PANEL}`}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleLike(post.id)} className="p-2 hover:bg-white/10 rounded-xl transition-colors group">
                        <Heart className={`w-6 h-6 transition-transform active:scale-75 ${post.liked ? 'fill-white text-white' : 'text-neutral-300 group-hover:text-white'}`} />
                      </button>
                      <button className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-300 hover:text-white">
                        <MessageCircle className="w-6 h-6" />
                      </button>
                      <button onClick={() => { showToast("Link copied to clipboard"); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-300 hover:text-white">
                        <Share2 className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* The Magic Iterate Button */}
                      <button 
                        onClick={() => openIterateModal(post)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
                      >
                        <Wand2 className="w-4 h-4" />
                        <span className="text-sm font-semibold">Iterate</span>
                      </button>

                      <button onClick={() => { showToast("Watermarked image downloading..."); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-300 hover:text-white">
                        <Download className="w-6 h-6" />
                      </button>
                      <button onClick={() => handleSave(post.id)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-300 hover:text-white">
                        <Bookmark className={`w-6 h-6 ${post.saved ? 'fill-white text-white' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Likes & Caption */}
                  <div className="mt-3 px-1">
                    <p className="font-semibold text-sm text-white mb-1">{post.likes.toLocaleString()} likes</p>
                    <p className="text-sm leading-relaxed text-neutral-300">
                      <span className="font-semibold text-white mr-2">{post.author.username}</span>
                      {post.description}
                    </p>
                    <button className="text-sm text-neutral-500 mt-1 hover:text-neutral-400">View all {post.comments} comments</button>
                  </div>
                </div>
              </article>
            ))}
            
            {/* End of Feed Loading State */}
            <div className="py-10 flex justify-center">
               <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
          </div>
        </main>

        {/* --- MOBILE BOTTOM NAV --- */}
        <div className="md:hidden fixed bottom-0 w-full z-40 px-4 pb-6 pt-2">
          <nav className={`flex items-center justify-around p-3 rounded-2xl ${GLASS_PANEL}`}>
            <button onClick={() => setActiveTab('home')} className={`p-2 rounded-xl transition-all ${activeTab === 'home' ? 'text-white' : 'text-neutral-500'}`}>
              <Home className="w-6 h-6" />
            </button>
            <button onClick={() => setActiveTab('search')} className={`p-2 rounded-xl transition-all ${activeTab === 'search' ? 'text-white' : 'text-neutral-500'}`}>
              <Search className="w-6 h-6" />
            </button>
            <button onClick={() => openIterateModal(null)} className="p-3 bg-white text-black rounded-xl hover:scale-105 transition-transform shadow-lg">
              <PlusSquare className="w-6 h-6" />
            </button>
            <button onClick={() => setActiveTab('activity')} className={`p-2 rounded-xl transition-all ${activeTab === 'activity' ? 'text-white' : 'text-neutral-500'}`}>
              <Heart className="w-6 h-6" />
            </button>
            <div onClick={() => setActiveTab('profile')} className="p-1 cursor-pointer">
              <div className={`w-8 h-8 rounded-full overflow-hidden border-2 ${activeTab === 'profile' ? 'border-white' : 'border-transparent'}`}>
                <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80" alt="You" className="w-full h-full object-cover" />
              </div>
            </div>
          </nav>
        </div>

      </div>

      {/* --- MODALS & TOASTS --- */}

      {/* Iterate / Create AI Modal */}
      {isIterateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsIterateModalOpen(false)}></div>
          
          <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col ${GLASS_PANEL} p-6 border-white/20 animate-in fade-in zoom-in-95 duration-200`}>
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5" /> 
                {iteratingPost ? 'Iterate Infographic' : 'Create New Infographic'}
              </h2>
              <button onClick={() => setIsIterateModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Preview Area */}
              <div className="w-full md:w-1/2 aspect-[4/5] rounded-xl bg-neutral-900 overflow-hidden relative border border-white/10 flex flex-col">
                {iteratingPost ? (
                  <>
                    <img src={iteratingPost.imageUrl} className="w-full h-full object-cover opacity-50 blur-sm" alt="Base" />
                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                       <Sparkles className="w-8 h-8 text-white animate-pulse" />
                       <p className="text-sm font-medium text-white/70">AI Context Loaded</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center flex-col gap-3 bg-gradient-to-br from-neutral-800 to-neutral-900">
                     <PlusSquare className="w-8 h-8 text-neutral-600" />
                     <p className="text-sm font-medium text-neutral-500">Blank Canvas</p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="w-full md:w-1/2 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">AI Prompt</label>
                  <textarea 
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 resize-none h-24"
                    placeholder={iteratingPost ? "How would you like to evolve this data?" : "Describe the infographic you want to generate..."}
                    defaultValue={iteratingPost ? "Update the color scheme to neon cyberpunk and project data to 2050." : ""}
                  ></textarea>
                </div>

                {iteratingPost && (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-neutral-400 mb-1">Iterating on:</p>
                    <div className="flex items-center gap-2">
                       <img src={iteratingPost.author.avatar} className="w-4 h-4 rounded-full" alt="" />
                       <span className="text-sm font-medium">@{iteratingPost.author.username} / {iteratingPost.title}</span>
                    </div>
                  </div>
                )}

                <div>
                   <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Data Source (Optional)</label>
                   <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="w-6 h-6 bg-green-500/20 rounded flex items-center justify-center">
                        <span className="text-green-500 font-bold text-xs">CSV</span>
                      </div>
                      <span className="text-sm text-neutral-400">Upload dataset</span>
                   </div>
                </div>

                <div className="mt-auto pt-4">
                  <button onClick={() => {
                    setIsIterateModalOpen(false);
                    showToast("AI Generation Started...");
                  }} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    <Wand2 className="w-4 h-4" />
                    Generate UI
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-full ${GLASS_PANEL} bg-neutral-900/80`}>
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
}