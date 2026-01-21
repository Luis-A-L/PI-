import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { MessageCircle, Heart, HelpCircle, AlertTriangle, Send, User, Plus, X } from 'lucide-react';
import { CommunityPost, CommunityComment } from '../types';

interface CommunityProps {
  isDemo?: boolean;
}

const Community: React.FC<CommunityProps> = ({ isDemo }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general' });
  const [submitting, setSubmitting] = useState(false);
  
  // Expanded Post View
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [isDemo, filter]);

  const fetchPosts = async () => {
    setLoading(true);
    if (isDemo) {
      setTimeout(() => {
        setPosts([
          {
            id: '1',
            institution_id: 'demo',
            author_id: 'demo',
            title: 'Doação de Roupas de Inverno',
            content: 'Recebemos uma grande doação de casacos infantis. Temos excedente para tamanhos 4 a 8 anos. Quem tiver interesse, entre em contato!',
            category: 'donation',
            created_at: new Date().toISOString(),
            profiles: { full_name: 'Maria Silva' },
            institutions: { name: 'Lar Esperança' }
          },
          {
            id: '2',
            institution_id: 'demo',
            author_id: 'demo',
            title: 'Dúvida sobre documentação escolar',
            content: 'Alguém sabe quais documentos exatos a escola municipal está exigindo para transferência este ano?',
            category: 'question',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            profiles: { full_name: 'João Santos' },
            institutions: { name: 'Casa do Menino' }
          }
        ]);
        setLoading(false);
      }, 500);
      return;
    }

    let query = supabase
      .from('community_posts')
      .select(`
        *,
        profiles (full_name),
        institutions (name)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('category', filter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setPosts(data as any);
    }
    setLoading(false);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isDemo) {
      setTimeout(() => {
        const post: CommunityPost = {
          id: Math.random().toString(),
          institution_id: 'demo',
          author_id: 'demo',
          title: newPost.title,
          content: newPost.content,
          category: newPost.category as any,
          created_at: new Date().toISOString(),
          profiles: { full_name: 'Usuário Demo' },
          institutions: { name: 'Instituição Demo' }
        };
        setPosts([post, ...posts]);
        setSubmitting(false);
        setShowNewPostModal(false);
        setNewPost({ title: '', content: '', category: 'general' });
      }, 500);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
      
      const { error } = await supabase.from('community_posts').insert([{
        institution_id: profile.institution_id,
        author_id: user.id,
        title: newPost.title,
        content: newPost.content,
        category: newPost.category
      }]);

      if (error) throw error;
      
      fetchPosts();
      setShowNewPostModal(false);
      setNewPost({ title: '', content: '', category: 'general' });
    } catch (err) {
      alert("Erro ao criar postagem.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    if (isDemo) {
        setComments([
            { id: '1', post_id: postId, institution_id: 'demo', author_id: 'demo', content: 'Tenho interesse! Vou mandar mensagem.', created_at: new Date().toISOString(), profiles: { full_name: 'Ana' }, institutions: { name: 'Lar Feliz' } }
        ]);
        setLoadingComments(false);
        return;
    }

    const { data, error } = await supabase
        .from('community_comments')
        .select(`
            *,
            profiles (full_name),
            institutions (name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (!error && data) {
        setComments(data as any);
    }
    setLoadingComments(false);
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPost) return;

    if (isDemo) {
        const comment: CommunityComment = {
            id: Math.random().toString(),
            post_id: selectedPost.id,
            institution_id: 'demo',
            author_id: 'demo',
            content: newComment,
            created_at: new Date().toISOString(),
            profiles: { full_name: 'Usuário Demo' },
            institutions: { name: 'Instituição Demo' }
        };
        setComments([...comments, comment]);
        setNewComment('');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();

        const { error } = await supabase.from('community_comments').insert([{
            post_id: selectedPost.id,
            institution_id: profile.institution_id,
            author_id: user.id,
            content: newComment
        }]);

        if (error) throw error;
        fetchComments(selectedPost.id);
        setNewComment('');
    } catch (err) {
        console.error(err);
    }
  };

  const openPost = (post: CommunityPost) => {
      setSelectedPost(post);
      fetchComments(post.id);
  };

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'donation': return <Heart className="w-5 h-5 text-pink-500" />;
          case 'question': return <HelpCircle className="w-5 h-5 text-blue-500" />;
          case 'alert': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
          default: return <MessageCircle className="w-5 h-5 text-slate-500" />;
      }
  };

  const getCategoryLabel = (cat: string) => {
      switch(cat) {
          case 'donation': return 'Doação';
          case 'question': return 'Dúvida';
          case 'alert': return 'Aviso';
          default: return 'Geral';
      }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Comunidade Inter-Lares</h1>
            <p className="text-slate-500">Espaço para colaboração, doações e troca de experiências entre instituições.</p>
        </div>
        <button 
            onClick={() => setShowNewPostModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg shadow-sm font-medium transition-colors"
        >
            <Plus className="w-5 h-5 mr-2" />
            Nova Postagem
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
              { id: 'all', label: 'Todos', icon: null },
              { id: 'donation', label: 'Doações', icon: <Heart size={16} /> },
              { id: 'question', label: 'Dúvidas', icon: <HelpCircle size={16} /> },
              { id: 'alert', label: 'Avisos', icon: <AlertTriangle size={16} /> },
              { id: 'general', label: 'Geral', icon: <MessageCircle size={16} /> },
          ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === f.id ? 'bg-gov-100 text-gov-800 border border-gov-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                  {f.icon && <span className="mr-2">{f.icon}</span>}
                  {f.label}
              </button>
          ))}
      </div>

      {/* Posts Grid */}
      {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gov-600"></div></div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map(post => (
                  <div key={post.id} onClick={() => openPost(post)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full">
                      <div className="flex justify-between items-start mb-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              post.category === 'donation' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                              post.category === 'question' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              post.category === 'alert' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-slate-50 text-slate-700 border-slate-100'
                          }`}>
                              {getCategoryIcon(post.category)}
                              <span className="ml-1.5">{getCategoryLabel(post.category)}</span>
                          </span>
                          <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{post.title}</h3>
                      <p className="text-slate-600 text-sm mb-4 line-clamp-3 flex-1">{post.content}</p>
                      <div className="flex items-center pt-4 border-t border-slate-100 mt-auto">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3">
                              <User size={16} />
                          </div>
                          <div className="text-xs">
                              <p className="font-medium text-slate-900">{post.profiles?.full_name || 'Anônimo'}</p>
                              <p className="text-slate-500">{post.institutions?.name || 'Instituição'}</p>
                          </div>
                      </div>
                  </div>
              ))}
              {posts.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      Nenhuma postagem encontrada nesta categoria.
                  </div>
              )}
          </div>
      )}

      {/* New Post Modal */}
      {showNewPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-900">Nova Postagem</h3>
                      <button onClick={() => setShowNewPostModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                          <select 
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-gov-500 focus:border-gov-500"
                            value={newPost.category}
                            onChange={e => setNewPost({...newPost, category: e.target.value})}
                          >
                              <option value="general">Geral / Discussão</option>
                              <option value="donation">Doação / Troca</option>
                              <option value="question">Dúvida Técnica</option>
                              <option value="alert">Aviso Importante</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                          <input 
                            type="text" 
                            required
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-gov-500 focus:border-gov-500"
                            placeholder="Resumo do assunto"
                            value={newPost.title}
                            onChange={e => setNewPost({...newPost, title: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Conteúdo</label>
                          <textarea 
                            required
                            rows={4}
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-gov-500 focus:border-gov-500"
                            placeholder="Descreva detalhadamente..."
                            value={newPost.content}
                            onChange={e => setNewPost({...newPost, content: e.target.value})}
                          />
                      </div>
                      <div className="flex justify-end pt-2">
                          <button type="button" onClick={() => setShowNewPostModal(false)} className="mr-3 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                          <button type="submit" disabled={submitting} className="px-4 py-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 font-medium shadow-sm disabled:opacity-50">
                              {submitting ? 'Publicando...' : 'Publicar'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center">
                          <span className={`mr-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              selectedPost.category === 'donation' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                              selectedPost.category === 'question' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              selectedPost.category === 'alert' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-slate-50 text-slate-700 border-slate-100'
                          }`}>
                              {getCategoryLabel(selectedPost.category)}
                          </span>
                          <span className="text-xs text-slate-500">{new Date(selectedPost.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <button onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">{selectedPost.title}</h2>
                      <div className="flex items-center mb-6 pb-6 border-b border-slate-100">
                          <div className="w-10 h-10 rounded-full bg-gov-100 flex items-center justify-center text-gov-600 mr-3 font-bold">
                              {selectedPost.profiles?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                              <p className="font-medium text-slate-900">{selectedPost.profiles?.full_name}</p>
                              <p className="text-xs text-slate-500">{selectedPost.institutions?.name}</p>
                          </div>
                      </div>
                      <p className="text-slate-700 whitespace-pre-wrap mb-8">{selectedPost.content}</p>

                      <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Comentários ({comments.length})
                      </h3>
                      
                      <div className="space-y-4 mb-6">
                          {loadingComments ? (
                              <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gov-600 inline-block"></div></div>
                          ) : comments.length === 0 ? (
                              <p className="text-slate-500 text-sm italic">Seja o primeiro a comentar.</p>
                          ) : (
                              comments.map(comment => (
                                  <div key={comment.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="font-bold text-xs text-slate-700">{comment.profiles?.full_name} <span className="font-normal text-slate-500">({comment.institutions?.name})</span></span>
                                          <span className="text-[10px] text-slate-400">{new Date(comment.created_at).toLocaleString('pt-BR')}</span>
                                      </div>
                                      <p className="text-sm text-slate-700">{comment.content}</p>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                      <form onSubmit={handleCreateComment} className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 border-slate-300 rounded-lg shadow-sm focus:ring-gov-500 focus:border-gov-500 text-sm"
                            placeholder="Escreva um comentário..."
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                          />
                          <button type="submit" disabled={!newComment.trim()} className="p-2 bg-gov-600 text-white rounded-lg hover:bg-gov-700 disabled:opacity-50">
                              <Send size={18} />
                          </button>
                      </form>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Community;