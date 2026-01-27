"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase"; 
import { collection, addDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import Link from "next/link";

const CATEGORIES = ["すべて", "冷蔵庫", "電子レンジ", "洗濯機", "食品", "その他"];

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 認証・出品用State（中身は以前と同じ）
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("その他");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  const fetchProducts = async () => {
    if (!user) return;
    let q = selectedCategory === "すべて" 
      ? query(collection(db, "products"), orderBy("createdAt", "desc"))
      : query(collection(db, "products"), where("category", "==", selectedCategory), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchProducts(); }, [selectedCategory, user]);

  const handleAuth = async () => {
    try {
      if (isLoginMode) { await signInWithEmailAndPassword(auth, email, password); }
      else {
        if (!email.endsWith("@s.kyushu-u.ac.jp")) return alert("九大アドレスが必要です");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        window.location.reload();
      }
    } catch (e: any) { alert("エラー: " + e.message); }
  };

  const handleAddProduct = async () => {
    if (!newName || !newPrice || !imageFile) return alert("入力漏れがあります");
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
      try {
        await addDoc(collection(db, "products"), {
          name: newName, price: Number(newPrice), category: newCategory,
          image: reader.result, sellerId: user.uid, isSold: false, createdAt: new Date()
        });
        setIsFormOpen(false);
        fetchProducts();
      } catch (e) { console.error(e); }
    };
  };

  if (loading) return <div className="p-10 text-center text-blue-600">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0068B7] flex items-center justify-center p-6 text-gray-800">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#0068B7] italic italic">Uni-Trade 伊都</h2>
          <div className="space-y-4">
            {!isLoginMode && <input type="text" placeholder="お名前" className="w-full border p-3 rounded-xl outline-none" onChange={e => setDisplayName(e.target.value)} />}
            <input type="email" placeholder="九大アドレス" className="w-full border p-3 rounded-xl outline-none" onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="パスワード" className="w-full border p-3 rounded-xl outline-none" onChange={e => setPassword(e.target.value)} />
            <button onClick={handleAuth} className="w-full bg-[#0068B7] text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition">{isLoginMode ? "ログイン" : "新規登録"}</button>
            <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-[#0068B7] text-xs font-bold text-center mt-2">{isLoginMode ? "アカウント作成" : "ログインへ"}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 text-gray-800">
      {/* 画像のイメージに近いヘッダー */}
      <header className="sticky top-0 z-50 bg-[#0068B7] text-white p-4 shadow-lg">
        <div className="flex justify-between items-center mb-4 px-2">
          <h1 className="text-2xl font-bold italic tracking-tight">Uni-Trade 伊都</h1>
          <Link href="/mypage" className="relative flex items-center gap-2 bg-white text-[#0068B7] px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
            マイページ
            <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px]">👤</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
            </span>
          </Link>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat ? "bg-white text-[#0068B7] shadow-md scale-105" : "bg-[#005291] text-blue-100 opacity-80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* 商品グリッド：画像のように余白を広めにしたデザイン */}
      <main className="max-w-5xl mx-auto p-5 grid grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((p) => (
          <Link href={`/product/${p.id}`} key={p.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col">
            <div className="relative overflow-hidden aspect-square">
              <img src={p.image} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" alt={p.name} />
              
              {/* ★かっこいいSOLDデザインの再現 */}
              {p.isSold && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="bg-[#E53E3E] text-white font-black text-xl py-2 w-[150%] text-center shadow-2xl transform -rotate-[30deg] border-y-4 border-white/40 tracking-widest">
                    SOLD
                  </div>
                </div>
              )}
              
              <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[8px] px-2 py-0.5 rounded-md font-bold">
                {p.category}
              </span>
            </div>
            
            <div className="p-4 bg-white flex-grow border-t border-gray-50">
              <h3 className="text-xs font-bold text-gray-500 mb-1">{p.category}</h3>
              <p className="text-sm font-bold text-gray-800 line-clamp-1">{p.name}</p>
              <p className="font-black text-[#ED8936] text-lg mt-1 italic">¥{p.price.toLocaleString()}</p>
            </div>
          </Link>
        ))}
      </main>

      {/* 出品ボタン */}
      <button onClick={() => setIsFormOpen(true)} className="fixed bottom-8 right-8 bg-[#ED8936] text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center font-bold text-4xl z-40 hover:scale-110 transition-transform">
        ＋
      </button>

      {/* 出品フォーム（デザイン調整） */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">商品を出品する</h2>
            <div className="space-y-5">
              <input type="text" placeholder="商品名" className="w-full border-2 border-gray-100 p-4 rounded-2xl bg-gray-50 focus:border-[#0068B7] outline-none transition" onChange={e => setNewName(e.target.value)} />
              <input type="number" placeholder="価格" className="w-full border-2 border-gray-100 p-4 rounded-2xl bg-gray-50 focus:border-[#0068B7] outline-none transition" onChange={e => setNewPrice(e.target.value)} />
              <select className="w-full border-2 border-gray-100 p-4 rounded-2xl bg-gray-50" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {CATEGORIES.filter(c => c !== "すべて").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="border-2 border-dashed border-gray-200 p-6 rounded-2xl text-center bg-gray-50">
                <input type="file" accept="image/*" capture="environment" className="text-xs w-full" onChange={e => setImageFile(e.target.files?.[0] || null)} />
              </div>
              <button onClick={handleAddProduct} className="w-full bg-[#0068B7] text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-[#005291] transition">出品を確定する</button>
              <button onClick={() => setIsFormOpen(false)} className="w-full text-gray-400 font-bold mt-2">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}