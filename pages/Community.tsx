import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { MessageCircle, Heart, HelpCircle, AlertTriangle, Send, User, Plus, X, Trash2, Search, Building2, Phone, Mail, CheckCircle } from 'lucide-react';
import { CommunityPost, CommunityComment } from '../types';

interface CommunityProps {
    isDemo?: boolean;
}

const Community: React.FC<CommunityProps> = ({ isDemo }) => {
    const [activeTab, setActiveTab] = useState<'feed' | 'directory'>('feed');
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [institutionsList, setInstitutionsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewPostModal, setShowNewPostModal] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general' });
    const [submitting, setSubmitting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Expanded Post View
    const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const viewingInstitutionId = localStorage.getItem('admin_viewing_institution_id');
    const isLocalAdmin = localStorage.getItem('admin_mode') === 'true';

    useEffect(() => {
        const getUser = async () => {
            if (isDemo) {
                setCurrentUser({ id: 'demo' });
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUser(user);
            }
        };
        getUser();
        fetchPosts();
    }, [isDemo, filter, searchTerm]);

    useEffect(() => {
        if (activeTab === 'directory') {
            fetchInstitutions();
        }
    }, [activeTab, isDemo]);

    const fetchInstitutions = async () => {
        if (isDemo) {
            setInstitutionsList([
                { id: '1', name: 'Lar Esperança', email: 'contato@laresperanca.org', phone: '(41) 3333-3333', manager: 'Maria Silva', address: 'Rua das Flores, 123' },
                { id: '2', name: 'Casa do Menino', email: 'adm@casadomenino.org', phone: '(41) 3333-4444', manager: 'João Santos', address: 'Av. Paraná, 456' }
            ]);
            return;
        }
        const { data } = await supabase.from('institutions').select('*').eq('active', true);
        if (data) setInstitutionsList(data);
    };

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
                        institutions: { name: 'Lar Esperança' },
                        status: 'open',
                        likes: 5
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
                        institutions: { name: 'Casa do Menino' },
                        status: 'resolved',
                        likes: 2
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

        if (searchTerm) {
            query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Erro ao buscar posts:", error);
            alert("Erro ao carregar postagens: " + error.message);
        }
        if (data) {
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
                    institutions: { name: 'Instituição Demo' },
                    status: 'open',
                    likes: 0
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

            const { data: profile, error: profileError } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();

            if (profileError || !profile) {
                throw new Error("Perfil não encontrado. Verifique seu cadastro.");
            }

            const { error } = await supabase.from('community_posts').insert([{
                institution_id: profile.institution_id,
                author_id: user.id,
                title: newPost.title,
                content: newPost.content,
                category: newPost.category,
                status: 'open'
            }]);

            if (error) throw error;

            fetchPosts();
            setShowNewPostModal(false);
            setNewPost({ title: '', content: '', category: 'general' });
        } catch (err: any) {
            console.error("Erro criação post:", err);
            alert("Erro ao criar postagem: " + (err.message || JSON.stringify(err)));
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolve = async (e: React.MouseEvent, post: any) => {
        e.stopPropagation();
        const newStatus = post.status === 'resolved' ? 'open' : 'resolved';

        if (isDemo) {
            setPosts(posts.map(p => p.id === post.id ? { ...p, status: newStatus } : p) as any);
            return;
        }

        const { error } = await supabase.from('community_posts').update({ status: newStatus }).eq('id', post.id);
        if (!error) {
            setPosts(posts.map(p => p.id === post.id ? { ...p, status: newStatus } : p) as any);
        }
    };

    const handleDeletePost = async (e: React.MouseEvent, postId: string) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja excluir esta postagem?")) return;

        if (isDemo) {
            setPosts(posts.filter(p => p.id !== postId));
            if (selectedPost?.id === postId) setSelectedPost(null);
            return;
        }

        const { error } = await supabase.from('community_posts').delete().eq('id', postId);
        if (error) {
            alert("Erro ao excluir postagem.");
        } else {
            setPosts(posts.filter(p => p.id !== postId));
            if (selectedPost?.id === postId) setSelectedPost(null);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Tem certeza que deseja excluir este comentário?")) return;

        if (isDemo) {
            setComments(comments.filter(c => c.id !== commentId));
            return;
        }

        const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
        if (error) {
            alert("Erro ao excluir comentário.");
        } else {
            setComments(comments.filter(c => c.id !== commentId));
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
        switch (cat) {
            case 'donation': return <Heart className="w-5 h-5 text-pink-500" />;
            case 'question': return <HelpCircle className="w-5 h-5 text-blue-500" />;
            case 'alert': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            default: return <MessageCircle className="w-5 h-5 text-slate-500" />;
        }
    };

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
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
                {(isLocalAdmin || !viewingInstitutionId) && <button
                    onClick={() => setShowNewPostModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-[#458C57] hover:bg-[#367044] text-white rounded-lg shadow-sm font-medium transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Postagem
                </button>}
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg mb-6 w-fit">
                <button
                    onClick={() => setActiveTab('feed')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'feed' ? 'bg-white text-[#458C57] shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    Feed de Postagens
                </button>
                <button
                    onClick={() => setActiveTab('directory')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'directory' ? 'bg-white text-[#458C57] shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    Diretório de Instituições
                </button>
            </div>

            {activeTab === 'feed' ? (
                <>
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
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
                                    className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === f.id ? 'bg-[#88F2A2]/20 text-[#458C57] border border-[#88F2A2]/40' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                                >
                                    {f.icon && <span className="mr-2">{f.icon}</span>}
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-full leading-5 bg-white placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#458C57] focus:border-transparent sm:text-sm"
                                placeholder="Buscar postagens..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Posts Grid */}
                    {loading ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#458C57]"></div></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map(post => (
                                <div key={post.id} onClick={() => openPost(post)} className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full ${(post as any).status === 'resolved' ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${post.category === 'donation' ? 'bg-pink-50 text-pink-700 border-pink-100' :
                                            post.category === 'question' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                post.category === 'alert' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-slate-50 text-slate-700 border-slate-100'
                                            }`}>
                                            {getCategoryIcon(post.category)}
                                            <span className="ml-1.5">{getCategoryLabel(post.category)}</span>
                                        </span>
                                        {(post as any).status === 'resolved' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 ml-2">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Resolvido
                                            </span>
                                        )}
                                        {currentUser && post.author_id === currentUser.id && (
                                            <button onClick={(e) => handleDeletePost(e, post.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors" title="Excluir postagem">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{post.title}</h3>
                                    <p className="text-slate-600 text-sm mb-4 line-clamp-3 flex-1">{post.content}</p>

                                    <div className="flex items-center pt-4 border-t border-slate-100 mt-auto">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3">
                                            <User size={16} />
                                        </div>
                                        <div className="text-xs flex-1">
                                            <p className="font-medium text-slate-900">{post.profiles?.full_name || 'Anônimo'}</p>
                                            <p className="text-slate-500">{post.institutions?.name || 'Instituição'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {currentUser && post.author_id === currentUser.id && (post as any).status !== 'resolved' && (
                                                <button onClick={(e) => handleResolve(e, post)} className="text-green-600 hover:text-green-700 text-xs font-medium ml-2" title="Marcar como resolvido">
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
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
                </>
            ) : (
                /* Directory Tab */
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                        {institutionsList.map(inst => (
                            <div key={inst.id} className="border border-slate-200 rounded-lg p-5 hover:border-[#458C57] transition-colors group">
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-[#458C57] mr-4 group-hover:bg-[#458C57] group-hover:text-white transition-colors">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{inst.name}</h3>
                                        <p className="text-xs text-slate-500">Resp: {inst.manager}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-slate-600">
                                    <div className="flex items-center">
                                        <Phone size={14} className="mr-2 text-slate-400" />
                                        {inst.phone}
                                    </div>
                                    <div className="flex items-center">
                                        <Mail size={14} className="mr-2 text-slate-400" />
                                        {inst.email}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Post Modal */}
            {showNewPostModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#458C57] text-white">
                            <h3 className="font-bold text-lg flex items-center">
                                <Plus className="mr-2 text-white/90" size={24} />
                                Nova Postagem
                            </h3>
                            <button onClick={() => setShowNewPostModal(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePost} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'general', label: 'Geral', icon: MessageCircle },
                                        { id: 'donation', label: 'Doação', icon: Heart },
                                        { id: 'question', label: 'Dúvida', icon: HelpCircle },
                                        { id: 'alert', label: 'Aviso', icon: AlertTriangle }
                                    ].map(cat => (
                                        <div
                                            key={cat.id}
                                            onClick={() => setNewPost({ ...newPost, category: cat.id })}
                                            className={`cursor-pointer rounded-xl border-2 p-3 flex items-center transition-all ${newPost.category === cat.id ? 'border-[#458C57] bg-green-50 text-[#458C57]' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                        >
                                            <cat.icon size={20} className={`mr-2 ${newPost.category === cat.id ? 'text-[#458C57]' : 'text-slate-400'}`} />
                                            <span className="font-medium text-sm">{cat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Título do Assunto</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:border-[#458C57] focus:ring-[#458C57] focus:outline-none transition-all font-medium placeholder:text-slate-400"
                                    placeholder="Ex: Doação de Livros Infantis"
                                    value={newPost.title}
                                    onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Conteúdo da Mensagem</label>
                                <textarea
                                    required
                                    rows={5}
                                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-slate-900 focus:bg-white focus:border-[#458C57] focus:ring-[#458C57] focus:outline-none transition-all placeholder:text-slate-400 resize-none"
                                    placeholder="Descreva, detalhadamente, o que você gostaria de comunicar à comunidade..."
                                    value={newPost.content}
                                    onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setShowNewPostModal(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">Cancelar</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-[#458C57] text-white rounded-xl hover:bg-[#367044] font-bold shadow-lg shadow-green-900/10 disabled:opacity-50 flex items-center transition-all transform hover:-translate-y-0.5">
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Publicando...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} className="mr-2" />
                                            Publicar Agora
                                        </>
                                    )}
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
                                <span className={`mr-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${selectedPost.category === 'donation' ? 'bg-pink-50 text-pink-700 border-pink-100' :
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
                                <div className="w-10 h-10 rounded-full bg-[#88F2A2]/20 flex items-center justify-center text-[#458C57] mr-3 font-bold">
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
                                    <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#458C57] inline-block"></div></div>
                                ) : comments.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">Seja o primeiro a comentar.</p>
                                ) : (
                                    comments.map(comment => (
                                        <div key={comment.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-xs text-slate-700">{comment.profiles?.full_name} <span className="font-normal text-slate-500">({comment.institutions?.name})</span></span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400">{new Date(comment.created_at).toLocaleString('pt-BR')}</span>
                                                    {currentUser && (comment.author_id === currentUser.id || selectedPost.author_id === currentUser.id) && (
                                                        <button onClick={() => handleDeleteComment(comment.id)} className="text-red-400 hover:text-red-600" title="Excluir comentário">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
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
                                    className="flex-1 border-slate-300 rounded-lg shadow-sm focus:ring-[#458C57] focus:border-[#458C57] text-sm"
                                    placeholder="Escreva um comentário..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                />
                                <button type="submit" disabled={!newComment.trim()} className="p-2 bg-[#458C57] text-white rounded-lg hover:bg-[#367044] disabled:opacity-50">
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