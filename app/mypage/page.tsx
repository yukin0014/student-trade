"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User, signOut, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mySales, setMySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [unreadItems, setUnreadItems] = useState<{[key: string]: boolean}>({});
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setNewName(u.displayName || "");
        setNewPhoto(u.photoURL || null);
        
        const qSales = query(collection(db, "products"), where("sellerId", "==", u.uid), orderBy("createdAt", "desc"));
        const snapSales = await getDocs(qSales);
        const salesData = snapSales.docs.map(d => ({ id: d.id, ...d.data() }));
        setMySales(salesData);

        // ★修正箇所：(p: any) とすることで TypeScript のエラーを回避します
        salesData.forEach((p: any) => {
          if (p.isSold) {
            const lastSeen = Number(localStorage.getItem(`lastSeen_${p.id}`) || 0);
            const chatRef = collection(db, "products", p.id, "messages");
            const qChat = query(chatRef, orderBy("createdAt", "desc"), where("uid", "!=", u.uid));
            onSnapshot(qChat, (snap) => {
              if (!snap.empty) {
                const latestMsg = snap.docs[0].data().createdAt?.toMillis() || 0;
                setUnreadItems(prev => ({ ...prev, [p.id]: latestMsg > lastSeen }));
              }
            });
          }
        });
      } else {
        router.push("/");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async () => {
    if (!user || !newName.trim()) return;
    try {
      await updateProfile(user, { displayName: newName, photoURL: newPhoto });
      setIsEditing(false);
      alert("プロフィールを更新しました！");
    } catch (e) { alert("更新失敗"); }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => setNewPhoto(reader.result as string);
  };

  if (loading) return <div className="p-10 text-center text-[#0068B7] font-bold">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 text-gray-800">
      <header className="bg-[#0068B7] p-8 text-white rounded-b-[2.5rem] shadow-lg mb-6">
        <div className="max-w-4xl mx-auto flex justify-between items-start">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img 
                src={user?.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-xl" 
              />
              <button onClick={() => setIsEditing(true)} className="absolute -bottom-1 -right-1 bg-white text-[#0068B7] shadow-lg rounded-full p-2 text-xs">✏️</button>
            </div>
            <div>
              <h1 className="text-2xl font-black">{user?.displayName || "九大生"}</h1>
              <p className="text-blue-100 text-xs opacity-80">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-bold border border-white/20">ログアウト</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-8">
        {isEditing && (
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-blue-50 space-y-5">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border-2 border-gray-100 p-4 rounded-2xl bg-gray-50 outline-none" placeholder="新しい表示名" />
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-xs w-full" />
            <div className="flex gap-3">
              <button onClick={handleUpdateProfile} className="flex-grow bg-[#0068B7] text-white font-bold py-4 rounded-2xl">保存する</button>
              <button onClick={() => setIsEditing(false)} className="px-6 py-4 text-gray-400 font-bold">閉じる</button>
            </div>
          </div>
        )}

        <section>
          <h2 className="text-lg font-black text-gray-700 flex items-center gap-2 mb-5">📦 出品した商品 <span className="bg-[#0068B7] text-white text-[10px] px-2 py-0.5 rounded-full">{mySales.length}</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {mySales.map((p: any) => (
              <Link href={`/product/${p.id}`} key={p.id} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm relative hover:shadow-xl transition-all">
                <div className="relative aspect-square overflow-hidden">
                  <img src={p.image} className="object-cover w-full h-full group-hover:scale-110 transition-transform" />
                  {unreadItems[p.id] && (
                    <div className="absolute top-3 right-3 z-20">
                      <span className="flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span></span>
                    </div>
                  )}
                  {p.isSold && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="bg-[#E53E3E] text-white font-black text-sm py-1.5 w-[150%] text-center transform -rotate-[30deg] border-y-2 border-white/40 tracking-widest">SOLD</div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 mb-1">{p.category}</p>
                  <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                  <p className="text-[#ED8936] font-black text-sm mt-1 italic">¥{p.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <Link href="/" className="block text-center bg-white text-[#0068B7] border-2 border-[#0068B7] py-4 rounded-2xl text-sm font-bold shadow-sm">トップページに戻る</Link>
      </main>
    </div>
  );
}